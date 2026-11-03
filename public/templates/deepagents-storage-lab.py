"""Offline Deep Agents backend/checkpointer lab. No model or agent delegation."""
from __future__ import annotations

import hashlib
import importlib.metadata as metadata
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile

os.environ["LANGSMITH_TRACING"] = "false"
os.environ["LANGCHAIN_TRACING_V2"] = "false"
NETWORK_ATTEMPTS = []
EXPECTED_VERSIONS = {"deepagents": "0.7.32", "langchain": "1.4.8", "langchain-core": "1.7.4",
    "langgraph": "1.2.19", "langgraph-checkpoint": "4.3.1", "langgraph-checkpoint-sqlite": "3.1.3"}


def deny_network(*args, **kwargs):
    NETWORK_ATTEMPTS.append("blocked")
    raise RuntimeError("This storage lab does not permit network connections.")


socket.socket.connect = deny_network
socket.socket.connect_ex = deny_network
socket.create_connection = deny_network

from deepagents.backends import FilesystemBackend, StateBackend, StoreBackend
from deepagents.middleware.filesystem import FilesystemState
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph
from langgraph.store.memory import InMemoryStore

SOURCES = {
    "/sources/a.txt": "SYNTHETIC source A: exports are available once per day.",
    "/sources/b.txt": "SYNTHETIC source B: exports need a human review before delivery.",
}
DIGESTS = {path: hashlib.sha256(text.encode()).hexdigest() for path, text in SOURCES.items()}
FILES = {**SOURCES, "/research/manifest.json": json.dumps({"synthetic": True, "source_sha256": DIGESTS,
    "next_step": "Compare export frequency and review requirements.", "status": "collected"}, sort_keys=True)}


class ResearchState(FilesystemState):
    action: str
    observed: dict


def inspect(backend):
    rows = {}
    for response in backend.download_files(list(FILES)):
        rows[response.path] = {"error": response.error,
            "sha256": hashlib.sha256(response.content).hexdigest() if response.content is not None else None}
    return rows


def graph_with(backend, saver):
    def step(state):
        if state["action"] == "write":
            for path, content in FILES.items():
                result = backend.write(path, content)
                assert result.error is None, result.error
        return {"observed": inspect(backend)}

    builder = StateGraph(ResearchState)
    builder.add_node("storage", step)
    builder.add_edge(START, "storage")
    builder.add_edge("storage", END)
    return builder.compile(checkpointer=saver)


def child(kind, action, root, thread):
    backend = FilesystemBackend(root_dir=root / "export", virtual_mode=True) if kind == "filesystem" else StateBackend()
    (root / "export").mkdir(exist_ok=True)
    if kind == "sqlite":
        with SqliteSaver.from_conn_string(str(root / "checkpoints.sqlite")) as saver:
            result = graph_with(backend, saver).invoke({"action": action}, {"configurable": {"thread_id": thread}})
    else:
        result = graph_with(backend, InMemorySaver()).invoke({"action": action}, {"configurable": {"thread_id": thread}})
    assert not NETWORK_ATTEMPTS
    print(json.dumps({"observed": result["observed"], "network_attempts": len(NETWORK_ATTEMPTS)}))


def verify(rows, present):
    assert set(rows) == set(FILES)
    for path, content in FILES.items():
        if present:
            assert rows[path] == {"error": None, "sha256": hashlib.sha256(content.encode()).hexdigest()}, rows[path]
        else:
            assert rows[path]["error"] == "file_not_found" and rows[path]["sha256"] is None, rows[path]


def main():
    versions = {name: metadata.version(name) for name in EXPECTED_VERSIONS}
    assert versions == EXPECTED_VERSIONS, "Install the matching fixed dependency file before running this lab."
    results = []
    with tempfile.TemporaryDirectory(prefix="deepagents-storage-lab-") as temp:
        base = Path(temp)

        def run(kind, action, thread):
            root = base / kind
            root.mkdir(exist_ok=True)
            value = subprocess.check_output([sys.executable, __file__, "--child", kind, action, str(root), thread], text=True)
            return json.loads(value)["observed"]

        for kind in ["memory", "sqlite", "filesystem"]:
            verify(run(kind, "write", "research-a"), True)
            restored = run(kind, "read", "research-a")
            verify(restored, kind != "memory")
            results.append({"case": kind + "_new_process_same_thread", "files_present": kind != "memory",
                "missing_files": sum(value["error"] == "file_not_found" for value in restored.values())})
        new_thread = run("sqlite", "read", "research-b")
        verify(new_thread, False)
        verify(run("sqlite", "read", "research-a"), True)
        results.append({"case": "sqlite_new_thread", "files_present": False, "original_thread_still_present": True})
        verify(run("filesystem", "read", "research-b"), True)
        results.append({"case": "filesystem_new_thread_same_root", "files_present": True})

        store = InMemoryStore()
        try:
            StoreBackend(store=store)
        except TypeError:
            results.append({"case": "missing_namespace", "error_type": "TypeError"})
        else:
            raise AssertionError("The pinned SDK requires an explicit namespace factory.")
        alpha = StoreBackend(store=store, namespace=lambda _rt: ("research", "alpha"))
        same = StoreBackend(store=store, namespace=lambda _rt: ("research", "alpha"))
        beta = StoreBackend(store=store, namespace=lambda _rt: ("research", "beta"))
        shared_graph = graph_with(alpha, InMemorySaver())
        verify(shared_graph.invoke({"action": "write"}, {"configurable": {"thread_id": "source-thread"}})["observed"], True)
        verify(shared_graph.invoke({"action": "read"}, {"configurable": {"thread_id": "another-thread"}})["observed"], True)
        verify(graph_with(same, InMemorySaver()).invoke({"action": "read"}, {"configurable": {"thread_id": "misconfigured-project"}})["observed"], True)
        verify(graph_with(beta, InMemorySaver()).invoke({"action": "read"}, {"configurable": {"thread_id": "other-project"}})["observed"], False)
        fresh = StoreBackend(store=InMemoryStore(), namespace=lambda _rt: ("research", "alpha"))
        verify(inspect(fresh), False)
        results.append({"case": "store_namespace", "same_namespace_visible": True, "other_namespace_visible": False,
            "mistaken_shared_namespace_visible": True, "new_memory_store_visible": False})
    assert not NETWORK_ATTEMPTS
    print(json.dumps({"scope": "SDK backends and local graph checkpoints; no model, client research or subagent execution",
        "python": sys.version.split()[0], "versions": versions, "source_sha256": DIGESTS,
        "files_per_case": len(FILES), "network_attempts": len(NETWORK_ATTEMPTS), "results": results}, indent=2))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--child":
        child(sys.argv[2], sys.argv[3], Path(sys.argv[4]), sys.argv[5])
    else:
        main()
