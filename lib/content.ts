import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type SourceLink = {
  label: string;
  href: string;
};

export type CaseStudy = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  markdown: string;
  cover?: string;
  imageAlt?: string;
  level?: string;
  surface?: string;
  duration?: string;
  checkedAt?: string;
  number?: string;
};

export type CommunityUpdate = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  displayDate: string;
  topics: string[];
  markdown: string;
};

export type TutorialDocument = {
  slug: string;
  title: string;
  description: string;
  level?: string;
  duration?: string;
  checkedAt?: string;
  markdown: string;
};

export type StartArticle = {
  slug: string;
  number: string;
  title: string;
  description: string;
  checkedAt?: string;
  markdown: string;
  track: "基础入门" | "开发者入门";
};

export type ThemeDocument = {
  slug: string;
  title: string;
  description: string;
  checkedAt?: string;
  markdown: string;
};

export type AssistantKnowledge = {
  slug: string;
  title: string;
  terms: string[];
  answer: string;
  sources: SourceLink[];
};

const contentRoot = path.join(process.cwd(), "content");

function listMarkdownFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".md") ? [fullPath] : [];
  });
}

function parseMarkdown(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const heading = parsed.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return {
    data: parsed.data,
    title: String(parsed.data.title || heading || path.basename(filePath, ".md")),
    markdown: parsed.content.replace(/^#\s+.+(?:\r?\n)+/m, ""),
  };
}

function readCases(): CaseStudy[] {
  const casesDir = path.join(contentRoot, "cases");
  return listMarkdownFiles(casesDir)
    .map((filePath) => {
      const parsed = parseMarkdown(filePath);
      const slug = path.basename(filePath, ".md");
      const category = path.basename(path.dirname(filePath));
      const firstImage = parsed.markdown.match(/!\[[^\]]*\]\((\/[^)]+)\)/)?.[1];
      const checkedInBody = parsed.markdown.match(/最后核对日期[：:]\s*(\d{4}-\d{2}-\d{2})/)?.[1];
      return {
        slug,
        title: parsed.title,
        summary: String(parsed.data.description || parsed.data.summary || "Codex 实战案例"),
        category,
        markdown: parsed.markdown,
        cover: parsed.data.cover ? String(parsed.data.cover) : firstImage,
        imageAlt: parsed.data.imageAlt ? String(parsed.data.imageAlt) : parsed.title,
        level: parsed.data.level ? String(parsed.data.level) : undefined,
        surface: parsed.data.surface ? String(parsed.data.surface) : undefined,
        duration: parsed.data.duration ? String(parsed.data.duration) : undefined,
        checkedAt: parsed.data.checkedAt ? String(parsed.data.checkedAt) : checkedInBody,
        number: /^(0[1-9]|1[0-7])-/.test(slug) ? slug.slice(0, 2) : undefined,
      } satisfies CaseStudy;
    })
    .sort((a, b) => Number(Boolean(a.number)) - Number(Boolean(b.number)) || a.slug.localeCompare(b.slug));
}

function readUpdates(): CommunityUpdate[] {
  const updatesDir = path.join(contentRoot, "community-updates");
  return listMarkdownFiles(updatesDir)
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
      } satisfies CommunityUpdate;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function readTutorials(): TutorialDocument[] {
  const tutorialsDir = path.join(contentRoot, "tutorials");
  return listMarkdownFiles(tutorialsDir)
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
      } satisfies TutorialDocument;
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function readStartArticles(): StartArticle[] {
  const startDir = path.join(contentRoot, "start");
  return listMarkdownFiles(startDir)
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
      } satisfies StartArticle;
    })
    .sort((a, b) => a.number.localeCompare(b.number));
}

function readThemes(): ThemeDocument[] {
  const themesDir = path.join(contentRoot, "themes");
  return listMarkdownFiles(themesDir)
    .map((filePath) => {
      const parsed = parseMarkdown(filePath);
      return {
        slug: path.basename(filePath, ".md"),
        title: parsed.title,
        description: String(parsed.data.description || "Codex Desktop 主题教程"),
        checkedAt: parsed.data.checkedAt ? String(parsed.data.checkedAt) : undefined,
        markdown: parsed.markdown,
      } satisfies ThemeDocument;
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function readAssistantKnowledge(): AssistantKnowledge[] {
  const assistantDir = path.join(contentRoot, "assistant");
  return listMarkdownFiles(assistantDir)
    .map((filePath) => {
      const parsed = parseMarkdown(filePath);
      const sources = Array.isArray(parsed.data.sources)
        ? parsed.data.sources.flatMap((source) => {
            if (!source || typeof source !== "object") return [];
            const value = source as { label?: unknown; href?: unknown };
            return value.label && value.href
              ? [{ label: String(value.label), href: String(value.href) }]
              : [];
          })
        : [];
      return {
        slug: path.basename(filePath, ".md"),
        title: parsed.title,
        terms: Array.isArray(parsed.data.terms) ? parsed.data.terms.map(String) : [],
        answer: parsed.markdown.trim(),
        sources,
      } satisfies AssistantKnowledge;
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export const cases = readCases();
export const updates = readUpdates();
export const tutorials = readTutorials();
export const startArticles = readStartArticles();
export const themes = readThemes();
export const knowledge = readAssistantKnowledge();

export function getCase(slug: string) {
  return cases.find((item) => item.slug === slug);
}

export function getUpdate(slug: string) {
  return updates.find((item) => item.slug === slug);
}

export function getTutorial(slug: string) {
  return tutorials.find((item) => item.slug === slug);
}

export function getStartArticle(slug: string) {
  return startArticles.find((item) => item.slug === slug);
}

export function getTheme(slug: string) {
  return themes.find((item) => item.slug === slug);
}
