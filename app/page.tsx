import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, FileText, Layers3, MoveUpRight } from "lucide-react";
import { ChatAssistant } from "@/components/chat-assistant";
import { CommunityLink } from "@/components/community-link";
import { EditorialCard } from "@/components/editorial-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { UpdateList } from "@/components/update-list";
import { editorial, readings, readingPaths } from "@/lib/editorial";
import { updates } from "@/lib/content";
import styles from "./page.module.css";

export default function Home() {
  const recentUpdates = [...updates].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const jsonLd = { "@context": "https://schema.org", "@type": "WebSite", name: "Agent 实践室 · Codex Study Club", url: siteUrl + "/", inLanguage: "zh-CN", description: editorial.identity.description };
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero}>
          <div className={"shell " + styles.heroGrid}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}><i />{editorial.hero.eyebrow}</span>
              <h1>{editorial.hero.title[0]}<br /><em>{editorial.hero.title[1]}</em></h1>
              <p>{editorial.hero.description}</p>
              <div className={styles.heroActions}><Link href="/paths" className={styles.primary}>按任务找方法 <ArrowRight size={18} /></Link><Link href="/community/updates" className={styles.heroSecondary}>阅读产品研究 <ArrowUpRight size={17} /></Link></div>
              <div className={styles.heroPromise}>{editorial.hero.promise}</div>
            </div>
            <article className={styles.coverStory}>
              <div className={styles.coverTop}><span>{editorial.feature.eyebrow}</span><span>FIELDNOTES / 01</span></div>
              <div className={styles.coverDiagram} role="img" aria-label="接收、授权、执行、审查、回传五个交接环节">
                <div className={styles.diagramCaption}><span>从一次请求开始</span><MoveUpRight size={20} /></div>
                <div className={styles.flow}>{["接收", "授权", "执行", "审查", "回传"].map((label, index) => <div key={label}><span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong></div>)}</div>
                <div className={styles.diagramNote}><span>工作就绪</span><i aria-hidden="true">≠</i><span>交付完成</span></div>
              </div>
              <div className={styles.coverCopy}><h2><Link href={editorial.feature.href}>{editorial.feature.title}<ArrowUpRight size={24} /></Link></h2><p>{editorial.feature.description}</p><div><span>源码研究 · 核心模拟</span><Link href={editorial.feature.href}>展开这条任务链 <ArrowRight size={16} /></Link></div></div>
            </article>
          </div>
          <div className={"shell " + styles.heroFoot}><span>产品研究 / 工作方法 / 可复现实验</span><a href="#reading-desk">从这里开始阅读 <ArrowDown size={14} /></a></div>
        </section>

        <section className={"shell " + styles.pathsSection} id="reading-desk" aria-labelledby="path-heading">
          <div className={styles.sectionHeading}><div><span className={styles.label}>01 / 从任务出发</span><h2 id="path-heading">今天，你想推进哪件事？</h2></div><Link href="/paths" className={styles.textLink}>查看完整阅读路线 <ArrowUpRight size={17} /></Link></div>
          <div className={styles.paths}>{readingPaths.map((item) => <Link href={`/paths#${item.id}`} className={styles.path} key={item.id}><span className={styles.pathNumber}>{item.number}</span><div><h3>{item.title}</h3><p>{item.question}</p></div><ArrowUpRight size={23} /></Link>)}</div>
          <p className={styles.beginner}><BookOpen size={16} />第一次用 Codex？<Link href="/start">从入门路线开始 <ArrowRight size={14} /></Link></p>
        </section>

        <section className={styles.readingsSection} id="cases" aria-labelledby="reading-heading"><div className="shell">
          <div className={styles.sectionHeading}><div><span className={styles.label}>02 / 深度阅读</span><h2 id="reading-heading">值得坐下来读的实践。</h2><p>机制、完整例子、失败对照，和能带走的成果。</p></div><Link href="/cases" className={styles.textLink}>全部文章与实验 <ArrowUpRight size={17} /></Link></div>
          <div className={styles.readings}>{readings.slice(1, 7).map((item) => <EditorialCard item={item} key={item.href} />)}</div>
        </div></section>

        <section className={"shell " + styles.takeaway} aria-labelledby="toolkit-heading">
          <div><span className={styles.label}>03 / 把方法带走</span><h2 id="toolkit-heading">读完之后，<br />留下一份自己的成果。</h2><p>任务模板、只读检查器和固定版本实验包。<br />每份工具都连接到使用说明与验证范围。</p><Link href="/toolkit" className={styles.inkButton}>打开工具包 <ArrowUpRight size={18} /></Link></div>
          <div className={styles.fileStack}>
            {[{ name: "一份清楚的任务", format: "任务模板", icon: FileText }, { name: "一次有依据的检查", format: "只读工具", icon: Check }, { name: "一组可复查的对照", format: "复现实验", icon: Layers3 }].map(({name,format,icon:Icon}) => <Link href="/toolkit" key={name}><Icon size={24} /><div><span>{format}</span><strong>{name}</strong></div><ArrowUpRight size={19} /></Link>)}
          </div>
        </section>

        <section className={styles.editorialSection}><div className={"shell " + styles.editorialGrid}>
          <div className={styles.notes}><div className={styles.sectionHeading}><div><span className={styles.label}>持续校订</span><h2>最近的研究笔记</h2></div><Link href="/community/updates" className={styles.textLink}>研究与更新 <ArrowUpRight size={16} /></Link></div><UpdateList items={recentUpdates} /></div>
          <aside className={styles.standard}><span className={styles.label}>我们的取舍</span><h2>把篇幅留给<br />真正有用的细节。</h2><p>先确认谁需要，再解释为什么。把一个任务走完整，写清选择的代价，也写清实际验证到哪里。</p><span>有来源 · 有例子 · 有可带走的成果</span></aside>
        </div></section>

        <section className={"shell " + styles.askSection} id="ask" aria-labelledby="ask-heading"><div><span className={styles.label}>04 / 查阅资料</span><h2 id="ask-heading">带着问题来，<br />找到下一篇该读什么。</h2><p>资料助手检索本站正文，回答附带阅读链接。<br />适合从具体任务或卡点问起。</p></div><ChatAssistant /></section>
        <section className={styles.community}><div className="shell"><span className={styles.label}>把一次实践，变成共同的经验</span><h2>你的真实问题，也值得被认真研究。</h2><p>分享任务背景、做法与结果，和认真使用 Agent 的人一起交流。</p><CommunityLink className={styles.inkButton} /></div></section>
      </main>
      <SiteFooter />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} type="application/ld+json" />
    </>
  );
}
