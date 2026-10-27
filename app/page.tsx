import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, FileText, MessageCircle, Search, Terminal, Users } from "lucide-react";
import { ChatAssistant } from "@/components/chat-assistant";
import { CaseList } from "@/components/case-list";
import { CommunityLink } from "@/components/community-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { UpdateList } from "@/components/update-list";
import { cases, startArticles, updates } from "@/lib/content";
import styles from "./page.module.css";

const featuredSlugs = [
  "minimal-bug-fix-with-reproduction", "codex-progress-or-loop", "codex-finished-but-not-verified",
  "codex-broken-link-workflow", "diagnose-ci-failure", "reusable-review-skill",
];

export default function Home() {
  const latestDate = [...updates.map((item) => item.date), ...cases.map((item) => item.checkedAt || ""), ...startArticles.map((item) => item.checkedAt || "")].sort().at(-1);
  const featuredCases = featuredSlugs.flatMap((slug) => cases.filter((item) => item.slug === slug));
  const recentUpdates = [...updates].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: "Codex Study Club", url: siteUrl + "/", inLanguage: "zh-CN", description: "Codex 中文学习与实践社区" },
      { "@type": "Organization", name: "Codex Study Club", url: siteUrl + "/" },
    ],
  };

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={"shell " + styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.kicker}><span />一份持续生长的 Codex 实践手册</div>
            <h1>把想法，变成<br /><em>可验收的成果。</em></h1>
            <p className={styles.lead}>从第一次提问，到完成真实任务。<br />在这里学习方法、找到案例，也解决卡住你的问题。</p>
            <div className={styles.heroActions}>
              <Link className={styles.primary} href="/start">开始学习 <ArrowRight size={18} /></Link>
              <Link className={styles.secondary} href="/cases">探索实战案例 <ArrowUpRight size={17} /></Link>
            </div>
            <div className={styles.heroMeta}><span>{startArticles.length} 篇入门教程</span><i /> <span>{cases.length} 个实践案例</span><i /><span>中文 · 开放共建</span></div>
          </div>
          <div className={styles.fieldwork}>
            <div className={styles.notebookTop}><span>THE PRACTICE NOTEBOOK</span><span>NO. 001</span></div>
            <div className={styles.notebookBody}>
              <div className={styles.noteLabel}><Terminal size={16} />第一次实践</div>
              <h2>从一个小任务开始。</h2>
              <p>目标清楚一点，改动小一点，<br />结果就更容易检查一点。</p>
              <ol className={styles.workflow}>
                <li><span>01</span><div><strong>说清目标</strong><small>要得到什么，什么不在范围内</small></div><FileText size={17} /></li>
                <li><span>02</span><div><strong>一起动手</strong><small>分步推进，留下过程与产物</small></div><Terminal size={17} /></li>
                <li><span>03</span><div><strong>亲自验收</strong><small>检查差异，用证据确认结果</small></div><Check size={18} /></li>
              </ol>
              <Link href="/start/06-first-task" className={styles.notebookLink}>打开「第一个可验收任务」<ArrowUpRight size={18} /></Link>
            </div>
            <div className={styles.notebookFoot}><span>LEARN. BUILD. VERIFY.</span><span aria-hidden="true">↗</span></div>
          </div>
        </section>

        <div className={"shell " + styles.edition}><span>不必一次学完，从眼前的问题开始。</span><span>最近更新 <time dateTime={latestDate}>{latestDate?.replaceAll("-", ".")}</time><ArrowDown size={13} /></span></div>

        <section className={"shell " + styles.pathSection} aria-labelledby="choose-path">
          <div className={styles.sectionTitle}><span className={styles.label}>01 / FIND YOUR WAY</span><h2 id="choose-path">今天，你想从哪里开始？</h2></div>
          <div className={styles.paths}>
            <Link href="/start" className={styles.path}><div><BookOpen size={22} /><span>从零到一</span></div><h3>第一次使用 Codex</h3><p>沿着学习路线，完成准备、提问与第一个可验收任务。</p><span className={styles.pathAction}>查看学习路线 <ArrowRight size={17} /></span></Link>
            <Link href="/cases" className={styles.path}><div><Terminal size={22} /><span>在实践中学习</span></div><h3>想把一个任务做完</h3><p>从开发、内容到知识协作，找到可参考的方法和验收步骤。</p><span className={styles.pathAction}>寻找适合的案例 <ArrowRight size={17} /></span></Link>
            <Link href="/cases#troubleshooting" className={styles.path}><div><Search size={22} /><span>带着问题来</span></div><h3>卡住了，需要线索</h3><p>任务跑偏、一直等待、结果不对？先定位问题，再决定下一步。</p><span className={styles.pathAction}>进入问题排查 <ArrowRight size={17} /></span></Link>
          </div>
        </section>

        <section className={styles.casesSection} id="cases" aria-labelledby="featured-cases">
          <div className="shell">
            <div className={styles.sectionHeading}><div><span className={styles.label}>02 / FIELDWORK</span><h2 id="featured-cases">真正的学习，发生在动手之后。</h2><p>从具体问题出发，带走方法、提示词和检查清单。验证范围见各篇说明。</p></div><Link href="/cases" className={styles.textLink}>全部 {cases.length} 个案例 <ArrowUpRight size={17} /></Link></div>
            <CaseList items={featuredCases} />
          </div>
        </section>

        <section className={"shell " + styles.desk} aria-labelledby="latest-notes">
          <div className={styles.notes}>
            <div className={styles.sectionHeading}><div><span className={styles.label}>03 / KEEP LEARNING</span><h2 id="latest-notes">最近在关注</h2></div><Link href="/community/updates" className={styles.textLink}>全部动态 <ArrowUpRight size={16} /></Link></div>
            <UpdateList items={recentUpdates} />
          </div>
          <aside className={styles.toolkit} aria-labelledby="toolkit-heading">
            <div className={styles.toolkitIcon}><FileText size={22} /></div><span className={styles.label}>TAKE IT WITH YOU</span><h2 id="toolkit-heading">把方法带回工作里</h2><p>下次开工前，先写清目标、边界和验收方式。</p>
            <a href="/templates/codex-goal-contract.md" download>Goal 任务契约 <ArrowDown size={16} /><small>Markdown 模板</small></a>
            <a href="/templates/codex-message-delivery-report.md" download>消息送达记录表 <ArrowDown size={16} /><small>Markdown 模板</small></a>
            <Link className={styles.toolkitGuide} href="/community/updates/codex-quality-regression-playbook">阅读任务与检查点指南 <ArrowUpRight size={15} /></Link>
          </aside>
        </section>

        <section className={styles.askSection} id="ask" aria-labelledby="ask-heading">
          <div className={"shell " + styles.askGrid}>
            <div><span className={styles.label}>04 / ASK THE LIBRARY</span><h2 id="ask-heading">带着你的问题，<br />找到下一步。</h2><p>学习助手从本站教程与案例中寻找线索，<br />回答附带资料链接，方便继续阅读与核对。</p><span className={styles.askCaption}><MessageCircle size={15} />可以从一个具体的卡点问起</span></div>
            <ChatAssistant />
          </div>
        </section>

        <section className={"shell " + styles.community}>
          <div className={styles.communityLabel}><Users size={20} /><span>实践不必独自进行</span></div>
          <h2>把你遇到的问题，<br className={styles.mobileBreak} />变成大家的经验。</h2>
          <p>交流真实任务，分享可复现的方法，和认真使用 Codex 的人一起学习。</p>
          <CommunityLink className={styles.primary} />
        </section>
      </main>
      <SiteFooter />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} type="application/ld+json" />
    </>
  );
}
