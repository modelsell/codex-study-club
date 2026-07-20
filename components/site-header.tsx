import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="Codex Study Club 首页">
          <BrandMark />
          <span>Codex Study Club</span>
        </Link>
        <nav className="main-nav" aria-label="主导航">
          <Link className="theme-nav" href="/themes">
            <span className="theme-nav-wide">Codex 主题</span>
            <span className="theme-nav-short">主题</span>
          </Link>
          <Link href="/cases">实战案例</Link>
          <Link href="/community/updates">社群动态</Link>
          <Link className="join-nav" href="/community">
            加入社群
            <ArrowUpRight size={15} strokeWidth={2} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
