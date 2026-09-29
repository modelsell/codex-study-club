import type { Metadata } from "next";
import Link from "next/link";
import { IdeaGacha } from "@/components/idea-gacha";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import content from "@/content/playground/idea-gacha.json";
import styles from "./play.module.css";

export const metadata: Metadata = {
  title: content.title,
  description: content.description,
  alternates: { canonical: "/play" },
};

export default function PlayPage() {
  return <>
    <SiteHeader />
    <main className={`${styles.page} shell`}>
      <header className={styles.intro}>
        <span className="eyebrow">{content.eyebrow}</span>
        <h1>{content.title}<span aria-hidden="true"> ✳</span></h1>
        <p>{content.description}</p>
        <p className={styles.note}>{content.intro}</p>
      </header>
      <IdeaGacha />
      <div className={styles.more}>
        <Link href="/cases/idea-gacha-lab">怎么玩、怎么改成自己的版本 →</Link>
        <Link href="/cases/17-desktop-pet">给工作台添一只桌面宠物 →</Link>
      </div>
    </main>
    <SiteFooter />
  </>;
}
