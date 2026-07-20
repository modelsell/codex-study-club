---
title: "AGENTS.md 和 Skill 的区别"
terms:
  - "agents.md"
  - "agents"
  - "skill"
  - "plugin"
  - "区别"
sources:
  - label: "OpenAI Codex 文档"
    href: "https://developers.openai.com/codex/"
  - label: "社群整理：AGENTS.md 边界"
    href: "/community/updates/agents-md-practical-boundaries"
---

AGENTS.md 保存某个仓库长期有效的工作规则，例如目录边界、常用命令和验证要求。Skill 保存一类任务可重复执行的专项流程，例如代码审查、修复 CI 或生成演示文稿。

- 只对这个项目长期有效：写进 AGENTS.md。
- 换一个项目仍然可以重复执行：做成 Skill。
- 只对当前一次任务有效：直接写在任务描述中。
