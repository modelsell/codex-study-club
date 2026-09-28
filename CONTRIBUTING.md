# 参与 Codex Study Club

欢迎修正过时说明、补充可复现案例、反馈无法完成的步骤，以及改善项目代码。首次贡献可以从一处错误链接或一段不清晰的教程开始。

## 提交内容

1. 检查已有内容和 Issues，确认主题没有重复。
2. 在 `content/` 对应目录修改 Markdown，遵循 [内容格式](content/README.md)。保留来源、核对日期与适用条件，不提交密钥或真实用户资料。
3. 使用 Node.js 20.9+ 和 npm，运行 `npm ci`，再运行 `npm run lint` 与 `npm run build`。
4. 检查生成的 `lib/generated-content.json`，把与本次内容相关的生成结果一并提交。
5. 提交 PR，说明解决了什么问题、参考来源、验证命令及尚未验证的部分。截图仅在有助于说明页面变化时提供，并先脱敏。

主分支推送和 PR 会运行 `Quality checks`（Node.js 24）：安装锁定依赖、Lint、生产构建，检查生成内容是否已提交，以及本地生产服务上的站内链接检查。构建后若 `lib/generated-content.json` 存在差异，请先确认差异与文章改动一致，再一并提交。该检查只验证代码质量，不执行生产部署；Cloudflare 的发布检查独立显示。

### 检查渲染后的站内链接

链接检查需要 Python 3.9+，只用标准库，无需安装 Python 依赖。先完成构建，在一个终端启动本地生产服务：

```bash
npm run start -- --hostname 127.0.0.1 --port 3107
```

另一个终端执行：

```bash
npm run test:links
npm run check:links
```

检查器读取本地 `/sitemap.xml`，打开其中页面，再解析实际 HTML 的链接，因此会覆盖 Markdown 转换后的地址与原始 HTML 链接。网站绝对链接会映射到本地服务，外部网址不请求。非 200 响应、跨站跳转及网络错误分别报告，发现问题返回非零退出码；服务未启动或 Sitemap 不可用也不会算通过。

它检查页面和链接目标是否可访问，不验证页内锚点、图片、浏览器脚本生成的链接、交互效果或外站状态，也不代表生产部署成功。可用 `npm run check:links -- --base-url http://127.0.0.1:其他端口` 指定本地端口。检查完成后停止临时服务。

不知道如何开始，可以跟随 [从一篇 Markdown 到可验证的内容贡献](content/cases/development/first-content-contribution.md) 完成练习。

## 反馈问题与建议

- [问题反馈](https://github.com/modelsell/codex-study-club/issues/new?template=bug-report.yml)：提供页面、操作步骤、预期与实际结果，以及版本信息。
- [内容建议](https://github.com/modelsell/codex-study-club/issues/new?template=content-request.yml)：说明希望完成的任务、目前卡住的位置和可参考的一手资料。
- 不要在公开 Issue 上传令牌、账户信息或带敏感数据的日志。

第三方内容范围见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。仓库当前尚未提供覆盖自身全部代码与内容的根许可证，不能把第三方 MIT 声明理解为全仓库许可；此项已列入维护待办。

维护计划与执行结果见 [日常运营](docs/operations/README.md) 和 [公开复盘](docs/operations/reviews/README.md)。
