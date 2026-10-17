import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Clock3 } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import styles from "@/components/case-reading.module.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCaseCategoryLabel } from "@/lib/case-categories";
import { cases, getCase } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return cases.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = getCase((await params).slug);
  if (!item) return {};
  return {
    title: item.title,
    description: item.summary,
    alternates: { canonical: `/cases/${item.slug}` },
    openGraph: item.cover ? { images: [{ url: item.cover, alt: item.imageAlt || item.title }] } : undefined,
  };
}

export default async function CaseDetailPage({ params }: Props) {
  const item = getCase((await params).slug);
  if (!item) notFound();

  const categoryLabel = getCaseCategoryLabel(item.category);
  const relatedCases = cases
    .filter((candidate) => candidate.category === item.category && candidate.slug !== item.slug)
    .slice(0, 2);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: item.title,
    description: item.summary,
    ...(item.checkedAt ? { dateModified: item.checkedAt } : {}),
    inLanguage: "zh-CN",
  };

  return (
    <>
      <SiteHeader />
      <main className={styles.page} id="main-content" tabIndex={-1}>
        <div className="shell">
          <nav aria-label="案例导航" className={styles.breadcrumb}>
            <Link href="/cases"><ArrowLeft aria-hidden="true" size={15} /> 案例库</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/cases#${item.category}`}>{categoryLabel}</Link>
          </nav>
          <div className={styles.layout}>
            <article className={styles.article}>
              <header className={styles.header}>
                <div className={styles.metadata}>
                  <span>{item.level || categoryLabel}</span>
                  {item.surface ? <span>{item.surface}</span> : null}
                  {item.duration ? <span><Clock3 aria-hidden="true" size={13} /> {item.duration}</span> : null}
                </div>
                <h1>{item.title}</h1>
                <p className={styles.lead}>{item.summary}</p>
                {item.checkedAt ? (
                  <p className={styles.checkedAt}>内容核对 <time dateTime={item.checkedAt}>{item.checkedAt}</time></p>
                ) : null}
              </header>
              <MarkdownContent content={item.markdown} />
              <section aria-labelledby="continue-reading" className={styles.continueReading}>
                <div className={styles.continueHeading}>
                  <h2 id="continue-reading">继续实践</h2>
                  <Link href={`/cases#${item.category}`}>浏览{categoryLabel} <ArrowUpRight aria-hidden="true" size={16} /></Link>
                </div>
                {relatedCases.length > 0 ? (
                  <div className={styles.relatedCases}>
                    {relatedCases.map((related) => (
                      <Link href={`/cases/${related.slug}`} key={related.slug}>
                        <span>{related.surface || categoryLabel}</span>
                        <h3>{related.title}</h3>
                        <ArrowUpRight aria-hidden="true" size={20} />
                      </Link>
                    ))}
                  </div>
                ) : null}
                <Link className={styles.nextStep} href="/start/06-first-task">
                  <div><span>把方法用到自己的项目</span><strong>从一个可验收的小任务开始</strong></div>
                  <ArrowUpRight aria-hidden="true" size={20} />
                </Link>
              </section>
            </article>
            <aside aria-label="实践提示" className={styles.sidebar}>
              <div className={styles.sidebarInner}>
                <span className={styles.sideKicker}>READ · TRY · VERIFY</span>
                <h2>带着任务来，<br />带着结果走。</h2>
                <ol>
                  <li>先看适用入口和前提。</li>
                  <li>把示例任务换成自己的目标。</li>
                  <li>按文中的验收步骤检查产物。</li>
                </ol>
                <p>来源、操作记录与未验证范围，以正文说明为准。</p>
                <Link href="/cases">寻找其他案例 <ArrowUpRight aria-hidden="true" size={16} /></Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} type="application/ld+json" />
    </>
  );
}
