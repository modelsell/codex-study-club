import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Bot,
  Check,
  CircleDollarSign,
  Code2,
  FileCheck2,
  Gauge,
  GitPullRequestArrow,
  PackageOpen,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const submissionUrl =
  "https://github.com/modelsell/codex-study-club/issues/new?template=open-source-sponsor.yml";

export const metadata: Metadata = {
  title: "Modelsell 开源项目赞助计划",
  description:
    "面向所有领域优质开源项目的长期赞助计划。在项目中展示 Modelsell，通过审核即可获得价值 500 美元以上的平台算力额度。",
  alternates: { canonical: "/agent-awards" },
  openGraph: {
    title: "Modelsell 开源项目赞助计划 | $500+ 算力额度",
    description: "优质开源项目展示 Modelsell，通过审核即可获得 500 美元以上算力赞助。",
    images: [
      {
        url: "/cases/reusable-review-skill.webp",
        width: 1200,
        height: 675,
        alt: "可复用 Agent Skill 的真实工作流示例",
      },
    ],
  },
};

const tracks = [
  {
    icon: FileCheck2,
    number: "01",
    title: "AI 与 Agent",
    description: "面向真实任务的 Agent、Skill、MCP、模型工具或完整 AI 应用。",
    examples: "Agent Skill / MCP / AI 应用",
  },
  {
    icon: Blocks,
    number: "02",
    title: "开发者工具",
    description: "让开发、测试、部署、调试或团队协作变得更高效的开源工具。",
    examples: "CLI / IDE 工具 / 自动化 / DevOps",
  },
  {
    icon: PackageOpen,
    number: "03",
    title: "框架与基础设施",
    description: "被其他项目依赖、扩展或集成的框架、SDK、组件库和基础能力。",
    examples: "框架 / SDK / 组件库 / 基础设施",
  },
  {
    icon: Bot,
    number: "04",
    title: "开源产品与应用",
    description: "面向明确用户、具备完整体验且持续维护的桌面端、Web 或移动应用。",
    examples: "效率工具 / 内容工具 / 垂直应用",
  },
];

const criteria = [
  {
    icon: Gauge,
    score: "35%",
    title: "真实价值",
    description: "是否解决明确而高频的问题，并明显改善时间、质量或成本。",
  },
  {
    icon: Play,
    score: "25%",
    title: "完成度",
    description: "是否有可运行产品、清晰演示和足够稳定的核心体验。",
  },
  {
    icon: GitPullRequestArrow,
    score: "25%",
    title: "复用潜力",
    description: "是否容易被更多人理解、接入、复现或迁移到相近场景。",
  },
  {
    icon: ShieldCheck,
    score: "15%",
    title: "可信与安全",
    description: "是否说明数据边界、权限策略、限制条件和验证方法。",
  },
];

const process = [
  {
    number: "01",
    title: "确认开源",
    description: "公开核心代码，提供清晰的开源协议、项目说明和可访问的仓库地址。",
  },
  {
    number: "02",
    title: "展示 Modelsell",
    description: "在 README、项目官网或产品 About 页面展示 Modelsell，并链接到 modelsell.com。",
  },
  {
    number: "03",
    title: "提交申请",
    description: "提交仓库、展示位置、产品演示和真实结果。不要填写密钥、客户数据或内部地址。",
  },
  {
    number: "04",
    title: "审核并赞助",
    description: "通过开源合规和项目质量审核后，直接发放价值 500 美元以上的平台算力额度。",
  },
];

const faqs = [
  {
    question: "必须开源吗？",
    answer:
      "必须。项目需要有公开可访问的代码仓库和清晰的开源协议，只有产品介绍页或仅提供 source-available 代码不视为满足条件。",
  },
  {
    question: "需要在哪里展示 Modelsell？",
    answer:
      "可以展示在项目 README、官网合作伙伴区域或产品 About 页面。需清晰出现 Modelsell 名称，并链接到 https://modelsell.com/，申请时提供对应公开地址。",
  },
  {
    question: "只有 AI 或 Codex 项目才能参加吗？",
    answer:
      "不是。计划不限领域、语言、模型、框架或开发工具。AI 与 Agent 项目可以申请，优秀的开发者工具、框架、基础设施和完整开源应用同样可以申请。",
  },
  {
    question: "提交后多久审核？",
    answer:
      "计划长期开放，材料齐全后滚动审核。需要补充开源协议、Modelsell 展示位置或演示材料时，我们会在原申请中联系项目作者。",
  },
  {
    question: "算力券是现金奖励吗？",
    answer:
      "不是。奖励为平台算力额度，以美元价值标称，不可提现或转让。实际面额、适用模型和有效期以发放时的通知为准。",
  },
  {
    question: "符合条件就能获得赞助吗？",
    answer:
      "是。项目满足开源要求、已正确展示 Modelsell，并通过真实价值、完成度和安全性审核后，即可获得价值 500 美元以上的算力赞助。更高额度会结合项目影响力、复用价值和当期预算确定。抄袭、虚假数据或无法核验的项目会被取消资格。",
  },
];

export default function AgentAwardsPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <SiteHeader />
      <main className="agent-awards-page">
        <section className="awards-hero">
          <Image
            alt="Agent Skill 自动完成代码审查并输出可核验结果的工作流示例"
            className="awards-hero-image"
            fill
            priority
            sizes="100vw"
            src="/cases/reusable-review-skill.webp"
          />
          <div className="awards-hero-wash" aria-hidden="true" />
          <div className="shell awards-hero-inner">
            <div className="awards-hero-copy">
              <span className="awards-kicker">
                <Sparkles size={14} />
                CODEX STUDY CLUB × MODELSELL
              </span>
              <h1>开源项目赞助计划</h1>
              <p className="awards-hero-lead">优质开源项目，只要在项目中展示 Modelsell，通过审核即可获得算力赞助。</p>
              <div className="awards-prize">
                <span>每个通过审核的项目</span>
                <strong>$500+</strong>
                <b>平台算力额度</b>
              </div>
              <div className="awards-actions">
                <Link className="awards-primary" href={submissionUrl} rel="noreferrer" target="_blank">
                  申请开源赞助
                  <ArrowUpRight size={17} />
                </Link>
                <Link className="awards-secondary" href="#criteria">
                  查看审核标准
                  <ArrowDown size={16} />
                </Link>
              </div>
            </div>
            <p className="awards-image-note">示例方向：开放可复用的 Agent Skill 与完整工作流</p>
          </div>
        </section>

        <section className="awards-facts" aria-label="活动要点">
          <div className="shell awards-facts-inner">
            <div>
              <span>STATUS</span>
              <strong>长期开放</strong>
            </div>
            <div>
              <span>REVIEW</span>
              <strong>材料齐全滚动审核</strong>
            </div>
            <div>
              <span>OPEN SOURCE</span>
              <strong>开源协议清晰</strong>
            </div>
            <div>
              <span>REQUIREMENT</span>
              <strong>项目展示 Modelsell</strong>
            </div>
          </div>
        </section>

        <section className="awards-section shell" id="tracks">
          <div className="awards-section-heading">
            <div>
              <span className="eyebrow">WHAT WE ARE LOOKING FOR</span>
              <h2>不限方向，只看开源价值</h2>
            </div>
            <p>不限领域和技术栈。项目需要公开核心代码、采用清晰开源协议，并能展示真实可用的结果。</p>
          </div>
          <div className="awards-track-grid">
            {tracks.map(({ icon: Icon, number, title, description, examples }) => (
              <article className="awards-track" key={number}>
                <div className="awards-track-top">
                  <span>{number}</span>
                  <Icon size={21} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <small>{examples}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="awards-criteria" id="criteria">
          <div className="shell">
            <div className="awards-section-heading awards-section-heading-light">
              <div>
                <span className="eyebrow">HOW WE REVIEW</span>
                <h2>质量审核通过，直接赞助</h2>
              </div>
              <p>这不是排名竞赛。我们会打开仓库和产品、观看演示，并核对项目的真实价值。</p>
            </div>
            <div className="awards-criteria-grid">
              {criteria.map(({ icon: Icon, score, title, description }) => (
                <article className="awards-criterion" key={title}>
                  <div>
                    <Icon size={19} />
                    <span>{score}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
            <div className="awards-reward-panel">
              <div className="awards-reward-intro">
                <CircleDollarSign size={24} />
                <div>
                  <span>REWARD RANGE</span>
                  <strong>$500+</strong>
                </div>
              </div>
              <div className="awards-reward-copy">
                <strong>赞助额度如何确定？</strong>
                <p>通过基础审核的优质开源项目直接获得价值 500 美元以上的算力额度。更高额度根据实际影响、项目成熟度、复用价值和当期预算综合确定。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="awards-section shell">
          <div className="awards-section-heading">
            <div>
              <span className="eyebrow">SUBMISSION CHECKLIST</span>
              <h2>满足三项即可申请</h2>
            </div>
            <p>不需要商业计划书。仓库、Modelsell 展示位置和真实演示完整，审核就可以开始。</p>
          </div>
          <div className="awards-checklist-layout">
            <ol className="awards-checklist">
              <li><Check size={16} /><span><strong>优质开源项目</strong>公开核心代码、开源协议清晰，并解决一个真实问题。</span></li>
              <li><Check size={16} /><span><strong>展示 Modelsell</strong>在 README、官网或 About 页面展示名称并链接至 modelsell.com。</span></li>
              <li><Check size={16} /><span><strong>可核验的演示</strong>提供产品入口、运行方式或从输入到结果的完整演示。</span></li>
            </ol>
            <div className="awards-submit-preview">
              <div className="awards-submit-bar">
                <Code2 size={15} />
                <span>open-source-sponsor.yml</span>
                <b>PUBLIC</b>
              </div>
              <div className="awards-submit-body">
                <span>README.md</span>
                <strong>Supported by Modelsell</strong>
                <i />
                <i />
                <span>OPEN SOURCE</span>
                <strong>Repository · License · Demo</strong>
                <i />
                <i className="short" />
              </div>
              <Link href={submissionUrl} rel="noreferrer" target="_blank">
                申请开源赞助
                <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        <section className="awards-process-section">
          <div className="shell">
            <div className="awards-section-heading">
              <div>
                <span className="eyebrow">FROM SUBMISSION TO FEATURE</span>
                <h2>从开源项目到算力赞助</h2>
              </div>
              <p>满足公开透明的基础条件，通过质量审核后直接获得赞助，结果会在原申请中同步。</p>
            </div>
            <ol className="awards-process">
              {process.map((item) => (
                <li key={item.number}>
                  <span>{item.number}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="awards-faq shell">
          <div className="awards-faq-heading">
            <span className="eyebrow">FAQ</span>
            <h2>申请前常见问题</h2>
            <p>申请即代表你有权展示所提交的内容，并允许平台为审核与项目推荐目的引用公开材料。</p>
          </div>
          <div className="awards-faq-list">
            {faqs.map((item) => (
              <details key={item.question}>
                <summary>{item.question}<span>+</span></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="awards-final-cta">
          <div className="shell awards-final-cta-inner">
            <div>
              <span className="eyebrow">SUBMISSIONS ARE OPEN</span>
              <h2>认真做开源，<br />Modelsell 提供算力。</h2>
            </div>
            <div>
              <p>添加 Modelsell 展示链接，准备好仓库、开源协议和演示，申请大约需要 10 分钟。</p>
              <Link href={submissionUrl} rel="noreferrer" target="_blank">
                申请 $500+ 算力赞助
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} type="application/ld+json" />
    </>
  );
}
