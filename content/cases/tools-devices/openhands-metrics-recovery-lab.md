---
title: "OpenHands SDK 统计实验：2 + 1 为什么会变成 6"
description: "用固定 SDK 的四组对象与跨进程统计 JSON 对照，解释恢复、浅复制和合计的关系；附隔离脚本、固定依赖及完整历史与摘要的取舍。使用合成记账值，未运行完整会话、模型或真实扣费。"
level: "进阶"
surface: "OpenHands SDK 1.60.1 · macOS arm64"
duration: "含依赖准备"
checkedAt: "2026-11-07"
---

# OpenHands SDK 统计实验：2 + 1 为什么会变成 6

如果你把 OpenHands SDK 接入长任务，恢复后又派生一个用途来提问，统计面板的总数值得单独核对。在本文固定的 **1.60.1 统计对象路径**中，先保存合成记账值 2，恢复后给派生用途再加入 1，两个用途会共同指向累计值 3，汇总于是得到 6。新建对象的基线却是正常的 2 / 1 / 3。

这不是“模型实际花了双倍钱”的证据。下面不调用模型，也不创建或恢复完整 `Conversation`，只执行真实 `LLMRegistry`、`ConversationStats`、`LLM` 与统计 JSON 的往返。它适合维护 SDK 用量展示、日志或恢复流程的开发者：带走一份能观察对象共享的实验、一份固定依赖，以及决定保存完整历史还是摘要的方法。

## 先把输入、用途与汇总分开

[官方 Metrics Tracking](https://docs.openhands.dev/sdk/guides/metrics)区分单个 LLM 实例的统计与会话级合计。主 Agent、压缩上下文等辅助用途可以有不同的 `usage_id`；这使你能知道各项工作记到了哪里。但两个不同的用途名，不保证它们持有不同的 Python 对象。

本实验的起点很小：

1. 创建 `agent` 用途，手动给其 metrics 加入 2，并保存完整统计 JSON。
2. 在另一个进程中读回这份 JSON，注册相同用途的新 LLM 对象，让统计订阅器恢复已有值。
3. 浅复制该 LLM，改名为 `ask-agent`，注册后手动加入 1。
4. 同时检查对象是否共享、各用途的值、合计和逐次记录条数。

已知输入合计是 **2 + 1 = 3**，这个期望来自我们注入的两笔测试值，不能再用“把 SDK 的两个用途数相加”来生成期望。否则 `3 + 3 = 6` 也会被自己的检查器判为正确。代码中的模型名只是配置字符串，合成 key 也不会用于请求。

这条路径来自两份独立问题线索：enyst 于 11 月 5 日发布的 [#6487](https://github.com/OpenHands/software-agent-sdk/issues/6487) 讨论恢复后派生对象的统计共享，属于内部类测试报告；no-hup 于 11 月 3 日发布的 [#6432](https://github.com/OpenHands/software-agent-sdk/issues/6432) 关心长任务逐次 metrics 历史的写入和保留成本。后者不是前者的根因证明，两帖作者的性能数字和生产影响都不作为本站实测数据。

## 同一输入，做四组对照

实际环境为 macOS arm64、Python 3.12.14、SDK 1.60.1、Pydantic 2.14.3、LiteLLM 1.105.7。原环境与按完整冻结清单重新安装的第二环境均执行完整脚本，观察结果相同，`pip check` 无缺损。SDK 的六份相关安装源码匹配固定发行提交 `e99e5c71ffe440a0b8d74b695f9307a7e34e4bbd`。

| 做法 | agent | ask-agent | 合计 / 记录条数 | metrics 与 telemetry |
| --- | ---: | ---: | --- | --- |
| 新建统计对象，再浅复制派生用途 | 2 | 1 | 3 / 2 条 | 不共享 |
| 统计 JSON 恢复后，再浅复制派生用途 | 3 | 3 | 6 / 4 条 | 共享 |
| 恢复后，先 reset 派生对象再注册 | 2 | 1 | 3 / 2 条 | 不共享 |
| 恢复后，重新构造派生 LLM 对象 | 2 | 1 | 3 / 2 条 | 不共享 |

第二行是保留的失败对照。后三列要一起看：只是发现合计为 6，并不能定位原因；观察到两个用途共享 metrics、单个用途的旧值也从 2 变成 3，才把问题缩小到对象与恢复顺序。

reset 与重新构造是本实验的局部对照，说明独立对象能改变这组输入的结果，**不是经完整会话验证的通用修复**。在已有用途上随意 reset 还可能清掉你需要的历史；不要把这段实验直接贴进生产恢复流程。

## 为什么新建正常，恢复后却发生共享

固定版本中有三个相邻动作，顺序决定结果：

1. [`LLMRegistry.add`](https://github.com/OpenHands/software-agent-sdk/blob/e99e5c71ffe440a0b8d74b695f9307a7e34e4bbd/openhands-sdk/openhands/sdk/llm/llm_registry.py#L80) 先检查 metrics 的对象身份，记录已见过的对象，再通知订阅器。发现后续对象已被使用时，它会重建独立的 metrics。
2. [`ConversationStats.register_llm`](https://github.com/OpenHands/software-agent-sdk/blob/e99e5c71ffe440a0b8d74b695f9307a7e34e4bbd/openhands-sdk/openhands/sdk/conversation/conversation_stats.py#L70) 在通知期间发现有尚未恢复的历史，会调用 `restore_metrics`，把这个 LLM 的 metrics 换成已有统计对象。
3. [`restore_metrics`](https://github.com/OpenHands/software-agent-sdk/blob/e99e5c71ffe440a0b8d74b695f9307a7e34e4bbd/openhands-sdk/openhands/sdk/llm/llm.py#L990) 替换引用并同步 telemetry；恢复后的对象身份没有在前一步原有的集合中登记。

可以把旧引用叫 A、恢复后的引用叫 B。注册器记住了 A，订阅器随后换成 B。再浅复制时，新 LLM 也拿到 B，但注册器不知道 B 已被使用，于是这次没有隔离。给派生用途加 1，实际上把双方共同持有的 B 从 2 改成 3；[`get_combined_metrics`](https://github.com/OpenHands/software-agent-sdk/blob/e99e5c71ffe440a0b8d74b695f9307a7e34e4bbd/openhands-sdk/openhands/sdk/conversation/conversation_stats.py#L58) 按用途遍历并合并，两次读到 B，得到 6，记录列表也合并两次。

新建基线没有“通知期间换掉引用”这一步，浅复制的共享能被识别，结果就是 2 / 1 / 3。固定源码中的 [`ask_agent` 派生逻辑](https://github.com/OpenHands/software-agent-sdk/blob/e99e5c71ffe440a0b8d74b695f9307a7e34e4bbd/openhands-sdk/openhands/sdk/conversation/impl/local_conversation.py#L3090)采用这类复制/注册操作；**本文执行了对应内部类顺序，没有执行 `ask_agent` 本身**，不据此宣称完整客户端工作流或供应商计费被复现。

## 合计正确，也不代表历史还在

第二个实验只改变统计 JSON 的序列化方式。对累计值 2、含一条费用记录的统计对象：

| 保存与读回方式 | 读回的累计值 | 逐次费用记录 |
| --- | ---: | ---: |
| 默认完整 JSON | 2 | 1 条 |
| `context={"use_snapshot": True}` 的摘要 JSON | 2 | 0 条 |

两份 JSON 都能被统计模型读回，但第二份没有原始列表字段，读回时得到空列表。这符合固定源码里[为网络传输缩小 payload 的摘要分支](https://github.com/OpenHands/software-agent-sdk/blob/e99e5c71ffe440a0b8d74b695f9307a7e34e4bbd/openhands-sdk/openhands/sdk/conversation/conversation_stats.py#L22)的用途；不是发现了一个“所有保存都会丢数据”的问题。[完整会话持久化文档](https://docs.openhands.dev/sdk/guides/convo-persistence)还涉及事件、状态和配置，本文没有运行那条完整路径。

因此，选择取决于你要回答的问题：

| 需要解决的任务 | 合适的记录方式 | 代价与限制 |
| --- | --- | --- |
| 展示当前累计数 | 摘要可以作为展示数据 | 无法据此还原哪一笔、哪个用途发生过变化 |
| 对比恢复前后的逐次记录 | 保留完整统计历史，并独立核对用途与记录 | 数据随历史增加；本文没有测规模或耗时 |
| 审查真实调用是否重复记账 | 另外保留具有稳定调用标识的事件记录，再与 SDK 展示及供应商记录核对 | 这是应用层设计方向，需要处理重试和去重；本文没有实现真实账单对账 |

不要为缩小 JSON，直接把展示摘要当完整恢复备份；也不要为得到“正确总数”把两个用途之一删掉。前者会丢掉审查线索，后者可能掩盖真实的另一用途。应先确定统计值、逐次历史和实际调用分别由什么证据证明。

## 运行带隔离的完整实验

<a href="/templates/openhands-metrics-lab.py" download>下载实验脚本</a> · <a href="/templates/openhands-metrics-requirements.txt" download>下载固定依赖清单</a>

脚本限定 macOS arm64 / Python 3.12；请在下载文件所在目录运行，并提前准备好 Python 3.12：

```bash
LAB_DIR="$(mktemp -d -t openhands-metrics)"
python3.12 -m venv "$LAB_DIR/venv"
"$LAB_DIR/venv/bin/python" -m pip install --only-binary=:all: -r openhands-metrics-requirements.txt
"$LAB_DIR/venv/bin/python" -m pip check
"$LAB_DIR/venv/bin/python" openhands-metrics-lab.py
```

依赖安装需要联网。实验子进程随后通过 macOS 沙箱禁止网络和真实主目录读写，只放行解释器/虚拟环境读取；原 HOME 值保持不变。它会先验证拒绝规则，核对固定版本与六份源码指纹，再执行独立子进程；所有工作数据在临时目录，结束后删除。输出不含主目录、真实凭据或原始持久化日志。这个实验沙箱不代表 OpenHands 产品自身的隔离保证。

实际输出中的关键部分是：

```json
{
  "case": "resumed-copy",
  "agent": 3.0,
  "question": 3.0,
  "combined": 6.0,
  "combined_records": 4,
  "expected_from_inputs": 3.0,
  "conserved": false,
  "same_metrics": true,
  "same_telemetry": true,
  "sdk_socket_connect_events": 0
}
```

`observations_match: true` 和脚本退出 0 的意思是“重现了本文约定的观察”，包括这行错误合计；不是“SDK 已修好”。`sdk_socket_connect_events` 只计 Python 的连接审计事件，OS 网络拒绝规则另有预检查。两套环境该计数均为 0。Python 版本不符、依赖/源码不符或隔离规则不可用时脚本停止；不要删掉保护来凑出成功输出。

## 版本、来源与下一步

官方资料、两份原帖和 1.60.x 版本在 **2026-11-07** 核对。本文实验固定 1.60.1，原发行于 11-05 16:32 UTC（北京 11-06）；对应[官方发布说明](https://github.com/OpenHands/software-agent-sdk/releases/tag/v1.60.1)与 [PyPI 固定版本](https://pypi.org/project/openhands-sdk/1.60.1/)。另有 [1.60.2 hotfix](https://github.com/OpenHands/software-agent-sdk/releases/tag/v1.60.2)，原发布 11-06 18:41 UTC，说明针对大型远程会话状态消息；**本站未执行 1.60.2，不把它等同于本文统计路径已恢复**。关联 [PR #6497](https://github.com/OpenHands/software-agent-sdk/pull/6497) 核对时仍未合并，标题和机器人回复不能代替修复验收。

### 2026-11-14：当前版本的证据边界

本文的实验结果仍只适用于上面的 1.60.1 内部类实验。本次补充仅核对官方版本记录、相关 Issue/PR 和当前标签源码，没有在 1.62.0 安装或运行实验，也没有运行完整 Conversation、模型请求或账单对账。

截至 **2026-11-14**，[GitHub 最新发布](https://github.com/OpenHands/software-agent-sdk/releases/tag/v1.62.0)和 [PyPI 最新版本](https://pypi.org/project/openhands-sdk/)均为 1.62.0。1.61.0 发布说明中的 #6581 是移除 LLM 时清理 metrics id；它不是 [#6497](https://github.com/OpenHands/software-agent-sdk/pull/6497) 提出的“subscriber 通知后，再登记恢复后的 metrics 对象身份”。1.62.0 发布说明未列出 #6497；该 PR 当日仍 open、未合并。

对 [`v1.62.0` 的 `LLMRegistry.add` 源码](https://github.com/OpenHands/software-agent-sdk/blob/v1.62.0/openhands-sdk/openhands/sdk/llm/llm_registry.py)做静态阅读时，看到的顺序仍是先登记当前 metrics 对象身份，再通知 subscribers；PR #6497 提议的通知后登记行不在这段实现中。这只能说明所查看标签里该处源码的内容，**不能代替安装运行 1.62.0、完整恢复/派生任务或真实调用验证，也不能据此宣称读者在当前版本会遇到相同结果**。

如果你需要判断自己所用版本是否覆盖这条路径，请固定实际安装版本，沿用本文的独立输入、用途、累计值和逐次记录验收表，再针对自己的恢复与派生流程运行；把 release note、PR 状态和静态源码阅读分别作为线索，不互相当作运行结果。本文仍可复现的结果及失败对照只有 1.60.1 实验脚本给出的范围。

读完可以先在自己的脱敏统计样本上列出“独立输入、用途、累计值、逐次记录”四列，再决定是否需要验证恢复与派生顺序。本实验给出了反例与局部对照；完整 Conversation、真实模型、供应商扣费、其他系统和性能结论仍需各自的实际验证。
