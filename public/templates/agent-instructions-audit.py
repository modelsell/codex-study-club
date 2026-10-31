#!/usr/bin/env python3
"""Inventory instruction filenames only; never infer a client's loaded context.

Python 3.9+, standard library only. No network, writes, file-content reads,
configuration reads, or model calls. See the companion guide before use.
"""

import argparse
import json
import os
from pathlib import Path
import stat


FILENAMES = (
    "AGENTS.md", "AGENTS.override.md", ".claude/AGENTS.md",
    "CLAUDE.md", ".claude/CLAUDE.md", "CLAUDE.local.md",
)
CLAUDE_MARKERS = {"CLAUDE.md", ".claude/CLAUDE.md", "CLAUDE.local.md"}


def audit_directory(directory, *, stop_at=None, user_home=None):
    """Return filename evidence, including blockers and incomplete probes.

    stop_at is an inclusive boundary for deterministic fixture tests only.
    The CLI checks the current directory and every ancestor.
    """
    directory = Path(directory).resolve(strict=True)
    if not directory.is_dir():
        raise ValueError("Target must be a directory")
    home = Path(user_home) if user_home is not None else Path.home()
    global_claude = home / ".claude/CLAUDE.md"
    found, errors, markers = [], [], []
    for parent in (directory, *directory.parents):
        for name in FILENAMES:
            candidate = parent / name
            label = os.path.relpath(candidate, directory)
            try:
                info = candidate.lstat()
                if stat.S_ISLNK(info.st_mode):
                    kind = "symlink"
                    usable = candidate.is_file()
                else:
                    kind = "file" if stat.S_ISREG(info.st_mode) else "other"
                    usable = kind == "file"
            except FileNotFoundError:
                continue
            except OSError as error:
                errors.append({"path": label, "error": type(error).__name__})
                continue
            is_global = candidate == global_claude
            found.append({"path": label, "kind": kind, "usable": usable,
                          "personal_global_file": is_global})
            if not usable:
                errors.append({"path": label, "error": "NotReadableAsRegularFile"})
            if name in CLAUDE_MARKERS and not is_global:
                markers.append(label)
        if stop_at is not None and parent == Path(stop_at):
            break
    return {
        "scope": "filenames in target directory and ancestors; no contents or settings read",
        "scan_complete": not errors,
        "found": found,
        "possible_claude_fallback_blockers": markers,
        "errors": errors,
        "client_loading_verified": False,
        "next_step": "Check client version, Project instructions, imports and /context; inventory is not proof of loading or compliance.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", default=".")
    args = parser.parse_args()
    try:
        result = audit_directory(args.directory)
    except (OSError, ValueError):
        parser.exit(2, "Cannot inspect target directory; no files were changed.\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["scan_complete"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
