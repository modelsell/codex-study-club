import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import styles from "./site-footer.module.css";

const groups = [
  { title: "从这里开始", links: [{ href: "/paths", label: "任务路线" }, { href: "/cases", label: "文章与实验" }, { href: "/toolkit", label: "工具包" }, { href: "/#ask", label: "资料助手" }] },
  { title: "继续探索", links: [{ href: "/community/updates", label: "产品研究" }, { href: "/start", label: "Codex 入门" }, { href: "/themes", label: "主题与外观" }, { href: "/industry-insights", label: "行业解读" }, { href: "/play", label: "动手练习" }] },
  { title: "一起建设", links: [{ href: "/community", label: "加入社群" }, { href: "/agent-awards", label: "开源赞助" }, { href: "https://github.com/modelsell/codex-study-club", label: "GitHub ↗" }, { href: "https://github.com/modelsell/codex-study-club/tree/main/docs/operations/reviews", label: "公开运营记录 ↗" }] },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={"shell " + styles.grid}>
        <div className={styles.identity}>
          <Link href="/" className={styles.brand}><BrandMark /><strong>Agent 实践室<small>Codex Study Club</small></strong></Link>
          <p>看懂新工具，<br />做出真成果。</p>
          <a href="https://modelsell.com/" rel="noreferrer" target="_blank" className={styles.credit}>由 Modelsell 支持 <ArrowUpRight size={13} /></a>
        </div>
        {groups.map((group) => <nav key={group.title} aria-label={group.title}><h2>{group.title}</h2>{group.links.map((link) => <a key={link.href} href={link.href} {...(link.href.startsWith("https:") ? { target: "_blank", rel: "noreferrer" } : {})}>{link.label}</a>)}</nav>)}
      </div>
      <div className={"shell " + styles.bottom}><p>独立中文实践社区。产品研究、工作方法与可复现实验，验证范围见各篇记录。</p><a href="https://developers.openai.com/codex/" target="_blank" rel="noreferrer">OpenAI 官方文档 <ArrowUpRight size={13} /></a><a href="https://x.com/modelsellcom" target="_blank" rel="noreferrer">Modelsell on X <ArrowUpRight size={13} /></a></div>
    </footer>
  );
}
