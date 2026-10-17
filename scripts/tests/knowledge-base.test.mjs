import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { compileFunction } from "node:vm";
import ts from "typescript";

const content = JSON.parse(fs.readFileSync(new URL("../../lib/generated-content.json", import.meta.url), "utf8"));
const source = fs.readFileSync(new URL("../../lib/knowledge-base.ts", import.meta.url), "utf8");

// Run the production retrieval code against the committed content snapshot without
// booting Next.js. Only its content import and server-only marker need an adapter.
function loadKnowledgeBase(code) {
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  compileFunction(outputText, ["require", "exports"])((specifier) => {
    if (specifier === "server-only") return {};
    if (specifier === "@/lib/content") return content;
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
