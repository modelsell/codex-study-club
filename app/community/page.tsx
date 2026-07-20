import type { Metadata } from "next";
import { Check, MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";
import { CommunityLink } from "@/components/community-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "加入 Codex 付费社群",
  description: "加入高质量 Codex 实践社群，交流真实问题、可复现案例与最新工作流。",
  alternates: { canonical: "/community" },
};

const values = [
  { icon: MessagesSquare, title: "真实问题", text: "围绕正在发生的任务讨论，不做泛泛的信息搬运。" },
  { icon: Sparkles, title: "经验整理", text: "高频问题和有效方法由站方定期整理，避免信息沉没。" },
  { icon: ShieldCheck, title: "隐私优先", text: "群聊不会自动公开，案例发布前完成授权和脱敏。" },
];

export default function CommunityPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_COMMUNITY_JOIN_URL);

  return (
    <>
      <SiteHeader />
      <main className="community-page">
        <section className="community-hero shell-narrow">
          <span className="eyebrow">CODEX COMMUNITY</span>
          <h1>和真正使用 Codex 的人一起进步</h1>
          <p>这里讨论具体任务、失败过程和验证结果。没有公开发帖压力，也不把群聊直接变成内容。</p>
          <CommunityLink className="primary-button" />
        </section>

        <section className="community-values shell">
          {values.map(({ icon: Icon, title, text }) => (
            <div className="community-value" key={title}>
              <Icon size={22} />
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          ))}
        </section>

        <section className="join-panel shell-narrow" id="join">
          <div>
            <span className="eyebrow">MEMBERSHIP</span>
            <h2>加入付费社群</h2>
            <p>适合愿意分享上下文、验证结果，并尊重他人项目隐私的 Codex 用户。</p>
          </div>
          <ul>
            <li><Check size={17} />真实问题交流与互助</li>
            <li><Check size={17} />社群动态和案例优先阅读</li>
            <li><Check size={17} />高频问题定期整理</li>
          </ul>
          {configured ? (
            <CommunityLink className="primary-button" />
          ) : (
            <div className="join-config-note">
              <strong>加入入口即将开放</strong>
              <span>部署时配置社群支付或入群链接后，此处将自动启用。</span>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
