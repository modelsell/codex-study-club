import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getTheme } from "@/lib/content";

const theme = getTheme("codex-dream-skin");

export const metadata: Metadata = {
  title: theme?.title || "Codex 主题",
  description: theme?.description || "Codex Desktop 主题效果与安装教程。",
  alternates: { canonical: "/themes" },
  openGraph: {
    images: [
      {
        url: "/themes/codex-dream-skin/dream-skin-demo.png",
        alt: "Codex Dream Skin 抽象主题效果",
      },
    ],
  },
};

export default function ThemesPage() {
  if (!theme) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: theme.title,
    description: theme.description,
    dateModified: theme.checkedAt || "2026-07-20",
    inLanguage: "zh-CN",
  };

  return (
    <>
      <SiteHeader />
      <main className="article-page markdown-article-page theme-page">
        <article className="article shell-narrow">
          <div className="meta-line article-meta">
            <span>桌面主题</span>
            <span>macOS + Windows</span>
          </div>
          <h1>{theme.title}</h1>
          <p className="article-lead">{theme.description}</p>
          <Link
            className="theme-source-link"
            href="https://github.com/Fei-Away/Codex-Dream-Skin"
            target="_blank"
            rel="noreferrer noopener"
          >
            查看开源项目
            <ArrowUpRight size={16} />
          </Link>
          <MarkdownContent content={theme.markdown} />
        </article>
      </main>
      <SiteFooter />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} type="application/ld+json" />
    </>
  );
}
