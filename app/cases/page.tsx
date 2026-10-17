import type { Metadata } from "next";
import { CaseLibrary } from "@/components/case-library";
import styles from "@/components/case-library.module.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cases } from "@/lib/content";

export const metadata: Metadata = {
  title: "Codex 实战案例",
  description: "按任务、工具和问题查找 Codex 案例，阅读操作步骤、来源与验收方法。",
  alternates: { canonical: "/cases" },
};

export default function CasesPage() {
  const caseMetadata = cases.map((item) => ({
    slug: item.slug,
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
              <span className={styles.kicker}>THE FIELD NOTES / 实践档案</span>
              <h1>实战案例</h1>
            </div>
            <p>从你正在遇到的问题出发。找到可参考的任务、步骤与验收方法，再把它用到自己的工作里。</p>
          </header>
          <CaseLibrary items={caseMetadata} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
