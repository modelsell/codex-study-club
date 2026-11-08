import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import type { EditorialReading } from "@/lib/editorial";
import styles from "./editorial-card.module.css";

export function EditorialCard({ item }: { item: EditorialReading }) {
  return (
    <article className={styles.card}>
      <div className={styles.top}><span>{item.kind}</span><span>{item.tool}</span></div>
      <h3><Link href={item.href}>{item.title}<ArrowUpRight aria-hidden="true" size={20} /></Link></h3>
      <p className={styles.description}>{item.description}</p>
      <p className={styles.outcome}><FileText aria-hidden="true" size={15} />{item.outcome}</p>
      <div className={styles.bottom}><p>{item.scope}</p>{item.date ? <time dateTime={item.date}>{item.date}</time> : null}</div>
    </article>
  );
}
