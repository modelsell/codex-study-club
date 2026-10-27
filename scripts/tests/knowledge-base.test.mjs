import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { compileFunction } from "node:vm";
import ts from "typescript";

const content = JSON.parse(fs.readFileSync(new URL("../../lib/generated-content.json", import.meta.url), "utf8"));
const source = fs.readFileSync(new URL("../../lib/knowledge-base.ts", import.meta.url), "utf8");

// Run the production retrieval code against the committed content snapshot without
// booting Next.js. Only its content import and server-only marker need an adapter.
function loadKnowledgeBase(code, snapshot = content) {
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  compileFunction(outputText, ["require", "exports"])((specifier) => {
    if (specifier === "server-only") return {};
    if (specifier === "@/lib/content") return snapshot;
    throw new Error(`Unexpected test dependency: ${specifier}`);
  }, exports);
  return exports;
}

const { knowledgeBase, searchKnowledgeBase, sourcesForMatches, knowledgeContext, localKnowledgeAnswer } = loadKnowledgeBase(source);

test("every published beginner chapter is available with its full text and stable URL", () => {
  assert.ok(content.startArticles.length > 0);
  const entries = knowledgeBase.filter((entry) => entry.kind === "start");
  assert.equal(entries.length, content.startArticles.length);
  for (const article of content.startArticles) {
    const entry = entries.find((candidate) => candidate.href === `/start/${article.slug}`);
    assert.ok(entry, `Missing chapter: ${article.slug}`);
    assert.equal(entry.title, article.title);
    assert.equal(entry.summary, article.description);
    assert.equal(entry.content, article.markdown);
  }
  assert.equal(new Set(knowledgeBase.map((entry) => entry.id)).size, knowledgeBase.length);
});

test("reader questions retrieve Cloud, CLI and VS Code chapters within the normal result limit", () => {
  const questions = [
    ["Codex Cloud 如何准备云端环境并开始新任务？", "/start/14-cloud"],
    ["Codex Cloud 环境保存发布后怎么开始新任务？", "/start/14-cloud"],
    ["CLI 如何精确恢复之前的会话？", "/start/12-cli-options"],
    ["VS Code 中消息发出后怎么检查？", "/start/13-ide-vscode"],
  ];
  for (const [question, href] of questions) {
    const matches = searchKnowledgeBase(question);
    assert.ok(matches.some((match) => match.entry.href === href), `${question}: ${matches.map((match) => match.entry.href).join(", ")}`);
  }
});

test("a retrieved chapter supplies an openable source, model context and a local answer", () => {
  const match = searchKnowledgeBase("Codex Cloud 如何准备云端环境并开始新任务？")
    .find((candidate) => candidate.entry.href === "/start/14-cloud");
  assert.ok(match);
  assert.ok(sourcesForMatches([match]).some((source) => source.href === match.entry.href));
  assert.ok(knowledgeContext([match]).includes(match.entry.href));
  assert.ok(knowledgeContext([match]).includes(match.entry.content.trim().slice(0, 200)));
  assert.ok(localKnowledgeAnswer([match]).includes(match.entry.title));
});

test("permission and network symptoms return an actionable local answer with the stable case source", () => {
  const href = "/cases/codex-permission-and-network-blocked";
  for (const question of ["permission denied", "403", "network access", "网络受限", "权限审批"]) {
    const matches = searchKnowledgeBase(question);
    assert.ok(matches.some((match) => match.entry.href === href), `Missing diagnosis for ${question}`);
    assert.ok(sourcesForMatches(matches).some((source) => source.href === href), `Missing source for ${question}`);
    assert.ok(localKnowledgeAnswer(matches).includes(href), `Local answer has no openable diagnosis link for ${question}`);
  }
});

test("CLI installation symptoms return the installation chapter and a staged local diagnosis", () => {
  const href = "/start/10-cli-installation";
  for (const question of ["install.sh 404", "安装脚本404", "codex command not found", "codex 安装后版本没变化"]) {
    const matches = searchKnowledgeBase(question);
    assert.ok(matches.some((match) => match.entry.href === href), `Missing installation chapter for ${question}`);
    assert.ok(sourcesForMatches(matches).some((source) => source.href === href), `Missing installation source for ${question}`);
    const answer = localKnowledgeAnswer(matches);
    assert.ok(answer.includes(href), `Local answer has no installation link for ${question}`);
    for (const stage of ["下载阶段", "本机命令阶段", "登录阶段", "实际任务阶段"]) {
      assert.ok(answer.includes(stage), `Local answer misses ${stage} for ${question}`);
    }
  }
});

test("installation recovery questions require current evidence rather than issue closure or HTTP success", () => {
  const href = "/start/10-cli-installation";
  for (const question of ["安装脚本恢复了吗", "install.sh 404 修好了吗", "安装问题关闭了但还是404"]) {
    const matches = searchKnowledgeBase(question);
    assert.ok(sourcesForMatches(matches).some((source) => source.href === href), `Missing recovery diagnosis source for ${question}`);
    const answer = localKnowledgeAnswer(matches);
    assert.ok(answer.includes(href), `Local answer has no installation link for ${question}`);
    assert.match(answer, /Issue 关闭.*不能证明你当前安装成功/, `Issue closure is not qualified for ${question}`);
    assert.match(answer, /HTTP 200.*不证明安装、登录或任务成功/, `HTTP success is not qualified for ${question}`);
    assert.match(answer, /不执行脚本的下载检查.*HTTP 状态和 curl 退出码/, `Missing bounded evidence collection for ${question}`);
    assert.match(answer, /当前仍是 404 或超时.*保留这次结果/, `Missing current-failure guidance for ${question}`);
  }
});

test("existing targeted answers, tutorials, cases, themes and updates remain retrievable", () => {
  const questions = [
    ["AGENTS.md 和 Skill 的区别", "assistant"],
    ["完成你的第一个可验证任务", "tutorial"],
    ["让 Codex 修好网站死链：从复现到回归检查", "case"],
    ["Codex 主题", "theme"],
    ["Codex CLI 0.160.0：把旧任务、终端文本和工作区边界接起来", "community-update"],
  ];
  for (const [question, kind] of questions) {
    assert.ok(searchKnowledgeBase(question).some((match) => match.entry.kind === kind), `${kind}: ${question}`);
  }
});

test("documented CLI commands retrieve their chapters, including backticks and Chinese questions", () => {
  const questions = [
    ["codex --version", "/start/10-cli-installation"],
    ["codex login status", "/start/10-cli-installation"],
    ["codex resume", "/start/12-cli-options"],
    ["`codex login status`", "/start/10-cli-installation"],
    ["请解释 `Codex resume` 的用途", "/start/12-cli-options"],
    ["怎么使用 codex resume 继续旧会话？", "/start/12-cli-options"],
    ["终端里的 `codex --version` 是做什么的？", "/start/10-cli-installation"],
    ["codex exec --help", "/start/12-cli-options"],
    ["请解释 codex resume --help", "/start/12-cli-options"],
  ];
  for (const [question, href] of questions) {
    const matches = searchKnowledgeBase(question);
    assert.ok(matches.some((match) => match.entry.href === href), `${question}: ${matches.map((match) => match.entry.href).join(", ")}`);
    assert.ok(sourcesForMatches(matches).some((source) => source.href === href), `Missing command source for ${question}`);
    assert.notEqual(localKnowledgeAnswer(matches), localKnowledgeAnswer([]), `Unexpected fallback for ${question}`);
  }
});

test("command lookup keeps complete subcommand and option boundaries", () => {
  for (const question of ["codex resumed", "codex login statusx", "codex --versionx", "codex resume --helpful", "codex --version=false"]) {
    assert.deepEqual(searchKnowledgeBase(question), [], `Undocumented command received a command match: ${question}`);
  }
});

test("command quotations in a case do not displace the teaching chapters", () => {
  const snapshot = {
    ...content,
    cases: [...content.cases, {
      slug: "retrieval-command-quotations",
      title: "修复站内助手的命令漏检",
      summary: "用 codex --version、codex login status 和 codex resume 检查检索结果。",
      category: "工程实践",
      markdown: [
        "案例中的查询样本：`codex --version`、`codex login status`、`codex resume`。这里只讨论搜索结果，不是 CLI 操作教程。",
        '```json\n{"sample": "codex not-a-real-subcommand"}\n```',
        "```text\ncodex another-unpublished-command\n```",
      ].join("\n\n"),
    }],
  };
  const retrieval = loadKnowledgeBase(source, snapshot);
  for (const question of ["codex --version", "codex login status", "codex resume"]) {
    const matches = retrieval.searchKnowledgeBase(question);
    assert.equal(matches[0]?.entry.kind, "start", `A quoted query displaced its chapter: ${question}`);
    assert.ok(matches[0].entry.content.includes(question), `Top chapter does not document ${question}`);
  }
  for (const question of ["codex not-a-real-subcommand", "codex another-unpublished-command"]) {
    assert.deepEqual(retrieval.searchKnowledgeBase(question), [], `Non-shell sample was treated as a command: ${question}`);
  }
});
