import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { IndustryInsight } from "@/lib/content";

export function IndustryInsightList({ items }: { items: IndustryInsight[] }) {
  return (
    <div className="insight-list">
      {items.map((item, index) => (
        <Link
          className="insight-row"
          href={`/industry-insights/${item.slug}`}
          key={item.slug}
        >
          <div className={`insight-preview insight-preview-${(index % 2) + 1}`} aria-hidden="true">
            <span>INDUSTRY</span>
            <i />
            <i />
            <i />
          </div>
          <div className="insight-copy">
            <span className="insight-label">行业研究 · HTML 专题</span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <span className="insight-open">
              阅读完整解读
              <ArrowUpRight size={17} strokeWidth={2} />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
