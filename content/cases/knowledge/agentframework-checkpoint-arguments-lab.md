---
title: "Agent Framework 恢复实验：报表为什么还用旧模板？"
description: "在固定 Python SDK 中走完暂停、跨进程恢复、真实本地工具调用与文件回读。比较普通续接和 checkpoint 覆盖参数，保留旧模板产物、拒绝与写入失败对照，附可运行脚本和固定依赖。"
level: "进阶"
surface: "Microsoft Agent Framework Python SDK · 本地工作流"
checkedAt: "2026-11-13"
---

# Agent Framework 恢复实验：报表为什么还用旧模板？

一份周报停在审阅步骤。保存现场、退出进程，之后恢复时明确传入新模板 `v2`。工具执行了，文件也生成了，但打开却仍是 `v1`。

在本文固定的 **agent-framework-core 1.26.0** 实验中，这个反例实际出现了：新消息和同实例响应续接使用 `v2`；从 checkpoint 重建后，即使再次传入 `v2`，本地工具仍收到 `v1`。两份文件都为 **83 字节**，只检查存在、大小或流程返回都无法分辨。

这篇 SDK 实验给需要恢复资料整理、报表或待审工作流的开发者：沿一条完整任务，核对**调用方请求 → 恢复状态 → 工具实际参数 → 文件内容**。工作流引擎、SDK 函数调用和文件读写实际运行；聊天响应由脚本合成，没有真实模型、provider 请求、外部业务操作或真人审批。它不证明模型效果，也没有修复 SDK。

## 先把周报任务说完整

任务只有一个产物：用指定模板版本生成本地 `report.md`，内容只含固定示例计数 `items=3`，没有读取或汇总业务数据。`v1`、`v2` 只是实验中的版本标识，没有业务或模型质量差异。

工作流先经过自建的审阅节点。它产生一个 `review-1` 待答请求，收到合成的布尔 `True` 后，才把消息交给 SDK 的 `AgentExecutor` 和 `Agent`。聊天替身随后请求一次 `render_report`，SDK 的函数调用层真正执行 Python 工具；工具写入文件，父进程再读文件内容和哈希。

```text
消息 → 自建审阅节点 → 保存 checkpoint / 等待响应
                           ↓ 换一个进程、重建同一工作流
恢复 checkpoint + True + template_revision=v2
                           ↓
AgentExecutor → Agent → 合成工具请求 → SDK 函数调用层
                           ↓
render_report 实际读取 ctx.kwargs → 写 report.md → 独立回读
```

这个审阅节点是实验应用自己的分支，工具设为 `approval_mode="never_require"`。合成 `True` 不等于真人批准，也没有验证 SDK 原生工具审批、FIDES、AG-UI 或托管服务的授权行为。

模板版本通过运行时上下文传递，而非由模型选择：

```python
@tool(approval_mode="never_require")
def render_report(report_id: str, ctx: FunctionInvocationContext) -> str:
    revision = ctx.kwargs.get("template_revision")
    # 记录实际收到的版本，再生成本地 report.md
```

合成工具请求只给 `report_id="weekly-synthetic"`。`template_revision` 来自 `function_invocation_kwargs`，经 SDK 注入 `ctx.kwargs`。因此本实验检查的是恢复后运行时参数去了哪里，不是模型是否听从“请用新模板”的自然语言指令。

## 同样传 v2，三条路径为什么不同

下载脚本实际比较了这些路径：

| 路径 | 本次希望使用的版本 | 工具实际读取 | 文件结果 |
| --- | --- | --- | --- |
| 新消息启动 | v2 | v2 | v2 报表 |
| 同一实例，先暂停，再仅提交响应与新参数 | v2 | v2 | v2 报表 |
| 新实例，从文件 checkpoint 恢复并提交响应、新参数 | v2 | **v1** | **v1 报表** |
| 从相同 v1 初始状态的 checkpoint 恢复，不提供覆盖 | 沿用 v1 | v1 | v1 报表，符合此组预期 |

第三组的关键调用形状是：

```python
await workflow.run(
    checkpoint_id=saved_checkpoint_id,
    responses={"review-1": True},
    function_invocation_kwargs={"template_revision": "v2"},
)
```

仅看这一行，调用方确实要求覆盖为 `v2`。实际读回的 `restore_v2/tool-receipt.json` 却记录：

```json
[{"report_id": "weekly-synthetic", "template_revision": "v1"}]
```

相应 `report.md` 的内容为：

```text
# Synthetic weekly report

report_id=weekly-synthetic
template_revision=v1
items=3
```

新消息基线的文件只把版本改为 `v2`。两者 UTF-8 字节数相同，SHA-256 不同：

| 文件实际版本 | 字节 | SHA-256 |
| --- | --- | --- |
| v1 | 83 | `ac60e47a00d4c98393494f46ffc0d01a78760eaf292afec27aa6278350ba23d6` |
| v2 | 83 | `28904a8fc995c8ce0678fd88b316ec0a1feb728f8cb01a7de98569e3fe6c0dc4` |

聊天替身在工具正常返回后统一输出 `SCRIPTED_TOOL_COMPLETE`，所以第三组也会出现这个字符串。它是刻意固定的传输夹具，不是模型幻觉样本；是否符合任务，仍以工具收参和文件回读为准。

## 覆盖发生在恢复之前

实验安装包的相关实现逐字节匹配固定提交 [`4f2d146bda4a2068438406f394c65fda7effcff7`](https://github.com/microsoft/agent-framework/tree/4f2d146bda4a2068438406f394c65fda7effcff7)。沿这条路径看，次序比“恢复成功”更重要：

1. [`_workflow.py`](https://github.com/microsoft/agent-framework/blob/4f2d146bda4a2068438406f394c65fda7effcff7/python/packages/core/agent_framework/_workflows/_workflow.py#L594)先将调用方 kwargs 写入并提交到运行状态，然后执行初始恢复。
2. [`_runner.py`](https://github.com/microsoft/agent-framework/blob/4f2d146bda4a2068438406f394c65fda7effcff7/python/packages/core/agent_framework/_workflows/_runner.py#L331)恢复时清空当前状态，导入 checkpoint 中保存的状态。旧的 kwargs 随之回来。
3. [`_agent_executor.py`](https://github.com/microsoft/agent-framework/blob/4f2d146bda4a2068438406f394c65fda7effcff7/python/packages/core/agent_framework/_workflows/_agent_executor.py#L829)从恢复后的状态准备 Agent 运行参数，再交给函数调用层和工具上下文。

于是这条恢复路径变成：**先写 v2 → 导入包含 v1 的旧现场 → 工具读取 v1**。固定源码的注释约定，续接默认保留原 kwargs，但显式提供新 kwargs 应可覆盖；这组行为与该约定不符。普通响应续接没有这次 checkpoint 导入，所以基线能见到 `v2`。

换一个工作流实例并没有消除差异：恢复本来就要求重建兼容的图，并重新导入旧状态。checkpoint 保存的是执行现场，不是自动校对“这次恢复的业务要求与原来是否一致”的服务。

## 下载后，自己读回八组结果

实验适用环境为本次实际执行的 **macOS 27.2 / arm64 / Python 3.12.14**。没有执行 Windows、Linux、真实模型或云端流程；不要把本地结果外推为这些入口已验证。

下载两份文件到新目录：

- <a href="/templates/agentframework-resume-artifact-lab.py" download="agentframework-resume-artifact-lab.py">完整实验脚本 agentframework-resume-artifact-lab.py</a>
- <a href="/templates/agentframework-resume-requirements.txt" download="agentframework-resume-requirements.txt">固定依赖 agentframework-resume-requirements.txt</a>

用独立环境安装。安装阶段需要从 PyPI 获取依赖；实验阶段拦截 Python socket 联网，不需要 API Key：

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r agentframework-resume-requirements.txt

python agentframework-resume-artifact-lab.py \
  --output ./checkpoint-lab-output > result.json
```

脚本只接受固定的 Core 1.26.0，不自动升级或改动 SDK。每轮在输出目录下创建唯一的 `artifact-run-*` 子目录；报表使用新建模式，不覆盖已有文件。

`result.json` 的 `artifact_directory` 指向本轮相对目录。例如进入 `restore_v2/`，可分别打开 `tool-receipt.json` 与 `report.md`，核对参数和成果。`checkpoints/` 是实验自己生成的现场；`worker-stderr.log` 是本地调试记录。不要仅凭控制台的完成字符串判断模板版本。

| 组名 | 实际验收 |
| --- | --- |
| `fresh_v2` | 真正调用工具一次，生成 v2 文件 |
| `same_instance_v2` | 暂停前零调用，普通响应续接后调用一次、生成 v2 |
| `restore_v2` | 分别启动 seed/resume 进程，捕获请求 v2 却生成 v1 的反例 |
| `restore_omit` | 不传覆盖时，保留 v1 的对照 |
| `reject_restore` | 合成 False 走拒绝分支；聊天替身、工具和报表写入均为零 |
| `tool_error` | 函数实际进入后，在写报表前抛错；返回工具错误，没有 report.md |
| `guard_restore` | 函数收到旧 v1，在写文件前发现与外部固定预期 v2 不符并拒绝 |
| `guard_fresh` | 相同检查遇到 v2 时正常写入，排除“全部拒绝”的假保护 |

**八组预期观察被捕获，不等于八次业务成功。** `restore_v2` 在结果中明确标出 `caller_override_honored=false`；失败函数和拒绝分支也没有报表。断言失败时应先检查固定环境和实际记录，不要为让脚本变绿而改掉预期。

父进程及所有 seed/run 子进程在导入 SDK 前拦截 socket，执行中尝试数均为 0；聊天往返是本地脚本返回的合成消息。这个拦截是实验范围控制，不是运行任意不可信代码的沙箱。

## 在写报表前核对任务契约

`guard_restore` 没有更改 SDK 内部状态。它给工具一个独立于旧 checkpoint 的本地预期 `v2`，在真正写报表前比较实际运行参数：

```python
if revision != "v2":
    raise ValueError("SYNTHETIC_REVISION_MISMATCH")
```

它证明这组输入下可以**拒绝错误版本的报表写入**，没有证明参数覆盖已经恢复，也没有自动完成报表。函数已经被调用，只是尚未写文件；这一点与 `reject_restore` 在 Agent 运行前直接停止不同。

真实系统的预期版本应来自当前可信任务契约，而不是把同一个 checkpoint 里的旧值复制两遍再比较。若任务在等待期间改变了目标文件、模板、数据范围或收件人，应先决定原批准是否仍适用。本文的一个字符串检查没有实现身份认证、审批绑定、并发幂等、崩溃后重试或完整业务事务。

| 选择 | 保留什么、付出什么 |
| --- | --- |
| 同实例继续等待并交响应 | 本实验新参数生效；实例和进程的存活仍是前提，不能代替重启恢复 |
| 从 checkpoint 重建恢复 | 保留原执行现场；本版本这条路径会取回旧参数，必须另外核对实际动作 |
| 重新发起一个新任务 | 本实验新消息基线使用 v2；在真实业务中可能重复先前动作，不应当作通用恢复补丁 |
| 动作前核对独立任务契约 | 本实验可在错误写入前停止；需要应用管理契约、待审状态与失败后的处理，SDK 没有因此被修复 |

如果只是确定性报表转换，普通函数加任务记录也可能更合适，不必为复现这个实验先增加模型或 Agent。已有工作流需要恢复时，先确认继续的是哪条任务、哪份参数和哪一个产物，再决定是否允许下一步动作。

## 来源、版本与边界

资料及实际运行核对日为 **2026-11-13**。需求来自两位独立作者，支持“恢复后实际执行参数需要可核对”这一任务，不能证明故障普遍或本文已有读者收益：

- [BlueX888 的 #9850](https://github.com/microsoft/agent-framework/issues/9850)，原 **10-29 18:37:28 UTC**：在 Core 1.23.0 报告 checkpoint 新 kwargs 被旧值覆盖。11-13 重读原文及全部回复；维护者计划、机器人源码说明与作者运行分别记录。[PR #9853](https://github.com/microsoft/agent-framework/pull/9853)本次仍未合并，不能当作已发布修复。
- [krivonosoff161 的 #9667](https://github.com/microsoft/agent-framework/discussions/9667)，原 **10-24 10:26:52 UTC**：询问恢复、隐藏运行时参数与外部批准之间，谁负责绑定最终执行动作；后续给出外部集成与回读材料。这里用它支持参数/动作一致性的需求，没有执行作者的适配器，也不把其测试数量或安全结论当本站结果。它不是 #9850 同一缺陷的第二次复现。

官方 [Checkpoints](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints)用于核对保存/恢复边界，[Function Tools](https://learn.microsoft.com/en-us/agent-framework/agents/tools/function-tools)说明 `FunctionInvocationContext` 的运行时上下文；文档首次发布日期未取得。Python **1.26.0 Release 原发 11-13 08:28:16 UTC**，Core wheel 于 **11-12 18:25:48 UTC** 上传，两个日期分开记录。实际安装的 wheel SHA-256 为 `175b75f07e15d1bb7b6cea9cb35b965ac2528cd96e3eae8f791c85c48c7232b3`，相关工作流、AgentExecutor、Agent 和函数层实现与固定 tag 源码一致。

本实验覆盖 SDK 本地工作流与实际函数/文件链，聊天 client 为合成实现。未验证真实模型、服务端会话、原生工具审批、FIDES、托管/AG-UI、并发恢复、磁盘故障或跨系统行为；八组结果不能代替这些验证。需要真实业务集成时，应另按对应入口、版本和成果验收。
