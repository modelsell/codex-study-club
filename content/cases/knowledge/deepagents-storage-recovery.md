---
title: "Deep Agents 存储实验：重启后怎么找回资料"
description: "用两份合成资料和来源清单，实际对照内存检查点、SQLite、文件后端与 Store 的恢复和可见范围。附固定依赖与脚本；只验证 SDK 存储层，不验证模型调研或子 Agent 权限。"
level: "进阶"
surface: "Deep Agents SDK · 离线存储"
checkedAt: "2026-11-03"
---

# Deep Agents 存储实验：重启后怎么找回资料

你在做一个资料整理服务：第一轮收集两份材料，第二轮继续比较，下一天再生成报告。服务进程换了，资料还能读到吗？如果换了一个对话线程，读不到原文件，是数据丢了，还是读错了范围？

这篇适合已经在接 Deep Agents SDK、需要自己管理存储的开发者。我们把任务缩到能验证的一步：**保存两份合成资料和一份来源清单，正常结束 Python 进程，再由另一个进程读取并核对内容哈希。** 流程里没有模型，也不生成调研报告；验证对象是实际 SDK 文件后端和图检查点。

结论先说：**能否跨进程保留，取决于数据最终放在哪里；谁能读到，还取决于 thread、目录或 namespace。** `StateBackend` 不必然一重启就丢，`StoreBackend` 也不会让内存自动变成磁盘。把这些条件分开，才容易定位“资料不见了”。

## 先把三种状态分清楚

Deep Agents 给模型提供的是文件工具接口，工具后面可以换不同的 backend。检查点则保存图的状态。二者有关联，但不是同一个配置项。

| 你要保存什么 | 本文对应的机制 | 读取时需要保持什么 |
| --- | --- | --- |
| 一个线程正在处理的资料 | `StateBackend` 的 `files` 状态，由 checkpointer 保存 | 实际检查点存储，以及同一个 `thread_id` |
| 独立于对话状态的资料文件 | `FilesystemBackend` 对应的本地目录 | 同一个实际目录与文件路径 |
| 多个线程要共享的笔记 | `StoreBackend` 对应的 Store 数据 | 同一 Store，以及正确的 namespace |

官方 [Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) 把 checkpointer 定义为线程状态的保存方式，把 Store 定义为图状态之外的应用数据存储。[Backends](https://docs.langchain.com/oss/python/deepagents/backends) 则说明文件接口如何接到不同介质。本文进一步验证：当介质、线程或命名空间改变时，实际读取结果会怎样变化。

这里用的是自行组装的最小 LangGraph 图，复用 SDK 的 `FilesystemState` 和真实 backend；没有调用 `create_deep_agent` 的模型循环。因此不要把下面的结果扩大为“真实调研 Agent 已经能可靠续跑”。

## 一条完整、可复现的资料保存任务

输入是三份固定文本文件，均由脚本构造：

- `/sources/a.txt`：标注为合成资料，内容是“每天可以导出一次”。
- `/sources/b.txt`：标注为合成资料，内容是“交付前需要人工审查”。
- `/research/manifest.json`：记录两份资料的 SHA-256、`collected` 状态，以及下一步比较问题。

这些不是任何真实产品的功能或商业数据。来源清单的作用，是让后一个进程确认读到的仍是原始输入；**哈希相同只证明字节相同，不证明资料中的说法正确，更不证明模型引用没有出错。**

实验按相同步骤运行各组：第一个进程在图节点中调用 backend 写入，立即读回并核对；调用结束后进程正常退出。第二个独立进程重新创建图和 backend，用指定的存储与线程读取，再逐个比较三份文件。脚本遇到结果与预期不符会退出失败。

这次使用 Python **3.12.14**，核心依赖如下；完整清单还固定了传递依赖。

| 组件 | 实际版本 |
| --- | --- |
| Deep Agents SDK | 0.7.32 |
| LangChain / langchain-core | 1.4.8 / 1.7.4 |
| LangGraph | 1.2.19 |
| langgraph-checkpoint / SQLite adapter | 4.3.1 / 3.1.3 |

<a href="/templates/deepagents-storage-lab.py" download="deepagents-storage-lab.py">下载存储实验脚本</a> · <a href="/templates/deepagents-storage-requirements.txt" download="deepagents-storage-requirements.txt">下载固定依赖清单</a>

把两个文件保存到一个新的实验目录，在 Python 3.12 环境执行：

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r deepagents-storage-requirements.txt
python deepagents-storage-lab.py
```

安装依赖需要取得相应发行包。脚本运行阶段会关闭 LangSmith tracing、阻断 Python socket 连接，不创建模型或委派子 Agent；本次连接尝试计数为 **0**。它仅在自己新建的临时目录写入，结束时清理该目录，输出版本和各组断言结果。需要保留结果时，可自行将输出保存为本地文件。

## 第一组：相同 thread_id，也救不回新的内存检查点

第一组使用 `StateBackend` 和 `InMemorySaver`。写入进程能读到三份文件；结束进程后，读取进程创建新的 `InMemorySaver`，即使仍传 `research-a`，三份文件也全部返回 `file_not_found`。

原因是 `thread_id` 用来标识要读哪个线程，它本身不是存储。新进程里那个空的内存 saver 没有旧检查点，线程名称相同也不会凭空出现历史数据。这是实验的失败基线，不是 SDK 故障复现。

第二组保持同一输入和 `StateBackend`，把检查点改成实际 SQLite 文件。两个进程使用同一个数据库文件和 `research-a`，三份内容全部恢复，哈希匹配。

源码中 [`StateBackend`](https://github.com/langchain-ai/deepagents/blob/e85c6b98087861512d2c5240305e16cfac68a746/libs/deepagents/deepagents/backends/state.py#L37) 通过图配置读取 `files` 通道、提交文件更新；它自己没有另外写一个磁盘目录。**在这一模式下，资料跟着图状态走，跨进程恢复依靠真正保留下来的检查点介质。**

完整脚本中的关键配置是这两处，builder 与 saver 的创建也包含在下载文件里：

```python
graph = builder.compile(checkpointer=saver)
graph.invoke(
    {"action": "read"},
    {"configurable": {"thread_id": "research-a"}},
)
```

对服务开发者来说，先核对部署实际使用的 saver 和数据库，再核对线程标识，比只在提示词里要求“记住资料”更能定位问题。本实验没有突然终止进程、断电或并发写入，不能据此保证所有崩溃点都能恢复。

## 第二组：换线程读不到，原资料仍可能完好

接下来不换数据库，只把 SQLite 组的读取线程改成 `research-b`。三份文件全部读不到；再用 `research-a` 读取，三份又全部存在。

这说明数据没有因为一次读取失败就被删除。对于 `StateBackend`，**文件跟随线程状态，并不会因为两个线程使用同一个 SQLite 数据库就自动共享。** 如果应用每次请求都随机生成新 `thread_id`，就不应期待新请求直接读到旧线程的工作资料。

这也不意味着把所有用户塞进同一个线程：那会混合本来应该分开的会话。应用需要明确管理“哪个请求继续哪个任务”，共享知识则另选有明确范围的存储方式。

该 SDK 版本的 [`FilesystemState`](https://github.com/langchain-ai/deepagents/blob/e85c6b98087861512d2c5240305e16cfac68a746/libs/deepagents/deepagents/middleware/filesystem.py#L1298) 使用 `DeltaChannel` 管理文件状态。因此“运行时恢复出完整文件”和“最新一行检查点已经包含所有文件的全量副本”也不能混为一谈。本文只验证恢复内容，不测远端读取次数或恢复延迟，不提供手改私有 reducer 的性能方案。

## 第三组：文件放到独立目录，恢复的是文件本身

把 backend 换成 `FilesystemBackend`，给它一个专用临时根目录，使用 `virtual_mode=True`。这次即使重建进程、换成 `research-b`，只要仍指向同一个根目录，三份文件都可读取，哈希匹配。

这组的关键变化，是资料有了独立的磁盘所有者，不再依赖某个线程的 `files` 状态。但它只保住文件，没有替你保存完整对话、执行位置或未完成的外部动作。不能从“原文还在”推导“模型会从正确步骤继续”。

[`FilesystemBackend` 的配置说明](https://github.com/langchain-ai/deepagents/blob/e85c6b98087861512d2c5240305e16cfac68a746/libs/deepagents/deepagents/backends/filesystem.py#L139)也区分了路径语义与进程隔离。根目录可以帮助组织访问路径，不能据此声称已建立操作系统沙箱。这里的目录是合成实验资料目录，不含用户文件。

如果你的需求只是存两份原文和一份清单，一个普通目录就可能够用。只有同时需要图的多步状态与线程恢复时，才值得增加相应检查点机制；不必为了“用了 Agent”就把所有文件塞进图状态。

## 第四组：Store 的共享范围，需要自己定义

最后使用真实 `StoreBackend`，但底层明确选择 `InMemoryStore`，用于验证可见范围。固定版本的构造函数要求显式提供 namespace factory；省略它会得到 `TypeError`。下面是完整的本组初始化方式：

```python
from deepagents.backends import StoreBackend
from langgraph.store.memory import InMemoryStore

store = InMemoryStore()
backend = StoreBackend(
    store=store,
    namespace=lambda _rt: ("research", "alpha"),
)
```

在同一 Store 中，图的一个线程写入，另一个线程使用同样的 namespace 读取，三份文件均可见；改成 `("research", "beta")` 则读不到。再把一个本来想分开的项目误配为 `alpha`，它也能读取。

这里验证的是配置决定的查找范围，**不是一套完整的认证或权限方案**。谁能决定 namespace，仍是应用责任；生产服务应从可信身份和项目配置确定范围，而不是任意接受来访者提供的共享标识。它也没有验证父 Agent、无关子 Agent 或 fork 后上下文的权限边界。

还有一个容易漏掉的对照：重新创建空的 `InMemoryStore` 后，即使 namespace 仍叫 `alpha`，三份文件也不可见。`StoreBackend` 是适配层，不会把内存实例自动升级成持久数据库。实现和参数见[固定版本源码](https://github.com/langchain-ai/deepagents/blob/e85c6b98087861512d2c5240305e16cfac68a746/libs/deepagents/deepagents/backends/store.py#L90)；跨进程共享笔记还需要真实持久化的 Store 实现，本轮未测试远端 Store。

## 实际结果放在一起，怎样选择

以下每组都核对同样的两份合成资料和一份清单，不是模型质量或吞吐量排名。

| 实际对照 | 本次读取结果 | 对应选择条件 |
| --- | --- | --- |
| 新进程、新 InMemorySaver、原 thread | 3 份均缺失 | 适合进程内实验，不能承担本轮验证的跨进程恢复需求 |
| 新进程、原 SQLite、原 thread | 3 份恢复、哈希一致 | 本地保存同一任务的图状态；生产并发与恢复策略另评估 |
| 原 SQLite、另一个 thread | 不可见；原 thread 仍可读 | 线程资料保持分开，应用必须正确续接任务标识 |
| 新进程、原文件根目录，换 thread | 3 份均可读 | 文件要独立于会话保留；对话状态另管 |
| 同一内存 Store、同一 namespace、换 thread | 3 份均可读 | 验证跨线程共享范围；不证明进程重启后持久化 |
| 同一 Store、不同 namespace | 不可见 | 配置范围分开；误用相同 namespace 仍会共享 |

对前面的资料整理服务，可以把“继续当前研究”与“共享已整理笔记”分开设计：前者续接正确线程及其检查点，后者用明确拥有者的目录或 Store。先决定资料归谁、保留多久、哪些任务能读，再选 backend；文件保存、状态恢复、来源准确和最终交付分别验收。

## 为什么选这个题，以及哪些问题仍没解决

两位独立使用者的请求给出了具体背景：[#7376](https://github.com/langchain-ai/deepagents/issues/7376)（herohua，2026-10-29）关注完整检查点与远端恢复成本；[#7279](https://github.com/langchain-ai/deepagents/issues/7279)（zamal-db，2026-10-26）希望部分研究角色共享笔记而不让其他角色看到。11-03 读取时两帖仍 open，前者有维护者对自定义 saver 历史读取实现的讨论，后者仍是共享分组功能请求。

它们说明保存与共享是有人遇到的工程问题，**不代表本实验已经解决了这两个请求**。完整快照策略、云端性能、子 Agent 分组权限、真实模型的资料理解与引用，都没有在这里得到验证。外部作者的数字与本地修订不是本站结果。

### 版本与复现边界

资料、需求原帖及后续讨论核对日期为 **2026-11-03**。SDK 0.7.32 的[官方发布](https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.32)是 10-23 21:30 UTC（北京时间 10-24），不是今天的新版本；源码固定在 `e85c6b98087861512d2c5240305e16cfac68a746`，已与安装包中的相关文件逐字节比对。

本站完成的是文本资料、SDK backend 与本地检查点实验，正常结束进程后再启动读取。没有创建模型、调用付费推理、生成真实调研报告、执行子 Agent 委派、测试远端存储、进程崩溃或操作系统隔离。脚本保留失败基线与可复查断言，源码和依赖版本也固定；将方法接入真实 Agent 后，仍要按你的任务实际验证完整流程。
