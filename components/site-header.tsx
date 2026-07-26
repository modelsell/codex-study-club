import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { GithubMark } from "@/components/github-mark";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="Codex Study Club 首页">
          <BrandMark />
          <span>Codex Study Club</span>
        </Link>
        <nav className="main-nav" aria-label="主导航">
          <a
            className="github-nav"
            href="https://github.com/modelsell/codex-study-club"
            rel="noreferrer"
            target="_blank"
            title="在 GitHub 查看开源项目"
            aria-label="在 GitHub 查看开源项目"
          >
            <GithubMark />
          </a>
          <Link className="start-nav" href="/start/01-what-is-codex">新手入门</Link>
          <Link href="/cases#troubleshooting">问题排查</Link>
          <Link className="theme-nav" href="/themes">
            <span className="theme-nav-wide">Codex 主题</span>
            <span className="theme-nav-short">主题</span>
          </Link>
          <Link
            aria-label="Modelsell 开源项目赞助计划"
            className="awards-nav"
            href="/agent-awards"
            title="Modelsell 开源项目赞助计划"
          >
            <Sparkles aria-hidden="true" size={13} />
            <span>开源赞助</span>
          </Link>
          <Link className="insights-nav" href="/industry-insights">行业解读</Link>
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
