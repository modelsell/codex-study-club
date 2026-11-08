import type { Metadata } from "next";
import { GoogleAnalytics } from "@/components/google-analytics";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Agent 实践室 · Codex Study Club",
    template: "%s | Agent 实践室",
  },
  description:
    "给认真用 Agent 做事的人：Codex、Claude Code 与更多产品的深度研究、任务方法和可复现实验，附模板与工具。",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-icon.png",
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
    siteName: "Agent 实践室 · Codex Study Club",
    title: "Agent 实践室 · Codex Study Club",
    description: "看懂新工具，做出真成果。产品研究、工作方法与可复现实验。",
    images: [{ url: "/agent-fieldnotes-cover.png", width: 1200, height: 630, alt: "Agent 实践室 · 看懂新工具，做出真成果" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent 实践室 · Codex Study Club",
    description: "看懂新工具，做出真成果。产品研究、工作方法与可复现实验。",
    images: ["/agent-fieldnotes-cover.png"],
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
