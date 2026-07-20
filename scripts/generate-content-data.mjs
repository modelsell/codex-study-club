import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content");
const outputPath = path.join(root, "lib", "generated-content.json");

function listMarkdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".md") ? [fullPath] : [];
  });
}

function parseMarkdown(filePath) {
  const parsed = matter(fs.readFileSync(filePath, "utf8"));
  const heading = parsed.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return {
    data: parsed.data,
    title: String(parsed.data.title || heading || path.basename(filePath, ".md")),
    markdown: parsed.content.replace(/^#\s+.+(?:\r?\n)+/m, ""),
  };
}

function readCases() {
  return listMarkdownFiles(path.join(contentRoot, "cases"))
    .map((filePath) => {
      const parsed = parseMarkdown(filePath);
      const slug = path.basename(filePath, ".md");
      const firstImage = parsed.markdown.match(/!\[[^\]]*\]\((\/[^)]+)\)/)?.[1];
      const checkedInBody = parsed.markdown.match(/最后核对日期[：:]\s*(\d{4}-\d{2}-\d{2})/)?.[1];
      return {
        slug,
        title: parsed.title,
        summary: String(parsed.data.description || parsed.data.summary || "Codex 实战案例"),
        category: path.basename(path.dirname(filePath)),
        markdown: parsed.markdown,
        cover: parsed.data.cover ? String(parsed.data.cover) : firstImage,
        imageAlt: parsed.data.imageAlt ? String(parsed.data.imageAlt) : parsed.title,
        level: parsed.data.level ? String(parsed.data.level) : undefined,
        surface: parsed.data.surface ? String(parsed.data.surface) : undefined,
        duration: parsed.data.duration ? String(parsed.data.duration) : undefined,
        checkedAt: parsed.data.checkedAt ? String(parsed.data.checkedAt) : checkedInBody,
        number: /^(0[1-9]|1[0-7])-/.test(slug) ? slug.slice(0, 2) : undefined,
      };
    })
    .sort((a, b) => Number(Boolean(a.number)) - Number(Boolean(b.number)) || a.slug.localeCompare(b.slug));
}

function readUpdates() {
  return listMarkdownFiles(path.join(contentRoot, "community-updates"))
    .map((filePath) => {
      const parsed = parseMarkdown(filePath);
      const date = String(parsed.data.date || "2026-07-20");
      return {
        slug: path.basename(filePath, ".md"),
        title: parsed.title,
        excerpt: String(parsed.data.excerpt || parsed.data.description || "社群动态"),
        date,
        displayDate: String(parsed.data.displayDate || date.slice(5).replace("-", ".")),
        topics: Array.isArray(parsed.data.topics) ? parsed.data.topics.map(String) : [],
        markdown: parsed.markdown,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function readTutorials() {
  return listMarkdownFiles(path.join(contentRoot, "tutorials"))
    .map((filePath) => {
      const parsed = parseMarkdown(filePath);
      return {
        slug: path.basename(filePath, ".md"),
        title: parsed.title,
        description: String(parsed.data.description || "Codex 入门教程"),
        level: parsed.data.level ? String(parsed.data.level) : undefined,
        duration: parsed.data.duration ? String(parsed.data.duration) : undefined,
        checkedAt: parsed.data.checkedAt ? String(parsed.data.checkedAt) : undefined,
        markdown: parsed.markdown,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function readStartArticles() {
  return listMarkdownFiles(path.join(contentRoot, "start"))
    .map((filePath) => {
      const parsed = parseMarkdown(filePath);
      const slug = path.basename(filePath, ".md");
      const number = slug.match(/^(\d{2})-/)?.[1] || "00";
      const checkedInBody = parsed.markdown.match(/最后核对日期[：:]\s*(\d{4}-\d{2}-\d{2})/)?.[1];
      return {
        slug,
        number,
        title: parsed.title,
        description: String(parsed.data.description || "Codex 新手入门教程"),
        checkedAt: parsed.data.checkedAt ? String(parsed.data.checkedAt) : checkedInBody,
        markdown: parsed.markdown,
        track: Number(number) <= 9 ? "基础入门" : "开发者入门",
      };
    })
    .sort((a, b) => a.number.localeCompare(b.number));
}

function readThemes() {
  return listMarkdownFiles(path.join(contentRoot, "themes"))
    .map((filePath) => {
      const parsed = parseMarkdown(filePath);
      return {
        slug: path.basename(filePath, ".md"),
        title: parsed.title,
        description: String(parsed.data.description || "Codex Desktop 主题教程"),
        checkedAt: parsed.data.checkedAt ? String(parsed.data.checkedAt) : undefined,
        markdown: parsed.markdown,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function readAssistantKnowledge() {
  return listMarkdownFiles(path.join(contentRoot, "assistant"))
    .map((filePath) => {
      const parsed = parseMarkdown(filePath);
      const sources = Array.isArray(parsed.data.sources)
        ? parsed.data.sources.flatMap((source) => {
            if (!source || typeof source !== "object") return [];
            return source.label && source.href
              ? [{ label: String(source.label), href: String(source.href) }]
              : [];
          })
        : [];
      return {
        slug: path.basename(filePath, ".md"),
        title: parsed.title,
        terms: Array.isArray(parsed.data.terms) ? parsed.data.terms.map(String) : [],
        answer: parsed.markdown.trim(),
        sources,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

const generated = {
  cases: readCases(),
  updates: readUpdates(),
  tutorials: readTutorials(),
  startArticles: readStartArticles(),
  themes: readThemes(),
  knowledge: readAssistantKnowledge(),
};

fs.writeFileSync(outputPath, `${JSON.stringify(generated, null, 2)}\n`);
console.log(`Generated ${path.relative(root, outputPath)}`);
