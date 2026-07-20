import type { Metadata } from "next";
import { CaseList } from "@/components/case-list";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { caseCategories, getCaseCategory } from "@/lib/case-categories";
import { cases } from "@/lib/content";

export const metadata: Metadata = {
  title: "Codex 实战案例",
  description: "经过验证的 Codex App、CLI、GitHub 与 Skill 实战案例。",
  alternates: { canonical: "/cases" },
};

export default function CasesPage() {
  return (
    <>
      <SiteHeader />
      <main className="listing-page" id="top">
        <header className="page-intro shell">
          <span className="eyebrow">REAL WORK</span>
          <h1>实战案例</h1>
          <p>按目标找到对应案例。先浏览任务和结果，再进入完整步骤、截图与验证标准。</p>
          <nav className="case-category-nav" aria-label="案例分类">
            {caseCategories.map((category) => {
              const count = cases.filter((item) => getCaseCategory(item) === category.id).length;
              return (
                <a href={`#${category.id}`} key={category.id}>
                  <span>{category.label}</span>
                  <small>{count}</small>
                </a>
              );
            })}
          </nav>
        </header>
        <div className="category-library">
          {caseCategories.map((category) => {
            const categoryItems = cases.filter((item) => getCaseCategory(item) === category.id);
            const count = categoryItems.length;

            return (
              <section className="case-category-section" id={category.id} key={category.id}>
                <div className="shell">
                  <header className="case-category-heading">
                    <div>
                      <span className="eyebrow">{String(count).padStart(2, "0")} CASES</span>
                      <h2>{category.label}</h2>
                      <p>{category.description}</p>
                    </div>
                    <a href="#top">返回分类</a>
                  </header>
                  <CaseList items={categoryItems} />
                </div>
              </section>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
