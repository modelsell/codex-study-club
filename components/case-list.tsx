import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getCaseCategoryLabel } from "@/lib/case-categories";
import type { CaseStudy } from "@/lib/content";
import styles from "./case-list.module.css";
export type CaseListItem = Omit<CaseStudy, "markdown"> & { kind?: string; evidence?: string };
export function CaseList({ items }: { items: CaseListItem[] }) {
  return <div className={styles.grid}>{items.map(item=><article className={styles.card} key={item.slug}>
    <div className={styles.meta}><span>{item.kind || "方法指南"}</span>{item.checkedAt?<time dateTime={item.checkedAt}>{item.checkedAt}</time>:null}</div>
    <h3><Link href={`/cases/${item.slug}`}>{item.title}</Link></h3>
    <p>{item.summary}</p>
    {item.evidence?<small className={styles.evidence}>{item.evidence}</small>:null}
    <div className={styles.bottom}><span>{item.surface || getCaseCategoryLabel(item.category)}</span><Link href={`/cases/${item.slug}`} aria-label={`阅读：${item.title}`}>阅读全文 <ArrowUpRight size={16} /></Link></div>
  </article>)}</div>;
}
