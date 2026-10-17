import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { startArticles } from "@/lib/content";
import styles from "./start.module.css";

export const metadata: Metadata = {
  title: "Codex 学习路线：从第一次使用到独立实践",
  description: "从安装准备、任务设计与验收到 CLI、IDE 和 Cloud，按阶段阅读中文教程，也可以从你当前的任务开始。",
  alternates: { canonical: "/start" },
};

const stages = [
  { id: "prepare", title: "先把工作环境准备好", description: "认识使用入口，确认账号与配置，找到自己的项目。", from: 1, to: 5 },
  { id: "practice", title: "亲手完成一个任务", description: "从一张学习卡片开始，练习描述需求、跟进任务和检查结果。", from: 6, to: 9 },
  { id: "terminal", title: "把实践带进命令行", description: "安装 CLI，在仓库里做一次小改动，再学习常用命令与任务恢复。", from: 10, to: 12 },
  { id: "workflow", title: "找到适合你的工作方式", description: "按项目需要，继续了解编辑器里的协作与云端任务。", from: 13, to: Infinity },
].map((stage) => ({
  ...stage,
  chapters: startArticles.filter((article) => Number(article.number) >= stage.from && Number(article.number) <= stage.to),
})).filter((stage) => stage.chapters.length > 0);

const entryPoints = [
  { slug: startArticles[0]?.slug, label: "第一次使用", detail: "从认识 Codex 开始" },
  { slug: "06-first-task", label: "已经准备好了", detail: "直接做第一个练习" },
  { slug: "10-cli-installation", label: "习惯使用终端", detail: "进入 CLI 学习路线" },
].filter((entry) => startArticles.some((article) => article.slug === entry.slug));

export default function StartPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <section className={`shell ${styles.hero}`} aria-labelledby="learning-title">
          <div>
            <p className={styles.eyebrow}>THE CODEX FIELD GUIDE / 学习路线</p>
            <h1 id="learning-title">从第一次使用，<br />到独立完成任务。</h1>
            <p className={styles.lead}>边学边做，把每一步变成可以检查的结果。<br className={styles.desktopBreak} />从头阅读，或从你现在需要的那一章开始。</p>
            <a className={styles.contentsLink} href="#chapters">浏览完整目录 <ArrowDown size={17} aria-hidden="true" /></a>
          </div>
          <div className={styles.guideNote}>
            <span className={styles.noteLabel}>一本可以随时查阅的实践手册</span>
            <div className={styles.guideCount}><strong>{startArticles.length}</strong><span>篇中文教程<br />{stages.length} 个学习阶段</span></div>
            <p>不用一次读完。选一个小任务，打开教程，对照实际结果继续往前。</p>
          </div>
        </section>

        <nav className={`shell ${styles.entries}`} aria-label="选择学习起点">
          {entryPoints.map((entry, index) => (
            <Link key={entry.slug} href={`/start/${entry.slug}`} className={styles.entry}>
              <span className={styles.entryIndex}>0{index + 1}</span>
              <span><strong>{entry.label}</strong><small>{entry.detail}</small></span>
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          ))}
        </nav>

        <div id="chapters" className={`shell ${styles.curriculum}`}>
          <aside className={styles.overview}>
            <p className={styles.eyebrow}>CONTENTS / 全部章节</p>
            <h2>一步一步，<br />建立自己的方法。</h2>
            <p>每章保留来源与核对说明。遇到界面或功能变化时，先查看文章的核对日期。</p>
            <nav aria-label="学习阶段">
              {stages.map((stage, index) => <a key={stage.id} href={`#${stage.id}`}><span>0{index + 1}</span>{stage.title}<ArrowDown size={14} aria-hidden="true" /></a>)}
            </nav>
          </aside>

          <div className={styles.stages}>
            {stages.map((stage, index) => (
              <section id={stage.id} key={stage.id} className={styles.stage} aria-labelledby={`${stage.id}-title`}>
                <header className={styles.stageHeading}>
                  <span className={styles.stageNumber}>0{index + 1}</span>
                  <div><p className={styles.stageMeta}>阶段 {index + 1} · {stage.chapters.length} 篇</p><h2 id={`${stage.id}-title`}>{stage.title}</h2><p>{stage.description}</p></div>
                </header>
                <ol className={styles.chapterList}>
                  {stage.chapters.map((article) => (
                    <li key={article.slug}>
                      <Link href={`/start/${article.slug}`}>
                        <span className={styles.chapterNumber}>{article.number}</span>
                        <div><h3>{article.title}</h3><p>{article.description}</p></div>
                        <ArrowRight size={18} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </div>

        <section className={`shell ${styles.nextStep}`} aria-labelledby="next-step-title">
          <div><p className={styles.eyebrow}>PUT IT INTO PRACTICE / 继续动手</p><h2 id="next-step-title">带着一个真实问题，去看看别人怎么做。</h2><p>案例库按任务整理实践过程、可复用方法和验收依据。</p></div>
          <Link href="/cases">探索实战案例 <ArrowRight size={18} aria-hidden="true" /></Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
