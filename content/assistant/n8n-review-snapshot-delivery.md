---
title: "n8n 资料校对：旧页面批准、版本与交付回读"
terms:
  - "n8n 资料校对"
  - "n8n旧标签页"
  - "n8n批准快照"
  - "n8n重复批准"
  - "n8n revision"
  - "n8n 表单成功"
  - "n8n-review-snapshot-delivery-lab.zip"
sources:
  - label: "n8n 资料校对与批准快照实验"
    href: "/cases/n8n-review-snapshot-delivery-lab"
---

本例固定n8n2.49.6，以Webhook、HTTP Request、If和Respond编排自建页面、SQLite状态服务与本地假CRM。资料和审核选择为合成输入；实际执行十组HTTP对照，原生Chrome另完成一条双标签页任务。原生Form/Wait、真实模型和客户系统未运行。

旧页批准携带revision1，但服务端修正已保存为revision2时，保护流程在同一事务检查pending、版本和数据库检查时间，从服务端冻结批准快照。旧提交返回409/stale_revision且当时目标零写入；重新打开r2批准后，真实目标字段、摘要与批准快照一致。期限检查发生在审批事务，不能保证目标完成时仍未过期。

相同批准重复提交在review状态层返回already_delivered，不再派发CRM写入；本轮物理写入为1。基线会写两次，但最终仍只有一条upsert记录，所以目标行数不能替代写入记录。这个结果不表示任意外部CRM、网络重试或跨崩溃恢复都具备exactly-once。

末端回执重新读取服务端冻结的approved_snapshot/hash/revision/request_key，再对照实际目标回读；不能让转发claim和目标里的同一份错稿互相证明正确。发现不一致时保留未确认；已经发生的目标写入不会由回执检查自动撤销。

[完整文章](/cases/n8n-review-snapshot-delivery-lab)和[实验包](/templates/n8n-review-snapshot-delivery-lab.zip)给出两条工作流、固定镜像、标准库驱动、合成输入、十组断言及清理步骤。默认python3 run_lab.py完成十组后精确清理本次资源；--ui-only保留独立页面供手工走双页。按同一个document核对批准版本、冻结快照、目标记录ID/字段和最终回执。
