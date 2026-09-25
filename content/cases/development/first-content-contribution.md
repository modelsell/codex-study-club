---
title: "从一篇 Markdown 到可验证的内容贡献"
description: "以 Codex Study Club 为练习仓库，完成一处教程修改、检查构建结果并提交清楚的 PR。"
level: "初学者"
surface: "Codex + 本地仓库"
duration: "20 分钟"
checkedAt: "2026-09-25"
---

# 从一篇 Markdown 到可验证的内容贡献

这份练习使用 Codex Study Club 自身的内容生成流程。目标是让你能说明改了什么、如何确认读者能看到，以及哪些步骤还没有完成。

## 准备工作

准备 Git、Node.js 20.9+、npm 和可访问的仓库。在自己的 Fork 或工作分支中实践，不直接修改别人的未提交文件。练习不需要配置模型 API Key。

```bash
git clone https://github.com/modelsell/codex-study-club.git
cd codex-study-club
npm ci
git switch -c docs/first-content-fix
```

如果你要贡献 PR，先 Fork 仓库并使用自己的克隆地址；上面的地址适用于本地练习。

## 给 Codex 一个能验收的任务

```text
阅读 AGENTS.md、README.md 和 content/README.md。
从 content/cases 中选一篇教程，找出一个读者难以执行或核验的步骤。
只修改这一篇文章，补齐前提、预期结果和失败时的排查方向。
涉及产品事实时，读取官方原文并附来源与核对日期。
运行 npm run lint 和 npm run build，检查生成内容与差异。
最终列出修改、实际执行的验证和没有验证的部分。
```

选择你能理解的文章。原文存在事实错误时纠正事实；只有表达模糊时改清楚步骤，不虚构测试成功。

## 验证内容是否进入网站

```bash
npm run lint
npm run build
npm run start
```

构建会运行 `scripts/generate-content-data.mjs`，将 Markdown 转换为 `lib/generated-content.json`。普通案例页面的地址是 `/cases/文件名`，不包含 `.md` 或案例分类目录。例如本页对应 `/cases/first-content-contribution`。

在浏览器中访问 `http://localhost:3000/cases/first-content-contribution`。如果你改的是另一篇文章，替换最后的文件名。检查标题、正文、链接和图片；命令退出成功不替代页面检查。新内容未出现时确认命令在正确仓库执行，并在重新构建后重启生产服务。

## 提交前检查

```bash
git status --short
git diff --check
git diff --stat
git diff -- content/cases/development/first-content-contribution.md
```

把最后一行替换为实际修改的文章路径，并检查生成文件只含预期内容变更。只暂存本次修改；不要提交 `.env.local` 或无关文件。PR 描述可以按下面格式填写：

```text
解决的问题：读者在第几步无法判断是否成功。
改动：补充了什么前提、步骤或结果说明。
来源与核对日期：实际读过的一手资料。
验证：实际执行的命令，以及本地页面检查结果。
未验证：例如没有生产发布权限，尚未验证线上更新。
```

## 怎样才算完成

本地构建通过、页面正文可见、PR 包含正确差异，是这次内容练习的验收点。PR 创建、合并和生产页面更新是不同阶段，分别记录状态。没有贡献账号或推送权限时，仍可保留本地差异作为练习结果，但应明确尚未提交 PR。

## 依据与适用范围

核对日期：2026-09-25。本文依据本仓库的 [内容规则](https://github.com/modelsell/codex-study-club/blob/main/content/README.md)、[生成脚本](https://github.com/modelsell/codex-study-club/blob/main/scripts/generate-content-data.mjs) 与 [案例页面](https://github.com/modelsell/codex-study-club/blob/main/app/cases/%5Bslug%5D/page.tsx) 整理。命令针对当前仓库；其他项目应使用各自的构建和测试约定。
