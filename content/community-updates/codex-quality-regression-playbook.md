---
title: "Codex 降智了吗？从体感回归到可验证修复"
excerpt: "近期公开反馈集中在指令遗漏、假完成、上下文丢失、长会话变慢和额度异常；这次更新把 Goal 的完成契约与可下载的断点协议接起来，让长任务更容易验收和接管。"
date: "2026-10-10"
displayDate: "10.10"
topics:
  - "可靠性排查"
  - "Codex 降智"
  - "任务验证"
---

# Codex 降智了吗？从体感回归到可验证修复

先说结论：**“降智”是一个需要拆分的现象，不是目前已经被官方确认的单一结论。** 同一句提示词有时变差，可能来自模型或路由变化，也可能来自服务事件、上下文膨胀、权限/网络失败、会话状态损坏，或者任务根本没有可执行的验收标准。

本文于 **2026-10-10** 更新。它汇总官方状态、官方模型与配置说明，以及 GitHub、Reddit 和 X 上的公开反馈；社区案例是线索，不是对所有账号、模型或套餐的统计结论。本文没有在读者账号上执行模型切换、升级、重置或发送反馈。

## 网络上到底出现了哪些证据

### 官方确认过服务层故障

OpenAI 状态页记录了 **2026-09-29** 一次影响 ChatGPT、Codex 和 API 的错误事件，受影响组件包括 Codex Web、Codex API、CLI 和 VS Code 扩展；状态页写明事件已恢复，但 RCA 仍需另行发布。在这种时间段里，失败请求、登录困难和任务不完成都可能被误认为“模型变笨”。

### GitHub 反馈集中在“交付可靠性”

- [openai/codex #42008](https://github.com/openai/codex/issues/42008) 是一条 9 月 1 日提交的公开报告：作者描述同一机器和多项目中出现指令被忽略、代码无法运行、上下文丢失以及提前报告完成。它有具体环境和症状，但没有给出能证明模型路由或量化变化的对照实验。
- [openai/codex #34971](https://github.com/openai/codex/issues/34971) 记录了长会话中反复处理大块缓存上下文、超时、循环和额度消耗异常的个人数据。它说明“上下文管线可能让任务表现变差”是值得排查的假设，不等于所有用户都遇到同一根因。
- Reddit 的[并行任务对照帖](https://www.reddit.com/r/codex/comments/1whcb1h/gpt6_astra_seems_to_spend_most_of_the_time_in_a/)展示了同类任务一次完成、一次反复做小片段后提前结束的个人对照。它适合启发复现实验，不能作为产品级质量统计。

这些证据共同指向一个更准确的描述：很多人感受到的是**指令遵循、持续执行和完成判定的可靠性下降**，不一定是抽象推理能力整体下降。

### 10 月 4 日复核：版本变化与更可复现的公开报告

- 官方更新日志在 **2026-09-29** 增加了 GPT-6.1 Sol，并说明可用性取决于套餐、客户端和 workspace 设置。它提供了一个应该固定记录的变量：同一任务要写下实际模型和 reasoning effort，不能只写“用了 Codex”。
- [openai/codex #49211](https://github.com/openai/codex/issues/49211) 于 **2026-09-29** 提交，作者描述了指令遗漏、上下文丢失、无关改动和需要反复纠正，并给出新会话、多约束任务的复现步骤。它仍是单个账号的自述，没有总体样本或官方根因。
- [openai/codex #46747](https://github.com/openai/codex/issues/46747) 提供了一个更适合复现的“小视觉任务”对照：作者记录了模型、High effort、CLI 版本与会话日志，并报告过度工具活动和上下文回放；同时也明确指出 Astra 的部分运行没有匹配到独立日志。它可以变成自己的基准任务，不能证明所有用户都发生同样回归。

这次新增材料让排查更具体：先固定模型、客户端版本、任务提示词和验收，再把“任务完成得差”与“运行时做了过多无关工作”分别计数。

### 10 月 8 日复核：先保住执行前沿，再谈模型变笨

长任务的“降智感”常常发生在上下文被压缩或任务被打断之后：目标还在，但已完成什么、为什么放弃某条路、下一步该做什么变得模糊。OpenAI 的 [GPT-6 Astra 提示与 Skill 指南](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)（2026-09-11）提醒，过长或过多的 Skill 描述会被截短；渐进式披露和按任务读取文档可以减少无关上下文。官方 [Codex Prompting Guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)（本站 2026-10-08 核对）也说明 `AGENTS.md` 会按目录层级注入，并介绍 compaction 如何携带压缩后的状态。

两条公开 Issue 让这个痛点更具体，但仍不构成官方根因结论：[#34095](https://github.com/openai/codex/issues/34095) 的作者报告多次自动 compaction 后反复回到“完成最后几项、运行验证、提交”的循环；[#36721](https://github.com/openai/codex/issues/36721) 提议保存结构化 checkpoint 和一小段不可丢失的操作尾部，并记录“尝试了 X，因为 Y 失败，除非 Z 改变不要重试”。它们适合设计复现和记录格式，不能证明所有账户都会出现同样行为。

因此这次新增的是**断点协议**，不是“让模型变聪明”的提示词：把目标、范围、已完成证据、失败结论、待办、下一动作和停止条件写进一个短文件。它能让新会话先恢复可检查的工作状态，也让你判断是上下文问题、工具阻塞还是任务本身没有验收标准。

## 先用 10 分钟判断是哪一层

不要立刻换模型、重装 CLI 或给出更高权限。先保存一份最小记录：日期和时区、客户端/CLI 版本、登录方式、模型、reasoning effort、任务目标、上下文大致长度、第一次失败的命令或工具、最终是否有可运行结果。

在 Codex CLI 中，官方建议用 `/status` 查看当前模型、审批策略、可写目录和 token 使用量，用 `/debug-config` 查看实际生效的配置层。也可以用一次性参数覆盖默认值：

```bash
codex --model gpt-6.1-sol
codex --config model_reasoning_effort='"medium"'
```

只有在你的客户端、账号和工作区提供该模型时才使用上面的模型名；否则从 `/model` 列出的可用项中选择。不要把命令能启动写成质量已经恢复。

然后用一个**新会话**做 A/B 对照：同一份小任务、同一组文件、同一验收命令，只改变一个变量（模型、reasoning effort 或是否新会话）。至少重复两次，记录：

- 是否完整读取并遵守 3 条关键约束；
- 是否完成所有阶段，而不是只做第一小片；
- 测试/构建是否真的通过；
- 是否出现重复工具循环、超时或无关改动；
- 从开始到可验收结果的时间，以及可得的 token/额度变化。

一次好回答或坏回答都不足以证明回归。把“模型输出差”与“服务事件”“上下文过长”“工具失败”分开记录。

## 立即可用的恢复方案

### 1. 先切到新会话，缩小上下文

长线程里已经反复失败时，不要继续叠加“再试一次”。新开会话，只带入：目标、当前状态、相关文件、失败命令、验收标准和明确的未完成项。大截图、整段日志和重复的工具输出改成摘要或文件路径，避免把历史噪音一起喂回去。

### 1.5 用一个短 checkpoint 接住 compaction

下载[断点记录模板](/templates/codex-task-checkpoint.md)，放在仓库的 `.codex/task-checkpoint.md`（或项目约定的安全位置）。它不应包含 API Key、Cookie、客户代码或整段私有聊天；只保留继续工作必需的状态：

```text
目标：让读者最终看到什么变化？
范围 / 非目标：这轮允许和禁止改什么？
已完成证据：文件、命令、页面或提交分别证明了什么？
失败与排除：尝试了什么，为什么失败，除非什么变化不要重试？
待完成：按验收项列出仍缺的结果。
下一动作：只写一个能产生新证据的动作。
停止条件：什么情况应停止、开新会话或交给人工？
```

首轮任务可以这样写：

```text
先读取 .codex/task-checkpoint.md、git status --short 和 git diff --stat。
复述当前目标、允许范围、已完成证据和 Pending 的第一项；不要重做 Done。
本轮只处理 Pending 的第一项，完成后把实际命令、退出码和产物写回 checkpoint。
发现新问题先标记 deferred，不扩大范围；验收不通过就保留失败证据。
如果连续两轮没有新增文件、测试或页面证据，停止并报告，不要继续循环。
```

发生 compaction、卡住或跨线程恢复时，按这个顺序操作：

1. 先读 checkpoint，再看 `git status --short`、`git diff --stat` 和最近一次失败命令。
2. 只从 Pending 的第一项继续；已完成项必须能指向证据，不能只引用模型总结。
3. 每个 reviewer 意见分成 `accepted`、`deferred` 或 `dismissed`，并写出对应验收项；没有映射到验收标准的意见不自动阻塞交付。
4. 连续两轮没有新证据，或上下文已经接近阈值，就保存现场、开新会话，只带 checkpoint、diff 摘要和失败命令摘要。

这是本站整理的恢复协议，不是 OpenAI 的自动修复功能；本站没有在独立读者账号上做 compaction 前后对照，也没有量化它能节省多少时间或额度。

### 1.6 长任务：让 Goal 管目标，让 checkpoint 管证据

如果任务的下一步取决于刚刚发现的结果，可以在支持该功能的 Codex 版本中使用 Goal。OpenAI 的 [Using Goals in Codex](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex)（官方发布日期 **2026-05-09**，本站核对日期 **2026-10-10**）把 Goal 定义为线程级、可暂停和可恢复的持久目标：它要有明确结果、验证面、约束、边界、迭代策略和阻塞停止条件。官方示例使用 `/goal`、`/goal pause`、`/goal resume` 和 `/goal clear` 管理生命周期，并注明 Goals 从 Codex **0.128.0** 起可用；实际能否使用仍取决于你的客户端和账号。

这两个东西分工不同：Goal 让 Codex 在当前线程里记住“做到什么才算完成”，checkpoint 文件让人和新会话看见“已经有什么证据、还缺什么”。Goal 不是无限循环开关，checkpoint 也不是模型记忆；每次继续前都要回到文件、命令、测试、页面或基准结果。

可以下载[长任务 Goal 契约模板](/templates/codex-goal-contract.md)，复制到项目约定的位置后再填写。一个可审计的起始指令如下：

```text
/goal 让 checkout 窄屏页面在 375px 下通过验收，
以 scrollWidth 等于 clientWidth、目标测试通过和生产构建成功为证据；
只允许修改 app/checkout、对应样式和测试，不改支付接口。
每轮把实际命令、结果和下一实验写入 .codex/task-checkpoint.md；
如果测试无法运行、连续两轮没有新证据或达到预算，暂停并报告阻塞，不要宣称完成。
```

验收时先用 `/goal` 查看当前目标，再检查 checkpoint、`git diff --stat`、测试/构建结果和页面；短任务、一次性解释和简单改动继续用普通提示词。本站没有在本机 Codex 客户端上确认 `/goal` 可用，也没有据此声称它能改善模型质量或减少额度。

### 2. 明确选择模型和 reasoning effort

官方模型文档说明：可以在桌面端或 CLI 选择模型与 reasoning effort；更高 effort 可能改善复杂任务结果，但会增加时间和 token 使用。复杂的跨文件任务可以从可用的 GPT-6.1 Sol 或 Astra 开始；清晰、重复、范围小的任务可以使用 Luna。不要把“更贵”当作“必然更可靠”，用同一验收任务做对照。

如果仍在使用 `gpt-5.5`，要注意官方文档标明它将在 **2026-10-14** 从 ChatGPT、ChatGPT Work 和 Codex 退休；应提前在可用模型中选择替代项，并同步检查 workspace 默认值、保存的配置、custom agents 和自动化任务。

### 3. 把“完成”改成阶段性验收

给任务写成 3–5 个小阶段，每阶段都要有命令或页面证据：

```text
目标：修复结账页在窄屏下的溢出。
范围：只改 app/checkout 和对应样式，不改支付接口。
步骤：先只读检查 -> 实施布局修复 -> 运行目标测试 -> 启动页面。
每阶段完成条件：贴出实际命令、退出码和关键结果。
最后必须：用 375px 视口复现原问题，确认 scrollWidth 等于 clientWidth。
未执行的检查写入“未验证”，不要写成完成。
```

这样可以把“模型说做完了”变成“读者能复核的交付”。

### 4. 把权限、网络和工具故障单独排除

如果命令被拒、网络超时、MCP 断开或文件不在工作区，模型可能只能生成计划，无法完成任务。记录完整错误和目标域名，先修复对应边界；不要为了验证智力而长期打开完全访问权限。恢复后从失败步骤继续，并重新运行原验收，不要只看新的文字回答。

### 5. 两次重复失败就停止循环

出现同一个错误两次，或模型连续两次声称完成但验收不通过时：保存状态、停止当前循环、新开会话、带最小失败复现。继续在污染上下文里追加指令，往往只会增加 token 和重复改动。

## 一份可长期使用的“降智”基准

在自己的项目里维护 5 个小任务，每个任务都能在 10–20 分钟内完成并自动验收，例如：修一个链接、补一个测试、改一个窄屏布局、解释一条日志、只读审查一个 diff。每周固定同一版本、同一模型/effort 和同一输入，记录：

| 指标 | 记录方式 |
| --- | --- |
| 约束遵循 | 3 条硬约束中完成几条 |
| 交付完整度 | 目标清单完成数 / 总数 |
| 验证通过 | 测试、构建或页面检查的真实结果 |
| 返工次数 | 因错误或假完成重新执行的次数 |
| 时间与用量 | 从开始到验收的时间；仅使用可得的 token/额度数据 |

连续 3 次同方向失败，才把它升级为可报告的回归；同时保留好运行和坏运行的完整对照。不要用主观“聪明/变笨”替代这些指标。

## 什么时候该向官方反馈

当你有了同一任务的好/坏对照、版本与模型、`/status` 输出、时间戳、失败命令和脱敏后的最小复现，再通过客户端反馈入口或官方支持渠道提交。删除 API Key、Cookie、真实业务数据、客户代码和本机绝对路径；不要把 Reddit 或 GitHub 的猜测写成根因。服务事件则先附上状态页事件时间，不要重复提交大量相同报告。

## 来源与边界

- [OpenAI Status：2026-09-29 ChatGPT、Codex 与 API 错误事件](https://status.openai.com/incidents/35y48hbm)：官方服务状态与受影响组件，核对日期 2026-10-03。
- [OpenAI Models：选择模型、reasoning effort 与 5.5 退休安排](https://learn.chatgpt.com/docs/models)：官方模型与配置说明，核对日期 2026-10-03。
- [OpenAI Developer settings：`/status`、`/debug-config` 与 CLI 覆盖参数](https://learn.chatgpt.com/docs/developer-settings)：官方配置排查方法，核对日期 2026-10-03。
- [ChatGPT & Codex 更新日志](https://learn.chatgpt.com/docs/changelog)：GPT-6.1 Sol 的 2026-09-29 条目，本站核对日期 2026-10-04。
- [Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)：长 Skill 描述、渐进式披露、按需读取文档和完成条件，官方发布日期 2026-09-11，本站核对日期 2026-10-08。
- [Codex Prompting Guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)：`AGENTS.md` 层级注入与 compaction 说明，本站核对日期 2026-10-08。
- [Using Goals in Codex](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex)：Goal 的线程级完成契约、生命周期命令与证据标准，官方发布日期 2026-05-09，本站核对日期 2026-10-10；实际可用性取决于客户端和账号。
- [GitHub #34095](https://github.com/openai/codex/issues/34095) 与 [GitHub #36721](https://github.com/openai/codex/issues/36721)：公开用户报告与功能提议，分别于 2026-07-19、2026-08-03 发布；用于设计 checkpoint 字段，不代表官方确认根因或通用效果。
- [X：Nick Dobos 的长会话建议](https://x.com/NickADobos/status/2039800787216547915)：2026-04-02 的个人经验，建议接近上下文限制时让旧会话总结后开启新会话；本站未在作者账号复现，不用于推导因果或量化收益。
- [GitHub #42008](https://github.com/openai/codex/issues/42008)、[GitHub #34971](https://github.com/openai/codex/issues/34971)、[GitHub #49211](https://github.com/openai/codex/issues/49211)、[GitHub #46747](https://github.com/openai/codex/issues/46747)、[Reddit 对照帖](https://www.reddit.com/r/codex/comments/1whcb1h/gpt6_astra_seems_to_spend_most_of_the_time_in_a/)：公开用户报告，仅作为线索和复现实验材料，不代表官方确认的普遍回归。
