import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getTutorial } from "@/lib/content";

const tutorial = getTutorial("getting-started");

export const metadata: Metadata = {
  title: tutorial?.title || "Codex 入门教程",
  description: tutorial?.description || "完成第一个可验证的 Codex 任务。",
  alternates: { canonical: "/learn/getting-started" },
};

export default function GettingStartedPage() {
  if (!tutorial) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: tutorial.title,
    description: tutorial.description,
    totalTime: "PT15M",
    inLanguage: "zh-CN",
  };

  return (
    <>
      <SiteHeader />
      <main className="article-page tutorial-page">
        <article className="article shell-narrow">
          <Link className="back-link" href="/">
            <ArrowLeft size={16} />
            返回首页
          </Link>
          <div className="tutorial-kicker">
            <Sparkles size={16} />
            {tutorial.level} · {tutorial.duration}
          </div>
          <h1>{tutorial.title}</h1>
          <p className="article-lead">{tutorial.description}</p>
          <MarkdownContent content={tutorial.markdown} />
        </article>
      </main>
      <SiteFooter />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} type="application/ld+json" />
    </>
  );
}
