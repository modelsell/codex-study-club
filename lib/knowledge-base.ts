import "server-only";

import { cases, knowledge, themes, tutorials, updates, type SourceLink } from "@/lib/content";

export type KnowledgeKind = "assistant" | "case" | "theme" | "tutorial" | "community-update";

export type KnowledgeEntry = {
  id: string;
  kind: KnowledgeKind;
  title: string;
  summary: string;
  content: string;
  href: string;
  terms: string[];
  sources: SourceLink[];
};

export type KnowledgeMatch = {
  entry: KnowledgeEntry;
  score: number;
};

const stopWords = new Set([
  "一个",
  "什么",
  "可以",
  "如何",
  "怎么",
  "帮我",
  "应该",
  "使用",
  "这个",
  "目前",
  "当前",
  "请问",
  "codex",
]);

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function queryTokens(question: string) {
  const chunks = normalize(question).match(/[a-z0-9_.+-]+|[\u3400-\u9fff]+/g) || [];
  const tokens = new Set<string>();

  for (const chunk of chunks) {
    if (/^[\u3400-\u9fff]+$/.test(chunk)) {
      if (chunk.length >= 2 && !stopWords.has(chunk)) tokens.add(chunk);
      for (let index = 0; index < chunk.length - 1; index += 1) {
        const pair = chunk.slice(index, index + 2);
        if (!stopWords.has(pair)) tokens.add(pair);
      }
    } else if (chunk.length >= 2 && !stopWords.has(chunk)) {
      tokens.add(chunk);
    }
  }

  return [...tokens];
}

function plainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^:::(?:\s*\w+.*)?$/gm, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[`*_~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const knowledgeBase: KnowledgeEntry[] = [
  ...knowledge.map((item) => ({
    id: `assistant:${item.slug}`,
    kind: "assistant" as const,
    title: item.title,
    summary: plainText(item.answer).slice(0, 180),
    content: item.answer,
    href: item.sources.find((source) => source.href.startsWith("/"))?.href || "/",
    terms: item.terms,
    sources: item.sources,
  })),
  ...tutorials.map((item) => ({
    id: `tutorial:${item.slug}`,
    kind: "tutorial" as const,
    title: item.title,
    summary: item.description,
    content: item.markdown,
    href: `/learn/${item.slug}`,
    terms: [item.title, item.level || "", "教程", "入门"].filter(Boolean),
    sources: [{ label: `教程：${item.title}`, href: `/learn/${item.slug}` }],
  })),
  ...themes.map((item) => ({
    id: `theme:${item.slug}`,
    kind: "theme" as const,
    title: item.title,
    summary: item.description,
    content: item.markdown,
    href: "/themes",
    terms: [item.title, "Codex 主题", "Codex 换皮", "Dream Skin", "桌面主题"],
    sources: [{ label: `主题：${item.title}`, href: "/themes" }],
  })),
  ...cases.map((item) => ({
    id: `case:${item.slug}`,
    kind: "case" as const,
    title: item.title,
    summary: item.summary,
    content: item.markdown,
    href: `/cases/${item.slug}`,
    terms: [item.title, item.category, item.level || "", item.surface || ""].filter(Boolean),
    sources: [{ label: `案例：${item.title}`, href: `/cases/${item.slug}` }],
  })),
  ...updates.map((item) => ({
    id: `community-update:${item.slug}`,
    kind: "community-update" as const,
    title: item.title,
    summary: item.excerpt,
    content: item.markdown,
    href: `/community/updates/${item.slug}`,
    terms: [item.title, ...item.topics],
    sources: [{ label: `社群动态：${item.title}`, href: `/community/updates/${item.slug}` }],
  })),
];

function scoreEntry(entry: KnowledgeEntry, question: string, tokens: string[]) {
  const normalizedQuestion = normalize(question);
  const title = normalize(entry.title);
  const summary = normalize(entry.summary);
  const content = normalize(plainText(entry.content));
  let score = 0;

  for (const term of entry.terms) {
    const normalizedTerm = normalize(term);
    if (normalizedTerm.length >= 2 && normalizedQuestion.includes(normalizedTerm)) score += 18;
  }

  for (const token of tokens) {
    if (title.includes(token)) score += 8;
    if (summary.includes(token)) score += 4;
    if (content.includes(token)) score += 1;
  }

  return score;
}

export function searchKnowledgeBase(question: string, limit = 4): KnowledgeMatch[] {
  const tokens = queryTokens(question);
  const ranked = knowledgeBase
    .map((entry) => ({ entry, score: scoreEntry(entry, question, tokens) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
  const minimumScore = Math.max(6, (ranked[0]?.score || 0) * 0.25);
  return ranked
    .filter((match) => match.score >= minimumScore)
    .slice(0, limit);
}

export function sourcesForMatches(matches: KnowledgeMatch[], limit = 4): SourceLink[] {
  const seen = new Set<string>();
  return matches
    .flatMap((match) => match.entry.sources)
    .filter((source) => {
      if (seen.has(source.href)) return false;
      seen.add(source.href);
      return true;
    })
    .slice(0, limit);
}

export function knowledgeContext(matches: KnowledgeMatch[]) {
  return matches
    .map((match, index) => {
      const content = match.entry.content.trim().slice(0, 6000);
      return `[资料 ${index + 1}]\n标题：${match.entry.title}\n类型：${match.entry.kind}\n站内地址：${match.entry.href}\n摘要：${match.entry.summary}\n正文：\n${content}`;
    })
    .join("\n\n");
}

export function localKnowledgeAnswer(matches: KnowledgeMatch[]) {
  const best = matches[0];
  if (!best) {
    return "本地资料库暂时没有找到直接相关的内容。请补充你使用的是 Codex App、CLI、IDE 还是 Cloud，以及已经做过什么、出现了什么结果。";
  }

  if (best.entry.kind === "assistant") return best.entry.content;

  const excerpt = plainText(best.entry.content).slice(0, 520);
  return [
    `本地资料库中最相关的是《${best.entry.title}》。`,
    best.entry.summary,
    excerpt && excerpt !== best.entry.summary ? excerpt : "",
    "可以打开下方资料查看完整内容。",
  ]
    .filter(Boolean)
    .join("\n\n");
}
