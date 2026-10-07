# 网站统计口径

本项目的 GA4 接入默认关闭。只有部署环境显式提供合法的 `NEXT_PUBLIC_GA_MEASUREMENT_ID`（形如 `G-XXXXXXXXXX`）时，页面才会加载 Google tag；本地 `.env.example` 留空，因此开发、构建和当前未配置 Measurement ID 的部署不会发送统计请求。

## 配置与验收

1. 在 Google Analytics 的 **Admin → Data collection and modification → Data streams** 中打开本站 Web 数据流，复制 Measurement ID。Google 的[官方设置说明](https://support.google.com/analytics/answer/14183469)要求使用数据流详情中的 ID，核对日期：2026-10-07。
2. 将 ID 作为部署环境变量 `NEXT_PUBLIC_GA_MEASUREMENT_ID` 配置，不写入仓库、不写进公开复盘。它是公开 tag ID，不是 API 密钥。
3. 重新部署后，在浏览器网络面板或页面源码确认 `googletagmanager.com/gtag/js?id=...` 只在已配置环境出现；再到 GA4 Realtime 报告确认 `page_view`。代码推送、CI、部署和 GA4 收数是四个独立状态。
4. 若要撤回收集，删除部署变量并重新部署；空值会让组件返回空节点，不会加载 Google 脚本。

## 事件边界

当前只发送以下低粒度事件：

| 事件 | 参数 | 用途 |
| --- | --- | --- |
| `page_view` | `page_path`、不含查询字符串的 `page_location` | 判断入口和页面路径，不记录搜索词或正文参数 |
| `assistant_question_submitted` | `question_length`、`source`（`typed` 或 `suggestion`） | 判断提问入口是否被使用，不上传问题内容 |
| `assistant_response_error` | `reason`（`request_failed` 或 `empty_response`） | 观察学习助手的粗粒度失败状态 |
| `community_cta_click` | `destination`（`external` 或 `community_page`） | 判断加入入口是否被点击，不上传目标地址 |

不会主动发送提问文本、回答文本、原始日志、用户标识、查询字符串或账户用量。未配置 Measurement ID 时，上述事件均不可得；不能用 GitHub Star、Fork 或共享额度窗口代替网站访问和教程完成数据。

## 运营使用规则

- 只比较相同口径和完整观测窗口；没有基线不计算增长。
- 页面访问量只能说明页面被请求，不能证明读者完成了案例、获得了收益或解决了问题。
- 运营复盘记录“已配置/未配置、核对时间、可见报告范围”，不记录 Measurement ID、账户信息或原始访问日志。
- 如果未来增加事件，先在本文件写清参数和隐私边界，再实现和验证；不得把文章正文或用户输入作为事件参数。
