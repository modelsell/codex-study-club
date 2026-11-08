import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, FileText } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { toolkits } from "@/lib/editorial";
import styles from "@/components/collection.module.css";
const groups = [{id:"templates",label:"任务模板",description:"写清任务，留下判断与交接依据。"},{id:"checks",label:"只读工具",description:"先了解现场，再决定要修改什么。"},{id:"experiments",label:"复现实验",description:"在文章规定的环境中重做观察与失败对照。"}];
export const metadata: Metadata = { title:"工具包与复现实验", description:"任务模板、只读检查器与固定版本实验包，每份下载连接使用说明、适用环境和验证范围。", alternates:{canonical:"/toolkit"} };
export default function ToolkitPage() {
 return <><SiteHeader /><main className={styles.page} id="main-content" tabIndex={-1}><div className="shell">
  <header className={styles.intro}><div><span className={styles.kicker}>TAKEAWAYS / 工具包</span><h1>带走一份<br />可以用的东西。</h1></div><p>把文章里的方法带回自己的任务。先读使用说明，确认环境与验证范围，再选择模板、检查器或实验包。</p></header>
  <nav className={styles.jumpNav} aria-label="工具包分类">{groups.map(g=><a href={`#${g.id}`} key={g.id}>{g.label}<span>{toolkits.filter(p=>p.category===g.label).length}</span></a>)}</nav>
  {groups.map(g=><section className={styles.section} id={g.id} aria-labelledby={`${g.id}-title`} key={g.id}><div className={styles.sectionHeading}><div><h2 id={`${g.id}-title`}>{g.label}</h2><p>{g.description}</p></div></div><div className={styles.grid}>{toolkits.filter(p=>p.category===g.label).map(pack=><article className={styles.pack} key={pack.id}><div className={styles.packTop}><span>{pack.category}</span><FileText aria-hidden="true" size={20} /></div><h3>{pack.title}</h3><p>{pack.description}</p><small>{pack.environment}</small><Link href={pack.source} className={styles.guideLink}>先读使用说明 <ArrowUpRight size={17} /></Link><div className={styles.files}>{pack.files.map(file=><a key={file.href} href={file.href} download aria-label={`下载${pack.title}：${file.label}`}><ArrowDown aria-hidden="true" size={13} />{file.label}<small>{file.format}</small></a>)}</div></article>)}</div></section>)}
  <p className={styles.note}>实验中的合成输入、模拟接口与真实客户端验证分别说明。运行条件、完整步骤和失败解释均在对应文章中。</p>
 </div></main><SiteFooter /></>;
}
