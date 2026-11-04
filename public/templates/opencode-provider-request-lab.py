"""OpenCode 2.2.5 CLI transport lab for macOS arm64; synthetic endpoint only."""
import argparse
import hashlib
import http.server
import json
import os
from pathlib import Path
import platform
import re
import shutil
import signal
import subprocess
import tempfile
import threading

BINARY_SHA256 = "abe4d88594bffb12b364375b8a6732d2d1f7a977195ed1a35c5c76f8e89c9e0e"
PROMPT = "TRANSPORT_LAB_ONLY: reply with the marker. Do not call tools."
MARKER = "LOCAL_ENDPOINT_OK"


def digest(path):
    value = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def run(command, env, cwd, timeout=12):
    process = subprocess.Popen(command, env=env, cwd=cwd, stdin=subprocess.DEVNULL,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                               text=True, start_new_session=True)
    stopped = False
    try:
        stdout, stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        stopped = True
        os.killpg(process.pid, signal.SIGTERM)
        try:
            stdout, stderr = process.communicate(timeout=3)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            stdout, stderr = process.communicate()
    text = re.sub(r"\x1b\[[0-9;]*m", "", stdout + stderr)
    return process.returncode, stopped, text


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, required=True,
                        help="Extracted official v2.2.5 macOS arm64 opencode binary")
    args = parser.parse_args()
    if platform.system() != "Darwin" or platform.machine() != "arm64":
        parser.error("This fixed-binary lab requires macOS arm64.")
    binary = args.binary.resolve(strict=True)
    if digest(binary) != BINARY_SHA256:
        parser.error("Binary SHA-256 mismatch. Do not run a different binary with this lab.")
    sandbox, curl, ls = (shutil.which(name) for name in ("sandbox-exec", "curl", "ls"))
    if not all((sandbox, curl, ls)):
        parser.error("sandbox-exec, curl and ls must be available.")
    requests = []

    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_GET(self):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"loopback-ok")

        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            # No headers, messages, credentials or original logs are retained.
            requests.append({"path": self.path, "model": body.get("model"),
                             "stream": body.get("stream"),
                             "synthetic_prompt": "TRANSPORT_LAB_ONLY" in json.dumps(body)})
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.end_headers()
            for delta, finish in [({"role": "assistant", "content": MARKER}, None), ({}, "stop")]:
                chunk = {"id": "synthetic-lab", "object": "chat.completion.chunk", "created": 1,
                         "model": "probe-1", "choices": [{"index": 0, "delta": delta,
                                                        "finish_reason": finish}]}
                self.wfile.write(("data: " + json.dumps(chunk) + "\n\n").encode())
            self.wfile.write(b"data: [DONE]\n\n")
            self.wfile.flush()

    with tempfile.TemporaryDirectory(prefix="opencode-provider-lab-", dir="/tmp") as temporary:
        root = Path(temporary).resolve()
        profile = root / "transport.sb"
        profile.write_text(
            '(version 1)\n(allow default)\n(deny network-outbound)\n'
            '(allow network-outbound (remote ip "localhost:*"))\n'
            '(deny file-read* file-write* (subpath ' + json.dumps(str(Path.home())) + '))\n'
            '(deny file-read* (subpath "/Library/Application Support/opencode") '
            '(subpath "/Library/Managed Preferences"))\n'
        )
        env = {"PATH": os.pathsep.join({str(Path(tool).parent) for tool in (sandbox, curl, ls)}),
               "HOME": str(Path.home()), "LANG": "en_US.UTF-8", "NO_COLOR": "1", "TERM": "dumb",
               "CI": "1", "PROBE_API_KEY": "SYNTHETIC-NOT-A-SECRET"}
        # HOME is preserved. Only this process's XDG and OpenCode test paths change.
        def case_environment(task):
            result = dict(env)
            for key, folder in [("XDG_CONFIG_HOME", "config-base"), ("XDG_DATA_HOME", "data"),
                                ("XDG_STATE_HOME", "state"), ("XDG_CACHE_HOME", "cache"),
                                ("OPENCODE_CONFIG_DIR", "config"), ("OPENCODE_TEST_HOME", "home"),
                                ("TMPDIR", "tmp")]:
                (task / folder).mkdir(parents=True, exist_ok=True)
                result[key] = str(task / folder)
            return result

        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        prefix = [sandbox, "-f", str(profile)]
        try:
            test_env = case_environment(root / "preflight")
            code, stopped, text = run(prefix + [str(binary), "--version"], test_env, root)
            assert code == 0 and not stopped and "opencode v2.2.5" in text, "Version check failed."
            code, stopped, text = run(prefix + [curl, "-sS", "--max-time", "3",
                                               f"http://127.0.0.1:{server.server_port}"], test_env, root)
            assert code == 0 and not stopped and text == "loopback-ok", "Loopback preflight failed."
            code, stopped, _ = run(prefix + [curl, "-sS", "--max-time", "3", "--noproxy", "*",
                                            "http://1.1.1.1"], test_env, root)
            assert code != 0 and not stopped, "Non-loopback connection was not rejected."
            code, stopped, _ = run(prefix + [ls, str(Path.home())], test_env, root)
            assert code != 0 and not stopped, "Real home-directory access was not rejected."
            results = []
            cases = [("valid_default", False, False, False), ("invalid_default", True, False, False),
                     ("invalid_explicit", True, True, False), ("valid_explicit", False, True, False),
                     ("invalid_disabled_free", True, False, True)]
            for name, invalid, explicit, disabled in cases:
                task = root / name
                task_env = case_environment(task)
                (task / "work").mkdir()
                config = {"update": "disable", "share": "disabled", "snapshots": False,
                          "model": "probe/probe-1", "providers": {"probe": {
                              "name": "Loopback Probe", "env": ["PROBE_API_KEY"],
                              "package": "@opencode/ai/providers/openai-compatible",
                              "settings": {"baseURL": f"http://127.0.0.1:{server.server_port}/v1", "timeout": 3000},
                              "models": {"probe-1": {"name": "Probe 1", "capabilities": {
                                  "tools": False, "reasoning": True if invalid else {"supported": False},
                                  "input": ["text"], "output": ["text"]}}}}}}
                if disabled:
                    config["disabled_providers"] = ["opencode"]
                (task / "config/opencode.json").write_text(json.dumps(config))
                start = len(requests)
                command = prefix + [str(binary), "run", "--standalone", "--print-logs",
                                    "--title", "Transport lab", PROMPT]
                if explicit:
                    command += ["--model", "probe/probe-1"]
                code, stopped, text = run(command, task_env, task / "work")
                received = requests[start:]
                selected_builtin = "build · big-pickle" in text
                rejected = "configuration normalization diagnostic" in text and "$.providers.probe" in text
                if not invalid:
                    assert code == 0 and not stopped and MARKER in text, name
                    assert received == [{"path": "/v1/chat/completions", "model": "probe-1",
                                         "stream": True, "synthetic_prompt": True}], (name, received)
                else:
                    assert received == [] and rejected, name
                    if explicit:
                        assert code == 1 and not stopped and "Model unavailable: probe/probe-1" in text, name
                    elif disabled:
                        assert code == 1 and not stopped and "No model is available for session" in text, name
                    else:
                        assert stopped and selected_builtin, name
                results.append({"case": name, "exit_code": code, "observer_deadline_reached": stopped,
                                "local_requests": received, "provider_rejection_seen": rejected,
                                "builtin_model_header_seen": selected_builtin})
            print(json.dumps({"scope": "Real CLI configuration and transport; synthetic HTTP endpoint, no real model",
                              "version": "2.2.5", "binary_sha256": BINARY_SHA256,
                              "platform": "macOS arm64", "observer_deadline_seconds": 12,
                              "preflight": {"loopback": True, "non_loopback_rejected": True,
                                            "real_home_access_rejected": True}, "results": results}, indent=2))
        finally:
            server.shutdown()
            server.server_close()
            worker.join()


if __name__ == "__main__":
    main()
