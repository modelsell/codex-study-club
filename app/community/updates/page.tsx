import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { UpdateList } from "@/components/update-list";
import { updates } from "@/lib/content";

export const metadata: Metadata = {
  title: "最新社群动态",
  description: "从 Codex 社群真实讨论中整理的经验、问题与验证结果。",
  alternates: { canonical: "/community/updates" },
};

export default function UpdatesPage() {
  return (
    <>
      <SiteHeader />
      <main className="listing-page">
        <header className="page-intro shell">
          <span className="eyebrow">FIELD NOTES</span>
          <h1>社群动态</h1>
          <p>群聊由站方定期整理。所有公开内容均经过筛选、核对和隐私处理。</p>
        </header>
        <section className="shell listing-content updates-archive">
          <UpdateList items={updates} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
