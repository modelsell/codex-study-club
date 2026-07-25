import type { Metadata } from "next";
import { IndustryInsightList } from "@/components/industry-insight-list";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { industryInsights } from "@/lib/content";

export const metadata: Metadata = {
  title: "行业解读",
  description: "围绕 AI 行业、公司战略与组织管理的深度专题解读。",
  alternates: { canonical: "/industry-insights" },
};

export default function IndustryInsightsPage() {
  return (
    <>
      <SiteHeader />
      <main className="listing-page industry-insights-page">
        <header className="page-intro shell">
          <span className="eyebrow">INDUSTRY BRIEFING</span>
          <h1>行业解读</h1>
          <p>从公开材料出发，拆解 AI 行业的重要判断、战略选择与组织方法。</p>
        </header>
        <section className="shell listing-content industry-insights-archive">
          <IndustryInsightList items={industryInsights} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
