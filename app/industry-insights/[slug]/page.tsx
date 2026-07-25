import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getIndustryInsight, industryInsights } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return industryInsights.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = getIndustryInsight((await params).slug);
  if (!item) return {};
  return {
    title: item.title,
    description: item.description,
    alternates: { canonical: `/industry-insights/${item.slug}` },
  };
}

export default async function IndustryInsightPage({ params }: Props) {
  const item = getIndustryInsight((await params).slug);
  if (!item) notFound();

  return (
    <div className="html-insight-shell">
      <SiteHeader />
      <main className="html-insight-page">
        <iframe
          className="html-insight-frame"
          src={`/industry-insights/${encodeURIComponent(item.slug)}/document`}
          sandbox="allow-modals allow-scripts"
          title={item.title}
        />
      </main>
    </div>
  );
}
