---
title: "OpenCode v2 模型配置验收：请求真的到了目标服务吗"
description: "用官方 CLI 和本地模拟端点做五组对照，追踪无效 provider、默认回退与显式模型选择。附可运行脚本；验证配置和传输，不评价真实模型、额度或 Desktop。"
level: "进阶"
surface: "OpenCode CLI 2.2.5 · macOS arm64"
checkedAt: "2026-11-04"
---

# OpenCode v2 模型配置验收：请求真的到了目标服务吗

你给 OpenCode 配置了自己的模型服务，配置文件也保存了，但目标服务的日志里没有这次请求。应该检查 API 地址、模型名称，还是配置根本没有被接受？

本文面向要接入自建服务或兼容接口的 CLI 使用者。我们实际运行官方 **OpenCode CLI 2.2.5**，把它连接到一个只返回固定文本的本地 HTTP 端点，再只改变一个配置字段，比较默认选择、显式模型选择和关闭内置 provider 的结果。**客户端是真实 CLI；端点是模拟服务，没有调用真实模型。**

最关键的观察是：在本次固定版本和隔离环境中，`reasoning` 写成错误类型后，整个 `probe` provider 被丢弃；默认选择显示成了内置 `big-pickle`，本地服务收到的请求为零。加上 `--model probe/probe-1` 后，同一个错误配置明确报 `Model unavailable`。修正字段类型后，本地端点实际收到指定模型的请求，CLI 读回固定响应。

## 先区分四个能分别核对的环节

| 环节 | 本文怎样检查 | 能回答什么 |
| --- | --- | --- |
| 配置写入 | 每组使用独立目录和生成的 JSON | 这次究竟提交了哪些值 |
| 配置接受 | CLI 的配置诊断与固定版本解析代码 | provider 是否真正进入可用配置 |
| 模型选择 | CLI 显示的模型、显式选择的错误结果 | 本次解析成了哪个目标 |
| 请求抵达与响应 | 本地服务记录路径、body 中的 model，再由 CLI 读回标记 | 配置有没有落实为一次实际传输 |

这四件事不是同一条证据。配置可以是合法 JSON，却不符合字段类型；模型名可以出现在文件里，却没有进入最终可用列表。只有看清它们的关系，才知道应该改配置、改选择方式，还是继续查服务端。

官方 [Providers](https://opencode.ai/v2/docs/providers/#custom) 把 provider ID、运行包、`settings.baseURL` 和模型定义分别列出。这里的 `probe/probe-1` 中，前半段是 provider ID，后半段是该 provider 下的模型 ID；显示名称不承担路由标识的作用。

## 实验输入：一个端点、一条合成请求、五份独立配置

实际环境为 **macOS 27.2 / arm64、Python 3.9.6、OpenCode CLI 2.2.5**。使用的是官方 Release 的 `opencode-darwin-arm64.zip`，不是从当前开发分支临时编译的客户端。

脚本在系统临时目录创建五组配置、数据和缓存目录，用 `run --standalone` 启动私有服务。它保留原来的 HOME，通过 XDG 路径及该版本的实验目录变量隔离状态；对子进程应用 `sandbox-exec`，只允许回环网络，并阻断真实用户主目录和系统 OpenCode 配置的读取。运行前会检查本地连接可达、非回环连接被拒绝、真实主目录读取被拒绝；任一检查失败就停止。

输入只有合成标记 `TRANSPORT_LAB_ONLY`，不附项目文件、不连接已有账号。模拟端点只记录请求路径、模型 ID、是否流式和是否含标记，不保存消息、认证头或原始日志。它返回固定的 `LOCAL_ENDPOINT_OK`，不调用模型，也不生成工具调用。

有效 provider 的结构如下。**8765 是结构示例端口，完整脚本会动态选择空闲端口。**

```json
{
  "update": "disable",
  "share": "disabled",
  "snapshots": false,
  "model": "probe/probe-1",
  "providers": {
    "probe": {
      "name": "Loopback Probe",
      "env": ["PROBE_API_KEY"],
      "package": "@opencode/ai/providers/openai-compatible",
      "settings": {
        "baseURL": "http://127.0.0.1:8765/v1",
        "timeout": 3000
      },
      "models": {
        "probe-1": {
          "name": "Probe 1",
          "capabilities": {
            "tools": false,
            "reasoning": {"supported": false},
            "input": ["text"],
            "output": ["text"]
          }
        }
      }
    }
  }
}
```

`PROBE_API_KEY` 只在实验子进程里设置为明确的合成占位值。失败组仅把 `reasoning` 的对象改成布尔值 `true`；不是在比较“开启推理”与“关闭推理”，而是在比较有效与无效的字段类型。

## 跑完一个完整对照

<a href="/templates/opencode-provider-request-lab.py" download="opencode-provider-request-lab.py">下载 CLI 请求验收脚本</a>

在一个新的实验目录保存脚本，再取得对应的官方二进制。Python 脚本只用标准库，没有 pip 依赖；它固定为 macOS arm64，其他平台不能直接套用这个二进制指纹。

```bash
curl -fL -o opencode-darwin-arm64.zip \
  https://github.com/anomalyco/opencode/releases/download/v2.2.5/opencode-darwin-arm64.zip
shasum -a 256 opencode-darwin-arm64.zip
```

压缩包应为 **105851917 字节**，SHA-256 为 `25ba9908979fa7d764792c82589b4b5768ab1511154e0317d98aa77d216ce767`。这是本轮下载后与 GitHub Release 发行物 digest 核对的值。匹配后再解压运行：

```bash
unzip opencode-darwin-arm64.zip
chmod u+x opencode
python3 opencode-provider-request-lab.py --binary ./opencode
```

脚本还会在执行客户端前核对解压后二进制的 SHA-256：`abe4d88594bffb12b364375b8a6732d2d1f7a977195ed1a35c5c76f8e89c9e0e`。指纹不符会拒绝运行，不能把它当成任意版本的通用检测器。下载发行物需要网络；实验中的 CLI 子进程只能访问回环地址。

输出是五组断言结果及预检查状态，临时目录在结束后清理。无效默认组设置了 **12 秒观察期限**，到期由脚本终止自己的进程组；这个停止是实验设计，不是一次模型任务的正常完成，也不是远端服务超时基准。

## 五组实际结果

| 配置与选择方式 | CLI 的实际表现 | 本地端点证据 |
| --- | --- | --- |
| 有效配置，使用配置中的默认模型 | 正常结束，读回 `LOCAL_ENDPOINT_OK` | 1 次 `/v1/chat/completions`，model 为 `probe-1`，stream 为 true |
| 无效配置，使用默认模型 | provider 诊断为 invalid，显示 `big-pickle`；12 秒后被观察脚本停止 | 0 次请求 |
| 同一无效配置，显式 `--model probe/probe-1` | 退出 1，报 `Model unavailable: probe/probe-1` | 0 次请求 |
| 有效配置，显式 `--model probe/probe-1` | 正常结束，读回固定标记 | 同样 1 次指定路径、指定模型的流式请求 |
| 无效配置，再加 `disabled_providers: ["opencode"]` | 退出 1，报没有可用模型 | 0 次请求；该隔离环境没有其他已连接 provider |

两组有效请求中，服务端确实看到了合成输入标记，CLI 也实际读回了端点返回的文本。它证明的是这条本地配置与传输链能走完。固定响应没有模型理解能力，不能据此评价模型效果、工具使用、推理支持或真实服务兼容性。

默认失败组只能支持更窄的结论：**本地 provider 被拒绝后，客户端显示选择了内置模型。** 外网由实验主动阻断，没有完成向远端提供商的传输，不能把这组结果写成“本站已经将请求发到该远端”。

## 为什么一个字段会影响整个 provider

本轮把源码固定在 Release 标签对应的提交 `9bbb8ce18c80f099e0e448775f59d965ead40a21`，核对相关原始文件与该提交的 Git blob；源码阅读与发行二进制测试是两份相互参照的证据，没有声称自行重建出相同二进制。

路径可以分三段看：

1. [`normalize.ts` 解析 provider 映射](https://github.com/anomalyco/opencode/blob/9bbb8ce18c80f099e0e448775f59d965ead40a21/packages/core/src/config/normalize.ts#L168)：按整个 provider 的 schema 解码。下方 [`decodeMap` / `decodeEncoded`](https://github.com/anomalyco/opencode/blob/9bbb8ce18c80f099e0e448775f59d965ead40a21/packages/core/src/config/normalize.ts#L736) 会跳过解码失败的条目并留下诊断，所以这里不是只丢一个 `reasoning` 字段。
2. [`Model.default`](https://github.com/anomalyco/opencode/blob/9bbb8ce18c80f099e0e448775f59d965ead40a21/packages/core/src/model.ts#L300) 先找配置要求的模型；找不到已启用的目标时，再选可用的文本模型。本轮无有效 `probe`，又没有其他账号，因此显示出内置默认项。
3. 显式模型选择走实际的模型解析流程。本轮指定不存在的 `probe/probe-1` 时直接失败；这是为什么同一份错误配置，在两种选择方式下给出不同结果。

这条解释与实际失败、修正后请求到达的对照吻合。它不意味着每一种配置错误都会触发相同回退，也不说明后来版本仍然如此。

## 三种做法怎样选

**先修正字段，再看服务端回执，是完整处理。** 本例把布尔值改回 schema 接受的对象后，两种选择方式都能抵达目标端点。只有修正配置并验证请求，才能交付可用连接。

**在自动化命令里显式指定模型，可以让本例的缺失目标明确失败。** 本轮执行的是 `opencode run --standalone --model probe/probe-1`，没有把“写了默认值”作为最终验收。代价是命令或运行配置需要维护明确的 provider/model ID；合法但填错的地址仍需要服务端证据，CLI 不知道你的业务意图。

**禁用内置 provider，只收窄可选范围。** 本例隔离环境关闭 `opencode` 后没有其他可用目标，所以失败。真实环境若还连着别的 provider，不能据此推导“永远只会去我的服务”；它也没有修好被拒绝的配置。

接到自己的网关时，可沿用本实验的三个验收点：客户端实际选择、入口收到的 model/请求、客户端读回结果。但如果网关还会转发，入口的 model 字符串只代表请求标签；要确认上游实际使用哪个模型，还要继续核对网关与上游回执。本轮没有执行那一段，不能用本地模拟端点为整条生产调用链背书。

## 需求、版本和未覆盖的入口

本轮于 **2026-11-04** 交叉阅读两份独立需求：[#58909](https://github.com/anomalyco/opencode/issues/58909)（iceteaSA，10-25）报告无效 provider 与默认回退；[#60279](https://github.com/anomalyco/opencode/issues/60279)（iEsclyOrg，10-29 UTC）描述 Windows Desktop 2.2.1 中切换服务及自定义 provider 入口的困难。前者仍 open，后者按 duplicate 关闭，不等于两项问题都恢复。它们支持“如何确认配置真的生效”的选题，不代表本站阅读量或同一故障的发生率。

相关 [PR #59238](https://github.com/anomalyco/opencode/pull/59238) 在核对时仍未合并。作者和机器人的回测属于上游报告，不替代本文对已发行版本的测试；我们没有安装该 PR 或宣称修复已发布。

官方 [v2.2.5 Release](https://github.com/anomalyco/opencode/releases/tag/v2.2.5) 原发布为 **2026-10-30 23:17 UTC**，不是 11-04 新版。当前 [v2 安装说明](https://opencode.ai/v2/docs/)指向 `@opencode/cli`，本轮 npm 元数据也为 2.2.5；不要仅凭仓库 GitHub Latest 标记选择 v2 客户端。本实验只覆盖该固定发行物的 macOS CLI、本地配置和合成 HTTP 流程，**未测试 Desktop、Windows、真实模型、账号登录、服务额度或远端任务。**
