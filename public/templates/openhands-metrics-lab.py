"""OpenHands 1.60.1 statistics-object lab; synthetic values, no model calls.

Tested on macOS arm64 / Python 3.12.14 with the accompanying frozen requirements.
Exit 0 means the documented observations were reproduced, including the bad sum.
This does not create/resume a Conversation or call ask_agent/generate.
"""
from __future__ import annotations

import hashlib
import importlib.metadata as metadata
import json
import os
from pathlib import Path
import platform
import shutil
import socket
import subprocess
import sys
import tempfile

VERSIONS = {"openhands-sdk": "1.60.1", "pydantic": "2.14.3", "litellm": "1.105.7"}
SOURCE_HASHES = {
    "llm/llm_registry.py": "b466739c5161b6226f7e4f2f9506869804a827ca93031f5106a5132dd62d60cc",
    "conversation/conversation_stats.py": "66543df64806e58542ad9e2ba8996aeb725a8889f15fc8eabfeab9952ed137af",
    "conversation/state.py": "176581dc2c122aaba7e2c016253ccaaee74850fd629b3f6ca3b2dfbd6893cf4c",
    "llm/llm.py": "70c73e52325504252d95b131bef95b06ab4f1b7fc70125db4a4069725deb6673",
    "conversation/impl/local_conversation.py": "ddea83a75f32f038d5fdc68d1e12369f94a9ee570af9bb49c60ace54c34dba1f",
    "llm/utils/metrics.py": "5e31d58bfe488f76f9f545daf1838e8b4b11bd466eeda9990925e93083c7787b",
}


def check_install():
    for package, expected in VERSIONS.items():
        if metadata.version(package) != expected:
            raise ValueError("Install the exact accompanying frozen requirements.")
    dist = metadata.distribution("openhands-sdk")
    for relative, expected in SOURCE_HASHES.items():
        data = Path(dist.locate_file("openhands/sdk/" + relative)).read_bytes()
        if hashlib.sha256(data).hexdigest() != expected:
            raise ValueError("SDK source differs from the fixed release; stopping.")


def child(mode, base):
    # Confirm the OS guard before importing any SDK code.
    for address in [("127.0.0.1", 9), ("1.1.1.1", 443)]:
        connection = socket.socket()
        connection.settimeout(0.5)
        code = connection.connect_ex(address)
        connection.close()
        if code not in (1, 13):
            raise RuntimeError("Network isolation preflight failed.")
    try:
        os.listdir(os.environ["HOME"])
    except PermissionError:
        pass
    else:
        raise RuntimeError("Home-directory isolation preflight failed.")

    attempts = []

    def audit(event, args):
        if event == "socket.connect":
            attempts.append(event)
            raise RuntimeError("SDK network access is disabled.")

    sys.addaudithook(audit)
    check_install()
    from pydantic import SecretStr
    from openhands.sdk.conversation.conversation_stats import ConversationStats
    from openhands.sdk.llm import LLM
    from openhands.sdk.llm.llm_registry import LLMRegistry

    def make_llm(usage):
        return LLM(model="gpt-4o", api_key=SecretStr("synthetic-no-api-key"), usage_id=usage)

    def charge(model, value, prompt):
        model.metrics.add_cost(value)
        model.metrics.add_token_usage(prompt, 10, 0, 0, 8192, "synthetic-" + model.usage_id)

    if mode == "seed":
        stats = ConversationStats()
        registry = LLMRegistry()
        registry.subscribe(stats.register_llm)
        agent = make_llm("agent")
        registry.add(agent)
        charge(agent, 2.0, 200)
        (base / "full.json").write_text(stats.model_dump_json(), encoding="utf8")
        (base / "snapshot.json").write_text(
            stats.model_dump_json(context={"use_snapshot": True}), encoding="utf8"
        )
        row = {"case": mode, "agent": agent.metrics.accumulated_cost, "records": len(agent.metrics.costs)}
    elif mode == "serializers":
        full = ConversationStats.model_validate_json((base / "full.json").read_text())
        snapshot = ConversationStats.model_validate_json((base / "snapshot.json").read_text())
        a, b = full.get_metrics_for_usage("agent"), snapshot.get_metrics_for_usage("agent")
        assert (a.accumulated_cost, b.accumulated_cost, len(a.costs), len(b.costs)) == (2, 2, 1, 0)
        row = {"case": mode, "full_cost": a.accumulated_cost, "snapshot_cost": b.accumulated_cost,
               "full_records": len(a.costs), "snapshot_records": len(b.costs)}
    else:
        stats = (ConversationStats() if mode == "fresh-copy" else
                 ConversationStats.model_validate_json((base / "full.json").read_text()))
        registry = LLMRegistry()
        registry.subscribe(stats.register_llm)
        agent = make_llm("agent")
        registry.add(agent)
        if mode == "fresh-copy":
            charge(agent, 2.0, 200)
        question = (make_llm("ask-agent") if mode == "resumed-new" else
                    agent.model_copy(update={"usage_id": "ask-agent", "stream": False}))
        if mode == "resumed-reset":
            question.reset_metrics()
        registry.add(question)
        charge(question, 1.0, 100)
        combined = stats.get_combined_metrics()
        row = {"case": mode, "same_metrics": agent.metrics is question.metrics,
               "same_telemetry": agent.telemetry is question.telemetry,
               "agent": agent.metrics.accumulated_cost, "question": question.metrics.accumulated_cost,
               "combined": combined.accumulated_cost, "combined_records": len(combined.costs),
               "expected_from_inputs": 3.0, "conserved": combined.accumulated_cost == 3.0}
        expected = ((True, 3, 3, 6, 4) if mode == "resumed-copy" else (False, 2, 1, 3, 2))
        assert (row["same_metrics"], row["agent"], row["question"], row["combined"], row["combined_records"]) == expected
        assert row["same_telemetry"] == row["same_metrics"]
    row["sdk_socket_connect_events"] = len(attempts)
    row["network_and_home_guards"] = True
    assert not attempts
    print(json.dumps(row, sort_keys=True))


def run():
    if sys.version_info[:2] != (3, 12) or sys.platform != "darwin" or platform.machine() != "arm64":
        raise ValueError("This fixed lab requires macOS arm64 and Python 3.12.")
    if sys.flags.optimize:
        raise ValueError("Run without -O: the observation assertions must remain enabled.")
    check_install()
    if not Path("/usr/bin/sandbox-exec").exists():
        raise ValueError("The required macOS sandbox-exec guard is unavailable.")
    original_home = os.environ.get("HOME")
    if not original_home:
        raise ValueError("HOME must already be set; the lab preserves it.")
    with tempfile.TemporaryDirectory(prefix="openhands-metrics-lab-") as directory:
        root = Path(directory)
        copied = root / "lab.py"
        shutil.copyfile(__file__, copied)
        profile = root / "isolation.sb"
        rules = ["(version 1)", "(allow default)", "(deny network*)",
                 "(deny file-read* (subpath " + json.dumps(original_home) + "))",
                 "(deny file-write* (subpath " + json.dumps(original_home) + "))"]
        for allowed in {str(Path(sys.base_prefix).resolve()), str(Path(sys.prefix).resolve())}:
            if Path(allowed) == Path(original_home):
                raise ValueError("Interpreter prefix must not be the home directory.")
            rules.append("(allow file-read* (subpath " + json.dumps(allowed) + "))")
        profile.write_text("\n".join(rules) + "\n")
        environment = {"PATH": str(Path(sys.executable).parent) + ":/usr/bin:/bin",
                       "HOME": original_home, "TMPDIR": str(root),
                       "XDG_CACHE_HOME": str(root / "cache"), "XDG_CONFIG_HOME": str(root / "config"),
                       "XDG_DATA_HOME": str(root / "data"), "DO_NOT_TRACK": "1",
                       "LITELLM_LOCAL_MODEL_COST_MAP": "True", "OTEL_SDK_DISABLED": "true",
                       "PYTHONNOUSERSITE": "1", "PYTHONDONTWRITEBYTECODE": "1"}
        rows = []
        for mode in ["seed", "fresh-copy", "resumed-copy", "resumed-reset", "resumed-new", "serializers"]:
            result = subprocess.run(
                ["/usr/bin/sandbox-exec", "-f", str(profile), sys.executable, str(copied), "--child", mode, str(root)],
                cwd=root, env=environment, capture_output=True, text=True, timeout=60,
            )
            if result.returncode:
                raise RuntimeError("Child observation failed: " + mode + "; no SDK recovery is established.")
            rows.append(json.loads(result.stdout.strip().splitlines()[-1]))
        print(json.dumps({"scope": "SDK statistics objects and JSON only; synthetic values",
                          "versions": VERSIONS, "observations_match": True, "results": rows}, indent=2))


if __name__ == "__main__":
    try:
        if len(sys.argv) == 4 and sys.argv[1] == "--child":
            child(sys.argv[2], Path(sys.argv[3]))
        else:
            run()
    except Exception as error:
        # Do not print raw SDK logs, home paths, credentials or persisted state.
        print(type(error).__name__ + ": " + (str(error) if isinstance(error, (ValueError, RuntimeError)) else
                                             "Lab stopped; check the pinned environment and guards."), file=sys.stderr)
        raise SystemExit(2)
