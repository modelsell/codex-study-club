import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3 } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: item.title,
    description: item.summary,
    dateModified: item.checkedAt || "2026-07-20",
    inLanguage: "zh-CN",
  };

  return (
    <>
      <SiteHeader />
      <main className="article-page markdown-article-page">
        <article className="article shell-narrow">
          <Link className="back-link" href="/cases">
            <ArrowLeft size={16} />
            返回案例
          </Link>
          <div className="meta-line article-meta">
            <span>{item.level || getCaseCategoryLabel(item.category)}</span>
            {item.surface ? <span>{item.surface}</span> : null}
            {item.duration ? <span className="with-icon"><Clock3 size={14} /> {item.duration}</span> : null}
          </div>
          <h1>{item.title}</h1>
          <p className="article-lead">{item.summary}</p>
          <MarkdownContent content={item.markdown} />
        </article>
      </main>
      <SiteFooter />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} type="application/ld+json" />
    </>
  );
}
