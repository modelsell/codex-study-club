---
title: "n8n 资料校对实验：旧标签页的批准，交付的是哪一版？"
description: "固定 n8n 2.49.6，以十组真实 HTTP 工作流对照和一次原生浏览器双标签任务，解释版本检查、批准快照、重复派发与目标回读。附完整实验包；资料、审核决定和 CRM 均为本地实验条件，未调用模型或客户系统。"
level: "进阶"
surface: "n8n 2.49.6 · Linux arm64 容器"
checkedAt: "2026-11-26"
---

# n8n 资料校对实验：旧标签页的批准，交付的是哪一版？

一份资料已提取成字段，审核员打开页面准备批准。另一位审核员在第二个页面修正了邮箱或金额，先保存了新版。第一个页面没有刷新，仍显示旧值；这时点下“批准”，下游该收到什么？

如果流程只把“收到批准”理解成“可以继续”，旧字段仍可能被送进CRM，尽管校对库里已经保存了新版。表单显示成功、n8n执行结束、目标记录正确，是三个需要分别核对的结果。

本文面向维护客户资料提取、校对队列和业务写回的自动化人员。案例从**已经提取好的单记录JSON**开始，用固定n8n **2.49.6** 编排自建校对页面、数据库守卫和本地假CRM，比较不检查版本的基线与绑定批准快照的流程。它不测试OCR或模型质量，也没有连接客户系统。

本轮完成了两模式、五场景的十组真实n8n HTTP流程：脚本读取实际HTML表单并提交，经过自建SQLite状态服务和假CRM，再独立回读目标。另外用原生Chrome走完一条保护流程，实际在两个标签页保存新版、提交旧页、再批准新版。十组HTTP对照和这一条浏览器任务分别记录；合成数据、操作选择与预期结果都由实验安排，不代表真人审核或模型判断质量。

## 从一份资料和两个页面开始

实验只使用三个业务字段：`company_name`、`contact_email`、`invoice_total`。文档有稳定的`document_id`，每次保存修正推进`revision`，另有当前状态和业务截止时间。

本轮实际初始输入：

```json
{
  "document_id": "http-v2-guarded-stale",
  "revision": 1,
  "status": "pending",
  "payload": {
    "company_name": "Synthetic Old Draft",
    "contact_email": "old@example.invalid",
    "invoice_total": 100
  }
}
```

页面A与页面B从同一版打开。B保存修正后，服务端记录变成新版，A仍留着旧版快照。具体变化如下：

| 检查位置 | revision | 本轮实际字段 |
| --- | --- | --- |
| A打开时看到的快照 | 1 | `Synthetic Old Draft / old@example.invalid / 100` |
| B保存修正后的服务端记录 | 2 | `Synthetic Reviewed Record / reviewed@example.invalid / 1250.5` |
| A随后提交的批准 | 1 | 仍带回旧页字段；保护流程不采用它们作为业务快照 |

自建页把“保存修正”和“批准已保存版本”分成两块。编辑区允许修改字段，但保存不交付；批准区显示只读快照，要求保存后重新打开新版再批准。这样至少能说清审核员当前在操作哪一步。

这还不够。页面中的隐藏`revision`只是客户端提交的数据，不能证明身份或授权，也不能阻止旧页稍后提交。真正决定这份批准还能否被接受的地方在服务端。

## 守卫先检查版本，再冻结要交付的内容

本例的实际入口是**Webhook → Respond to Webhook返回自建HTML**。保存、批准和拒绝也通过Webhook进入，n8n用HTTP Request调用本例自己的状态服务。这里没有调用原生Form、Wait或AI Agent节点；数据库守卫也不是n8n内建审批保证。

守卫在同一个SQLite写事务里读取记录并检查：

```text
BEGIN IMMEDIATE
  记录还处于pending吗？
  提交revision等于服务端当前revision吗？
  数据库检查时间尚未到expires_ms吗？
  ├─ 不满足 → 返回明确拒绝结果，不请求CRM写入
  └─ 满足并批准 → 从服务端字段冻结approved_snapshot与claim
COMMIT
```

保存修正也经过这些条件，成功后推进revision。批准采用服务端保存的字段，不采用批准表单夹带的业务字段。随后写CRM的步骤读取被冻结的claim，不再读取当前文档的live字段。

为什么要同时检查和冻结？只比较一次revision，随后又去读取当前字段，就可能失去“批准的是哪一版内容”。只保存一个批准布尔值，也解释不了后来写入的邮箱或金额来自哪次审阅。`approved_snapshot`和摘要把这次批准的内容固定下来，`request_key`把本次交付与其后的回执关联。

本例的期限条件也需要读准：它检查的是**审批事务中的数据库当前时间**。它没有证明CRM写入一定在截止前完成，更没有测试n8n Wait的超时调度。如果你的任务要求“截止前目标必须完成写入”，需要另一条目标端契约和对应验证。

## 基线与守卫要走到同一个目标验收

两条流程使用相同的自建页面、n8n节点和假CRM。基线故意不做版本/状态/期限守卫，并直接使用旧页面带回的字段；保护流程在服务端比较并冻结当前记录。这个基线是为实验构造的应用行为，不能称作n8n的默认行为或产品缺陷。

每条业务写入之后，流程再以目标记录ID发起一次GET，读回实际字段。完整判断顺序是：页面提交了哪版，服务端接受了哪版，claim冻结了什么，目标实际存了什么，最后的回执有没有如实表达。

可以先沿最关键的旧页流程看一次完整任务。原生Chrome验证使用独立合成记录`ui-root-guarded`：

1. 在两个标签页打开同一份记录，确认两边都显示revision 1、旧邮箱和金额100。
2. 在B页把三个字段改成`Synthetic Reviewed Record / reviewed@example.invalid / 1250.5`，点击保存。服务端成为revision 2，这一步没有批准或写CRM。
3. 留在未刷新的A页点击批准，页面返回`stale_revision`，说明提交的是1、当前是2。此时另开状态页，确认仍为pending/revision 2，目标的`records`和`writes`都为空。
4. 重新打开当前页面，确认新版字段，再点击批准。流程返回`delivered`、approved_revision 2和目标记录ID。
5. 用浏览器直接打开目标记录JSON，逐项比对三个字段、摘要和request key；再从独立状态读回确认实际写入只有1次。

这条浏览器任务的最后结果是新稿，摘要为`9bb9f08113883d816873c1ef976da3fcdb9fc0989ef34c334832933a003d8239`。它证明了这条实际双页路径的显示、提交和目标内容一致；其他失败场景由下表的HTTP脚本对照覆盖，没有全部再走GUI。

| 场景 | 无guard基线 | 保护流程 | 目标验收 |
| --- | --- | --- | --- |
| 新版正常批准 | 200 / delivered，1写 | 200 / delivered，1写 | 两者均为已保存的新稿 |
| 拒绝 | 200 / rejected，0写 | 200 / rejected，0写 | 两者目标均为空 |
| 旧页面批准 | 200 / delivered，1写旧稿 | 旧提交409 / stale_revision、该阶段0写；再批准新版后1写新稿 | 保护流程保留新修正并拒绝旧版交付 |
| 已过业务期限 | 200 / delivered，1写 | 410 / expired，0写 | 基线故意保留错误交付；保护流程未请求写入 |
| 相同批准提交两次 | 后一次仍delivered，总计2写 | 后一次already_delivered，总计1写 | 两边目标都只有1行，必须看实际写日志 |

十组均满足各自预先定义的验收，包括基线应该保留的失败。它不是“十组业务都成功”。尤其旧页基线里，review库的revision2新修正仍在，错误是**CRM收到旧稿**；本文没有把它写成校对库本身被覆盖。


## 目标回读的“正确答案”要来自批准记录

版本守卫决定旧页面还能否取得交付资格。内容在后续编排中仍可能被错误映射，所以只增加一次GET还不够：GET取到了实际目标，却需要另一份可信记录告诉我们它应该是什么。

本例以review数据库里冻结的`approved_snapshot`、`approved_hash`、`approved_revision`和`request_key`为准。ack在事务中先核对传入claim与这组值一致，再把目标回读与它们比较，通过后才把本地状态推进到`acknowledged`。不能仅让目标与这次HTTP请求带来的快照相互作证；两处同时拿错同一份内容，也会得出看似一致的结果。

准备期的独立审查曾在本例自建ack里发现这种预期值选错的问题，修正后才跑本文的最终十组对照。这是自建程序的修正，不能归因于n8n产品缺陷。公开实验包保留本文两条主流程，不附带该准备期的第三故障变体。

**回读不等于回滚。** 如果CRM已经接受错误内容，ack拒绝`delivered`不能撤销那次写入。此时本地保持未确认，目标实际记录还要保留并供对账处理。这个验收方法帮助避免把错稿宣布为交付成功，不能承诺拦住所有错写。假CRM也不会直接读取review库替外部目标作保证：它按收到的请求写入，再由工作流实际GET回读。

## 一份小实验，怎样选择和迁移

如果只是采集表单数据，原生Form Trigger/Form提供现成页面、隐藏字段和响应选项。如果任务要暂停一个已经运行的execution，Wait有对应的恢复入口。本例选择Webhook与自建页，是为了明确展示服务端快照、分开保存与批准，并能返回具体拒绝原因。本文没有运行前两套入口，不比较它们的效果或宣称它们缺少同样的保护能力。

自建方案的成本很明确：多了一份状态服务、数据库记录、版本和快照生命周期，以及需要维护的页面与错误回执。所有能修改业务字段的入口都必须推进revision；绕开这条规则，版本比较就不再可靠。页面的隐藏字段也不会自动变成真实用户认证或权限。

本地目标端的重复处理同样有限。保护流程第二次收到相同批准时，由review服务返回`already_delivered`，不再发起CRM写入。因此本轮“重复批准只有1写”首先证明的是应用没有再次派发，不能当作目标端反复收到相同key的专项测试。本例假CRM只在当前记录中保存request key；保护流程也不允许同一document确认后重新进入审批，对照限定为**一份document的一次审批交付生命周期**。它不是保留所有历史key的永久账本，不能外推多版本重放或任意CRM的exactly-once。

如果真实目标返回超时，或者既没有可靠查询也没有幂等契约，本地“claimed”不能证明外部没做。本篇不扩展那条跨崩溃恢复路径；先保留结果未知，再按目标的真实能力或人工回读核对。

## 下载实验包，读实际目标而不是只看绿灯

**完整实验包：[n8n 资料校对与版本交付实验包（ZIP，25,229 字节）](/templates/n8n-review-snapshot-delivery-lab.zip)。**

包内包含两条工作流、已修正的状态/CRM服务、标准库Python驱动、HTTP桥、合成字段和使用说明，共9份源码/说明与一份SHA256清单。运行结果与新生成的实例数据写到包目录之外。我们已从解压件启动全新实例，十组再次通过；页面保留模式另核对两条入口和退出清理。最终执行代码与通过件逐字节一致。

ZIP的SHA256为：

```text
eb16fc3d5936a3d084edc26cbd0a48c4f73ba90c86efe7938ec6d8d8287af0c7
```

本轮实际运行的是官方Linux arm64容器，容器内读回n8n **2.49.6**、Node **v26.13.0**。固定镜像为：

```text
docker.n8n.io/n8nio/n8n@sha256:a1a9955a4a9e5dd9fa65a62f59e0751351b45b9e5cd2c17e6e330a8d0026cad8
```

HTTP脚本走十组两模式对照；原生Chrome单独走一条保护流程的双标签页任务。本轮没有模型、OCR供应商、Slack/邮箱或客户业务，审核决定由实验预设。不同架构或更新镜像需要重新核对，不把这个digest泛指所有平台。

需要本机Docker Desktop与Python3.9+；主机无需安装n8n或Node。保存ZIP后解压，在实验目录运行：

```bash
unzip n8n-review-snapshot-delivery-lab.zip
cd n8n-review-snapshot-delivery-lab
python3 run_lab.py
```

默认创建全新的专用实例，完成十组后清理本次容器、网络和代理，打印保留结果的私有目录。到其中的`results/results.json`查看每组目标回读，到`cleanup.json`确认收尾；57是驱动记录的HTTP请求，包含初始化和状态回读，不是57次n8n执行。

要自己走双页面，另开一个新实例：

```bash
python3 run_lab.py --ui-only
```

程序打印完整的两条校对入口和只读state地址。两页都从版本1打开，先在B保存修正，再让A提交旧批准；用state检查零写入，再重新打开版本2批准并核对目标。按Ctrl-C结束该模式。若终端意外退出，按包内README对对应实例目录执行`--cleanup`，这个命令只处理该实例的精确资源，不清理既有项目。

读结果时，沿同一document核对：实际显示的revision与字段、提交内容、服务端决定、冻结claim、目标记录ID/字段，以及最终回执。成功响应不是这些检查的替代物。

本轮浏览器/脚本访问宿主机loopback代理，再由桥接程序请求隔离容器内的实际n8n入口；业务流程中的HTTP Request访问同容器的自建review服务和假CRM。代理传回实际状态码、响应头与响应字节。本次固定镜像返回的HTML带有n8n的`Content-Security-Policy: sandbox …`；表单使用绝对action，并在保留该响应头的条件下完成上述浏览器任务。

代理自身也可能失败，它用`local_transport_failure`标记传输502。应将这类结果与守卫的`stale_revision`、`expired`或末端未确认分开；HTTP超时本身也不能证明工作流已经取消。本文没有把限定的loopback拓扑写成对整台机器网络流量的监测结论。

## 来源与本例范围

资料和原帖于**2026-11-26**重新读取。固定正式 [n8n2.49.6](https://github.com/n8n-io/n8n/releases/tag/n8n%402.49.6)原发布为**2026-11-25 08:27:07 UTC**，tag为`5fae94bb8d37827d1c11b7d748b92343477459c1`。容器运行版本和digest已单独读回，解压件的新实例也验证了同一发行物。

- [operantsolo原帖](https://community.n8n.io/t/for-human-approval-in-n8n-do-you-prefer-the-wait-form-or-slack-send-and-wait-for-response/328231)，原发**2026-11-11 21:08:08 UTC**：本地测试后追问迟到批准收到确认却无效果的问题。作者报告不是本站结果，也不说明所有Wait行为。
- [liz7up原帖](https://community.n8n.io/t/for-those-who-deliver-pdf-doc-extraction-to-clients-what-happens-after-your-review-queue/329724)，原发**2026-11-20 11:08:14 UTC**：客户资料校对后的队列、重复交付和旧页覆盖问题；作者明确规模尚小，相关修正与ledger计划未由本站复现。跨帖与续帖只计这一位作者。
- 官方[Webhook响应](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/)、[Form](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.form/)和[Wait](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/)分别说明各自入口。本例的HTML与响应头范围采用固定源码和实际保存的HTTP响应。固定源码中，[Respond的text响应](https://github.com/n8n-io/n8n/blob/5fae94bb8d37827d1c11b7d748b92343477459c1/packages/nodes-base/nodes/RespondToWebhook/RespondToWebhook.node.ts)交给[Webhook handler](https://github.com/n8n-io/n8n/blob/5fae94bb8d37827d1c11b7d748b92343477459c1/packages/cli/src/webhooks/webhook-request-handler.ts)，另由[响应头处理](https://github.com/n8n-io/n8n/blob/5fae94bb8d37827d1c11b7d748b92343477459c1/packages/cli/src/webhooks/webhook-response-headers.ts)应用sandbox CSP。

这篇主要检查执行前的批准版本绑定与末端canonical交付对照。[Pydantic AI的审批恢复实验](/cases/pydantic-ai-approval-replay-lab)另讨论历史落盘后崩溃重放；未覆盖的真实身份、生产授权、其他操作系统、n8n Cloud、原生Form/Wait、外部业务幂等和所有并发时序，都不能由这个本地流程代替验收。
