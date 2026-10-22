# 只读代码审查实验原始报告

日期：2026-10-22（Asia/Shanghai）。仓库：`modelsell/codex-study-club`。

本次按照任务指定的 `SKILL.md`（`evidence-review`）逐条执行审查步骤。该文件由任务提供并明确要求读取；这不是客户端原生 Skill 自动发现、显式触发或触发准确率测试。

版本由输入 `manifest.json` 标明：

- base：`09a8841eef555de21b5d389d38f02912466608c4`
- target：`7efb39eaaa5f757b571f7167a3aeb97bec856a15`
- 输入差异：`review.diff`，仅包含 `lib/knowledge-base.ts` 的新手章节索引变化及新增的 `scripts/tests/knowledge-base.test.mjs`。

结论：在以下明确范围内，没有发现可确认的代码缺陷。这个结论不等于全站、所有问句或线上功能全面通过。

## 检查范围与静态证据

1. 已读项目规则 `README.md`、`content/README.md`、`docs/operations/README.md`，以及本次提供的技能、清单和差异；项目规则仅作为维护约定，审查结果对应提供的目标快照。
2. `lib/knowledge-base.ts:3-5,89-98`：引入 `startArticles`，新增 `start` 类型，映射标题、摘要、完整 Markdown、`start:<slug>` ID、稳定的 `/start/<slug>` 地址与来源。
3. `lib/content.ts:45-53,78-95` 与 `lib/generated-content.json`：`startArticles` 已由生成内容直接导出；14 个章节的 slug、title、description、markdown、track 均为非空字符串。知识库共 60 条，其中 assistant 6、start 14、tutorial 1、theme 1、case 27、community-update 11。
4. `lib/knowledge-base.ts:141-172`：新条目使用现有评分与过滤流程，默认结果限额为 4。`174-211`：来源去重、模型上下文与本地回退使用通用条目字段，新增类型可进入这些路径。
5. `app/api/chat/route.ts:215-220,233-234`：API 静态调用路径以默认限额检索，随后生成来源、本地回退与模型上下文。未执行路由、请求上游或读取密钥。
6. `scripts/tests/knowledge-base.test.mjs:12-23,27-75`：测试转译实际生产检索代码，仅适配 `server-only` 与内容导入；覆盖新章节映射、指定问句、来源/上下文/本地答案和原内容类型。这里的转译与执行不构成 TypeScript 完整类型检查或 Next.js 构建。

## 实际执行及结果

命令：

```bash
node --test scripts/tests/knowledge-base.test.mjs
```

退出码为 0，原始输出：

```text
✔ every published beginner chapter is available with its full text and stable URL (0.958958ms)
✔ reader questions retrieve Cloud, CLI and VS Code chapters within the normal result limit (32.707ms)
✔ a retrieved chapter supplies an openable source, model context and a local answer (3.406584ms)
✔ existing targeted answers, tutorials, cases, themes and updates remain retrievable (10.996833ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 361.856208
```

另外执行了无文件写入的 `node <<'NODE'` 内存脚本：按测试相同方式转译目标模块，读取生成快照，打印实际召回、来源、条目数量、字段校验，并对 manifest 中全部 9 个文件计算 SHA-256。以下是实际观测，不是预期值：

| 问句 | 目标章节 | 排名 | 分数 | 默认返回条数 |
| --- | --- | --- | --- | --- |
| Codex Cloud 如何准备云端环境并开始新任务？ | `/start/14-cloud` | 1 | 47 | 4 |
| Codex Cloud 环境保存发布后怎么开始新任务？ | `/start/14-cloud` | 1 | 67 | 4 |
| CLI 如何精确恢复之前的会话？ | `/start/12-cli-options` | 1 | 37 | 4 |
| VS Code 中消息发出后怎么检查？ | `/start/13-ide-vscode` | 1 | 32 | 4 |

四个问句的实际来源数组均包含相应章节链接。五个原类型问句（测试第 66-70 行）均仍返回目标类型，其中各自目标类型也均位于第一条。

补充执行结果：

```json
{
  "allStartSourcesMatchEntryHref": true,
  "allStartContextIncludesFullContent": true,
  "emptyQuestionCount": 0,
  "hashesUnchanged": true
}
```

当前 14 个新手章节最长 4,148 个字符，均小于现有 `knowledgeContext` 的每条 6,000 字符截断阈值，所以这份快照内所有章节进入该函数时均保留完整正文。该观测不能保证未来更长文章也完整进入上下文。

哈希核验命令的关键计算为：

```javascript
for (const [file, expected] of Object.entries(manifest.files)) {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  console.log({ file, expected, actual, match: actual === expected });
}
```

读取依赖版本的命令为 `node` 内存脚本中的 `process.version`、`process.platform`、`process.arch`、`require('typescript/package.json').version` 与 `require('next/package.json').version`，并对照 `package-lock.json` 的锁定版本。

## 输入哈希

以下全部与 manifest 一致；验证完成后再次读取计算仍一致。

| 文件 | SHA-256 |
| --- | --- |
| `lib/knowledge-base.ts` | `ec98a73de59dfba31c8b986215ebdb49b84431ea9105d8beacc8b05c0901efbd` |
| `lib/content.ts` | `d3cf87ce7875dcfc1655fb36fac33ede7bf116c8c0ae174deaef109b1bba917f` |
| `lib/generated-content.json` | `2792425b6ff615e7d7e14d7205799274059e76629b5bfbb3d47ad6ed01249065` |
| `scripts/tests/knowledge-base.test.mjs` | `a2bba6edeb3b68cd72f8cddd4803bcd9c05c2d9cb1a8482527363834dfab5333` |
| `app/api/chat/route.ts` | `d7d05e9590afd6a35525d4bf83d5d0b533f48a59db406a9fe2e575c9c436d3e1` |
| `package.json` | `92ac654afb6f93ad585d79457e60ec9aef0337b078336c20992f94f5e7d186fa` |
| `package-lock.json` | `4794295ee77c53e407738a001e96863708c63ed277ebb029e6363a8c1ab3f7e7` |
| `SKILL.md` | `137c1060b821e9a3f1a25fa4ce239cc0e9f61b1a0ccdc5b381524ba2ba5102ee` |
| `review.diff` | `e0ee45a506b4b7c40a949aaad5e5049caafa9d46c4fefb8dafa3cf9ecea50262` |

## 确认发现

无。没有为了形成问题数量而把未执行的验证项或一般性风险写成缺陷。

## 待核实与残余风险

- Skill 原生发现与触发是否生效：未测试；需要真实客户端安装/发现与触发记录。本次只证明模型收到指定文件后按步骤执行了一次审查。
- 页面地址实际可访问性、浏览器交互、API 流式输出及上游模型回答：未测试；测试中 “openable source” 实际只断言路径进入来源数组，不是 HTTP 打开验证。
- 已发布源文档是否与生成快照完全一致：本次以提供的 `lib/generated-content.json` 为输入，未运行生成器或检查源内容全量覆盖。这里的“14 章”指快照中的 14 个条目。
- 同义问法、所有既有内容与排名变化：仅验证列出的九个问句与静态逻辑，未做全面检索质量评估；未计算准确率、改善率或用户收益。
- `npm run lint`、`npm run build`、部署与 CI：本次只读实验未运行这些步骤，也未修改代码或内容；不能据此声称构建、发布或部署通过。
- 版本归属以输入 manifest 为依据；未联网验证远端提交、CI 或生产部署版本。

## 环境版本与执行边界

- Node.js：`v25.8.0`
- 平台：`darwin`，架构：`arm64`
- TypeScript：`5.9.3`，与 lockfile 一致
- Next.js：`16.2.10`，与 lockfile 一致
- 项目 package 版本：`0.1.0`
- npm lockfile 格式：`3`

未安装依赖、联网、触发 API/浏览器、发布评论或修改快照、主仓库与依赖。唯一写入为此次报告文件。
