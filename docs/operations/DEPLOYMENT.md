# 发布与核验

核对日期：2026-09-25。当前主分支已有 Cloudflare Workers Builds 自动构建记录，正文更新也已在生产站点独立核验。GitHub Actions 负责质量检查；Cloudflare 负责生产发布，两条流程独立运行。

## 每次更新

1. 运行 `npm run lint` 和 `npm run build`。修改 Next.js、OpenNext 或发布配置时额外运行 `npm run cf-build`，检查平台构建兼容性。
2. 确认生成内容差异属于本次改动，提交并正常推送。
3. 记录这次提交的完整 SHA，按同一个 SHA 查询检查，避免把上一轮绿色状态当成此次成功：

```bash
git rev-parse HEAD
gh run list --workflow quality.yml --commit <提交SHA>
gh api repos/modelsell/codex-study-club/commits/<提交SHA>/check-runs \
  --jq '.check_runs[] | {name, head_sha, status, conclusion}'
```

4. 分别记录 `Content, lint and build` 和 `Workers Builds: codex-study-club` 的结果。没有检查记录或仍在运行时标注待核验。当前未配置“质量检查成功后才能部署”的串行门禁，不能把二者独立成功理解为发布前强制阻断。
5. 打开变更页面，核对 HTTP 状态、标题及本次新增的独特正文，同时检查案例列表和 Sitemap。刚推送后的 404 可能是部署尚未完成；构建成功但持续不可见时，再查缓存、域名和部署版本，不盲目重复推送。
6. 在当日复盘记录提交、检查链接与线上验证时间。

## 已确认与尚未确认

- 2026-09-25：提交 `9ce1ef4b4053ef32fda25ae9e70f9f2789487967` 的 `Workers Builds: codex-study-club` 检查成功；新贡献教程返回 HTTP 200 且正文正确。
- 仓库已有 `wrangler.jsonc` 和 `open-next.config.ts`。旧配置 PR #1 仍开放，不能仅因它尚未合并就判定生产未配置，也不应未经差异评估重复合并。
- 本次本机 Wrangler 登录检查为未认证；已有 Git 集成发布可工作，不需要为常规内容更新另外登录或创建临时 Worker。
- Cloudflare 后台的分支设置、回滚策略及质量门禁尚未完整审计。GitHub 上的成功检查和实际页面是当前可得证据。
- 本文不保存账户标识、令牌或本机路径。
