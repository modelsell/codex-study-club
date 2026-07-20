import Link from "next/link";
import { Layers3 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { GithubMark } from "@/components/github-mark";

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
        <nav className="footer-links" aria-label="页脚导航">
          <Link href="/cases">实战案例</Link>
          <Link href="/community/updates">社群动态</Link>
          <span className="footer-external-links">
            <a
              className="footer-icon-link"
              href="https://github.com/modelsell/codex-study-club"
              rel="noreferrer"
              target="_blank"
              title="开源项目"
              aria-label="在 GitHub 查看开源项目"
            >
              <GithubMark />
            </a>
            <a
              className="footer-icon-link"
              href="https://x.com/modelsellcom"
              rel="noreferrer"
              target="_blank"
              title="Modelsell on X"
              aria-label="在 X 关注 Modelsell"
            >
              <span className="x-icon" aria-hidden="true">X</span>
            </a>
            <a
              className="footer-icon-link"
              href="https://modelsell.com/"
              rel="noreferrer"
              target="_blank"
              title="模型聚合平台"
              aria-label="访问 Modelsell 模型聚合平台"
            >
              <Layers3 size={15} strokeWidth={2} aria-hidden="true" />
            </a>
          </span>
          <a href="https://developers.openai.com/codex/" rel="noreferrer" target="_blank">
            官方文档
          </a>
        </nav>
        <p>非 OpenAI 官方网站。内容以官方资料与已验证实践为依据。</p>
      </div>
    </footer>
  );
}
