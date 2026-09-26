---
title: "Codex 是什么：按任务选择使用入口"
description: "区分桌面应用中的 Codex、CLI、IDE 和云端任务，从熟悉的工作环境完成第一次可验证练习。"
checkedAt: "2026-09-26"
---

# Codex 是什么：按任务选择使用入口

Codex 可以帮助你阅读项目、修改代码和运行开发工具。选择入口时，先看代码在哪里、你希望在哪里检查结果，不必先学完所有界面。

::: tip 核对范围
官方资料最后核对日期：2026-09-26。本页根据当前官方文档整理入口关系，没有对所有系统、账号和入口逐一实测。功能是否显示，以当前版本和工作区权限为准。
:::

## 从你熟悉的环境开始

| 你的任务 | 可以选择的入口 | 接下来读什么 |
| --- | --- | --- |
| 在本机文件夹中做项目，希望同时查看任务和文件 | 桌面应用中的 Codex | [桌面安装与首次验证](/start/02-app-installation) |
| 已经在终端工作，希望运行仓库命令或脚本 | Codex CLI | [CLI 官方入门](https://learn.chatgpt.com/docs/codex/cli) |
| 正在编辑器里阅读和修改代码 | Codex IDE 扩展或对应 IDE 集成 | [IDE 官方入门](https://learn.chatgpt.com/docs/codex/ide) |
| 希望交给云端编码环境处理任务，稍后审查结果 | Codex cloud | [官方桌面页的入口对照](https://learn.chatgpt.com/docs/app) |

CLI 面向终端中的代码、命令与自动化；IDE 入口适合带着已打开的文件和选区协作。这里没有固定的“先 CLI、后桌面”学习顺序，选择你已经会检查文件差异的环境即可。依据：[CLI 文档](https://learn.chatgpt.com/docs/codex/cli)、[IDE 文档](https://learn.chatgpt.com/docs/codex/ide)。

## 桌面里的 ChatGPT 和 Codex 怎么区分

当前[官方快速开始](https://learn.chatgpt.com/docs/quickstart)以 ChatGPT 桌面应用为入口：编程任务可在应用的产品选择菜单中选择 Codex；ChatGPT 的 Chat 和 Work 是另外的工作方式。旧版教程可能仍称它为“Codex App”，界面和命名应结合自己的版本辨认。

网页上的 ChatGPT 对话与本机已打开的代码文件夹，也不应被默认视作同一份任务上下文。开始前写清项目、目标和允许改动的范围。

## 第一个任务先做到可以核验

在一个你熟悉的示例项目中，尝试下面这段任务描述：

```text
读取 README 和项目入口，解释这个项目如何启动。
列出你实际查看的文件、找到的启动命令，以及还不能确认的前提。
这一步只阅读，不修改文件，也不安装依赖。
```

这是本站提供的入门练习，预期输出是项目说明和可追溯的文件位置。你应自己打开文件检查依据；回答得很完整，不代表项目已成功启动。

然后选一个小任务，例如修正 README 中的一处错误。约定验收方法，检查 diff，再决定是否保留。需要完整练习时，可继续阅读[第一个任务](/start/06-first-task)或[内容贡献练习](/cases/first-content-contribution)。

## 下一步

先完成[桌面安装与首次验证](/start/02-app-installation)，再核对[账号、套餐与可用范围](/start/03-account-plan)。模型与套餐会变化，本文不把某个固定付费档位作为学习前提。
