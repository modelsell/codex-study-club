import Link from "next/link";
import { ArrowRight } from "lucide-react";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  action?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  action,
}: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {href && action ? (
        <Link className="text-link" href={href}>
          {action}
          <ArrowRight size={17} />
        </Link>
      ) : null}
    </div>
  );
}
