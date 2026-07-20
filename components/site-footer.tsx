import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div className="footer-brand">
          <BrandMark />
          <div>
            <strong>Codex Study Club</strong>
            <span>一起学习，交流实践。</span>
          </div>
        </div>
        <div className="footer-links">
          <Link href="/cases">实战案例</Link>
          <Link href="/community/updates">社群动态</Link>
          <a href="https://developers.openai.com/codex/" rel="noreferrer" target="_blank">
            官方文档
          </a>
        </div>
        <p>非 OpenAI 官方网站。内容以官方资料与已验证实践为依据。</p>
      </div>
    </footer>
  );
}
