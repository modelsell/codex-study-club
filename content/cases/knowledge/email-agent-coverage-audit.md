---
title: "邮件 Agent 漏了哪些任务？做一份可追溯的只读对账"
description: "从五条合成邮件展开未读筛选、短窗口和完成标记的盲区，提供离线审计工具、示例与失败验收。报告和扫描游标在同一 SQLite 事务保存；不接邮箱、不自动补建草稿或重发。"
level: "进阶"
surface: "离线审计工具 · Python / SQLite"
checkedAt: "2026-11-12"
---

# 邮件 Agent 漏了哪些任务？做一份可追溯的只读对账

收件、分类、生成草稿的流程一直显示绿色，却有消息没有进入处理。再加一次“查最近一天未处理邮件”，能发现一部分遗漏，也可能把已经生成草稿的消息重新列为漏件。

先回答两个问题：**这次实际检查了哪些消息？每条消息的预期产物由什么记录证明？** 前者是扫描覆盖，后者是业务完成。两者混在一起，既容易漏处理，也容易在补做时制造第二份草稿。

本文给维护邮件分类与草稿流水线的人一套可运行的离线对账方法：五条合成消息、一个只写本地审计库的 Python 工具，以及分页、冲突和保存失败的对照。它接收你提供的元数据，不连接 Gmail、不运行 n8n 或模型；**匹配两份元数据不等于已读回真实草稿。** 这是一篇工具实践。

## 五条消息，为什么补扫只能看到两条

用同一个例子贯穿全文。假设上次成功扫描在 48 小时前，这次准备检查到固定时刻 T；邮件的名字都是虚构标识。

| 消息 | T 时刻的状态 | 处理证据 | 最近一天、仍在收件箱、无完成标签的补扫 |
| --- | --- | --- | --- |
| opened | 2 小时前到达，已经被人读过 | 无 | 能看到；但未读触发器可能没接到 |
| archived | 4 小时前到达，已归档 | 无 | 被收件箱条件排除 |
| delayed | 30 小时前到达，这轮补扫延迟了 | 无 | 被一天窗口排除 |
| done | 1 小时前到达 | 完成记录和草稿引用相符，有完成标签 | 被完成标签排除，符合预期 |
| draft-no-marker | 2 小时前到达 | 有草稿引用，无完成记录或标签 | 会再次出现，不能直接补建 |

示意补扫条件是 `in:inbox -label:ai-processed newer_than:1d`。配套验收脚本用这些虚构状态做集合判断，返回 **opened 和 draft-no-marker 两条**；没有实际执行 Gmail 查询或实现完整查询语法解析。

这个结果还不能回答“漏了多少”：archived、delayed 没被检查到，draft-no-marker 又可能已经有产物。把返回数量直接当漏处理数量，会同时漏报和误报。只缩短轮询间隔，也不能消除这几个集合的差异。

## 先定义“完成”，再选择标记

本工具只审计一个明确阶段：**草稿已经准备好（draft_ready）**。它不把这个阶段扩为人工批准、邮件发送或收件人收到。其他业务阶段应该另定成果与证据，不能共用一个模糊的“已处理”。

对每个消息 ID，输入分成三份：

1. `pages`：扫描取得的消息及到达时间，决定这次检查集合。
2. `ledger`：你的流水线声明完成的阶段，以及对应产物引用。
3. `artifacts`：另一份提供给审计器的产物引用清单。

工具按相同 ID 对齐后，输出三类结果：

| 输出 | 具体条件 | 后续应怎样处理 |
| --- | --- | --- |
| `missing_record` | 没有完成记录，也没有产物引用 | 先检查采集和业务执行，不能由缺记录推断从未执行 |
| `needs_review` | 只有其中一份证据、引用不符，或完成阶段不是 draft_ready | 核对已有产物与流程，避免重复副作用 |
| `declared_complete` | draft_ready 记录与产物清单中的引用相同 | 只说明所提供元数据一致；真实产物仍由你的采集/回读流程负责 |

独立清单的价值取决于来源。如果两个字段都由同一个“我做完了”的节点复制出来，匹配没有增加多少可信度。生产接入时，应从可回读的草稿存储或服务端结果取得产物清单；本文没有实现这层适配。

标签可以作为快速筛选索引，但它不是天然的业务凭证。先打标签后生成草稿，后一步失败会留下假完成；先生成再打标签，中途失败又会留下真产物、缺标记。后一种情况正是 draft-no-marker，需要人工核对，而不是让审计器自动补建。

## 下载后，走完一次完整审计

工具 **1.0** 只依赖 Python 标准库。下载三份文件，放在同一个新目录：

- <a href="/templates/mail-coverage-audit.py" download="mail-coverage-audit.py">审计工具 mail-coverage-audit.py</a>
- <a href="/templates/mail-coverage-example.json" download="mail-coverage-example.json">五消息、两页的合成输入</a>
- <a href="/templates/mail-coverage-audit-tests.py" download="mail-coverage-audit-tests.py">失败对照与验收脚本</a>

先运行验收，再用示例建立独立审计库。下面的 scope 与毫秒时间来自下载的输入，不是你的邮箱时间或账号：

```bash
python3 mail-coverage-audit-tests.py \
  --tool ./mail-coverage-audit.py \
  --example ./mail-coverage-example.json

python3 mail-coverage-audit.py init \
  --db ./audit.db \
  --scope synthetic-mailbox/draft-ready/v1 \
  --cursor-ms 1794182400000

python3 mail-coverage-audit.py scan \
  --db ./audit.db --input ./mail-coverage-example.json

python3 mail-coverage-audit.py reports \
  --db ./audit.db --scope synthetic-mailbox/draft-ready/v1

python3 mail-coverage-audit.py pending \
  --db ./audit.db --scope synthetic-mailbox/draft-ready/v1
```

本次实际运行后，报告的关键字段如下，完整输出还包含输入指纹与报告 ID：

```json
{
  "input_coverage": "complete",
  "cursor_before_ms": 1794182400000,
  "cursor_after_ms": 1794355200000,
  "findings": [
    {"id": "archived", "status": "missing_record"},
    {"id": "delayed", "status": "missing_record"},
    {"id": "done", "status": "declared_complete"},
    {"id": "draft-no-marker", "status": "needs_review"},
    {"id": "opened", "status": "missing_record"}
  ],
  "automatic_mail_actions": 0
}
```

这里的 complete 是**输入页链在规定结构上完整**，不是“没有遗漏”或“五个业务任务都成功”。已有三条缺记录、一条待核；即使返回码为 0，也只是离线扫描和本地保存完成。

`reports` 从 SQLite 读回所有已保存报告。`pending` 展示历史报告中缺记录和待核的明细，本例为四条；它不自动结案，也不去重成“当前仍欠四件事”的业务统计。后续空扫描不会删除这些明细；同一消息在重叠扫描中可能出现多次，应结合报告 ID 和证据人工处理。

## 输入协议怎样接住分页、时间和冲突

下载的 JSON 是完整可运行示例。版本 1 必须提供以下顶层字段，工具拒绝缺字段、未知字段和重复 JSON 键：

| 字段 | 约定 |
| --- | --- |
| `version`、`source` | 1；示例为 synthetic，外部采集数据用 supplied-metadata，均不自动升级成真实客户端证明 |
| `scope` | 同一邮箱、工作阶段和规则版本的稳定命名空间；用自己的无敏感信息标识 |
| `cursor_ms`、`until_ms`、`overlap_ms` | 上次扫描边界、本轮固定上界、重叠长度；非负整数毫秒，布尔值不接受，上界须大于旧边界 |
| `pages` | 每页有 request_token、next_token、messages；末页必须显式 next_token=null，消息仅含 id 和 received_ms |
| `ledger` | 每条含 id、outcome、artifact；本题完成阶段为 draft_ready |
| `artifacts` | 每条含 id、ref；只是引用，不会打开文件或调用接口验证 |

本工具检查区间为 **[cursor_ms − overlap_ms, until_ms)**，下界最低为 0。示例重叠五分钟，以消息 ID 去重。相同 ID、相同内容的重复行允许；时间或记录内容冲突时，整轮变为 unknown，不用“最后一条覆盖前一条”掩盖问题。窗口是工具的本地协议，不能直接当成 Gmail 查询边界已经实测。

分页则必须从 request_token=null 开始，上一页 next_token 与下一页 request_token 一致，直到明确末页。失败页、缺末页、断链、循环或末页后又多一页，均不能报告输入完整。输入即使结构完整，也可能漏导出一批消息：审计器看不到根本没被提供的东西。

如果以后实现 Gmail 适配，要另外处理几件事：官方 `messages.list` 返回的消息只有 id、threadId，额外详情需读取 `messages.get`；不能把结果数量估计当分页结束。API id 与邮件头 Message-ID 也不是一个字段。`internalDate` 是毫秒时间，普通接收和迁移邮件有边界差异；用字符串日期构造查询还会遇到时区解释。相关依据见文末官方资料，这里没有隐含一个可用的 Gmail 连接器。

## 报告与游标，必须一起保存

即使集合判断正确，保存顺序也可能丢掉证据：

```text
先推进扫描游标 → 保存报告失败 → 下一轮从新边界开始
                                  这轮未处理项没有报告可查
```

工具把报告与扫描游标放进同一个 SQLite 事务：

```text
校验旧游标 → 判断输入覆盖 → 写报告 → 完整时更新扫描游标 → 提交
                        任一步失败：回滚两份写入
```

unknown 结果可以保存成报告，但游标保持原值；格式非法则直接失败、不写报告。正常报告提交后，旧输入再次提交会被旧游标校验拒绝，不能让扫描位置倒退。`init` 也不会重置已有命名空间的游标。

这解决的是**本地审计证据与扫描进度的一致保存**。它没有把 SQLite 与 Gmail 放进同一事务，也没有保证草稿只创建一次。扫描游标前进不等于业务欠账清零，所以前面的历史明细仍须保留。

配套脚本在真实临时 SQLite 文件中测试了写报告后、更新游标后分别抛错和进程直接退出，重开文件读取后，两表均无部分提交；另测只读数据库写失败、独立子进程正常提交/回读、旧输入重放和命名空间隔离。进程退出测试不等于断电、磁盘满或文件系统损坏测试。

| 命令结果 | 返回码 | 库中的状态 |
| --- | --- | --- |
| 输入页链完整且保存成功 | 0 | 报告与新扫描游标同时存在；业务仍可能有缺记录/待核 |
| 覆盖 unknown | 2 | 保存未知报告，游标不前进 |
| 格式非法、旧游标不匹配或读写失败 | 1 | 该次扫描不部分写入报告/游标；检查错误，再决定如何重试 |

## 什么条件下选哪种方案

| 做法 | 适合什么任务 | 要付出的代价 |
| --- | --- | --- |
| 未读触发器加标签 | 低延迟启动分类，标签用于发现处理进度 | 仍需定义补扫范围；已读、归档和标记时序要另处理 |
| 固定时间窗加独立完成记录 | 已有消息/产物元数据，想检查一段已知范围；本文离线工具服务这一层 | 采集方必须保证范围、分页、时间和记录可靠，有限重叠不能覆盖任意历史遗漏 |
| Gmail 历史同步配合独立审计 | 需要维护长期变化和回补的连接器 | 需自己实现历史游标、全量同步与失效恢复；官方说明历史过期会返回 404、须重新全量同步，本文未实现 |

不必为做一次审计先换 Agent 或接更多模型。先把期望产物、记录来源和未知分支说清，才能决定是修采集、补回读，还是在人工核对后补做业务。

## 来源、版本与实际验证

资料核对日期 **2026-11-12**。新稿来自两位独立作者的具体任务线索，而非产品热度：

- [Huzaifa_Aamish 的邮箱运行报告](https://community.n8n.io/t/i-let-an-n8n-ai-assistant-run-my-business-inbox-for-10-days-15-of-64-emails-were-never-touched/327116)，原帖 **11-06**、后续到 **11-09**：报告未读触发与补扫问题。效果数字与归因属于作者报告，本例没有复现其真实邮箱。
- [ck_lu 的分类/草稿流水线](https://community.n8n.io/t/inbound-email-triage-in-n8n-classify-draft-human-approval-reply-in-the-same-thread/314655)，原帖 **09-19**，**11-09/10** 补充：提出按消息记录对账，同时承认公开模板审批回调尚未接完，不能以文章标题认定整条发送链已实现。作者仓库与同帖只计一份来源。社区显示时区未核实。

另读第一帖 sameday 的 **11-09** 假消息对照，归档、延迟和缺标记只作为合成线索。我们读取作者导出固定提交 [`0b5c7525cdff40dcb2d885f0bb36a440041f8a2e`](https://github.com/buildthenbreak-hq/n8n-templates/tree/0b5c7525cdff40dcb2d885f0bb36a440041f8a2e)的助手/补扫 JSON：未读条件、四个空 labelIds 与上面的补扫查询确实存在；没有导入工作流或运行作者代码。

官方 [n8n Gmail Trigger](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.gmailtrigger/)用于核对筛选；文档明确超出 Max Emails per Poll 的消息会在后续轮获取，不能仅凭上限小就断言必然丢件。[Gmail 列表](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list)、[消息资源](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages)、[过滤](https://developers.google.com/workspace/gmail/api/guides/filtering)与[同步](https://developers.google.com/workspace/gmail/api/guides/sync)分别核对分页、ID/时间、查询及历史失效；页面更新标记为 **04-15 / 05-06 / 09-10 / 09-15**，首次发布日期未知，不当成本日新功能。[SQLite 原子提交说明](https://www.sqlite.org/atomiccommit.html)用于解释本地事务。

实际环境 **macOS 27.2 / arm64**，工具 1.0；Python **3.12.14 / SQLite 3.53.1** 与 Python **3.9.6 / SQLite 3.54.0** 均通过配套 **32 项验收**，包括在含空格的新目录运行下载文件的完整 CLI。测试父进程和每个 CLI/故障子进程均拦截网络，尝试数 0。没有账号、真实邮箱、Gmail/n8n 客户端、模型调用或草稿/邮件操作；没有验证并发邮箱快照、采集真实性、真实产物、断电恢复或读者收益。
