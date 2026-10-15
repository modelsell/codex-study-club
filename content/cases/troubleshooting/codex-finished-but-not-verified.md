---
title: "Codex 说完成了，但结果还不能用：怎么补上验证闭环"
description: "审查面板没显示，不等于没有改动：用可复现练习检查未跟踪、暂存与工作区文件，再验收真实结果。"
level: "所有用户"
surface: "App / CLI / Cloud"
duration: "12 分钟"
cover: "/imported/codexguide/codex-cli-review-diff-result-fd3304aed7.png"
imageAlt: "Codex CLI 对代码改动进行审查"
checkedAt: "2026-10-15"
---

# Codex 说完成了，但结果还不能用：怎么补上验证闭环

::: tip 资料说明
本文于 2026-10-15 重新核对 [OpenAI Prompting](https://learn.chatgpt.com/docs/prompting) 与 [Long-running work](https://learn.chatgpt.com/docs/long-running-work)，并在独立临时仓库验证了下文两种 Git 漏检场景。适合收到“已完成”答复、却不确定改了哪些文件的读者；需要 Git 和终端。读完可带走一份只读验收提示词和包含工作区基线的交接模板。旧版界面图片仅供理解，不代表今天的客户端外观。
:::

“已经写入文件”、“构建通过”和“用户报告的问题已经解决”是三个不同结论。如果任务只停在第一个结论，就容易出现“Codex 说完成了，我打开页面却还是错的”。

## 四层验证

| 层级 | 要回答的问题 | 常见方式 |
| --- | --- | --- |
| 改动审查 | 改了什么，是否混入无关变更 | 文件清单、工作区与暂存区 diff、新文件内容 |
| 静态检查 | 代码是否满足项目基本约束 | lint、typecheck、格式检查 |
| 目标验证 | 原始失败是否真的恢复 | 失败测试、原请求、特定脚本 |
| 运行时验证 | 用户实际使用时是否正常 | 启动服务、页面操作、API 探测、部署后检查 |

不是每个任务都要跑全仓库所有检查。验证应该与风险成比例：改一段文案与改计费、身份验证或生产部署，所需证据不会相同。

## 审查面板为空，先查有没有漏掉新文件

2026-10-12，liyandong001 在 [openai/codex #53368](https://github.com/openai/codex/issues/53368) 报告：macOS 桌面版 26.1007.30912 创建的新文件在磁盘和 Git 中存在，却没有预期的变更摘要。本站于 2026-10-15 核对时该 Issue 仍开放；作者明确说明日志失败与界面症状的因果关系尚未确认。这是一个用户报告，下面提供的是独立核对文件的方法，不是已验证的客户端修复。

**空的 `git diff` 不能单独证明没有改动。** 普通 diff 比较工作区与暂存区；已经暂存的修改要另查，新建但未跟踪的文件也不会自动进入普通 diff。先确认自己查看的是任务所在的仓库和分支，再执行：

```bash
git branch --show-current
git rev-parse --verify HEAD
git status --short --untracked-files=all
git diff --stat
git diff --cached --stat
git ls-files --others --exclude-standard
```

这些命令不会暂存、提交或撤回文件。统计清单只能定位文件，接着还要阅读任务范围内的实际 diff 与新文件内容。`git diff --check` 检查空白错误等问题，不能替代功能验收。

| 看到什么 | 下一步 | 能得出的结论 |
| --- | --- | --- |
| `?? filename` | 阅读该新文件，核对任务开始时的文件清单 | 文件未跟踪；不能仅凭状态认定是本次创建 |
| 已跟踪文件有修改 | 分别看 `git diff` 与 `git diff --cached` | 区分工作区和暂存区，避免漏审 |
| HEAD 已存在 | 可用 `git diff HEAD` 看已跟踪文件相对当前提交的净变化 | 仍不包括未跟踪文件，也不自动区分用户原有修改 |
| HEAD 不存在 | 记录“尚无提交”，核对文件清单与事前快照 | 不要把命令报错解释成“零改动” |

如果任务开始前就有未提交修改，先把它们记入[交接模板](/templates/codex-task-checkpoint.md)的 Working-tree baseline：当前提交、已有修改、已有未跟踪文件、需要保护的文件及本地快照位置。没有事前基线时，准确结论是“归属待核对”，不要自行清理或把全部文件算作 Codex 的产物。若任务过程中产生新提交，还要比较记录的起始提交与当前提交；只对照当前 HEAD 会遗漏已提交的任务改动。

### 两种漏检的可复现练习

下面在子 shell 中新建临时仓库，不改变原项目或原 shell 目录。适用于 macOS/Linux 的 Bash 或 zsh；Windows 原生 PowerShell 未实测。`git add` 和演示提交只用于这个新建练习目录，不是在真实项目里“修复面板”的建议。不要用 `git add .` 掩盖真实项目的未知状态。

```bash
(
  set -eu
  fixture_dir=$(mktemp -d)
  cd "$fixture_dir"
  git init --quiet
  printf 'baseline\n' > tracked.txt
  git add -- tracked.txt
  git -c user.name='Fixture Author' \
      -c user.email='fixture@example.invalid' \
      -c commit.gpgsign=false \
      -c core.hooksPath=/dev/null \
      commit --quiet -m 'fixture baseline'

  # 场景一：普通 diff 为空，但新文件存在。
  printf 'new file not in index\n' > untracked-note.txt
  git diff -- .
  git status --short --untracked-files=all
  git ls-files --others --exclude-standard

  # 场景二：修改全部暂存后，普通 diff 又为空。
  printf 'baseline\nstaged change\n' > tracked.txt
  git add -- tracked.txt
  git diff -- .
  git diff --cached -- tracked.txt
  git diff HEAD -- tracked.txt
)
```

本站在 **2026-10-15、Git 2.53.0** 的隔离仓库实际得到：场景一的普通 diff 无输出，status 显示 `?? untracked-note.txt`；场景二的普通 diff 仍无输出，`--cached` 与 `HEAD` 对比都显示新增 `staged change`。可用这两项结果验收练习。这里只验证 Git 命令的覆盖范围，没有复现 Codex 面板故障、测试具体模型或证明质量改善。

常见边界：上述清单默认排除尚未跟踪且被忽略的文件；任务如果生成被忽略的构建产物，需要按已知路径单独验收，不要扫描或公开密钥文件。快照只证明检查时的状态，不能证明过程中从未写过文件；净 diff 也不是操作历史。

### 可复制的只读验收提示词

```text
先做只读验收，不修改、暂存、提交或撤回文件。
确认当前仓库、分支和 HEAD；HEAD 不存在就明确记录。
读取任务开始时的工作区基线，区分原有修改与本次改动。
检查 git status --short --untracked-files=all、git diff、
git diff --cached 和 git ls-files --others --exclude-standard。
若 HEAD 已变化，补查起始提交到当前提交的改动。
只阅读任务相关的新增文件和差异；归属不明的文件列为待核对。
按“文件或产物 / 证据 / 验收结果 / 未验证原因”输出表格。
不要把空 diff、退出码为 0 或文字答复当作功能成功。
最后列出下一项最小验证及执行条件，本轮先不要运行会改写文件的验证。
```

验收产物是一张覆盖相关文件的表格，至少说明新文件是否存在、暂存区是否有遗漏、原问题的检查是否已执行。提示词是本站编写的方法，没有跨模型成功率数据；它也不能代替真实测试。

## 在任务开始前写验收标准

模糊的验收：

```text
改完后测试一下。
```

可执行的验收：

```text
完成后：
1. 运行 npm test -- checkout；
2. 用失败请求中的相同输入重试；
3. 确认返回状态为 200，且 amount 与预期一致；
4. 检查 diff 中没有计费模块之外的改动；
5. 如果某一步无法执行，说明原因，不要将它写成已验证。
```

## 没有现成测试时怎么办

没有自动化测试不等于只能相信代码。可以选择离用户报告最近的证据：

- 页面问题：启动本地页面，按原步骤点击并截图。
- API 问题：用脱敏后的原请求重放，检查状态码和关键字段。
- 命令行问题：重跑原命令，同时保留退出码和标准错误。
- 文档链接：检查生成路由、链接状态与移动端排版。
- 部署问题：区分本地构建成功和公网运行正常，部署后再做一次外部探测。

![Codex 根据实际 diff 进行代码审查](/imported/codexguide/codex-cli-review-diff-result-fd3304aed7.png)

## 如何记录“未验证”

如果任务还在执行，先看[该继续等，还是接管任务](/cases/codex-progress-or-loop)，区分推进、等待和阻塞。可以<a href="/templates/codex-progress-check.md" download="codex-progress-check.md">下载进展与验收记录表（Markdown）</a>，在自己的任务中填写，不必每次从长文章中手动摘录。文件包含未验证项与外部动作状态，避免把不确定的提交或部署重复执行。

一个可靠的交付总结应该把结果分开：

```text
已完成：
- [实际改动]

已验证：
- [命令或操作] -> [结果]

未验证：
- [无法执行的检查] -> [原因]

剩余风险：
- [仍然需要人工或生产环境确认的事项]
```

## 完成检查

- 验收方式在实施前已经确定。
- 原始失败路径已经重试，不只是另外一条方便的路径。
- diff 与验证命令都有实际记录。
- 构建成功没有被当成所有运行时问题的证明。
- 未验证项和剩余风险已经说明。

站内延伸阅读：[任务执行与验证闭环](/start/08-task-execution) 和 [从 CI 日志完成修复](/cases/diagnose-ci-failure)。

## 来源与核对范围

- [Git diff](https://git-scm.com/docs/git-diff)、[Git status](https://git-scm.com/docs/git-status)、[Git ls-files](https://git-scm.com/docs/git-ls-files)：2026-10-15 核对命令的比较范围与忽略规则，命令行为另以上文隔离练习验证。
- [OpenAI Codex Prompting Guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)：2026-10-15 核对其保留用户已有改动的编辑约束；本文不把该指南当作所有客户端行为保证。
- [Maintaining software with the GPT-6 family](https://developers.openai.com/blog/maintaining-software-with-the-gpt-6-family)，Rodrigo Roim，官方发布日期 **2026-10-14**，本站核对 **2026-10-15**：作者分享以证据支持清理和审查的维护实践。这里仅作为选题背景，未复现其模型对比、内部代码库或收益数字。
