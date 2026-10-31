---
title: "Codex 换到 Claude Code：先用只读工具检查项目规则"
description: "共用 AGENTS.md 时，先盘点当前目录和父目录中的规则文件，再用 Claude Code 的上下文面板核对。附已通过五组本地测试的下载工具；客户端加载与执行效果未实测。"
level: "初学者"
surface: "Codex / Claude Code / Python 3.9+"
duration: "10–15 分钟"
checkedAt: "2026-11-01"
---

# Codex 换到 Claude Code：先用只读工具检查项目规则

项目已经有 `AGENTS.md`，换到 Claude Code 后，还需要维护另一份规则吗？先确认**有哪些文件、客户端加载了什么、实际行为是否符合要求**。这三件事需要分别验收。

适合在同一仓库交替使用 Codex 与 Claude Code 的开发者。本文的只读盘点工具已在本地验证；本站没有安装或运行 Claude Code，下面的客户端核对步骤需要读者在自己的版本上执行，不属于客户端成功案例。

## 为什么现在补这个入口

[GitHub #96466](https://github.com/anthropics/claude-code/issues/96466) 的原请求与 10 月后续回复讨论了父目录文件、个人规则与共享规则的关系；[Reddit 的独立提问](https://www.reddit.com/r/ClaudeCode/comments/1x9vkkh/agentsmd_in_claudemd_does_it_work_100/)仍在询问导入是否可靠。本站于 2026-11-01 阅读两处原讨论，后者页面仅提供相对时间，精确发布日期未核实。

这些是一手需求线索，支持为这类读者提供检查方法；不能推算本站阅读人数，也不证明所有 Claude Code 会话都有故障。产品行为以下面的当日官方资料为准。

## 先弄清当前规则

据 [Claude Code 的项目记忆文档](https://code.claude.com/docs/en/memory#agentsmd)，原生读取 `AGENTS.md` 要求 v2.1.277 或更高版本。默认回退取决于当前目录及上层是否有项目 `CLAUDE.md`、`.claude/CLAUDE.md` 或 `CLAUDE.local.md`；个人全局 `~/.claude/CLAUDE.md` 不属于这个阻断条件。已有导入、设置与内置插件状态还会影响结果。

| 你的现场 | 下一步核对 |
| --- | --- |
| 只有共享规则，没有上述项目标记文件 | 检查版本、启动提示与实际上下文，别只看文件存在 |
| 当前或父目录还有 Claude 项目规则 | 查看是否已有导入，或在 `/config` 的 Project instructions 中核对加载模式 |
| 已经用 `CLAUDE.md` 导入共享规则 | 保留现有内容，检查导入是否实际生效；无需为了本文删除文件 |
| 共享内容只放在 `AGENTS.override.md` | 核对两边各自支持范围，不能假设 Claude 会读取 Codex 的覆盖文件 |

Codex 有自己的[项目规则发现顺序](https://learn.chatgpt.com/docs/agent-configuration/agents-md)：同一目录的覆盖文件会影响它采用哪份规则。文件名相似不代表两种客户端具有相同的发现机制。

## 第一步：运行不读正文的盘点工具

[下载 Python 只读检查器](/templates/agent-instructions-audit.py)。需要 Python 3.9+，只使用标准库，无需 API Key。

将脚本保存到自己的临时工作目录。从脚本所在目录执行下面的命令，把 `your-project` 换成要检查的真实项目目录：

```bash
python3 agent-instructions-audit.py ./your-project
```

工具只检查目标目录及所有父目录中的六种文件名，不读取规则正文、客户端配置或聊天，不联网，不修改文件。它不递归扫描所有子目录；换到某个子项目时应对那个目录重新运行。

重点看四个字段：

| 输出字段 | 能证明什么 |
| --- | --- |
| `found` | 检查时看到了哪些文件名，以及是否为符号链接 |
| `possible_claude_fallback_blockers` | 哪些项目标记值得进一步核对；已有导入或加载模式可能改变结果 |
| `scan_complete` | 是否发生检查错误；`false` 时不能把缺失结果当作没有规则 |
| `client_loading_verified` | 固定为 `false`，因为这个工具不访问客户端上下文 |

正常完成盘点退出 0，检查不完整或目标无效退出 2。退出 0 **只表示文件名盘点完成**，不能据此判断规则已经加载。工具也没有检测你安装的 Claude Code 版本、插件、排除模式、导入链或组织策略。

## 第二步：在 Claude Code 中核对加载

先在普通终端记录 `claude --version` 的实际结果，再从目标目录进入 Claude Code。命令用途见[官方 CLI reference](https://code.claude.com/docs/en/cli-reference)。

在交互会话中查看启动提示、`/config` 的 Project instructions 和 `/context`。记录实际模式、可见文件与结果，不能仅凭模型说“我读过”就确认自动加载；显式要求它读一次规则，会改变现场，不能再用该轮证明自动发现。

如果团队选择用导入共享规则，官方文档支持在 `CLAUDE.md` 中写独立一行 `@AGENTS.md`。以下代码块是**展示应写入文件的内容**；保存到 `CLAUDE.md` 时只保留这一行，不带三反引号：

```text
@AGENTS.md
```

不要覆盖已有 `CLAUDE.md`。先审查现有内容与相对路径，再在合适位置添加导入；无需把共享正文复制两遍。官方文档说明，代码跨度或围栏内的 `@` 路径不会作为导入处理。修改后重新核对实际上下文，未确认时保留“加载待验证”。

## 第三步：用一个小任务验证行为

先选择一个没有写入、提交或发布要求的小任务。下面是核验提示词，不是效果保证：

```text
只读梳理这个项目的验证方式。
请指出现有规则中与本任务有关的要求，以及 README 或包脚本中的对应依据。
区分你在会话开始时已获得的信息和本轮新读取的信息。
不要编辑文件、安装依赖、提交或推送。
最后给出：建议执行的检查、尚未核实的部分，以及本轮实际做了什么。
```

对照真实文件和工具记录验收：检查命令是否存在、引用是否正确、是否发生了额外写入。模型对信息来源的自述只能辅助核对。需要始终阻止的行为应由权限、工具或仓库门禁落实；[Claude Code 官方实践](https://code.claude.com/docs/en/best-practices#enforce-the-rules-that-cant-have-exceptions)也区分了项目指引与执行约束。

## 本站实际验证到了哪一层

2026-11-01 在临时目录执行了五组回归：只有共享规则、父目录和个人项目标记、个人全局文件不误报为项目阻断、覆盖文件与断开的符号链接、权限错误。五组全部通过；测试还确认盘点不调用正文读取、保留夹具原文，遇到不完整证据不会报告完成。

本仓库实际盘点只发现根目录的 `AGENTS.md`，`scan_complete=true`，`client_loading_verified=false`。这条结果不证明 Claude Code 会话已加载规则，也不是两种模型的效果对照。工具源码与测试可在[仓库](https://github.com/modelsell/codex-study-club)核查。

下一次切换客户端时，保存版本、目录层级、加载模式、上下文证据与小任务结果；若仍不符合要求，可以继续使用[任务完成验收方法](/cases/codex-finished-but-not-verified)，把具体失败交给下一轮排查。

## 来源与核对日期

以上官方资料与两处需求讨论均于 **2026-11-01** 阅读。GitHub 原请求发表于 2026-09-23，有 10-22、10-26 后续回复；回复中的第三方产品推广不作为本指南推荐依据。来源日期不等于功能发布日期，文档核对与工具测试不等于客户端实测。
