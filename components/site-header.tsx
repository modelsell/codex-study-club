"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { ArrowUpRight, ChevronDown, Menu, MessageCircle, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { GithubMark } from "@/components/github-mark";
import styles from "./site-header.module.css";

const primaryLinks = [
  { href: "/paths", label: "任务路线" },
  { href: "/cases", label: "文章与实验" },
  { href: "/community/updates", label: "产品研究" },
  { href: "/toolkit", label: "工具包" },
];
const resourceLinks = [
  { href: "/start", label: "Codex 入门" },
  { href: "/cases#troubleshooting", label: "问题排查" },
  { href: "/themes", label: "主题与外观" },
  { href: "/industry-insights", label: "行业解读" },
  { href: "/play", label: "动手练习" },
  { href: "/agent-awards", label: "开源赞助" },
  { href: "/community", label: "加入社群" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const mobileRef = useRef<HTMLDetailsElement>(null);
  const resourceRef = useRef<HTMLDetailsElement>(null);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  function closeMenu(ref: { current: HTMLDetailsElement | null }, restoreFocus = false) {
    if (!ref.current) return;
    ref.current.open = false;
    if (restoreFocus) ref.current.querySelector("summary")?.focus();
  }

  return (
    <header className={styles.header}>
      <a className={styles.skip} href="#main-content">跳到主要内容</a>
      <div className={"shell " + styles.inner}>
        <Link className={styles.brand} href="/" aria-label="Agent 实践室 · Codex Study Club 首页">
          <BrandMark />
          <span>Agent <span className={styles.brandLight}>实践室</span><small>CODEX STUDY CLUB</small></span>
        </Link>
        <nav className={styles.desktopNav} aria-label="主导航">
          {primaryLinks.map(({ href, label }) => href === "/cases" ? <a key={href} href={href} aria-current={isActive(href) ? "page" : undefined}>{label}</a> : <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}>{label}</Link>)}
          <details className={styles.resources} ref={resourceRef} onKeyDown={(event) => { if (event.key === "Escape") closeMenu(resourceRef, true); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) closeMenu(resourceRef); }}>
            <summary>更多资源 <ChevronDown size={14} /></summary>
            <div className={styles.dropdown}>
              {resourceLinks.map(({ href, label }) => <a href={href} key={href} onClick={() => closeMenu(resourceRef)}>{label}<ArrowUpRight size={14} /></a>)}
            </div>
          </details>
        </nav>
        <div className={styles.actions}>
          <a className={styles.github} href="https://github.com/modelsell/codex-study-club" target="_blank" rel="noreferrer" aria-label="在 GitHub 查看项目"><GithubMark /></a>
          <Link className={styles.ask} href="/#ask"><MessageCircle size={16} />资料助手</Link>
        </div>
        <details className={styles.mobileMenu} ref={mobileRef} onKeyDown={(event) => { if (event.key === "Escape") closeMenu(mobileRef, true); }}>
          <summary aria-label="网站导航"><Menu className={styles.menuIcon} size={22} /><X className={styles.closeIcon} size={22} /></summary>
          <nav className={styles.mobilePanel} aria-label="手机导航">
            {[...primaryLinks, ...resourceLinks, { href: "/#ask", label: "资料助手" }].map(({ href, label }) => (
              <a href={href} key={href} aria-current={isActive(href) ? "page" : undefined} onClick={() => closeMenu(mobileRef)}>{label}<ArrowUpRight size={16} /></a>
            ))}
            <a href="https://github.com/modelsell/codex-study-club" target="_blank" rel="noreferrer">GitHub 开源项目<ArrowUpRight size={16} /></a>
          </nav>
        </details>
      </div>
    </header>
  );
}
