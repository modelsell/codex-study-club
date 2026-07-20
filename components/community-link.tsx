"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function CommunityLink({ className = "" }: { className?: string }) {
  const joinUrl = process.env.NEXT_PUBLIC_COMMUNITY_JOIN_URL;

  if (joinUrl) {
    return (
      <a className={className} href={joinUrl} rel="noreferrer" target="_blank">
        立即加入
        <ArrowUpRight size={17} />
      </a>
    );
  }

  return (
    <Link className={className} href="/community#join">
      了解加入方式
      <ArrowUpRight size={17} />
    </Link>
  );
}
