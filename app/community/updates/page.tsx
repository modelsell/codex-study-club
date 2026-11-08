import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EditorialCard } from "@/components/editorial-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { UpdateList } from "@/components/update-list";
import { readings } from "@/lib/editorial";
import { updates } from "@/lib/content";
import styles from "@/components/collection.module.css";
export const metadata: Metadata = { title:"Agent 产品研究与更新", description:"围绕具体任务阅读 Agent 源码、CLI 与 SDK 实验，理解产品机制、取舍、验证范围及实际影响。", alternates:{canonical:"/community/updates"} };
export default function UpdatesPage() {
 return <><SiteHeader /><main className={styles.page} id="main-content" tabIndex={-1}><div className="shell">
  <header className={styles.intro}><div><span className={styles.kicker}>PRODUCT RESEARCH / 产品研究</span><h1>理解产品，<br />也理解它的边界。</h1></div><p>沿一项具体工作看机制、选择与实际影响。源码研究、CLI 对照和 SDK 实验分别标明，按自己的工具与环境选读。</p></header>
  <section className={styles.section} aria-labelledby="research-heading"><div className={styles.sectionHeading}><div><h2 id="research-heading">从一个值得研究的问题开始</h2><p>已收录的深度研究；资料日期与验证条件见各篇。</p></div><Link href="/toolkit">配套工具与实验包 <ArrowUpRight size={16} /></Link></div><div className={styles.grid}>{readings.filter(item=>item.research).map(item=><EditorialCard item={item} key={item.href} />)}</div></section>
  <section className={styles.archive} aria-labelledby="archive-heading"><div className={styles.sectionHeading}><div><span className={styles.kicker}>DATED NOTES / 按日期查阅</span><h2 id="archive-heading">更新档案</h2><p>保留原记录与稳定链接。查看版本、来源和核对日期后，再判断是否适合当前任务。</p></div></div><UpdateList items={updates} /></section>
 </div></main><SiteFooter /></>;
}
