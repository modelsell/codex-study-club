"use client";

import { useRef, useState } from "react";
import content from "@/content/playground/idea-gacha.json";
import styles from "@/app/play/play.module.css";

export function IdeaGacha() {
  const [index, setIndex] = useState(0);
  const [message, setMessage] = useState("");
  const textArea = useRef<HTMLTextAreaElement>(null);
  const idea = content.ideas[index];
  const prompt = `${content.commonPrompt}\n\n本次挑战：${idea.title}\n${idea.task}\n\n验收清单：\n${idea.checks.map((item, i) => `${i + 1}. ${item}`).join("\n")}`;

  function select(next: number) {
    setIndex(next);
    setMessage("");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setMessage(content.copiedLabel);
    } catch {
      textArea.current?.focus();
      textArea.current?.select();
      setMessage(content.copyFallback);
    }
  }

  return (
    <div className={styles.machine}>
      <section className={styles.card} aria-labelledby="idea-title">
        <div className={styles.cardMeta}><span>{idea.category}</span><span>{idea.duration}</span></div>
        <div className={styles.symbol} aria-hidden="true">{idea.symbol}</div>
        <div aria-live="polite" aria-atomic="true">
          <p className={styles.issue}>IDEA {String(index + 1).padStart(2, "0")} / {String(content.ideas.length).padStart(2, "0")}</p>
          <h2 id="idea-title">{idea.title}</h2>
          <p className={styles.pitch}>{idea.pitch}</p>
        </div>
        <button className={styles.draw} onClick={() => select((index + 1 + Math.floor(Math.random() * (content.ideas.length - 1))) % content.ideas.length)} type="button">
          {content.drawLabel} <span aria-hidden="true">↗</span>
        </button>
      </section>
      <section className={styles.brief} aria-labelledby="prompt-label">
        <h2 id="prompt-label">{content.promptLabel}</h2>
        <textarea aria-labelledby="prompt-label" readOnly ref={textArea} value={prompt} spellCheck={false} />
        <button className={styles.copy} onClick={copy} type="button">{content.copyLabel}</button>
        <p className={styles.message} role="status">{message}</p>
        <p className={styles.note}>{content.note}</p>
      </section>
      <nav className={styles.shelf} aria-label="选择一个挑战">
        {content.ideas.map((item, i) => (
          <button aria-pressed={index === i} key={item.id} onClick={() => select(i)} type="button">
            <span aria-hidden="true">{item.symbol}</span>{item.title}
          </button>
        ))}
      </nav>
    </div>
  );
}
