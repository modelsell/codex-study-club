---
title: "Browser Use 下载交付实验：同名报表，答案指向哪一份？"
description: "固定 Browser Use 1.0.8，以真实本地 Chrome、REPL 和合成模型做三组下载对照，检查旧文件误交付、编码链接被拒与稳定副本。附复现脚本和固定依赖；验证软件流程，不评价模型自主能力。"
level: "进阶"
surface: "Browser Use 1.0.8 · macOS arm64"
checkedAt: "2026-11-23"
---

# Browser Use 下载交付实验：同名报表，答案指向哪一份？

让 Agent 收集上期和当前报表，网站给出的两个附件都叫 `report.csv`。浏览器下载了两份文件，最终回答也给出一个可读链接，但点开以后，里面是上期数据。下载完成了，当前任务仍没有交付正确。

本文面向用 Browser Use 下载报表、整理资料的人。我们固定 **Browser Use 1.0.8**，实际启动顶层 `Agent`、Python REPL worker 和本地无界面 Chrome，点击本地 HTTP 页面，走完下载、重复命名、最终回答和文件回读三组对照。**浏览器和 SDK 是真实执行；工具调用、`success=True`、故意选择旧文件及后续复制修正，都由 `FunctionModel` 脚本预设。** 这里验证软件怎样处理这些输入，不验证真实模型能否自主完成任务。

三组中，SDK 最终都返回 `completed` 和 `success=True`，但故意交付旧文件的一组没有通过当前任务的内容验收。另一组已经找对当前文件，却因文件名的 URL 编码触发交付重试；预设的下一步保留原件、生成稳定副本，再由独立回读确认正确。读者可以带走完整复现包，以及把“文件存在”推进到“答案确实指向本任务文件”的验收方法。

## 一个足够小、但能分出错稿的任务

任务要求是：**下载 `task_id=current`、`total=42` 的 CSV，最终链接必须指向这份内容。** 本地服务另提供上期报表，两个响应都使用附件名 `report.csv`：

| 页面入口 | 响应内容 | 附件名 | 字节数 |
| --- | --- | --- | ---: |
| `/old` | `task_id=previous`，`total=7` | `report.csv` | 25 |
| `/current` | `task_id=current`，`total=42` | `report.csv` | 25 |

当前报表的完整输入为 UTF-8 文本，最后一行保留换行：

```csv
task_id,total
current,42
```

上期报表为：

```csv
task_id,total
previous,7
```

**尺寸相同，内容不同。** 比较下载数量或文件大小，无法发现这次错稿。脚本在任务开始前根据这两份固定字节计算预期 SHA-256，结束后再读取实际最终链接的目标文件，比较 CSV 字段和哈希。预期内容来自实验输入，不是让合成模型替自己的回答定义正确答案。

服务用 `Content-Type: text/csv; charset=utf-8` 返回文件，并设置 `Content-Disposition: attachment; filename="report.csv"`。页面有上期、当前两个链接；REPL 通过页面点击触发请求。每组都有新的工作区和浏览器配置目录，下载目录起始为空。重复名组是在**同一次 Agent 运行中先下载上期，再下载当前报表**，没有预先往下载目录放两份文件冒充浏览器结果。

## 从点击到交付，中间发生了什么

下载链有几个不同的终点：页面收到点击，浏览器开始传输，文件完成命名，Agent 返回下载列表，最终答案指向文件，文件内容满足任务。少核对后面的环节，前面的成功仍可能留下错误交付。

本文把源码固定在 **`753d629d76eb2b670f4cf467f3355bbe750f6845`**。实际安装的发行包来自官方 1.0.8 wheel；相关源码与该提交的原文件核对一致。沿这次任务，可以把机制串成下面一条路径：

```text
页面点击 → HTTP 附件 → CDP 下载事件与 GUID 文件
                     → 完成后命名 / 同名后缀
                     → 下载列表 → 最终答案链接 → 当前任务内容回读
```

### 1. 完成命名解决冲突，文件名不承担业务身份

本地浏览器的 [`_send_downloads`](https://github.com/browser-use/browser-use/blob/753d629d76eb2b670f4cf467f3355bbe750f6845/browser_use/browser/browser.py#L757) 将 CDP 下载行为设为 `allowAndName`，并启用事件。文件先按下载 GUID 保存；worker 收到完成事件后，按建议文件名处理命名，相关路径在 [`CellStats.name_download`](https://github.com/browser-use/browser-use/blob/753d629d76eb2b670f4cf467f3355bbe750f6845/browser_use/repl/worker.py#L255)。

[`file_names` / `name_download`](https://github.com/browser-use/browser-use/blob/753d629d76eb2b670f4cf467f3355bbe750f6845/browser_use/utils.py#L172) 为同名文件依次尝试原名、` (1)`、` (2)` 等名称，避免覆盖。在本次重复名组里，上期文件成为 `report.csv`，后下载的当前文件成为 `report (1).csv`。这个后缀表达的是文件系统冲突的处理结果，不是“本任务的正确报表”标签。

下载事件要按 GUID 关联开始、完成和建议文件名；同一 GUID 的完成记录也可能重复出现，不能把日志行数当成下载文件数。本实验保留了事件与最终字节的对应证据，但没有刻意制造 GUID 重命名竞态，不能据此宣布相关竞态已经修复。

### 2. 运行中的列表与结束后的列表，各有范围

REPL 内的 `downloads()` 通过 [`Browser.list_downloads`](https://github.com/browser-use/browser-use/blob/753d629d76eb2b670f4cf467f3355bbe750f6845/browser_use/browser/browser.py#L1254) 获取已出现的文件名和大小。本地路径会排除 `.crdownload`；本实验在有限轮询后继续实际读取文件，任何等待超时或读回失败都会使对照失败，没有用一次固定休眠代替文件验收。

Agent 结束后的 `result.downloads` 则在 [`Agent._run`](https://github.com/browser-use/browser-use/blob/753d629d76eb2b670f4cf467f3355bbe750f6845/browser_use/agent/service.py#L606) 中，根据运行前后的 `workspace/downloads` 目录差收集并排序。它列出的是这次新增的下载路径，**按路径排序，不是下载时间顺序，也不表示哪个文件被最终答案选中。**

所以重复名组实际读到的顺序是：

```text
downloads/report (1).csv   ← 当前内容
downloads/report.csv       ← 上期内容
```

不能把列表首项、末项或没有后缀的文件固定当成当前报表。应以本任务的内容条件、来源映射或预期哈希确认身份。

### 3. 最终链接检查检查了什么

本例通过 `finish_from_repl` 交付 REPL 中的 `answer` 字符串。1.0.8 的 [`check_delivery`](https://github.com/browser-use/browser-use/blob/753d629d76eb2b670f4cf467f3355bbe750f6845/browser_use/agent/loop.py#L252) 提取部分 Markdown 链接和反引号文件引用，再检查路径是否存在。它没有比较报表的任务字段，也没有在该检查中将 URL 编码还原为文件名。

因此两个方向的问题都能出现：旧文件真实存在，检查可放行；正确文件叫 `report (1).csv`，答案写成 `report%20%281%29.csv`，字面路径不存在，又会触发一次修复。下载选对文件和最终答案能交付它，需要分别验证。

## 三组完整对照，最后一组走五步

三组都使用真实浏览器、HTTP 下载与 REPL。合成模型接收真实工具回执，但按照事先排好的顺序返回下一条工具调用；它不根据错误自行决定修复方案。三组分别产生 **3、3、5 次合成响应，共 11 次**。

| 对照 | 下载与答案选择 | SDK 最终结果 | 独立内容验收 |
| --- | --- | --- | --- |
| 单次下载当前报表 | 只点当前入口，交付 `downloads/report.csv` | `completed`、`success=True`；3 次响应 | 当前字段、哈希匹配 |
| 两次同名下载，故意交旧稿 | 先上期、后当前；脚本故意把答案指向上期的 `downloads/report.csv` | 同样完成；3 次响应 | 不匹配，实际是 `previous / 7` |
| 找对当前文件，编码链接后修正 | 先交付当前文件的编码链接；被拒后，预设下一轮复制稳定副本再交付 | 最终完成；5 次响应 | 最终副本为 `current / 42`，哈希匹配 |

第二组的负例是验收要保留的结果：SDK 的完成标志并没有阻止脚本交错文件。它不代表真实模型在这些输入下会犯同样的错，也不是故障发生率统计。

### 第三组：正确文件为什么先被拒绝

前三次合成响应按下面的顺序驱动实际执行：

1. `python` 打开本地页面，点击上期附件并等待文件出现。
2. `python` 点击当前附件，读回两个文件的 CSV 字段与哈希，找到 `task_id=current` 的 `report (1).csv`，生成编码链接。
3. `finish_from_repl(expression="answer", success=True)` 尝试交付该链接，实际触发 `ModelRetry`。

此时的答案是：

```markdown
[current](downloads/report%20%281%29.csv)
```

worker 已经能读到正确的 `downloads/report (1).csv`，但交付检查将编码后的目标当作路径，返回“链接文件不存在”的提示。这是**最终链接检查失败**，不是本组下载丢失。

第 4 次合成响应预设执行以下做法：从刚才已经确认的当前文件复制字节到工作区根目录的 `current-report.csv`，保留原下载文件，并核对复制前后哈希。第 5 次响应再交付：

```markdown
[current](current-report.csv)
```

复制过程的核心逻辑如下；`current` 来自前一轮对下载文件的实际读取，完整脚本还有最终任务内容校验：

```python
source = Path("downloads") / current["name"]
stable = Path("current-report.csv")
stable.write_bytes(source.read_bytes())
assert hashlib.sha256(stable.read_bytes()).hexdigest() == current["sha256"]
answer = "[current](current-report.csv)"
```

这里有两个容易漏掉的范围。

首先，稳定副本位于 **workspace 根目录**，不在 `workspace/downloads`。因此第三组的 `result.downloads` 仍只有两个原始下载文件；最终交付物要沿答案链接另行检查，不能用下载列表判断副本是否交付。

其次，`check_delivery` 设计为一次修复，使用过修复后不会对后续交付重复执行同样的严格检查。因此**第二次返回完成并不证明新链接又被完整检查了一遍**。本实验的修正结论来自脚本独立解析实际最终链接、还原 URL 编码、核对工作区边界，再读取目标 CSV 字段和预先固定的任务哈希。复制前后哈希相同，只能证明复制一致；与预期当前报表的哈希相同，才连接到了任务要求。

## 保留原名，还是增加一份稳定交付副本

保留下载原名有价值：它保留了网站给出的名称和 SDK 的冲突处理结果，便于追溯多个附件。代价是调用方要维护“来源、任务、实际文件名”的对应关系，并验证自己的链接生成和消费逻辑。不要靠省略编码、改变 Markdown 语法来利用检查漏检。

稳定副本适合交给后续脚本、报表目录或需要固定文件名的读者。本文在已知当前内容后复制，避开这一固定版本对编码名称的误判，同时保留原件用于追溯。它增加了存储和管理成本：大文件需要额外空间，长期任务要避免稳定名互相覆盖，副本更新后也要防止旧链接继续指向旧内容。本文每组使用新工作区，**没有验证共享目录中的并发发布或原子替换**。

| 做法 | 怎样确认任务身份 | 交付与维护成本 |
| --- | --- | --- |
| 只看完成标志、文件数量或大小 | 不够；本例两个文件同为 25 字节 | 实现简单，但无法识别错稿 |
| 保留下载原名，加任务与内容映射 | 将最终目标映射到来源、字段及预期内容；另验链接解析 | 无额外副本，需要维护映射及命名兼容性 |
| 保留原件，再生成稳定交付副本 | 先确认源文件，再核副本字节与最终答案目标 | 增加空间、命名和生命周期管理；本例已走通这条软件流程 |

不论采用哪种文件组织方式，验收都应从**最终答案实际指向的目标**出发。把两个下载都存好，却检查另一个正确文件，仍然可能放过错误链接。本文第二组正是用这条验收识别失败，而不是把旁边已经下载的正确报表当作交付成功。

## 下载复现包，跑出同一份对照

<a href="/templates/browser-use-download-delivery-lab.py" download="browser-use-download-delivery-lab.py">下载三组完整浏览器实验脚本</a>

<a href="/templates/browser-use-download-requirements.txt" download="browser-use-download-requirements.txt">下载固定 Python 依赖</a>

本轮环境为 **macOS arm64、Python 3.12.14、Chrome 157.0.8103.80**。核心依赖是 Browser Use **1.0.8**、browser-harness **0.1.13**、pydantic-ai-slim **2.66.0**、pydantic **2.14.3**；复现时使用下载的完整固定依赖文件。没有在 Windows、Linux、已有 Chrome 用户配置或 Cloud 中执行这三组。

把两个文件保存在一个新目录，使用 Python 3.12 建立独立环境：

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r browser-use-download-requirements.txt
python -m pip check
python browser-use-download-delivery-lab.py --output browser-download-results.json
```

安装依赖需要联网。实验脚本使用已经安装的 Chrome、Chromium 或 Edge，**不负责安装或更新浏览器**；自动发现失败时，可通过 `--browser-executable` 指定本地可执行文件。上述环境是本轮实际覆盖范围，不把浏览器品牌可配置理解成所有平台都已验证。

脚本会启动绑定到 `127.0.0.1` 随机端口的测试服务，为各组建立独立工作区和浏览器配置，再运行真实 `Agent.run()`。它使用合成 `FunctionModel`，关闭 judge 和 web search，不需要模型 Key，也不创建 Cloud 浏览器。调用前关闭使用统计、自动登录和更新检查，禁用 python-dotenv；另检查 Harness 安装位置可能读取的 `.env`，以及本轮专用工作目录中的 `.env` 和 `agent_helpers.py`，发现既有文件就拒绝启动。随后以最小环境启动实验子进程。

网络验收有明确边界：Python 审计钩子限制非回环连接，任务浏览器域名限制为 `127.0.0.1`；这不是针对整个 Chrome 后台流量的操作系统网络隔离证明，不能据此宣称“所有浏览器网络请求均为零”。

### 怎样读结果，而不是只看退出成功

`browser-download-results.json` 给出三组摘要和本轮私有证据目录。对照摘要中的这些字段：

```text
single_current              responses=3   final_hash_matches_task=true
duplicate_old_answer        responses=3   final_hash_matches_task=false
encoded_current_then_stable responses=5   final_hash_matches_task=true
```

中间的 `false` 是故意留下的失败基线，不能删掉后宣称三组业务任务都成功。脚本只有在这组确实交付旧稿、其余两组交付当前内容，并满足工具调用与资源收尾断言时才通过。

每组详细结果把合成调用序列、SDK 工具回执、实际 HTTP 路由、GUID 下载事件、下载文件清单和最终目标回读分开保存。核对顺序是：浏览器是否请求了对应附件；完成事件与落盘文件能否关联；最终答案指向哪一份；目标文件的 `task_id`、`total` 和预期哈希是否匹配。文件和来源映射同时存在，才能说明为什么选中了它。

实验结束会关闭本轮 Agent 和测试服务，检查自己启动的进程与运行时资源；下载文件和结果证据保留在本轮临时目录，便于复查后自行清理。若找不到浏览器、依赖版本不符、下载等待超时、最终目标越出工作区或资源未收尾，先按该失败阶段查看本轮证据，不要把等待时间调大后的一次退出当作修复。

## 需求来源、版本与本例没有回答的问题

我们在 **2026-11-23** 重读了两份近三十天的独立原帖，它们涉及文件交付的不同阶段：

| 原始来源与作者 | 原日期（UTC） | 作者报告及与本例的关系 |
| --- | --- | --- |
| [#6479](https://github.com/browser-use/browser-use/issues/6479)，wang1299 | 2026-11-20 09:00:58 | 1.0.6 / Windows / fresh-local 下载列表短暂暴露 GUID 路径，随后命名令旧路径失效；提示要把事件、名称和最终读回连起来。本文没有复现其竞态或采用作者次数作为本站结果。 |
| [#6447](https://github.com/browser-use/browser-use/issues/6447)，adityajai119 | 2026-11-17 05:56:35 | 1.0.6 的编码链接、链接语法及工作区外路径检查问题；本文在固定 1.0.8 的实际下载链中验证了其中一种编码链接情形，没有穷尽原帖全部输入。 |

当日两帖仍 open。[#6481](https://github.com/browser-use/browser-use/pull/6481)、[#6448](https://github.com/browser-use/browser-use/pull/6448)以及新关联的 [#6505](https://github.com/browser-use/browser-use/pull/6505)、[#6510](https://github.com/browser-use/browser-use/pull/6510)均未合并。分支说明、作者测试和机器人审阅只作追踪资料，不额外计独立需求；本实验没有安装这些分支，也不宣布其中的修复已经正式发布。

固定 [1.0.8 Release](https://github.com/browser-use/browser-use/releases/tag/1.0.8) 原发布为 **2026-11-22 03:30:41 UTC**；[PyPI wheel](https://pypi.org/pypi/browser-use/1.0.8/json) 上传于 **03:44:53.401216 UTC**。核对日的官方 [Quickstart](https://docs.browser-use.com/open-source/quickstart) 安装示例仍固定 1.0.6，本文使用自己的固定依赖，不混用版本说明。官方 [Files](https://docs.browser-use.com/open-source/files) 页也把 fresh-local、Cloud 复制和附着现有 Chrome/CDP 分开：最后一种入口的 `result.downloads` 为空是其文档约定，不能套用本例的下载清单预期。

本文借鉴了 Playwright 团队 [Python Downloads](https://playwright.dev/python/docs/downloads) 对“围住触发动作、等待完成、明确保存位置”的解释方法，以及异步事件可能比主流程结束更晚的提醒。该页于本轮实际阅读，首次发布日期未确认；本实验使用 Browser Use，没有执行 Playwright 教程或比较两套工具的性能。

这三组能支持的结论是：**在这套固定软件与本地输入下，真实下载和重命名可以完成，最终链接仍需独立核对当前任务内容；稳定副本方案在预设修复流程中完成了字节交付。** 真实模型是否会识别错稿、选择正确文件或自行提出复制方案，生产网站的登录和权限、并发或取消时序、其他操作系统与 Cloud 行为，都需要对应的另一次验证。
