import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CommunityUpdate } from "@/lib/content";

export function UpdateList({ items }: { items: CommunityUpdate[] }) {
  return (
    <div className="update-list">
      {items.map((item) => (
        <Link className="update-row" href={`/community/updates/${item.slug}`} key={item.slug}>
          <time dateTime={item.date}>{item.displayDate}</time>
          <div>
            <h3>{item.title}</h3>
            <p>{item.excerpt}</p>
            <div className="topic-line">
              {item.topics.map((topic) => (
                <span key={topic}>{topic}</span>
              ))}
            </div>
          </div>
          <ArrowUpRight className="update-arrow" size={20} />
        </Link>
      ))}
    </div>
  );
}
