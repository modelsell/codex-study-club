#!/usr/bin/env python3
"""Offline SDK experiment: approval, crash, replay, and a local transaction.

Requires pydantic-ai-slim==2.68.0. All model replies are FunctionModel fixtures.
Only freshly created local SQLite databases are changed; no external service runs.
This is not a production approval service or a distributed exactly-once guarantee.
"""

import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass

VERSION = "2.68.0"
TITLE = "Synthetic weekly report"


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def connect(folder):
    db = sqlite3.connect(folder / "business.sqlite", timeout=10)
    db.execute("PRAGMA synchronous=FULL")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY, business_key TEXT NOT NULL, title TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS receipts (
            business_key TEXT PRIMARY KEY, intent_digest TEXT NOT NULL, result TEXT NOT NULL
        );
    """)
    return db


class IntentConflict(ValueError):
    pass


def child(plan):
    folder = Path(plan["folder"])
    # Catch attempted network connects as well as disabling real model requests.
    def blocked_connect(sock, address):
        with (folder / "network-attempts").open("a") as log:
            log.write("blocked\n")
        raise AssertionError("This experiment must remain offline")
    socket.socket.connect = blocked_connect
    socket.socket.connect_ex = blocked_connect
    os.environ["OTEL_SDK_DISABLED"] = "true"
    os.environ["LOGFIRE_SEND_TO_LOGFIRE"] = "false"

    import pydantic_ai.models as model_settings
    from pydantic_ai import Agent, DeferredToolRequests, DeferredToolResults, RunContext
    from pydantic_ai.messages import (
        ModelMessagesTypeAdapter, ModelResponse, TextPart, ToolCallPart, ToolReturnPart,
    )
    from pydantic_ai.models.function import FunctionModel
    model_settings.ALLOW_MODEL_REQUESTS = False
    assert importlib.metadata.version("pydantic-ai-slim") == VERSION

    @dataclass
    class Dependencies:
        folder: Path
        business_key: str

    def synthetic_model(messages, info):
        if any(isinstance(part, ToolReturnPart) for message in messages for part in message.parts):
            return ModelResponse(parts=[TextPart("Synthetic continuation; inspect the receipt.")])
        return ModelResponse(parts=[ToolCallPart(
            "register_report", {"title": plan["title"]}, tool_call_id="report-call",
        )])

    agent = Agent(FunctionModel(synthetic_model), deps_type=Dependencies,
                  output_type=[str, DeferredToolRequests])

    @agent.tool(requires_approval=True)
    def register_report(ctx: RunContext[Dependencies], title: str) -> dict:
        """Register a synthetic report in the local business database."""
        with (folder / "invocations").open("a") as log:
            log.write("called\n")
        if plan.get("barrier"):
            (folder / ("ready-" + plan["out"])).touch()
            deadline = time.monotonic() + 10
            while len(list(folder.glob("ready-*"))) < 2:
                if time.monotonic() > deadline:
                    raise TimeoutError("Second approved worker never reached the barrier")
                time.sleep(0.01)
        db = connect(folder)
        try:
            db.execute("BEGIN IMMEDIATE")
            key = ctx.deps.business_key  # Supplied by this trusted host, not the model.
            intent = digest({"tool": "register_report", "schema": 1, "title": title})
            if plan["mode"] == "guarded":
                prior = db.execute("SELECT intent_digest, result FROM receipts WHERE business_key=?", (key,)).fetchone()
                if prior:
                    if prior[0] != intent:
                        raise IntentConflict("same_business_key_different_intent")
                    return json.loads(prior[1])
            row_id = db.execute("INSERT INTO reports(business_key,title) VALUES (?,?)", (key, title)).lastrowid
            result = {"row_id": row_id, "business_key": key, "title": title}
            if plan["mode"] == "guarded":
                db.execute("INSERT INTO receipts VALUES (?,?,?)", (key, intent, json.dumps(result, sort_keys=True)))
            if plan.get("crash") == "before_commit":
                os._exit(74)  # Only this isolated child dies, with the SQLite transaction open.
            db.commit()  # The effect and receipt commit together, in this local database.
            if plan.get("crash") == "after_commit":
                os._exit(73)  # Business commit succeeded; new SDK history was never saved.
            return result
        finally:
            db.close()

    history_path = folder / plan["history"]
    deps = Dependencies(folder, plan["business_key"])
    if plan["phase"] == "start":
        result = agent.run_sync("Register the synthetic report.", deps=deps)
        assert isinstance(result.output, DeferredToolRequests)
        assert len(result.output.approvals) == 1
        history_path.write_bytes(ModelMessagesTypeAdapter.dump_json(result.all_messages()))
        return {"waiting_for_approval": True}
    history = ModelMessagesTypeAdapter.validate_json(history_path.read_bytes())
    result = agent.run_sync(
        message_history=history, deps=deps,
        deferred_tool_results=DeferredToolResults(approvals={"report-call": plan["phase"] != "deny"}),
    )
    (folder / plan["out"]).write_bytes(ModelMessagesTypeAdapter.dump_json(result.all_messages()))
    returns = [part.content for message in result.all_messages() for part in message.parts
               if isinstance(part, ToolReturnPart)]
    return {"waiting_for_approval": isinstance(result.output, DeferredToolRequests), "tool_returns": returns}


def inspect(folder):
    with connect(folder) as db:
        rows = [{"row_id": row[0], "business_key": row[1], "title": row[2]}
                for row in db.execute("SELECT id,business_key,title FROM reports ORDER BY id")]
        receipts = [json.loads(row[0]) for row in db.execute("SELECT result FROM receipts ORDER BY business_key")]
    invocations = (folder / "invocations").read_text().count("called\n") if (folder / "invocations").exists() else 0
    return {"effects": len(rows), "receipts": len(receipts), "invocations": invocations,
            "rows": rows, "saved_receipts": receipts}


def main():
    assert importlib.metadata.version("pydantic-ai-slim") == VERSION
    sequence = 0
    with tempfile.TemporaryDirectory(prefix="approval-replay-lab-") as temp:
        root = Path(temp)
        def plan(folder, phase, *, mode="guarded", key="request-A", title=TITLE,
                 history="paused.json", crash=None, barrier=False):
            nonlocal sequence
            sequence += 1
            return {"folder": str(folder), "phase": phase, "mode": mode, "business_key": key,
                    "title": title, "history": history, "crash": crash, "barrier": barrier, "out": f"completed-{sequence}.json"}
        def command(p):
            return [sys.executable, str(Path(__file__).resolve()), "_child", json.dumps(p)]
        def run(p, code=0):
            result = subprocess.run(command(p), capture_output=True, text=True, timeout=30)
            assert result.returncode == code, (p["phase"], result.returncode, result.stderr, result.stdout)
            return json.loads(result.stdout) if result.stdout.strip() else None
        def folder(name):
            path = root / name
            path.mkdir()
            connect(path).close()
            return path
        results = []

        f = folder("deny")
        run(plan(f, "start")); assert inspect(f)["effects"] == 0
        run(plan(f, "deny")); state = inspect(f)
        assert state["effects"] == state["invocations"] == 0
        results.append({"case": "pause_then_deny", **state})

        f = folder("approve")
        run(plan(f, "start")); assert inspect(f)["effects"] == 0
        response = run(plan(f, "resume")); state = inspect(f)
        assert state["effects"] == state["receipts"] == 1
        assert response["tool_returns"][-1] == state["saved_receipts"][0]
        results.append({"case": "approve_and_read_receipt", **state})

        for mode, expected in [("naive", 2), ("guarded", 1)]:
            f = folder(mode + "-crash")
            run(plan(f, "start", mode=mode))
            history_digest = hashlib.sha256((f / "paused.json").read_bytes()).hexdigest()
            run(plan(f, "resume", mode=mode, crash="after_commit"), code=73)
            after_crash = inspect(f)
            assert after_crash["effects"] == 1 and not list(f.glob("completed-*.json"))
            response = run(plan(f, "resume", mode=mode)); state = inspect(f)
            assert hashlib.sha256((f / "paused.json").read_bytes()).hexdigest() == history_digest
            assert state["effects"] == expected and state["invocations"] == 2
            assert response["tool_returns"][-1] == state["rows"][-1 if mode == "naive" else 0]
            results.append({"case": mode + "_crash_after_commit_replay", "crash_exit": 73,
                            "paused_history_unchanged": True, **state})

        f = folder("rollback")
        run(plan(f, "start"))
        run(plan(f, "resume", crash="before_commit"), code=74)
        before = inspect(f); assert before["effects"] == before["receipts"] == 0
        run(plan(f, "resume")); state = inspect(f)
        assert state["effects"] == state["receipts"] == 1
        results.append({"case": "crash_before_commit_then_resume", "crash_exit": 74,
                        "effects_after_crash": 0, **state})

        f = folder("concurrent")
        run(plan(f, "start"))
        workers = [subprocess.Popen(command(plan(f, "resume", barrier=True)), stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE, text=True) for _ in range(2)]
        replies = []
        for worker in workers:
            stdout, stderr = worker.communicate(timeout=30)
            assert worker.returncode == 0, (worker.returncode, stderr)
            replies.append(json.loads(stdout)["tool_returns"][-1])
        state = inspect(f)
        assert state["effects"] == state["receipts"] == 1 and state["invocations"] == 2
        assert replies[0] == replies[1] == state["saved_receipts"][0]
        results.append({"case": "two_processes_replay_one_approval", "same_receipt": True, "both_reached_barrier": len(list(f.glob("ready-*"))) == 2, **state})

        f = folder("changed-intent")
        run(plan(f, "start")); run(plan(f, "resume"))
        run(plan(f, "start", history="second.json", title="Changed report"))
        error = run(plan(f, "resume", history="second.json", title="Changed report"), code=2)
        state = inspect(f)
        assert error == {"error": "IntentConflict", "reason": "same_business_key_different_intent"}
        assert state["effects"] == 1 and state["rows"][0]["title"] == TITLE
        results.append({"case": "same_business_key_different_intent_rejected", **state})

        f = folder("two-requests")
        run(plan(f, "start")); run(plan(f, "resume"))
        run(plan(f, "start", key="request-B", history="second.json"))
        run(plan(f, "resume", key="request-B", history="second.json"))
        state = inspect(f)
        assert state["effects"] == state["receipts"] == 2
        assert {row["business_key"] for row in state["rows"]} == {"request-A", "request-B"}
        results.append({"case": "different_business_requests_same_arguments_allowed", **state})

        attempts = sum(path.read_text().count("blocked\n") for path in root.rglob("network-attempts"))
        assert attempts == 0
        print(json.dumps({"sdk": "pydantic-ai-slim", "version": VERSION,
                          "python": ".".join(map(str, sys.version_info[:3])), "cases": len(results),
                          "results": results, "network_attempts": attempts,
                          "scope": "real SDK and local SQLite; synthetic FunctionModel and approval decisions; no provider or approval server"}, indent=2))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "_child":
        try:
            print(json.dumps(child(json.loads(sys.argv[2]))))
        except IntentConflict as error:
            print(json.dumps({"error": "IntentConflict", "reason": str(error)}))
            raise SystemExit(2)
    else:
        main()
