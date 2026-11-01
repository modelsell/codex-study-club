---
title: "DeepSeek Super-agent 开源了：能接什么任务，试用前查什么"
excerpt: "核对 dsh-superagent 研究原型的官方仓库、授权和部署文档，以及两位独立使用者的反馈。它面向单个 GitHub 仓库，可选接飞书；附任务验收卡。本站未安装或运行原型，不把架构设想当已实现功能。"
date: "2026-11-01"
displayDate: "11.01"
topics:
  - "Agent 产品动态"
  - "DeepSeek"
  - "团队自动化"
---

# DeepSeek Super-agent 开源了：能接什么任务，试用前查什么

如果你想让 Agent 接收仓库里的任务，处理完再把结果交回原讨论，DeepSeek 这次开源值得看。它公开了任务进入、授权、执行和回传的设计，便于逐项核对。

**先认准项目：官方组织下的 [dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)。README 明确说它是供研究参考的原型，并非 DeepSeek 正式产品，也未达到生产就绪状态。** 公开代码与内部版本、架构文章描述并不完全相同，部分设计尚未实现。

首个可见[提交记录](https://github.com/deepseek-ai/dsh-superagent-prototype/commit/6337fc823ce20251c8de8085948165c81aaa701e)标注 **2026-10-31**；本站资料核对日期为 **2026-11-01**。核对时 package.json 为 **0.1.0**，仓库没有 GitHub Release，不把这个包版本称为正式产品发布版。本站没有安装或运行该原型，本文是资料简报和试用前的验收建议。

## 它能接哪类工作

据[官方 README](https://github.com/deepseek-ai/dsh-superagent-prototype#readme)，它打包为 DeepSeek Harness 的 bundle，面向**一个 GitHub 仓库**，监听 GitHub，也可选接入飞书。获准的人提出工作请求后，它建立工作项，在独立会话和目录中处理，再回到原对话交付，例如提供 Pull Request。Web 面板用于查看需要人介入的事项。

适合先研究小范围仓库维护：一条明确请求、一个可审查的改动、一份验证结果。这里不是已实测成功的任务清单，也不意味着它会自动合并、部署或代替负责人判断。

与单纯“开一个会话让它写代码”相比，值得观察的是：**请求有没有收到、谁授权了它、任务卡在哪里、产物有没有交回去**。这些环节能逐项验收，才能讨论团队是否真的少花了精力。

## “观察模式”不代表所有请求都只观察

[官方授权文档](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/002-authorization.md)区分两条路径：

- 获准用户直接向 Agent 提出请求，可以进入显式任务路径。
- 系统根据消息推断出的候选工作，再受 `off`、`observe`、`auto` 模式与团队规则约束；默认 `observe` 会记录“本来会接”的判断，不接下这类推断任务。

**显式请求在三个模式中都可以工作。** 因此，不能把 `observe` 理解成“任何操作都不会发生”。消息或引用文档是待判断的输入，也不能自行改变权限。这是文档规定，本站尚未进行运行时授权测试。

## 独立工作目录也不等于操作系统隔离

[官方部署文档](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/006-deployment.md)要求独立的 Harness profile 和 Agent GitHub 账号，可选飞书机器人。它还明确说明：Router / Worker preset 以操作系统用户身份运行，使用 `danger-full-access`；账号包装器负责选择凭据，并不提供进程隔离。

准备试用时，先对照该文档审查账号、目录、依赖和操作系统权限。不要把“每个任务有自己的目录”写成“已经进入安全沙箱”。本文不提供一键接入现有生产仓库的命令。

版本也需要成套记录：[package.json](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/6337fc823ce20251c8de8085948165c81aaa701e/package.json)声明 Node `^22.19.0 || >=24.0.0`、DSH `^0.2.1-alpha.2`；部署文档还列有 pnpm、git、Python、tmux 和 GitHub CLI 等前提。这里是当前公开源码的要求，不代表任意 Harness 版本都能加载。

## 为什么先写验收，而不是“装好就能用”

两份独立的一手反馈给出了具体需求：

- [Discussion #11700](https://github.com/deepseek-ai/deepseek-harness/discussions/11700)，页面标注 **2026-10-31**。作者报告在 WSL2 / Ubuntu、Node 24、DSH 0.2.1-rc.5 上遇到服务状态识别和 GitHub mention 延迟接收的问题，并提供自己的修订与测试说明。
- [Discussion #11714](https://github.com/deepseek-ai/deepseek-harness/discussions/11714)，页面标注 **2026-11-01**。另一位 macOS 使用者报告安装、版本匹配和插件加载失败时的恢复困难；文章说明由 Agent 代笔，包含作者标记为已复现与尚未确认的内容。

这些反馈证明有人正在尝试，也说明“装上了”和“任务可靠交付”之间还有检查点。**它们是作者报告，本站未复现，不是官方统一根因或已修复的证明。** 同一条新闻的多站转载、Star 数和第三方 fork 也不替代这两份独立需求。

## 先用一张小任务验收卡

开始前读[官方部署指南](https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/006-deployment.md)，把范围限定在可审查的小任务。以下是待执行的验收模板，不是本站成功案例：

```text
目标：处理一个小改动，先提交可审查的 PR，由人决定是否合并。
范围：固定一个测试仓库、允许的请求人、任务目录和操作边界。
版本：记录原型提交、Harness / Node / git / gh 的实际版本。
接收：保存请求链接；确认它形成 Ticket，而不只看聊天已发送。
执行：核对对应 Session、目录、差异和真实检查结果。
交付：确认原讨论收到结果链接，PR 与验证记录属于同一次任务。
失败对照：若没有 Ticket、服务状态异常或没有回传，分别记录阶段；
          不因一次 status=0、页面提示或模型说完成就判为成功。
```

暂时只想了解方向的读者，可以先读源码与文档，不急着部署。已经试用的人，最有价值的后续样本是：**固定版本、请求链接、Ticket、产物和失败阶段**，而不是一句“全自动跑起来了”。

## 来源与验证范围

以上官方仓库、提交、package.json、授权/部署文档及两份 Discussion 均于 **2026-11-01** 读取。原型采用 MIT 许可；原始项目与同名的其他 Superagent 产品应分开识别。本文完成资料交叉核对，未执行 Harness 安装、GitHub/飞书接入、模型任务、通知恢复或部署隔离测试，也没有测量成本和效率收益。
