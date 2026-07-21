import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Codex Study Club - Codex 中文学习与交流社区",
    template: "%s | Codex Study Club",
  },
  description:
    "直接向 Codex 学习助手提问，查看经过验证的实战案例与高质量社群动态。",
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
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Codex Study Club",
    title: "Codex Study Club - Codex 中文学习与交流社区",
    description: "以对话为入口，用真实案例掌握 Codex。",
    images: [{ url: "/og-image.webp", width: 1200, height: 630, alt: "Codex Study Club" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Codex Study Club - Codex 中文学习与交流社区",
    description: "以对话为入口，用真实案例掌握 Codex。",
    images: ["/og-image.webp"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
