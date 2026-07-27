---
title: "Codex 0.145 迁移指南：从 Cursor / Claude Code 带走配置与近期工作"
excerpt: "Codex 0.145 扩展了导入能力，可迁移指令、Skills、插件、MCP、会话与项目记忆；真正重要的是导入后如何复核权限、认证和 Hooks。"
date: "2026-07-27"
displayDate: "07.27"
topics:
  - "Codex CLI"
  - "迁移指南"
  - "Skills 与 MCP"
---

# Codex 0.145 迁移指南：从 Cursor / Claude Code 带走配置与近期工作

> 来源核对：OpenAI 于 2026 年 7 月 21 日在 [Codex changelog](https://learn.chatgpt.com/docs/changelog) 发布 Codex CLI 0.145.0，并明确扩展 `/import` 对 Cursor 和 Claude Code 的迁移能力；本文于 2026 年 7 月 27 日对照 [Import from another agent 官方文档](https://learn.chatgpt.com/docs/import) 复核导入范围与检查项。

## 为什么这次更新值得单独关注

以前从另一个 coding agent 迁移，最耗时间的往往不是安装工具，而是重新整理指令、MCP、Skills、命令和近期上下文。Codex 0.145.0 把这些内容纳入导入流程，并且不会修改或删除原有 agent 的设置。

这不等于“一键迁移后行为完全相同”。不同工具对权限、Hooks、命令参数和认证方式的解释可能不同，导入完成只代表文件和配置已经转换或关联，不能代替复核。

## 官方列出的迁移映射

| 原有内容 | 导入到 Codex / ChatGPT 后 |
| --- | --- |
| 指令文件 | `AGENTS.md` |
| `settings.json` | `config.toml` |
| Skills | Skills |
| Plugins | Plugins |
| 现有项目文件夹 | 使用原文件夹的 Projects |
| 最近 30 天聊天 | ChatGPT chats |
| MCP server 配置 | Codex MCP 配置 |
| Hooks | Codex hooks |
| Slash commands | Skills |
| Subagents | Codex agents |

0.145.0 的发布说明还包括更完整的线程历史与恢复、持久化名称、搜索、子代理和记忆支持，这让迁移后的长期工作更容易继续，而不是只搬走静态配置。

## 两条导入入口

- 在支持的 Codex CLI 版本中使用 `/import`，按提示选择来源与内容。
- 在 ChatGPT 桌面应用打开 **Settings > Import**；如果还没有独立的 Import 区域，可到 **General > Import other agent setup** 查看。

桌面入口和具体支持来源可能随分批开放而变化。先确认当前客户端已经出现对应入口，不要因为看不到按钮就手动覆盖配置文件。

CLI 可以用下面的命令检查和更新：

```bash
codex --version
npm install -g @openai/codex@0.145.0
```

如果团队锁定了 Codex 版本，应先在测试环境评估，不要绕过项目的版本策略。

## 导入完成后必须复核的五类内容

### 1. 权限与工具限制

检查导入的 Skills、Agents 和项目规则是否扩大了命令、目录或网络访问范围。原工具里的“默认允许”不一定对应 Codex 的权限模式。

### 2. MCP 认证与传输方式

使用自定义 Header、环境变量、OAuth 或特殊 transport 的 MCP server 可能需要重新登录。不要把密钥直接写进 `config.toml` 或提交到仓库。

### 3. Hooks 的触发时机

逐个确认 Hooks 在什么生命周期触发、失败时是否阻止任务，以及执行命令的工作目录。导入成功不代表行为完全等价。

### 4. 命令模板与路径占位符

Slash commands 会迁移为 Skills。检查参数、Shell 插值和文件路径占位符，尤其是依赖特定 Shell 或全局目录的命令。

### 5. 项目级与用户级边界

导入流程会同时检查机器上的用户级设置和所选仓库中的项目级设置。确认哪些规则应该全局复用，哪些只应该留在单个仓库，避免把临时项目约束变成全局默认。

## 推荐的最小验证流程

1. 先只导入一个低风险项目和必要设置，不要一次迁移全部工作区。
2. 打开导入结果中的状态卡，完成仍需授权的插件或连接。
3. 让 Codex 只读列出已发现的 `AGENTS.md`、Skills、MCP、Hooks 和 Agents，不执行任务。
4. 运行一个不修改文件的验证任务，检查命令、目录和权限是否符合预期。
5. 再运行一个可回滚的小改动，复核 diff、测试和 Git 目标仓库。

## 今天可以怎么用

如果你正同时维护 Cursor 或 Claude Code 配置，先把导入当成“生成迁移草稿”，而不是最终切换开关。保留原设置，完成上述复核后再决定哪些规则长期留在 Codex；这比导入后立刻清理旧环境更容易发现行为差异。
