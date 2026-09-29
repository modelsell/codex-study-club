---
title: "安装 Codex CLI：分开验证安装、登录与任务"
description: "选择官方安装方式，检查 CLI 版本和登录状态，再进入自己的项目执行第一个只读任务。"
checkedAt: "2026-09-29"
---

# 安装 Codex CLI：分开验证安装、登录与任务

::: tip 最后核对
官方资料最后核对日期：2026-09-29。安装入口依据 [Codex CLI](https://learn.chatgpt.com/docs/codex/cli)，登录与状态检查依据 [Authentication](https://learn.chatgpt.com/docs/auth)。本轮只核对文档，没有重新安装 CLI 或执行账号登录。
:::

CLI 适合已经愿意使用终端的读者。安装程序能运行、账号能登录、项目任务能完成，是三个独立的检查点，按顺序排查更容易定位问题。

## 1. 选择与你的环境匹配的安装方式

官方安装页提供 macOS/Linux、Windows、npm 和 Homebrew 选项。不要把 Node.js 或 WSL2 当作所有方式的统一前提；按照你选择的安装页签准备环境。

macOS 或 Linux 可使用官方独立安装器：

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

这是下载并执行安装脚本的命令，只应使用官方地址，并在自己有权安装软件的环境中执行。更新独立安装器版本也使用这条命令。

Windows 用户打开[官方安装页的 Windows 选项](https://learn.chatgpt.com/docs/codex/cli#install-codex)，按该页当前命令操作；已有 npm 或 Homebrew 管理习惯的读者可以选择对应页签。后续更新也沿用同一安装方式，避免机器上多个副本造成混淆。

## 2. 确认终端能找到程序

安装完成后重新打开终端，运行：

```bash
codex --version
```

看到版本信息只说明当前终端能找到 CLI。如果提示命令不存在，先检查安装输出中的失败位置和 PATH 设置；不要通过重复更换安装方式掩盖原来的错误。若机器上已有多个副本，先确认当前终端实际使用哪个，再决定更新方式。

这一步不需要输入 API Key，也不能证明账号和网络已就绪。

## 3. 登录并检查状态

```bash
codex login
codex login status
```

ChatGPT 登录会打开浏览器；完成后回到终端看结果。CLI 也支持 API Key 登录，但 API 用量使用独立的 API 计费，不能把它当成已包含在 ChatGPT 订阅里。账号方式与第三方配置的区别见[账号与套餐](./03-account-plan.md)和[API 配置](./04-third-party-api.md)。

不要将密钥、登录缓存或完整认证日志贴进 Issue。登录失败时，记录所用方式、失败阶段和脱敏报错；先解决认证问题，再运行实际任务。

## 4. 进入自己的项目

先在终端进入你准备练习的目录，再启动：

```bash
codex
```

第一条请求只读了解项目：

```text
请先阅读项目说明和 AGENTS.md，概括目录结构与可用检查命令。
不要修改文件、安装依赖、提交或发布。
若资料不足，明确列出缺少的依据。
```

验收时核对它提到的文件是否存在，命令是否来自当前项目。工具安装成功但项目回复失败时，保留错误，把网络、权限和项目环境分别排查；无需先卸载重装。

下一章用一个小改动练习[CLI 的第一轮工作](./11-cli-first-run.md)。
