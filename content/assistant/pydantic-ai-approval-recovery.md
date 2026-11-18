---
title: "Pydantic AI 审批恢复与执行回执"
terms:
  - "Pydantic AI"
  - "pydantic-ai-slim"
  - "DeferredToolResults"
  - "DeferredToolRequests"
  - "Pydantic AI 2.69.0"
  - "HandleDeferredToolCalls"
  - "RequestInput"
  - "resume token"
sources:
  - label: "Pydantic AI 审批恢复：八组 SDK 与 SQLite 对照"
    href: "/cases/pydantic-ai-approval-replay-lab"
  - label: "2026-11-18 Pydantic AI handler 进程边界研究记录"
    href: "https://github.com/modelsell/codex-study-club/blob/main/docs/operations/reviews/2026-11-18.md"
---

`DeferredToolRequests` 表示本次运行在等审批或外部结果；用 `DeferredToolResults(approvals=...)` 提交批准，不能据此证明业务已经提交或只执行一次。

本站固定 pydantic-ai-slim 2.68.0 的八组实验，使用合成 FunctionModel 和审批响应，实际运行 SDK、子进程与本地 SQLite。业务已提交但新会话尚未保存时，重放旧待审历史让普通工具登记两条记录；把报表和回执放在同库事务后，工具仍进入两次，但相同业务请求只提交一条。还对照了拒绝、提交前回滚、双进程重放、同键参数冲突和两个独立请求。

关联文章及其下载脚本固定在 pydantic-ai-slim 2.68.0。官方 v2.69.0 将 RequestInput 合并并弃用为可带 resume token 的 HandleDeferredToolCalls 入口；本站另有一轮六组 2.69.0 SDK/SQLite/子进程实验，结果记录在第二来源中，未包装成公开复现脚本。实验观察到保存 token 不会恢复原进程等待；在新 run 中重新提交已保存的审批历史是另一条流程。它未验证生产认证/UI、外部服务或 durable engine，不能据此宣称 exactly-once。阅读原文时请区分固定 2.68.0 的八组公开复现与 2.69.0 的独立研究范围。

先核对实际业务回执、数据库记录及持久化历史，再决定如何续接。外部服务结果未知时，需可信回读或该服务的幂等契约，不能拿本地没有回执当作外部没执行。脚本和固定依赖见原文；未测试真人审批、生产认证、durable engine 或真实模型/业务接口。
