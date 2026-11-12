---
title: "Gemini CLI 取消验收：退出了，子命令停了吗"
description: "用官方 0.67.0 CLI、真实本地 shell 和模拟 Gemini API 做五组对照，分别检查退出码、进程、文件与会话。附离线复现脚本；不把信号退出当作任务停止或真实模型续跑成功。"
level: "进阶"
surface: "Gemini CLI 0.67.0 · macOS arm64"
checkedAt: "2026-11-12"
---

# Gemini CLI 取消验收：退出了，子命令停了吗

你在脚本里启动 Gemini CLI，让它处理一份文件。任务需要暂停，于是向 CLI 发出终止信号；进程返回了 143。现在可以直接续跑吗？

先检查子命令和文件。在本文的固定实验中，**官方 Gemini CLI 0.67.0 已退出，包含四秒等待的 shell 随后仍写入了结果；会话文件中没有这次工具调用。** 实际执行 `--resume latest` 后，本地端点收到的续接历史也没有对应的函数调用或工具响应。

本文面向把编码 Agent 接入脚本、CI 或长任务的人。我们实际运行发行版 CLI、真实本地 shell 和文件，用合成 Gemini API 返回固定工具调用；**没有调用真实模型，没有测试真实模型是否会重复执行任务。** 读者可以带走一份不需要账号或 API 费用的实验脚本，以及判断“退出、停止、交付、可续接”四件事的方法。

## 一个能看清副作用的最小任务

不用付款、发消息或修改项目来测试取消。实验只让 CLI 的 `run_shell_command` 执行 `bash ./worker.sh`；脚本位于每组独立的临时工作目录：

```bash
printf '%s\n' "$$" > worker.pid
printf 'STARTED\n' > started.txt
sleep 4
printf 'DELIVERED\n' >> result.txt
```

`started.txt` 是工具已经执行的证据，`worker.pid` 用于核对本实验进程，`result.txt` 则是延迟发生的副作用。观察脚本在看到启动标记、确认结果尚未写入后，才发信号；它不是凭固定等待时间猜测任务是否开始。

本地端点第一次返回一个固定的 `run_shell_command` 调用，收到工具响应后返回 `LOCAL_TOOL_RESULT_OK`。它没有推理能力。失败对照里，即使工具被拒绝，端点也会返回同一段固定文本，刻意检验“只看最后一句话”的验收会漏掉什么。

实际环境为 **macOS 27.2 / arm64、Node.js 24.22.1、Python 3.9.6**。CLI 来自官方 `gemini-cli-bundle.zip`，实际 `--version` 为 0.67.0；没有安装开发分支或未合并 PR。

## 五组对照，分别看四种结果

五组使用相同的合成任务与默认 CLI 启动方式、非 TTY 输入。除“未授权命令”组外，临时 Policy 只允许参数精确匹配 `bash ./worker.sh` 的工具调用，没有使用 `--yolo`。

| 对照 | CLI 退出码 | 文件与进程 | 会话中的工具记录 |
| --- | --- | --- | --- |
| Policy 只允许另一条命令，当前工具未获授权 | 0；`tool_result` 是 error，最终事件是 success | worker 没启动，结果 0 行 | 1 条 error |
| 正常执行 | 0 | 结果恰好 1 行 `DELIVERED` | 1 条 success |
| worker 开始后，只向 CLI 发 SIGTERM | 143 | CLI 退出时 worker 仍在；当时没结果，观察后写入 1 行 | 0 条 |
| worker 开始后，只向 CLI 发 SIGINT | 130 | 同样在 CLI 退出后写入 1 行 | 0 条 |
| 先终止已核对归属的实验 worker 进程组，再终止 CLI | 143 | 观察后仍无结果 | 0 条 |

最后一组是**实验观察器额外管理自己创建的进程组**，不是 Gemini CLI 自行完成的清理，也没有补回缺失的会话记录。脚本先核对 worker 和进程组首进程的命令、组 ID 与本实验归属，才操作该组；不能把这段方法改成按进程名批量终止真实任务。

信号组在 CLI 退出后再观察五秒，覆盖这个 worker 的四秒定时器；不是取消延迟或性能基准。表格只是上述发行物、系统和合成任务的实际结果，不是所有 shell、系统或取消入口的结论。

第一行尤其容易误判。CLI 退出 0、固定端点回复了成功标记，但工具事件明明是 error，文件也不存在。它说明调用方需要检查工具结果和交付物；这组故意设计的模拟响应不能证明真实模型会忽略错误。

## 为什么退出、停止和可续接要分开验收

可以把本次路径画成一条时间线：

```text
收到工具调用 → shell 启动并写入 started.txt → 向 CLI 发信号
                                         ↓
                       CLI 退出；检查当时的 worker 与文件
                                         ↓
                       等待覆盖 worker 定时器，再检查结果
                                         ↓
                       读取会话；实际续接并查看请求历史
```

**退出码只回答这个 CLI 进程怎样结束。** 它没有包含“所有工具进程已停止”或“没有文件变化”的证明。这里 143 / 130 与 worker 后续写入同时存在，所以自动化不能只把这两个数字转成“已安全取消”。

**取消也不是撤销。** 即使最后一组成功阻止了延迟写入，已经发生的外部操作仍需要单独核对。本实验只处理尚未发生的一次本地追加，没有测试回滚已完成写入、交易或网络请求。

**会话历史是另一份产物。** 我们把源码固定为 Release 对应提交 [`dc6602cec4a6e823aa33937144245dc421e5165f`](https://github.com/google-gemini/gemini-cli/tree/dc6602cec4a6e823aa33937144245dc421e5165f)，相关文件逐份与 Git blob 核对：

- [`nonInteractiveCli.ts`](https://github.com/google-gemini/gemini-cli/blob/dc6602cec4a6e823aa33937144245dc421e5165f/packages/cli/src/nonInteractiveCli.ts#L149) 注册信号并触发 abort，也在调度工具前检查取消状态。这些检查对“是否继续启动工具”有意义；本实验发信号时，工具已经开始。
- 同一文件在 [`scheduler.schedule()` 返回之后记录工具调用](https://github.com/google-gemini/gemini-cli/blob/dc6602cec4a6e823aa33937144245dc421e5165f/packages/cli/src/nonInteractiveCli.ts#L514)。因此要另外检查中途退出时究竟落下了哪些记录，不能仅由“支持续接”推导调用历史完整。
- [`cleanup.ts`](https://github.com/google-gemini/gemini-cli/blob/dc6602cec4a6e823aa33937144245dc421e5165f/packages/cli/src/utils/cleanup.ts#L166) 有退出清理与信号退出码；[`shellExecutionService.ts`](https://github.com/google-gemini/gemini-cli/blob/dc6602cec4a6e823aa33937144245dc421e5165f/packages/core/src/services/shellExecutionService.ts) 则另外处理 shell 与进程组。源码中存在这些路径，不等于已证明它们在每次中断时按期望完成。

这是对验收层级的源码解释。本轮没有修改客户端、定位并修复退出竞态，不能把某一处代码直接命名为已确认根因。

## 续接真正带回了什么

对 SIGTERM 那组，我们保留同一个隔离目录，实际运行 `--resume latest`。端点这次只返回固定文本，不再发工具调用；CLI 退出 0，结果文件仍为原来的一行，没有新增交付。

更关键的是请求内容：**续接历史中的 `functionCall` 数为 0，也没有该工具的 `functionResponse`。** 这与此前会话文件未记录工具的结果一致。

它验证了这次 CLI 加载会话并发送请求的路径，没有验证模型如何判断现场，也没有故意让模型重复执行。对真实任务的实际含义是：续接前应先给出现场证据，而不是仅依靠“上一次中断了”这句话。

例如，本实验的交接记录应是：

```text
CLI：SIGTERM 后退出 143
工具：退出当时仍存活
产物：退出当时不存在；观察后 result.txt 有 1 行 DELIVERED
会话：没有这次工具调用
续接请求：没有对应函数调用/响应
下一步：先核对这一行是否已交付，再决定是否补做；不要直接重跑追加命令
```

在真实项目里，把合成文件换成可检查的 diff、文件指纹、任务标识或服务端回执。哪些操作已完成、哪些仍未知要明确区分；存在未知副作用时，先只读核对，再决定补做范围。

## 怎样复现，以及怎样选择处理方式

<a href="/templates/gemini-cancellation-lab.py" download="gemini-cancellation-lab.py">下载五组取消与续接验收脚本</a>

准备 macOS arm64、Node.js **24.22.1** 和 Python 3。下载对应官方发行物：

```bash
curl -fL -o gemini-cli-bundle.zip \
  https://github.com/google-gemini/gemini-cli/releases/download/v0.67.0/gemini-cli-bundle.zip
shasum -a 256 gemini-cli-bundle.zip
```

本次发行物为 **21291052 字节**，SHA-256 为 `53371261bc56ebd5b3d1d6c400e07854e8d674f4e06365bae38443c1dc1312d3`，已与 Release digest 核对。脚本会先验证同一指纹，再自行解压到临时目录；指纹不符，不执行客户端。

```bash
python3 gemini-cancellation-lab.py \
  --bundle ./gemini-cli-bundle.zip \
  --node "$(command -v node)"
```

脚本只用 Python 标准库。它把 Node 复制到实验目录，保留原 HOME，用独立 `GEMINI_CLI_HOME` 和全新环境隔离配置；系统 `sandbox-exec` 只允许回环网络、阻断真实主目录及系统 Gemini 配置读取。预检查实际确认本地可达、非回环连接及主目录读取被拒绝。子进程只使用合成凭据和合成文件；跳过临时管理员配置路径的提示不需要通过修改系统权限解决。

最终输出五组摘要和一次续接探针，不输出 PID、会话 ID、真实路径、消息或认证头；临时目录结束后清理。若当前环境行为不符合固定断言，脚本失败，不能把失败输出算作复现成功。该脚本不是任意版本、Linux/Windows、真实终端 Ctrl-C 或任意生产任务的通用停止器。

| 做法 | 能确认什么 | 选择条件与代价 |
| --- | --- | --- |
| 只读取退出码或最后回复 | CLI 结束方式或回复文本 | 信息不足；本例的失败对照会被误判 |
| 退出后核对进程、文件和会话 | 哪些副作用已发生、历史缺了什么 | 本例可执行；真实系统需定义自己的交付回执 |
| 由任务所有者额外管理已知进程组 | 本例阻止了尚未发生的追加 | 必须掌握准确归属和清理范围；不能恢复已完成副作用或补齐模型历史 |

实际自动化优先把写入设计成可核对、可去重的交付步骤：完成标识与结果绑定，续接时先检查，再继续缺口。本轮没有改造真实业务的幂等性，这属于从实验得出的工程建议，不是已经验证的业务收益。

## 版本、需求与适用边界

**原始复现实验固定在 Gemini CLI 0.67.0；后续状态核对日期为 2026-11-12。** 官方 [0.67.0 Release](https://github.com/google-gemini/gemini-cli/releases/tag/v0.67.0) 原发布为 11-04 20:27 UTC（北京时间 11-05 04:27），实验结果、发行物指纹与源码提交均保持该版本边界。原 Release 所列已合并 [PR #29849](https://github.com/google-gemini/gemini-cli/pull/29849)涉及信号处理、流式取消和工具调度前检查；不能由标题推导本文已启动工具的全部停止结果。

当日交叉阅读的两份独立近 30 天需求为：

- [#30007](https://github.com/google-gemini/gemini-cli/issues/30007)，stars-spark，10-28 13:50 UTC：报告 0.65.0 / 0.66.0 的信号、子命令与会话缺项；原作者也使用过本地端点。本文是另行执行的 0.67.0 实验，不把旧帖直接当新版结论。
- [#29971](https://github.com/google-gemini/gemini-cli/issues/29971)，frabcd，10-27 01:08 UTC：报告 Windows / 固定源码的文件准备阶段取消后仍写入，明确属于 core 工具测试。它支持“取消后要查实际产物”的需求，**不是本文同一故障或 Windows CLI 复现**。

后续官方状态已变化：[PR #30204](https://github.com/google-gemini/gemini-cli/pull/30204)于 11-09 20:16:27 UTC 合并，标题和改动说明涉及 headless 中止时结束子进程、记录取消的工具并保留信号退出码；[#30007](https://github.com/google-gemini/gemini-cli/issues/30007)于两秒后以 completed 关闭。与此同时，官方 [v0.68.0 Release](https://github.com/google-gemini/gemini-cli/releases/tag/v0.68.0)于 11-10 21:17:07 UTC 发布。**本轮没有安装或运行 0.68.0，也没有确认该 Release 是否包含 #30204；合并和关闭状态不能替代指定发行版的实测。**

另一需求 [#29971](https://github.com/google-gemini/gemini-cli/issues/29971)截至本次核对仍 open；关联 [#29973](https://github.com/google-gemini/gemini-cli/pull/29973)已关闭但未合并，[#30051](https://github.com/google-gemini/gemini-cli/pull/30051)仍 open。不同 issue / PR 的症状和状态不相互代替。上述进展不证明所有环境仍有相同问题，也不替代发行版测试。官方 [Headless reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/headless.md)和固定版本 [Policy Engine 说明](https://github.com/google-gemini/gemini-cli/blob/dc6602cec4a6e823aa33937144245dc421e5165f/docs/reference/policy-engine.md)分别用于核对输出与授权配置。

本例验证真实 CLI、真实本地 shell/文件与合成 API 的五组流程；没有测试真实模型推理、生产 API、PTY 键盘中断、SIGHUP、Linux/Windows、业务回滚或真实模型的续跑决策。需求原帖也不代表本站阅读量或读者收益。
