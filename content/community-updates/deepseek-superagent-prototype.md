---
title: "DeepSeek Super-agent 源码拆解：一条请求怎样走到交付"
excerpt: "沿一条文档修订请求，拆开接收、授权、工单、执行、PR 和回传。直接运行固定版本的核心引擎，比较合并、未合并关闭与无 PR 三条分支；附可复现脚本及手工派发、定时脚本的选择表。属于源码分析与内存模拟，未运行 Harness 客户端。"
date: "2026-11-08"
displayDate: "11.08"
topics:
  - "Agent 产品动态"
  - "DeepSeek"
  - "团队自动化"
---

# DeepSeek Super-agent 源码拆解：一条请求怎样走到交付

假设你维护一个仓库，队友在 Issue 里说：“把安装文档里的一个拼写错误修掉，开 PR 给我看，先别合并。”你希望 Agent 接住请求、处理修改、跟进审查，最后把结果交回原讨论。这里最难的部分，往往是几次交接：消息是否被接到、这次究竟允许改什么、PR 在等谁、结果是否送到了人面前。

DeepSeek 的 [dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)值得研究的正是这些交接。**本文的判断是：它把一次编码会话扩成了“有授权依据、能跟踪讨论、能区分工作与交付状态”的仓库工作流。** 这也增加了常驻服务、账号、事件读取和失败恢复的维护负担。是否值得用，要看你需要管理多少次交接。

先交代材料：官方定位仍是**研究原型，非正式 DeepSeek 产品、非生产就绪**。本文 11-01 首发概览，**2026-11-02 改为源码分析**，固定首个可见提交 [`6337fc8`](https://github.com/deepseek-ai/dsh-superagent-prototype/commit/6337fc823ce20251c8de8085948165c81aaa701e)（2026-10-31），当日核对 HEAD 未变、无 GitHub Release。包版本 0.1.0 不代表正式产品版。下面的请求是合成例子；本站实际运行了核心引擎的内存模拟，没有运行 Harness 客户端或创建真实 PR。

## 先看整条路径：消息、授权与工作为什么要分开

原型面向一个 GitHub 仓库，可选接入飞书，作为 DeepSeek Harness 的 bundle 运行。沿着上面的修订请求，可以先把官方术语翻译成日常工作：

| 环节 | 这条任务中代表什么 | 分开记录的意义 |
| --- | --- | --- |
| Source / Trigger | GitHub 事件来源 / 一条具体请求 | 能追到事件，也能识别同一事件重放 |
| Thread | Issue 或 PR 中的持续讨论 | 后续审查与补充要求有归属 |
| Eval / Mandate | 是否接单 / 接单时获得的授权范围 | 知道为什么能做，以及能做到哪里 |
| Ticket / Assignment | “修这个拼写”的工单 / 当前一次派工 | 换执行轮次不必另造一份业务任务 |
| Executor Session | 实际做修改的会话与目录 | 工作现场与工单状态分别维护 |
| Channel / receipt | 回到原讨论的写入渠道 / 发送记录 | 区分准备交付、等待发送和已经发出 |

这里有两个刻意的拆分：**消息不自动等于新任务，会话结束也不自动等于工作完成。** 一条讨论可以包含多项独立工作；一项工作也可能经过重试和多轮审查。把它们都塞进“一个聊天窗口”，后续就很难判断该继续谁、是否已经做过。术语和关系见[官方领域模型](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/001-domain.md)。

## 第一站：先接到同一条消息，再决定是否新开工单

源码 [`Intake.receive`](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/src/core/intake.ts#L19)先查 Trigger ID 是否已经存过，再检查来源监听范围，记录线程关系。属于已有订阅工单的消息会送入相应工单；没有执行器负责判断的消息才排入 Eval。

因此要分清两种相似情况：“同一事件又被拉到一次”和“同一个人又发了一条相同文字”。前者有相同事件 ID，可以去重；后者可能是新事件，不能仅靠这条 ID 检查推断系统一定会去重。接单逻辑还会查先前 accept 的记录，避免同一 Trigger 再产生工单，见 [`Evals.decide`](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/src/core/evals.ts#L131)。

**这解释了去重能解决什么，也解释了它解决不了什么。** 它保护的是已进入系统的事件处理，不保证通知一定及时到达，更不保证外部动作绝不重复。事件读取、会话收信、PR 操作和消息发送各有自己的状态，不能由一个“已接收”概括。

## 第二站：接单时固定范围，跟帖只提供上下文

在合成例子里，假设请求人位于该 Source 的允许名单，明确 @ 了 Agent。准入层把它识别为 explicit；主会话再路由为接单、附到已有工单、停止或忽略。若接单，Mandate 保存请求人的来源身份、Policy 版本和工作范围；它不是一句随时被跟帖覆盖的提示词。

这里最容易读错的是 `observe`。它控制推断候选：默认观察模式会记录“如果自动接单，本来会接什么”，而不接下这类候选。**显式请求在 `off`、`observe`、`auto` 中仍可处理**。判断运行方式，要同时看来源准入、消息身份和接单模式，不能只看模式开关。[授权文档](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/002-authorization.md)列出了具体规则；这部分是文档/源码核对，后面的模拟没有测试真实 Policy。

开始修拼写后，队友在同一 Issue 补一句“顺便重新设计安装流程”，又会怎样？订阅把消息送到工单，**送达不授予更大范围**。执行器应处理范围内的补充，把超范围请求交回主会话重新路由。仅为参考而订阅的其他讨论，也不提供新的授权。

这种设计的好处是审查跟帖能继续推动原任务，不必每次重新 @；代价是“继续处理”和“新工作”之间仍需要判断。正在运行的工单遇到相关 Policy 变化，会收到变化通知，并非马上被强制取消；已结束任务恢复前会重新核验授权。不要把修改允许名单等同于立即终止全部在途工作。

## 第三站：工单派给会话，重试保留工作现场

[`Tickets.create`](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/src/core/tickets.ts#L37)保存 Ticket、建立第一次 Assignment、订阅来源线程，然后请求启动执行器。确认回复存在时也在这里排入发送队列。因此，“有工单”和“执行会话已启动”是两个时点。

按[执行文档](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/003-execution.md)，每个 Ticket 有自己的 Executor Session 和目录。首次派工前可运行 prepare 命令，例如创建 Git worktree；没有 prepare 命令时，执行器从空目录开始。**独立目录负责组织工作现场，源码并没有承诺替你自动准备好可工作的仓库。** prepare 失败与已经进入会话后模型报错，也需要分别处理。

可重试工单的 retry 会结束当前 Assignment、建立新 Assignment，继续使用原 Session、目录、分支与 PR；它不是“清空后重做”。这让已有修改有机会保留，也要求恢复时核对现场。主机重启期间被打断的执行会收到恢复说明，先看目录、Git 历史和 GitHub 状态，再决定还缺哪一步，见[恢复代码](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/src/core/assignments.ts#L21)。

对于这个小修订，好的请求应把目标限定为一个拼写，要求提供对应差异和检查结果，交付一个待审 PR。Session 能运行只是执行条件；这份差异是否正确，还得靠实际仓库检查和审查者确认。

## 第四站：ready、工单结束、PR 合并是三个不同结论

Worker 报告 `ready` 时，核心逻辑会看 Ticket 是否跟踪 PR：没有跟踪项，可以以 `completed` 结束；有跟踪项，则需要相应关闭条件成立。对于只开了一个、仍然打开的 PR，工单进入等待审查，不能因为模型说“改好了”就标为已合并。实现见 [`Assignments.report`](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/src/core/assignments.ts#L128)。

[`followsDone`](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/src/core/tickets.ts#L95)也不是简单的“看到一个 PR 关闭”：有本工单自己开的 PR，就要等这组都不再打开；没有自己开的，才检查所跟踪的整组。最后一个相关关闭的结果可以是 `merged`，也可以是未合并的 `closed`；尚未处理完的跟进工作还会推迟结束。

这会直接改变负责人看面板的方式：**对于本文有打开 PR 的任务，ready 表示交给人审；ended 只说明流程走到了结束，outcome 才说明如何结束。** `closed` 不应进入“成功合并”统计；`completed` 也不能自动解释成生产已更新。

合并本身还有另一层边界：默认交付要求通过提示词约束执行器，宿主没有专门的合并决策逻辑；缺少指定的合并账号 CLI 时由人合并。要强制审批和过期审批失效，仍应使用 GitHub 分支保护。[执行文档的 Merging 部分](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/003-execution.md#merging)不能被简写成“宿主已强制保证不会误合并”。

## 第五站：结果放进发件箱，还没有到读者手里

工单到达可交付状态后，结果回复经过 Channel。核心 [`Replies`](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/src/core/replies.ts#L70)检查是否允许发结果、选择原始对话并排队；应用层 [`Outbox`](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/src/app/outbox.ts#L29)保存发送记录，再交给真实 Source 发送。记录区分 `pending`、`sent` 和因渠道不可达等原因结束的 `dropped`。

为什么要多这一步？如果网络断了，工单与结果不该一起消失。存储后的动作可以重试；同一工单、同一会话的回复还有顺序约束。

**“已有结果”和“人已收到结果”仍然分开。** 实际值守时，PR 已准备好而回复仍 pending，应查发送渠道；不必让 Worker 再修一次拼写。

## 一个能运行的小实验：直接调用公开核心引擎

为了核对上面的状态区别，本站在 **Node 24.22.1** 下运行了固定提交中的 `Engine`、`MemoryRepositories` 和 `ticketStage`，没有重写一套状态机。<a href="/templates/deepseek-ticket-core-demo.mjs" download="deepseek-ticket-core-demo.mjs">下载完整模拟脚本</a>。它检查提交和核心文件未修改，再导入该版本的核心代码。

脚本的 Policy、Source、Executor 和 Outbox 是内存替身：请求由脚本构造，接单判断和 ready 报告由脚本提供，PR 关闭也是注入的事件。**它验证核心函数在这些输入下的行为，不验证模型能修好代码、真实鉴权、Harness 会话、GitHub 轮询、持久化恢复或消息送达。** `resultReceipt=pending` 正是替身只排队、不发送的结果，不是对真实发件箱故障的复现。

在一个用于阅读源码的目录中，先保存下载脚本，再执行：

```bash
git clone https://github.com/deepseek-ai/dsh-superagent-prototype.git
git -C dsh-superagent-prototype fetch origin 6337fc823ce20251c8de8085948165c81aaa701e
git -C dsh-superagent-prototype checkout --detach 6337fc823ce20251c8de8085948165c81aaa701e
node --experimental-transform-types deepseek-ticket-core-demo.mjs ./dsh-superagent-prototype
```

**11-08 复现入口修订：先获取固定提交，再切换。** 本站在全新克隆中发现，当时默认 `main` 指向 [`8c32a9d`](https://github.com/deepseek-ai/dsh-superagent-prototype/commit/8c32a9dc5d72c033816c6a8110b37f40cf94fba4)，直接执行原文的 `checkout 6337fc8…` 会以退出 128 报 `unable to read tree`。显式 `fetch origin <完整 SHA>` 后，切换与上面的完整脚本均成功，三个分支仍得到下表结果。克隆默认分支不等于已取得所有历史提交对象，不能只凭网页能打开旧提交就省略获取步骤。

两个提交的 Git tree 均为 `3efbb036e5a56183c6bf642e2e1856a1f64e7be3`，本次核对的文件树相同；本文继续固定原来已测的完整提交，没有取消脚本的版本检查，也没有把当前分支名当实验版本。这里不推断提交身份变化的原因或时间。若获取固定提交失败，先保留错误和版本待核，不直接换成 `main` 来绕过保护。

这是 Node 24 的源码实验入口，不是原型安装步骤；使用实验性类型转换是因为原始 TypeScript 含参数属性。无需安装 DSH 或配置 API Key。请先阅读下载脚本和将要导入的公开核心代码；实验不运行原仓库的 SETUP，也不连接外部账号。

本次实际输出中的三个分支如下，三者都重复接收并重复 accept 同一个 Trigger，工单均保持 **1 个**：

| 输入分支 | ready 后的真实核心状态 | 注入后续事件后的 outcome | 被反例否定的简化判断 |
| --- | --- | --- | --- |
| 绑定一个打开的 PR，然后注入 merged | `person / review` | `merged` | ready 就已经完成合并 |
| 绑定一个打开的 PR，然后注入未合并关闭 | `person / review` | `closed` | 工单结束就等于合并成功 |
| 没有跟踪 PR，直接报告 ready | `ended` | `completed` | 所有 ready 都必须等 PR 关闭 |

三条分支的结果回复都停在模拟 Outbox 的 `pending`，没有一个 `sent`。这组对照的用途，是把“去重、准备就绪、结束原因、发送状态”拆成能单独断言的事实，避免将它们揉成一个绿色成功标记。它不是吞吐量、可靠性或成本测试。

## 同一项修订，用哪种方式更合适

下面是基于任务结构的选择建议，没有进行三个方案的耗时或效果排名。

| 比较维度 | 人在编码会话里派发 | 固定任务的定时脚本 | Super-agent 原型 |
| --- | --- | --- | --- |
| 何时开始 | 人打开会话、给上下文 | 到时间运行预定义程序 | 从监听来源进入请求判断 |
| 处理目标 | 人现场说明并决定下一步 | 输入、规则和输出较固定 | 工单记录范围，多轮讨论继续推进 |
| 审查跟进 | 人把意见带回会话 | 需另写审查事件与状态逻辑 | 通过线程订阅接收后续上下文 |
| 交付追踪 | 人确认 PR 和回复 | 脚本自行保存状态及回执 | 工单、PR 结束原因和发送记录分开 |
| 维护负担 | 人承担派发与交接 | 维护脚本、凭据、调度与异常 | 还要维护 Harness、来源读取、账号、会话与恢复 |

如果只是自己偶尔改一处文档，人工派发通常更容易看清全过程。如果任务每天完全一样，例如从固定数据生成同一格式报表，先考虑可测试的脚本。**当多人在不同时间提出工作、任务要跨审查轮次持续推进，且你愿意维护常驻系统时，才更值得评估这类工单式 Agent。** 这里的比较是取舍分析，不是说研究原型已经在你的团队可靠运行。

部署时还要另算一项成本：执行器的独立目录和账号包装器只组织现场、选择默认凭据；Router / Worker preset 以操作系统用户身份使用 `danger-full-access`。官方建议用只含 Agent 凭据的独立 OS 账号做隔离。见[部署文档](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/docs/006-deployment.md#permissions-and-isolation)。不要把工单授权或独立 worktree 当成进程沙箱。

## 两份外部试用记录，提醒我们检查不同阶段

11-02 重新阅读了两位独立作者的记录：[mikel38487 的 #11700](https://github.com/deepseek-ai/deepseek-harness/discussions/11700)（10-31）报告 WSL2、Node 24 与 DSH 0.2.1-rc.5 下的服务识别和延迟 mention 问题；[maxonxie 的 #11714](https://github.com/deepseek-ai/deepseek-harness/discussions/11714)（11-01）报告 macOS 的安装、版本和插件恢复经历，并说明由 Agent 代笔、区分已复现与推测。

前一份提示“进程活着、请求被读到”要分别检查，后一份提示“bundle 装入、宿主仍能恢复”也要分别检查。它们解释了为何本题值得研究；**作者的修订与结论不是本站复现，也不是上游已修复的证明**。本文不采用第三方 fork 补丁，更不从两份记录推算普遍故障率或阅读量。

## 把分析落成一条可用的试用请求

对本文的文档修订，可以从下面这条请求开始设计测试。它是待执行样例，所有名称均为占位，没有真实 Issue、PR 或成功回执：

```text
在测试仓库 sample-org/docs-demo 中，只把安装指南的 “instal” 改成 “install”。
先确认当前文件仍包含该拼写；若没有，说明实际情况，不制造改动。
保留已有工作，不改安装逻辑、依赖和其他文案，不合并、不部署。
提交一个供人审查的 PR，附准确差异和实际执行的检查结果。
在原 Issue 回传 PR 链接；遇到权限或发送失败，说明卡在哪一段。
```

实际试用时，把任务记录成一条链：`请求链接 → Trigger ID → Ticket/授权范围 → Assignment/Session → PR/head commit → 检查记录 → outcome → 原讨论回执`。每个字段对应本文拆开的一个交接；某段没有证据，就保留在那个阶段，不用“完成”覆盖它。对于这个例子，负责人最终要确认的是：只改了那一个词、检查属于该提交、PR 等人审，以及原 Issue 真的收到链接。

### 版本与证据范围

本次官方 README、领域/授权/执行/部署文档、对应核心与回传源码、package.json，以及两份需求原帖均于 **2026-11-02** 核对。源码与 MIT 许可归原项目；包声明 Node `^22.19.0 || >=24.0.0`、DSH `^0.2.1-alpha.2`，完整部署前提见官方指南。本站完成的是源码追踪和三个核心模拟分支；尚未完成原型安装、真实会话、GitHub/飞书接入、崩溃恢复与隔离测试，也没有测量模型质量、成本或团队收益。
