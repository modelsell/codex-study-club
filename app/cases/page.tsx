import type { Metadata } from "next";
import { CaseLibrary } from "@/components/case-library";
import styles from "@/components/case-library.module.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cases } from "@/lib/content";
import { readings } from "@/lib/editorial";

export const metadata: Metadata = {
  title: "Agent 文章与实验",
  description: "检索 Agent 工作方法、只读工具、CLI 与 SDK 实验，按任务和内容类型查找来源、步骤、验证范围与可复用成果。",
  alternates: { canonical: "/cases" },
};

export default function CasesPage() {
  const caseMetadata = [...cases].sort((a, b) => (b.checkedAt || "").localeCompare(a.checkedAt || "")).map((item) => ({
    slug: item.slug,
    kind: readings.find((reading) => reading.href === `/cases/${item.slug}`)?.kind || "方法指南",
    evidence: readings.find((reading) => reading.href === `/cases/${item.slug}`)?.scope,
    title: item.title,
    summary: item.summary,
    category: item.category,
    cover: item.cover,
    imageAlt: item.imageAlt,
    level: item.level,
    surface: item.surface,
    duration: item.duration,
    checkedAt: item.checkedAt,
    number: item.number,
  }));

  return (
    <>
      <SiteHeader />
      <main className={styles.page} id="main-content" tabIndex={-1}>
        <div className="shell">
          <header className={styles.intro} id="top">
            <div>
              <span className={styles.kicker}>THE LIBRARY / 文章与实验</span>
              <h1>找到下一篇<br />值得读的文章。</h1>
            </div>
            <p>按问题、工具和内容类型选读。方法指南、工具实践与 CLI / SDK 实验分别标明，实际环境和验证范围见正文。</p>
          </header>
          <CaseLibrary items={caseMetadata} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
