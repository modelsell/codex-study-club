import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getStartArticle, startArticles } from "@/lib/content";
import { notFound } from "next/navigation";
import styles from "./article.module.css";

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
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <div className={`shell ${styles.layout}`}>
          <aside className={styles.sidebar} aria-label="学习路线目录">
            <Link className={styles.sidebarTitle} href="/start">
              <BookOpen size={16} aria-hidden="true" />
              学习路线
              <span>{startArticles.length} 篇</span>
            </Link>
            <nav aria-label="全部教程章节"><ol className={styles.chapterList}>
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
            </ol></nav>
            <Link className={styles.sidebarPractice} href="/cases">去案例库找一个练习 <ArrowRight size={14} aria-hidden="true" /></Link>
          </aside>

          <article className={styles.article}>
            <Link className={styles.backLink} href="/start">
              <ArrowLeft size={15} aria-hidden="true" />
              返回学习路线
            </Link>
            <details className={styles.mobileIndex}>
              <summary>查看全部 {startArticles.length} 篇教程 <span>当前第 {index + 1} 章</span></summary>
              <nav aria-label="移动端教程目录"><ol className={styles.chapterList}>
                {startArticles.map((item) => (
                  <li key={item.slug}>
                    <Link aria-current={item.slug === article.slug ? "page" : undefined} href={`/start/${item.slug}`}>
                      <span>{item.number}</span>{item.title}
                    </Link>
                  </li>
                ))}
              </ol></nav>
            </details>
            <header className={styles.articleHeader}>
              <div className={styles.meta}>
                <span>{article.track}</span>
                <span>第 {index + 1} 章 / 共 {startArticles.length} 章</span>
              </div>
              <h1>{article.title}</h1>
              <p className={styles.lead}>{article.description}</p>
              {article.checkedAt ? <p className={styles.checkedAt}>内容核对 <time dateTime={article.checkedAt}>{article.checkedAt}</time></p> : null}
            </header>
            <MarkdownContent content={article.markdown} />
            <p className={styles.credit}>
              本文基于 CodexGuide 的 MIT 授权内容收录，原作者 canghe。
            </p>
            <nav className={styles.pagination} aria-label="教程前后章导航">
              {previous ? (
                <Link href={`/start/${previous.slug}`} rel="prev">
                  <ChevronLeft size={18} aria-hidden="true" />
                  <span><small>上一章 · {previous.number}</small>{previous.title}</span>
                </Link>
              ) : (
                <Link href="/start"><ChevronLeft size={18} aria-hidden="true" /><span><small>从这里开始</small>查看完整学习路线</span></Link>
              )}
              {next ? (
                <Link href={`/start/${next.slug}`} rel="next">
                  <span><small>下一章 · {next.number}</small>{next.title}</span>
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              ) : (
                <Link href="/cases">
                  <span><small>接着实践</small>在案例库中选择一个任务</span>
                  <ArrowRight size={18} aria-hidden="true" />
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
