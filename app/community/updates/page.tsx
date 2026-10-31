import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { UpdateList } from "@/components/update-list";
import { updates } from "@/lib/content";

export const metadata: Metadata = {
  title: "Agent 产品动态与使用技巧",
  description: "跟进 Codex、Claude Code 与 Agent 产品，交叉核对官方资料和用户需求，整理有来源的新功能、使用技巧与验证方法。",
  alternates: { canonical: "/community/updates" },
};

export default function UpdatesPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="listing-page">
        <header className="page-intro shell">
          <span className="eyebrow">FIELD NOTES</span>
          <h1>Agent 产品动态</h1>
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
