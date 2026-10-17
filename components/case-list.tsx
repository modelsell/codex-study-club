import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { getCaseCategoryLabel } from "@/lib/case-categories";
import type { CaseStudy } from "@/lib/content";
import styles from "./case-list.module.css";

export type CaseListItem = Omit<CaseStudy, "markdown">;

export function CaseList({ items }: { items: CaseListItem[] }) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <article className={styles.card} key={item.slug}>
          <Link className={styles.cover} href={"/cases/" + item.slug} tabIndex={-1} aria-hidden="true">
            {item.cover ? <Image alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw" src={item.cover} /> : <span className={styles.placeholder}>{getCaseCategoryLabel(item.category)}<ArrowUpRight size={32} /></span>}
          </Link>
          <div className={styles.copy}>
            <div className={styles.meta}><span>{getCaseCategoryLabel(item.category)}</span>{item.duration ? <span><Clock3 size={11} />{item.duration}</span> : null}</div>
            <h3><Link href={"/cases/" + item.slug}>{item.title}</Link></h3>
            <p>{item.summary}</p>
            <div className={styles.bottom}><span>{item.surface || item.level || "实践方法"}</span><Link href={"/cases/" + item.slug} aria-label={"查看案例：" + item.title}>阅读案例<ArrowUpRight size={16} /></Link></div>
          </div>
        </article>
      ))}
    </div>
  );
}
