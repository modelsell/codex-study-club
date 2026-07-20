import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { UpdateList } from "@/components/update-list";
import { updates } from "@/lib/content";

export const metadata: Metadata = {
  title: "Codex 最新动态与实践",
  description: "筛选 Codex 官方动态与社区实践，整理可核对的新功能、教程与验证方法。",
  alternates: { canonical: "/community/updates" },
};

export default function UpdatesPage() {
  return (
    <>
      <SiteHeader />
      <main className="listing-page">
        <header className="page-intro shell">
          <span className="eyebrow">FIELD NOTES</span>
          <h1>Codex 动态</h1>
          <p>追踪官方产品更新与社区实践，去除重复信息，只保留有来源、能落地的内容。</p>
        </header>
        <section className="shell listing-content updates-archive">
          <UpdateList items={updates} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
