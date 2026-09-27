---
title: "连接第三方 API：先分清登录与供应商配置"
description: "区分 ChatGPT 登录、OpenAI API Key 与自定义供应商，按官方字段准备最小配置，并逐项验证兼容性。"
checkedAt: "2026-09-27"
---

# 连接第三方 API：先分清登录与供应商配置

::: tip 最后核对
官方资料最后核对日期：2026-09-27。本章是配置说明，没有调用第三方服务、测试真实密钥或验证第三方启动器。已能正常使用 Codex 的新手，可以直接进入[第一个任务](./06-first-task.md)。
:::

## 先确认自己要接入什么

| 方式 | 需要准备 | 核验入口 |
| --- | --- | --- |
| ChatGPT 登录 | 可用的 ChatGPT 账号及相应访问权限 | 客户端账号状态与工作区 |
| OpenAI API Key 登录 | 自己获准使用的 OpenAI Platform Key | 官方登录流程、API 用量与功能范围 |
| 自定义模型供应商 | 供应商地址、模型标识、鉴权方式与协议说明 | 用户级 provider 配置及供应商侧记录 |

前两项是官方文档说明的登录方式；第三项是在配置中定义请求发往哪里。更换供应商不等于获得 ChatGPT 订阅功能，也不能凭模型名称判断实际后端。登录与计费区别见[官方认证说明](https://learn.chatgpt.com/docs/auth)，账号可用范围见[上一章](./03-account-plan.md)。

OpenAI API Key 登录可使用部分受支持的官方精选插件，但某些依赖 OAuth 的连接不可用。因此不应把“API Key 登录”概括为“完全不能用插件”，也不能把官方 Key 的功能范围直接套用到第三方服务。[官方插件说明](https://learn.chatgpt.com/docs/plugins#api-key-availability)

## 自定义供应商的最小配置

先取得供应商提供的 **API 基础地址、模型 ID、密钥环境变量与 Responses 协议兼容说明**。如果只有“兼容 OpenAI”的宣传，仍需确认工具调用、流式输出和请求格式，不能据此推定能运行 Codex。

当前官方配置要求把 provider 设置放在用户级 `~/.codex/config.toml`；若自定义了 `CODEX_HOME`，则使用对应目录。项目内 `.codex/config.toml` 的 provider 和鉴权路由设置会被忽略并产生启动警告。[高级配置](https://learn.chatgpt.com/docs/config-file/config-advanced)

编辑前保存现有配置的私有备份，保留已有设置。以下是字段示意，**不能原样运行**：地址与模型都是占位符，替换为你已获准使用的服务信息，并确保表名没有与已有配置重复。

```toml
model = "REPLACE_WITH_PROVIDER_MODEL_ID"
model_provider = "my_provider"

[model_providers.my_provider]
name = "My provider"
base_url = "https://api.example.com/v1"
wire_api = "responses"
env_key = "MY_PROVIDER_API_KEY"
requires_openai_auth = false
```

`model`、`model_provider` 是顶层字段，应放在任何表声明之前或现有顶层区域；不要粘贴到已有 `[其他表]` 内。

| 字段 | 应检查什么 |
| --- | --- |
| `model_provider` | 与 `[model_providers.my_provider]` 的 ID 一致；不要占用内置的 `openai`、`ollama`、`lmstudio` |
| `base_url` | 使用供应商明确给出的基础地址；不要自行猜测路径或重复附加 `/responses` |
| `wire_api` | 官方当前支持的值为 `responses`；改成 `chat` 不能直接解决协议不兼容 |
| `env_key` | 值是环境变量名称；启动 Codex 的进程必须能取得该变量 |
| `requires_openai_auth` | 本例使用供应商自己的 Key；不要为获取额外功能而随意改成 OpenAI 鉴权 |

字段含义以[官方配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)为准。使用密钥管理工具或受控的环境变量注入方式提供 `MY_PROVIDER_API_KEY`，不要把实际值放进文章、聊天、仓库或截图。无需照着旧截图手工编辑 `auth.json`。

## 从检查配置到确认请求

建议先在 CLI 中验证环境变量是否传给了同一个启动进程，避免同时排查桌面启动方式和供应商配置。准备好变量后，可在自己的练习目录运行：

```bash
codex --version
codex
```

然后发送一个范围明确的任务：

```text
只读列出当前练习目录的文件，并指出一个确实存在的文件名。
如果目录为空，就明确说明为空。不要修改文件，也不要读取凭据文件。
```

验收时分别检查：配置能加载、服务能响应、工具能读取允许的目录、结果与目录实际内容一致。需要确认请求是否到达指定供应商时，查看自己有权访问且已脱敏的服务侧请求/用量记录；模型的自我介绍不是验证证据。配置能加载也不代表所有工具、插件和长任务均兼容。

桌面应用与终端的环境变量继承方式可能不同。本章不承诺 `open -a` 会传递当前 shell 的变量；CLI 成功后，再按客户端和供应商的受支持方式检查桌面接入。

## 失败时按阶段排查

| 现象 | 下一步 |
| --- | --- |
| 启动时报配置错误 | 检查 TOML 表位置、重复字段、客户端版本和错误行号 |
| 提示缺少环境变量 | 检查启动进程是否取得 `env_key` 指定的变量；不打印密钥值 |
| 请求返回认证或路径错误 | 分别核对供应商鉴权、Key 权限与基础地址 |
| 能聊天，但工具调用失败 | 核对 Responses 工具调用与流式能力，不能只用普通聊天成功作判断 |
| 切换后功能或历史显示变化 | 先记录客户端版本和配置差异，按备份恢复本次改动，再核对官方说明 |

如需回退，退出相关客户端，仅恢复本次修改的配置项，再按官方流程确认原登录状态。不要覆盖之后新增的其他配置或把凭据文件作为普通备份分享。

## 第三方管理工具的范围

旧版文章包含 Codex++、CCX、CC Switch 的界面和安装步骤。本次没有复核这些项目的当前安装包、命令与兼容性，因此移除了逐步操作和“配置后必定可用”的表述。若以后采用此类工具，应先核对项目自身文档、版本、实际写入的配置及回退方法；本章的手动示例不代表对任何工具或供应商的实测背书。

下一步：[认识项目、任务与运行位置](./05-app-overview.md)。
