"""Gemini CLI 0.67.0 cancellation lab; macOS arm64, synthetic API only."""
import argparse
import hashlib
import http.server
import json
import os
from pathlib import Path
import platform
import shutil
import signal
import stat
import subprocess
import tempfile
import threading
import time
import zipfile

BUNDLE_SHA256 = "53371261bc56ebd5b3d1d6c400e07854e8d674f4e06365bae38443c1dc1312d3"
COMMAND = "bash ./worker.sh"
MARKER = "LOCAL_TOOL_RESULT_OK"


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def alive(pid):
    if not pid:
        return False
    result = subprocess.run(["/bin/ps", "-o", "stat=", "-p", str(pid)],
                            capture_output=True, text=True)
    return result.returncode == 0 and bool(result.stdout.strip()) and "Z" not in result.stdout


def owned_group(pid):
    if not alive(pid):
        return None
    command = subprocess.check_output(["/bin/ps", "-o", "command=", "-p", str(pid)], text=True)
    group = os.getpgid(pid)
    leader = subprocess.check_output(["/bin/ps", "-o", "command=", "-p", str(group)], text=True)
    assert COMMAND in command and COMMAND in leader and group > 1 and group != os.getpgrp(), "Worker identity changed."
    return group


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", type=Path, required=True, help="Official v0.67.0 gemini-cli-bundle.zip")
    parser.add_argument("--node", type=Path, required=True, help="Node.js v24.22.1 executable")
    args = parser.parse_args()
    if platform.system() != "Darwin" or platform.machine() != "arm64":
        parser.error("This lab is pinned to macOS arm64.")
    if sha256(args.bundle) != BUNDLE_SHA256:
        parser.error("Bundle SHA-256 mismatch; no client was executed.")
    requests = []
    mode = {"resume": False}

    class Endpoint(http.server.BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_GET(self):
            self.send_response(200); self.end_headers(); self.wfile.write(b"loopback-ok")

        def do_POST(self):
            data = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))))
            parts = [p for c in data.get("contents", []) for p in c.get("parts", [])]
            response = any("functionResponse" in p for p in parts)
            tools = [f.get("name") for t in data.get("tools", []) for f in t.get("functionDeclarations", [])]
            requests.append({"path": self.path.split("?")[0], "has_tool_response": response,
                             "history_function_calls": sum("functionCall" in p for p in parts),
                             "resume_probe": mode["resume"]})
            if ":countTokens" in self.path:
                self.send_response(200); self.send_header("Content-Type", "application/json")
                self.end_headers(); self.wfile.write(b'{"totalTokens":1}'); return
            if "run_shell_command" in tools and not response and not mode["resume"]:
                result = [{"functionCall": {"name": "run_shell_command", "args": {
                    "command": COMMAND, "description": "Run only the synthetic worker"}},
                           "thoughtSignature": "c3ludGhldGlj"}]
            else:
                result = [{"text": MARKER}]
            value = {"candidates": [{"content": {"role": "model", "parts": result}, "finishReason": "STOP"}],
                     "usageMetadata": {"promptTokenCount": 1, "candidatesTokenCount": 1, "totalTokenCount": 2}}
            self.send_response(200)
            streaming = ":streamGenerateContent" in self.path
            self.send_header("Content-Type", "text/event-stream" if streaming else "application/json")
            self.end_headers()
            self.wfile.write((("data: " + json.dumps(value) + "\n\n") if streaming else json.dumps(value)).encode())

    with tempfile.TemporaryDirectory(prefix="gemini-cancel-lab-", dir="/tmp") as temporary:
        root = Path(temporary).resolve()
        node = root / "node"
        shutil.copy2(args.node.resolve(strict=True), node)
        bundle = root / "bundle"
        with zipfile.ZipFile(args.bundle) as archive:
            for item in archive.infolist():
                path = Path(item.filename)
                assert not path.is_absolute() and ".." not in path.parts
                assert not stat.S_ISLNK(item.external_attr >> 16), "Unexpected archive symlink."
            archive.extractall(bundle)
        profile = root / "isolate.sb"
        profile.write_text('(version 1)\n(allow default)\n(deny network-outbound)\n'
                           '(allow network-outbound (remote ip "localhost:*"))\n'
                           '(deny file-read* file-write* (subpath ' + json.dumps(str(Path.home())) + '))\n'
                           '(deny file-read* (subpath "/Library/Application Support/GeminiCli"))\n')
        prefix = ["/usr/bin/sandbox-exec", "-f", str(profile)]
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Endpoint)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()

        def environment(task):
            for folder in ["home/.gemini", "tmp", "work"]:
                (task / folder).mkdir(parents=True)
            (task / "home/.gemini/settings.json").write_text(json.dumps({
                "telemetry": {"enabled": False}, "security": {"auth": {"selectedType": "gemini-api-key"}},
                "general": {"disableUpdateNag": True}, "ide": {"enabled": False}}))
            # These unprivileged, nonexistent paths exclude real administrator configuration.
            # The client can warn that such system paths are skipped. No ownership is changed.
            return {"PATH": str(root) + ":/usr/bin:/bin", "HOME": str(Path.home()), "SHELL": "/bin/bash",
                    "LANG": "en_US.UTF-8", "TERM": "dumb", "CI": "1", "NO_COLOR": "1",
                    "GEMINI_CLI_HOME": str(task / "home"), "TMPDIR": str(task / "tmp"),
                    "GEMINI_CLI_SYSTEM_SETTINGS_PATH": str(task / "absent-system.json"),
                    "GEMINI_CLI_SYSTEM_DEFAULTS_PATH": str(task / "absent-defaults.json"),
                    "GEMINI_API_KEY": "SYNTHETIC-LAB-NOT-A-SECRET", "GEMINI_TELEMETRY_ENABLED": "false",
                    "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{server.server_port}",
                    "GEMINI_CLI_TRUST_WORKSPACE": "true"}

        def journal(task):
            records = {}
            def collect(value):
                if isinstance(value, dict):
                    for tool in value.get("toolCalls", []):
                        if isinstance(tool, dict) and tool.get("id"):
                            records[tool["id"]] = tool.get("status")
                    for child in value.values():
                        collect(child)
                elif isinstance(value, list):
                    for child in value:
                        collect(child)
            files = list((task / "home/.gemini").rglob("session-*.jsonl"))
            for path in files:
                for line in path.read_text().splitlines():
                    if line.strip():
                        collect(json.loads(line))
            return {"session_files": len(files), "recorded_tools": len(records),
                    "tool_statuses": sorted(str(value) for value in records.values())}

        try:
            preflight = root / "preflight"; env = environment(preflight)
            def check(command):
                return subprocess.run(prefix + command, env=env, cwd=preflight,
                                      stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=20)
            assert check([str(node), "--version"]).stdout.strip() == "v24.22.1", "Use Node.js v24.22.1."
            version = check([str(node), str(bundle / "gemini.js"), "--version"])
            assert version.returncode == 0 and version.stdout.strip() == "0.67.0"
            assert check(["/usr/bin/curl", "-sS", "--max-time", "3", f"http://127.0.0.1:{server.server_port}"]).stdout == "loopback-ok"
            assert check(["/usr/bin/curl", "-sS", "--max-time", "3", "--noproxy", "*", "http://1.1.1.1"]).returncode != 0
            assert check(["/bin/ls", str(Path.home())]).returncode != 0
            results = []
            cases = [("policy_denied", None, False), ("complete", None, False),
                     ("cli_sigterm", signal.SIGTERM, False), ("cli_sigint", signal.SIGINT, False),
                     ("owned_group_sigterm", signal.SIGTERM, True)]
            for name, sig, supervise in cases:
                task = root / name; env = environment(task)
                permitted = "not-worker" if name == "policy_denied" else "worker"
                (task / "policy.toml").write_text('[[rule]]\ntoolName = "run_shell_command"\n'
                    'argsPattern = \'"command":"bash \\./' + permitted + '\\.sh"\'\n'
                    'decision = "allow"\npriority = 900\n')
                (task / "work/worker.sh").write_text('#!/bin/bash\nprintf \'%s\\n\' "$$" > worker.pid\n'
                    "printf 'STARTED\\n' > started.txt\nsleep 4\nprintf 'DELIVERED\\n' >> result.txt\n")
                command = prefix + [str(node), str(bundle / "gemini.js"), "-p",
                    "SYNTHETIC_CANCEL_LAB: run only the isolated worker.", "--model", "gemini-2.5-flash",
                    "--output-format", "stream-json", "--policy", str(task / "policy.toml")]
                start = len(requests); worker = None; sent = False; worker_after_exit = False
                artifact_at_exit = False
                with tempfile.TemporaryFile(mode="w+") as out, tempfile.TemporaryFile(mode="w+") as err:
                    process = subprocess.Popen(command, env=env, cwd=task / "work", stdin=subprocess.DEVNULL,
                                               stdout=out, stderr=err, start_new_session=True)
                    began = time.monotonic()
                    try:
                        while process.poll() is None and time.monotonic() - began < 25:
                            if sig and not sent and (task / "work/started.txt").exists():
                                assert not (task / "work/result.txt").exists(), "Worker completed before signal."
                                worker = int((task / "work/worker.pid").read_text())
                                group = owned_group(worker); assert group
                                if supervise:
                                    os.killpg(group, signal.SIGTERM)
                                os.kill(process.pid, sig); sent = True
                            time.sleep(.02)
                        assert process.poll() is not None, "Observer deadline; no cancellation result claimed."
                        artifact_at_exit = (task / "work/result.txt").exists()
                        worker_after_exit = alive(worker)
                        if sig:
                            # Observe beyond this worker's four-second timer; this is not a performance benchmark.
                            time.sleep(5)
                    finally:
                        if process.poll() is None:
                            os.killpg(process.pid, signal.SIGKILL)
                        process.wait(timeout=5)
                        if alive(worker):
                            os.killpg(owned_group(worker), signal.SIGKILL)
                    out.seek(0); events = [json.loads(line) for line in out.read().splitlines() if line.startswith("{")]
                history = journal(task)
                delivered = (task / "work/result.txt").read_text().splitlines() if (task / "work/result.txt").exists() else []
                statuses = [e["status"] for e in events if e.get("type") == "tool_result"]
                final = [e.get("status") for e in events if e.get("type") == "result"]
                result = {"case": name, "exit_code": process.returncode, "signal_sent": sent,
                          "worker_started": (task / "work/started.txt").exists(),
                          "worker_alive_at_cli_exit": worker_after_exit, "artifact_at_cli_exit": artifact_at_exit,
                          "delivered_lines_after_observation": len(delivered), "tool_result_statuses": statuses,
                          "final_event_statuses": final, **history}
                if name == "policy_denied":
                    assert process.returncode == 0 and not result["worker_started"] and not delivered
                    assert statuses == ["error"] and final == ["success"] and history["recorded_tools"] == 1
                elif name == "complete":
                    assert process.returncode == 0 and delivered == ["DELIVERED"]
                    assert statuses == ["success"] and history["recorded_tools"] == 1
                elif not supervise:
                    assert sent and process.returncode == (143 if sig == signal.SIGTERM else 130)
                    assert not artifact_at_exit and worker_after_exit and delivered == ["DELIVERED"]
                    assert history["recorded_tools"] == 0
                else:
                    assert sent and process.returncode != 0 and not delivered
                if name == "cli_sigterm":
                    mode["resume"] = True; request_start = len(requests)
                    resumed = subprocess.run(command + ["--resume", "latest"], env=env, cwd=task / "work",
                                             stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=20)
                    observed = requests[request_start:]; mode["resume"] = False
                    assert resumed.returncode == 0 and MARKER in resumed.stdout and observed
                    assert all(r["history_function_calls"] == 0 and not r["has_tool_response"] for r in observed)
                    assert (task / "work/result.txt").read_text().splitlines() == ["DELIVERED"]
                    result["resume_probe"] = {"exit_code": resumed.returncode,
                        "history_function_calls": 0, "history_tool_responses": 0,
                        "synthetic_reply_seen": True, "additional_delivery": False}
                results.append(result)
            print(json.dumps({"scope": "Official CLI, real local shell/files, synthetic Gemini API; no real model",
                "version": "0.67.0", "node": "24.22.1", "platform": "macOS arm64", "bundle_sha256": BUNDLE_SHA256,
                "preflight": {"loopback": True, "external_connection_rejected": True, "real_home_access_rejected": True},
                "results": results}, indent=2))
        finally:
            server.shutdown(); server.server_close(); thread.join()


if __name__ == "__main__":
    main()
