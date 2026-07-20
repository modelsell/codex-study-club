import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getUpdate, updates } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return updates.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = getUpdate((await params).slug);
  if (!item) return {};
  return {
    title: item.title,
    description: item.excerpt,
    alternates: { canonical: `/community/updates/${item.slug}` },
  };
}

export default async function UpdateDetailPage({ params }: Props) {
  const item = getUpdate((await params).slug);
  if (!item) notFound();

  return (
    <>
      <SiteHeader />
      <main className="article-page update-article-page">
        <article className="article shell-narrow">
          <Link className="back-link" href="/community/updates">
            <ArrowLeft size={16} />
            返回社群动态
          </Link>
          <div className="update-article-meta">
            <time dateTime={item.date}>{item.date}</time>
            {item.topics.map((topic) => <span key={topic}>{topic}</span>)}
          </div>
          <h1>{item.title}</h1>
          <p className="article-lead">{item.excerpt}</p>
          <MarkdownContent content={item.markdown} />
          <Link className="article-community-cta" href="/community">
            参与下一次讨论
            <ArrowUpRight size={18} />
          </Link>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
