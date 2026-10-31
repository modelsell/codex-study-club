import type { Metadata } from "next";
import { GoogleAnalytics } from "@/components/google-analytics";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Codex Study Club - Codex、Claude Code 与 Agent 实践",
    template: "%s | Codex Study Club",
  },
  description:
    "跟进 Codex、Claude Code 与 Agent 产品，学习经过资料核对的技巧、可复现案例和结果验收方法。",
  icons: {
    icon: "https://modelsell.com/logo.png",
    apple: "https://modelsell.com/logo.png",
  },
  keywords: [
    "Codex 教程",
    "Codex 中文",
    "OpenAI Codex",
    "Codex 实战",
    "AGENTS.md",
    "Codex Skill",
    "Claude Code 教程",
    "Agent 产品动态",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Codex Study Club",
    title: "Codex Study Club - Codex、Claude Code 与 Agent 实践",
    description: "从具体问题出发，把想法变成可验收的成果。",
    images: [{ url: "/og-image.webp", width: 1200, height: 630, alt: "Codex Study Club" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Codex Study Club - Codex、Claude Code 与 Agent 实践",
    description: "从具体问题出发，把想法变成可验收的成果。",
    images: ["/og-image.webp"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
