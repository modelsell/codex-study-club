---
title: "Pydantic AI 审批恢复实验：同意一次，为什么登记两次？"
description: "用固定 SDK、合成模型和真实 SQLite，复现业务已提交但会话未保存时的重复执行。比较普通写入与同库事务，检查拒绝、回滚、双进程重放和请求键冲突，附八组可运行对照。"
level: "进阶"
surface: "Pydantic AI Python SDK · 本地审批恢复"
checkedAt: "2026-11-18"
---

# Pydantic AI 审批恢复实验：同意一次，为什么登记两次？

Agent 要登记一份报表，先暂停等批准。批准之后，数据库已经写入，进程却在保存新会话之前退出。重启时，应用只找得到旧的待审会话和那份批准，于是再次续跑。

在本文固定的 **pydantic-ai-slim 2.68.0** 中，普通写入实际登记了 **两条**。把报表记录和执行回执放进同一个 SQLite 事务后，相同恢复过程仍进入工具函数 **两次**，但只留下 **一条报表和同一份回执**。

这篇给开发需要暂停、人工审阅和重启恢复的资料、报表或支持工作流的人。你可以拿走八组跨进程对照，判断自己的应用把“同意了”“执行了”和“结果已保存”混在哪一步。SDK、子进程、数据库与工具函数真实执行；模型响应和批准/拒绝由脚本合成，没有真人审批、真实模型、外部业务服务或生产审批接口。本文不把这一观察定性为 SDK 缺陷，也不宣称通用的外部操作只执行一次。

## 版本范围：八组实验固定于 2.68.0

**版本核对日期：2026-11-18。** 本文八组对照均固定在 `pydantic-ai-slim 2.68.0`，没有升级验证。官方 [`v2.69.0` 发布记录](https://github.com/pydantic/pydantic-ai/releases/tag/v2.69.0)（页面标注 2026-11-16）列出合并 [`#13285`](https://github.com/pydantic/pydantic-ai/pull/13285)：将 `RequestInput` 的能力合并进 `HandleDeferredToolCalls`；handler 可采用带 resume token 的形式。PR 说明原 `RequestInput` 已弃用，且带 token 的 handler 会经 `wait_for_external_event` 等待外部答复。

这项 API 变化不改变本文实验的版本或观察结果；本文**没有**在 2.69.0 下运行八组流程、带 token 的 handler 或 durable engine，因此不能据此判断新入口的恢复与业务回执行为。若要迁移，应在目标版本重新验证“外部答复已到达、业务写入已提交、执行记录已持久化”之间的崩溃窗口；2.68.0 的对照不是新 handler 的兼容性证明。

## 一次报表登记，实际上有三份状态

报表只是固定标题 `Synthetic weekly report` 的本地数据库记录，不读取业务数据。合成模型只提出 `register_report(title=...)`；应用事先分配业务请求键 `request-A`，通过 SDK 的 `deps` 交给工具，键不由模型生成。

任务完整经过这些步骤：

```text
FunctionModel 提出工具调用
    → requires_approval=True：返回 DeferredToolRequests，业务表仍为空
    → 应用保存待审 message_history
    → 新进程提交 DeferredToolResults(approvals={"report-call": True})
    → SDK 真正调用 register_report，提交 SQLite 记录
    → SDK 生成工具结果和后续响应
    → 应用保存新的 message_history
```

其中，待审历史说明“模型请求过什么”；批准说明“这次调用可以继续”；业务回执说明“目标记录已经提交”。它们处在不同位置，不能互相替代。

实验的崩溃点就在数据库提交之后、新历史写入之前。`os._exit(73)` 只结束隔离的工具子进程；父进程继续读回数据库，确认已有一条记录，同时确认没有完成历史文件。随后启动另一个进程，读取**字节未变的旧待审历史**和同一批准，再次恢复。不是把 Python 变量清空来模拟重启。

## SDK 为什么会再次进入工具

普通续跑的调用形状是：

```python
result = agent.run_sync(
    message_history=stored_messages,
    deps=trusted_request_context,
    deferred_tool_results=DeferredToolResults(
        approvals={"report-call": True}
    ),
)
```

固定源码的 [`_handle_deferred_tool_results`](https://github.com/pydantic/pydantic-ai/blob/d8bcca9ce06da5cdb998c8e15275cb1ae0865280/pydantic_ai_slim/pydantic_ai/_agent_graph.py#L1224-L1277) 从传入历史寻找最后的模型请求与已有工具结果，再进入工具调用节点。已有结果可以阻止相同结果被覆盖，但本例保存的是**批准前**历史，里面没有第一次执行的回执。

接着，[工具执行分支](https://github.com/pydantic/pydantic-ai/blob/d8bcca9ce06da5cdb998c8e15275cb1ae0865280/pydantic_ai_slim/pydantic_ai/_tool_execution.py#L821-L851) 遇到 `ToolApproved` 会调用实际工具。SDK 可以知道“这份历史中的调用获准了”，却不能由此知道另一个数据库是否已经提交。两份固定源码与本次安装的 wheel 文件逐字节一致；这解释的是本次 **手动 message_history + deferred_tool_results** 路径，不覆盖 Temporal、DBOS、UI adapter 或其他 durable engine。

因此，只保存批准布尔值并不能填补这个空隙。反过来，仅凭模型最后说“完成”也不够：实验固定回复就是 `Synthetic continuation; inspect the receipt.`，判断依据始终是实际记录、回执和历史文件。

## 一个可复现的局部改法：把记录和回执一起提交

普通组每进入一次工具就插入报表。事务组在同一数据库内增加 `receipts` 表，以应用业务请求键作唯一键，保存有效参数的摘要和原始结果。

```text
BEGIN IMMEDIATE
    查业务请求键
    ├─ 已有回执 + 参数摘要相同 → 返回原回执，不再插入
    ├─ 已有回执 + 参数摘要不同 → 拒绝，保留原记录
    └─ 没有回执 → 插入报表 + 插入回执
COMMIT
```

`BEGIN IMMEDIATE` 让两个已到达执行入口的进程先争取写事务，再读取和修改状态。唯一约束只是其中一环；本例把**检查、报表插入、回执插入**放在同一事务，避免“先查没有，两个进程各写一次”，也避免报表和去重标记分别提交。

回执包含 `row_id`、`business_key` 和 `title`。重放返回第一次的真实回执，调用方能沿 `row_id` 回读记录；返回一句“重复了”会留下“到底是哪条成功”的疑问。

业务键的含义也要固定。本例一个键只对应一次 `register_report` 操作，摘要覆盖工具名、示例 schema 版本和标题。两个独立业务请求即使标题一样，也使用 `request-A`、`request-B` 两个键，允许各登记一次。不能直接用“参数一样”判断它们是重复请求，也不能把裸 `tool_call_id` 当整个应用的全局业务键。

脚本刻意让两个独立请求复用同一个合成调用 ID；这不说明真实模型供应商会重复分配 ID。

这仍不是审批授权机制：实验由本地可信脚本选择 `deps`、批准结果和历史。真实服务还需把它们绑定到服务端保存的请求、实际用户、目标、有效参数、政策和过期条件，不能信任客户端随意提交的批准或业务键。本例没有实现或验收这些服务能力。

## 八组结果分别证明什么

实测环境为 **macOS arm64、Python 3.12.14、pydantic-ai-slim 2.68.0、SQLite**。每组使用新建临时数据库；模型为 `FunctionModel`，真实模型请求关闭，同时拦截网络连接并记录尝试。并发组的两个工具子进程都到达屏障之后才争取事务。

| 对照 | 工具进入次数 | 最终报表条数 | 关键读回 |
| --- | ---: | ---: | --- |
| 暂停后拒绝 | 0 | 0 | 待审和拒绝均未写业务记录 |
| 正常批准 | 1 | 1 | 工具结果等于保存的回执 |
| 普通写入，提交后退出再恢复 | 2 | **2** | 旧待审历史未变，没有完成历史仍已有业务记录 |
| 事务写入，同一崩溃点再恢复 | 2 | **1** | 返回第一次的同一回执 |
| 事务写入，提交前退出再恢复 | 2 | 1 | 退出后报表/回执均为 0；恢复后一起提交 |
| 两进程重放相同批准 | 2 | 1 | 两者返回相同回执，两个进程都到达屏障 |
| 同业务键，第二次批准的标题改变 | 2 | 1 | `IntentConflict`，原标题保持 |
| 不同业务键，相同标题和合成调用 ID | 2 | 2 | 两个独立请求各有自己的记录与回执 |

八组均完成，网络连接尝试 **0**。第三组留下两条记录是实验需要保留的失败对照；脚本退出 0 表示这些预期全部满足，不代表每一组都避免了重复。

第四组也没有让工具“只执行一次”。重放仍会经过工具入口；不在事务里的日志、邮件或另一条外部写入，可能再次发生。这里只证明本地表中的业务变更在该事务约束下没有重复提交。

## 为什么这不能直接拿去包住发邮件或外部 API

本地报表与回执能放在一个 SQLite 事务中，外部服务往往不能：

```text
外部服务已经接受动作
    → 本进程退出
    → 本地还没保存外部回执
```

此时，单独查本地“没有回执”不能推出外部“没执行”。再发送可能重复，把状态直接标为完成又可能漏做。应先保留“结果未知”，通过外部可信回读或服务真正支持的幂等契约核对；这部分没有在本实验执行。

可以按任务条件选择：

| 条件 | 合适的下一步 | 代价与边界 |
| --- | --- | --- |
| 只读、重复读取可接受 | 保存历史，按需重读 | 仍要区分费用、时效与读取结果 |
| 业务数据和回执可在同一数据库提交 | 参考本文事务、业务键和参数冲突对照 | 工具入口可重复；须验证自己的 schema、故障点及保留期 |
| 外部服务明确支持幂等键与结果查询 | 固定业务键，按该服务契约发送和核对 | 范围、参数冲突、有效期由服务决定；本站未测该服务 |
| 外部写入结果未知且没有可信去重/查询 | 暂停自动重放，交给核对流程 | 需要处理未知状态，不能用批准记录代替执行证据 |

不要把正常“拒绝一次调用”扩为永远禁止所有修改，也不要让修改后的调用自动继承旧批准；审批记录与执行去重解决的是不同问题。

## 运行自己的八组对照

下载[实验脚本](/templates/pydantic-approval-replay-lab.py)和[固定依赖](/templates/pydantic-approval-replay-requirements.txt)，放在同一新目录：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r pydantic-approval-replay-requirements.txt
python pydantic-approval-replay-lab.py > approval-replay-results.json
```

安装固定依赖需要访问包仓库；网络尝试为 0 指实验运行阶段。实际验证的是 Python 3.12.14 / macOS；包声明 Python 3.11+ 不等于本文已测所有系统或 Python 版本。脚本检查 SDK 版本，使用自己创建的临时目录和数据库，结束后清理临时状态；不会读取现有业务数据库。子进程故意退出 73 / 74 是受控崩溃点，父进程会检查它们，其他异常使实验失败。

先检查输出中的 `cases: 8`、`network_attempts: 0`，再逐组核对 `effects`、`receipts`、`invocations` 和 `rows`。不要只看最终响应或退出码。把它迁移到自己的工具时，先写清业务键在哪里产生、重启后从哪里取回、什么参数变化必须重新核对，以及哪个系统能证明业务已经提交。

## 来源与本次核对范围

资料与原帖于 **2026-11-17** 交叉阅读。固定版本 [v2.68.0](https://github.com/pydantic/pydantic-ai/releases/tag/v2.68.0) 对应提交 `d8bcca9ce06da5cdb998c8e15275cb1ae0865280`；GitHub API 原发为 **11-12 01:56:19 UTC**，[PyPI wheel](https://pypi.org/project/pydantic-ai-slim/2.68.0/) 上传为 **11-12 02:30:07 UTC**。本实验按固定版本执行，不用 Release 标题中的日期替代实际发布元数据。

- [当前 Deferred Tools 文档](https://ai.pydantic.dev/deferred-tools/)与[固定版本文档](https://github.com/pydantic/pydantic-ai/blob/d8bcca9ce06da5cdb998c8e15275cb1ae0865280/docs/deferred-tools.md)：核对暂停、批准和历史续接入口，不把当前文档所有功能都算作本次测试。
- [#10926](https://github.com/pydantic/pydantic-ai/issues/10926)：salahmakboul 于 **10-21** 提出崩溃后重复副作用的问题，后来报告 2.68.0 回测；作者披露维护相关库，回复和机器人复现不另计独立需求。本站只把它作为需求线索，另行运行本地报表实验，不采用其付款或其他框架结论。
- [#11847](https://github.com/pydantic/pydantic-ai/issues/11847)：jabrailkhalil 于 **10-29** 提出持久审批收件箱，并发布独立原型。它与上一帖共同支持重启审批的工作流需求，不是同一故障或官方承诺；本站未执行其原型，不采用其测试数量作为本站验证。
- [Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)，Malcolm Featonby（原页未列明首次发布日期，本次未确认）：借鉴“明确业务意图、同键不同参数、重试返回原结果”的分析方法。该历史文章不作为当前 SDK 事实或本站执行证据。

如果你要核对恢复后工具用了哪份运行参数，可继续读 [Agent Framework 报表恢复实验](/cases/agentframework-checkpoint-arguments-lab)；如果关心任务有没有漏掉，读[邮件处理只读对账](/cases/email-agent-coverage-audit)。它们分别检查参数、覆盖和执行去重，不能用其中一份报告代替其余两种验收。
