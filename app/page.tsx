import Link from "next/link";
import { ArrowRight, BookOpen, CircleCheck, Users } from "lucide-react";
import { ChatAssistant } from "@/components/chat-assistant";
import { CaseList } from "@/components/case-list";
import { CommunityLink } from "@/components/community-link";
import { SectionHeading } from "@/components/section-heading";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { UpdateList } from "@/components/update-list";
import { caseCategories, getCaseCategory } from "@/lib/case-categories";
import { cases, updates } from "@/lib/content";

export default function Home() {
  const featuredSlugs = [
    "first-verifiable-task",
    "diagnose-ci-failure",
    "reusable-review-skill",
    "01-ppt-skill-walkthrough",
    "02-drawio-mcp",
    "03-playwright-mcp",
    "04-hyperframes-animation",
    "05-obsidian-codex",
  ];
  const featuredCases = featuredSlugs.flatMap((slug) => cases.filter((item) => item.slug === slug));
  const categoryCounts = Object.fromEntries(
    caseCategories.map((category) => [
      category.id,
      cases.filter((item) => getCaseCategory(item) === category.id).length,
    ]),
  );
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Codex Study Club",
        url: `${siteUrl}/`,
        inLanguage: "zh-CN",
        description: "Codex 中文学习与实战社区",
      },
      {
        "@type": "Organization",
        name: "Codex Study Club",
        url: `${siteUrl}/`,
      },
    ],
  };

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero shell">
          <div className="hero-status">
            <span />
            内容核对至 2026.07
          </div>
          <h1>Codex Study Club</h1>
          <p className="hero-lead">学习 Codex，交流真实实践。</p>
          <ChatAssistant />
          <div className="hero-guides">
            <p className="assistant-note">
              <CircleCheck size={14} />
              回答优先引用官方资料与已发布内容
            </p>
            <Link className="beginner-link" href="/start/01-what-is-codex">
              <BookOpen size={14} />
              完整新手入门
            </Link>
          </div>
        </section>

        <section className="home-category-section" aria-labelledby="browse-by-category">
          <div className="shell">
            <div className="home-category-heading">
              <span className="eyebrow">BROWSE BY TOPIC</span>
              <h2 id="browse-by-category">按你想解决的问题浏览</h2>
            </div>
            <nav className="home-category-grid" aria-label="案例分类">
              {caseCategories.map((category) => (
                <Link href={`/cases#${category.id}`} key={category.id}>
                  <span>{String(categoryCounts[category.id]).padStart(2, "0")}</span>
                  <strong>{category.label}</strong>
                  <p>{category.description}</p>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <section className="section section-cases" id="cases">
          <div className="shell">
            <SectionHeading
              action="全部案例"
              description="先浏览标题和任务摘要，再进入案例详情。"
              eyebrow="REAL WORK"
              href="/cases"
              title="常用实战案例"
            />
            <CaseList items={featuredCases} />
          </div>
        </section>

        <section className="section section-updates">
          <div className="shell">
            <SectionHeading
              action="查看全部"
              description="筛选官方产品动态与真实社区实践，只保留可核对、可复用的信息。"
              eyebrow="FIELD NOTES"
              href="/community/updates"
              title="最新 Codex 动态"
            />
            <UpdateList items={updates} />
          </div>
        </section>

        <section className="community-band">
          <div className="shell community-band-inner">
            <div className="community-icon" aria-hidden="true">
              <Users size={25} />
            </div>
            <div>
              <span className="eyebrow">CODEX COMMUNITY</span>
              <h2>和认真使用 Codex 的人一起交流</h2>
              <p>真实问题、可复现案例、定期整理。社群讨论不会直接公开，发布内容均经过审核。</p>
            </div>
            <CommunityLink className="community-button" />
          </div>
        </section>

        <section className="official-note shell">
          <span>内容原则</span>
          <p>产品事实以 OpenAI 官方资料为准；实践经验必须能够说明来源和验证方式。</p>
          <Link href="https://developers.openai.com/codex/" target="_blank">
            查阅官方文档
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <SiteFooter />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} type="application/ld+json" />
    </>
  );
}
