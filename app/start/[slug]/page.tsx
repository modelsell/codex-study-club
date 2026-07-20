import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getStartArticle, startArticles } from "@/lib/content";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return startArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getStartArticle((await params).slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/start/${article.slug}` },
  };
}

export default async function StartArticlePage({ params }: Props) {
  const article = getStartArticle((await params).slug);
  if (!article) notFound();

  const index = startArticles.findIndex((item) => item.slug === article.slug);
  const previous = index > 0 ? startArticles[index - 1] : undefined;
  const next = index < startArticles.length - 1 ? startArticles[index + 1] : undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: article.title,
    description: article.description,
    position: Number(article.number),
    dateModified: article.checkedAt || "2026-07-20",
    inLanguage: "zh-CN",
  };

  return (
    <>
      <SiteHeader />
      <main className="article-page markdown-article-page start-article-page">
        <div className="start-article-layout shell">
          <aside className="start-article-sidebar" aria-label="新手入门目录">
            <Link className="start-sidebar-title" href="/start/01-what-is-codex">
              <BookOpen size={16} />
              新手入门
            </Link>
            <ol>
              {startArticles.map((item) => (
                <li key={item.slug}>
                  <Link
                    aria-current={item.slug === article.slug ? "page" : undefined}
                    href={`/start/${item.slug}`}
                  >
                    <span>{item.number}</span>
                    {item.title}
                  </Link>
                </li>
              ))}
            </ol>
          </aside>

          <article className="article start-article">
            <Link className="back-link" href="/">
              <ArrowLeft size={16} />
              返回首页
            </Link>
            <details className="start-mobile-index">
              <summary>查看全部 14 篇教程</summary>
              <ol>
                {startArticles.map((item) => (
                  <li key={item.slug}>
                    <Link aria-current={item.slug === article.slug ? "page" : undefined} href={`/start/${item.slug}`}>
                      {item.number} · {item.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </details>
            <div className="start-article-meta">
              <span>{article.track}</span>
              <span>第 {article.number} 章</span>
              {article.checkedAt ? <span>核对于 {article.checkedAt}</span> : null}
            </div>
            <h1>{article.title}</h1>
            <p className="article-lead">{article.description}</p>
            <MarkdownContent content={article.markdown} />
            <p className="start-article-credit">
              本文基于 CodexGuide 的 MIT 授权内容收录，原作者 canghe。
            </p>
            <nav className="start-article-pagination" aria-label="文章翻页">
              {previous ? (
                <Link href={`/start/${previous.slug}`}>
                  <ChevronLeft size={18} />
                  <span><small>上一篇</small>{previous.title}</span>
                </Link>
              ) : <span />}
              {next ? (
                <Link href={`/start/${next.slug}`}>
                  <span><small>下一篇</small>{next.title}</span>
                  <ChevronRight size={18} />
                </Link>
              ) : (
                <Link href="/start/01-what-is-codex">
                  <span><small>已完成</small>从第一篇重新开始</span>
                  <ArrowRight size={18} />
                </Link>
              )}
            </nav>
          </article>
        </div>
      </main>
      <SiteFooter />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} type="application/ld+json" />
    </>
  );
}
