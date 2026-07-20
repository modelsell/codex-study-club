import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getCaseCategoryLabel } from "@/lib/case-categories";
import type { CaseStudy } from "@/lib/content";

export function CaseList({ items }: { items: CaseStudy[] }) {
  return (
    <div className="case-list">
      {items.map((item) => (
        <article className="case-row" key={item.slug}>
          {item.cover ? (
            <Link className="case-image-wrap" href={`/cases/${item.slug}`} tabIndex={-1}>
              <Image
                alt={item.imageAlt || item.title}
                className="case-image"
                fill
                loading={item.slug === "first-verifiable-task" ? "eager" : "lazy"}
                sizes="(max-width: 720px) 50vw, (max-width: 1100px) 33vw, 25vw"
                src={item.cover}
              />
              {item.number ? <span className="case-number">{item.number}</span> : null}
            </Link>
          ) : (
            <Link className="case-image-wrap case-image-empty" href={`/cases/${item.slug}`} tabIndex={-1}>
              <span>{getCaseCategoryLabel(item.category)}</span>
            </Link>
          )}
          <div className="case-copy">
            <h3>
              <Link href={`/cases/${item.slug}`}>{item.title}</Link>
            </h3>
            <div className="meta-line">
              <span>{item.level || getCaseCategoryLabel(item.category)}</span>
              {item.surface ? <span>{item.surface}</span> : null}
            </div>
            <p>{item.summary}</p>
            <Link className="case-open" href={`/cases/${item.slug}`} aria-label={`查看案例：${item.title}`}>
              查看案例
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
