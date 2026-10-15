# Codex task checkpoint

> Keep this file short. Do not include API keys, cookies, customer data, or private chat transcripts.

## Objective

- User-visible result:
- Acceptance checks:

## Scope

- Allowed files or systems:
- Non-goals / do not change:

Before making changes, record the baseline below. At handoff or completion, compare it with the current state. If work started without a baseline, mark the original state as unknown. An empty plain `git diff` does not cover staged changes or untracked files.

## Working-tree baseline

- Recorded at (timezone):
- Starting branch and commit (or "no HEAD yet"):
- Existing tracked changes, including staged changes:
- Existing untracked files relevant to this task:
- Protected files and local before-snapshot/hash references (no secrets):
- Task-created commits, if HEAD has changed:

Read-only inventory, from the intended repository:

```bash
git status --short --untracked-files=all
git diff --stat
git diff --cached --stat
git ls-files --others --exclude-standard
```

Read relevant diffs and new files after the inventory. If HEAD exists, `git diff HEAD` compares tracked working-tree content with the current commit; it still omits untracked files. If HEAD changed during the task, also compare the recorded starting commit with the current commit. These checks normally exclude untracked ignored files; verify known task outputs separately. Without a before-snapshot, mark ownership as unknown instead of reverting or claiming all changes. Final state does not prove that no intermediate writes occurred.

## Done evidence

- [ ] Evidence:
  - File, command, page, or commit:
  - Actual result:

## Failed or rejected approaches

- Tried:
- Failed because:
- Do not retry unless:

## Pending

- [ ]

## Next action

- One action that should produce new evidence:
- Expected evidence:

## Stop condition

- Stop, preserve the state, and report when:

## Review decisions

- accepted:
- deferred:
- dismissed:

## Handoff notes

- Model / client / version (if relevant):
- Last verified at (timezone):
- Unverified risks:
