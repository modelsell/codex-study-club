# 网站统计口径

本项目的 GA4 接入对本地开发、预览、Fork 和其他域名默认关闭。正式域名 `codex.modelsp.com` 使用一个仅限该主机的公开 Measurement ID 兜底，以便没有 Cloudflare Build variable 权限时，Git 集成构建仍能启用统计；`NEXT_PUBLIC_GA_MEASUREMENT_ID` 若被显式配置则优先覆盖该兜底。Measurement ID 不是 API 密钥，浏览器加载 tag 时本来就会公开它。

## 配置与验收

1. 在 Google Analytics 的 **Admin → Data collection and modification → Data streams** 中打开本站 Web 数据流，复制 Measurement ID。Google 的[官方设置说明](https://support.google.com/analytics/answer/14183469)要求使用数据流详情中的 ID，核对日期：2026-10-07。
2. 优先将其他部署的 ID 作为 `NEXT_PUBLIC_GA_MEASUREMENT_ID` 配置；正式站点的公开兜底 ID 已随代码发布，不需要把账号凭据或 API 密钥写入仓库。
3. 重新部署后，在浏览器网络面板或页面源码确认 `googletagmanager.com/gtag/js?id=...` 只在正式域名或显式配置环境出现；再到 GA4 Realtime 报告确认 `page_view`。代码推送、CI、部署和 GA4 收数是四个独立状态。
4. 若要撤回正式站点收集，需要移除正式域名兜底 ID 并重新部署；其他环境删除部署变量即可关闭。空值会让非正式域名组件返回空节点，不会加载 Google 脚本。

2026-10-15 核对 [Google 官方 gtag.js 安装示例](https://developers.google.com/tag-platform/gtagjs)：用普通函数的 `arguments` 对象入队，初始化与事件 fallback 共用 `createGtagQueue`。`npm run test:analytics`（Node.js 22.6+，CI 使用 24）检查命令类型、参数、顺序和原队列保留；不发送网络请求。此前普通数组写法与官方示例不同，这次按标准形式修正，但尚未确认它是否导致数据流未收数。

`data-analytics-ready` 仅表示本地初始化与命令入队，**不表示 Google 脚本加载成功、请求发出或 GA4 已收到事件**。验收依次区分这些状态，并从对应本站数据流读取结果；维护者测试访问不能计为自然增长。

2026-10-15 晚间独立核验：GA4 管理界面的本站 Web 数据流在加载结束后显示“正在接收过去 48 小时内的流量”。这确认后台接收状态，不提供首次收数时刻、事件明细或自然访客数量；尚未建立隔离本站、排除维护访问的完整日期报告。不能由此证明队列修正是唯一原因或网站已经增长。实际时间、口径与后续项见 [当日复盘](reviews/2026-10-15.md)。

## 事件边界

2026-10-16 上午首次取得本站单数据流报告基线：在“报告概况 → 添加比较对象 → 新建”选择“数据流名称完全匹配 Codex Study Club”，只应用到当前报告，并移除“所有用户”。窗口为 **2026-09-18 至 2026-10-15**，媒体资源详细信息中报告时区为 **GMT+08:00 中国时间**。活跃用户 17、新用户 17、事件 92；事件报告为 page_view 40、session_start 22、first_visit 17、user_engagement 10、assistant_question_submitted 3。没有保存比较对象或更改收集配置。

切换报告时需重新核对比较开关及“所有用户”是否恢复，不能把属性总量读成本站数量。这组数据尚未排除维护者验收或自动化访问，窗口还包含接入前日期；只能作为未清洗的接收基线，不能认定自然访客、教程完成或增长。后续先建立可比完整日期窗口与测试访问处理口径，详见 [10-16 复盘](reviews/2026-10-16.md)。

当前只发送以下低粒度事件：

| 事件 | 参数 | 用途 |
| --- | --- | --- |
| `page_view` | `page_path`、不含查询字符串的 `page_location` | 判断入口和页面路径，不记录搜索词或正文参数 |
| `assistant_question_submitted` | `question_length`、`source`（`typed` 或 `suggestion`） | 判断提问入口是否被使用，不上传问题内容 |
| `assistant_response_error` | `reason`（`request_failed` 或 `empty_response`） | 观察学习助手的粗粒度失败状态 |
| `community_cta_click` | `destination`（`external` 或 `community_page`） | 判断加入入口是否被点击，不上传目标地址 |

不会主动发送提问文本、回答文本、原始日志、用户标识、查询字符串或账户用量。非正式域名未配置 Measurement ID 时，上述事件均不可得；不能用 GitHub Star、Fork 或共享额度窗口代替网站访问和教程完成数据。

## 运营使用规则

- 只比较相同口径和完整观测窗口；没有基线不计算增长。
- 页面访问量只能说明页面被请求，不能证明读者完成了案例、获得了收益或解决了问题。
- 运营复盘记录“已配置/未配置、核对时间、可见报告范围”，不记录 Measurement ID、账户信息或原始访问日志。
- 如果未来增加事件，先在本文件写清参数和隐私边界，再实现和验证；不得把文章正文或用户输入作为事件参数。
