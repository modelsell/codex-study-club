import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { editorial, readingPaths } from "@/lib/editorial";
import styles from "@/components/collection.module.css";
export const metadata: Metadata = { title: "按任务找方法", description: "从任务定义、长任务续接、工具切换到团队交付，按眼前的问题选读 Agent 方法、研究与实验。", alternates: { canonical: "/paths" } };
export default function PathsPage() {
 return <><SiteHeader /><main className={styles.page} id="main-content" tabIndex={-1}><div className="shell">
  <header className={styles.intro}><div><span className={styles.kicker}>READING PATHS / 任务路线</span><h1>从手头的任务开始。</h1></div><p>先找与你眼前问题有关的路线，再选择所用工具对应的文章。每条路线连接问题、方法与可带走的成果。</p></header>
  <nav className={styles.jumpNav} aria-label="选择任务路线">{readingPaths.map(p=><a href={`#${p.id}`} key={p.id}><span>{p.number}</span>{p.title}</a>)}</nav>
  {readingPaths.map(p=><section id={p.id} key={p.id} className={styles.path} aria-labelledby={`${p.id}-title`}><div><span className={styles.pathNumber}>PATH / {p.number}</span><h2 id={`${p.id}-title`}>{p.title}</h2><p>{p.question}</p><div className={styles.result}><span>这条路线的成果</span>{p.result}</div></div><ol className={styles.steps}>{p.documents.map((d,i)=><li key={d.href}><Link href={d.href}><span>{String(i+1).padStart(2,"0")}</span><div><h3>{d.title}</h3>{d.date?<time dateTime={d.date}>{d.date}</time>:null}</div><ArrowUpRight size={18} /></Link></li>)}</ol></section>)}
  <p className={styles.note}>路线选编于 {editorial.checkedAt}。文章日期沿用各篇原记录，适用环境与实际验证范围请读正文。</p>
  <div className={styles.closing}><p>第一次使用 Codex，从准备和第一个小任务开始。</p><Link href="/start">打开入门路线 <ArrowRight size={17} /></Link></div>
 </div></main><SiteFooter /></>;
}
