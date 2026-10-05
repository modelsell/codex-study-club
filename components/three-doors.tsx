"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import content from "@/content/playground/three-doors.json";
import styles from "@/app/play/play.module.css";

const possibilities = content.doors.map(({ id }) => {
  const truths = content.doors.map((clue) => (id === clue.target) === clue.isEqual);
  return { id, truths, count: truths.filter(Boolean).length };
});

export function ThreeDoors() {
  const [selected, setSelected] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState("");
  const firstDoor = useRef<HTMLButtonElement>(null);
  const result = possibilities.find(({ id }) => id === selected);

  function reset() {
    setSelected(null);
    setResetMessage(content.resetMessage);
    firstDoor.current?.focus();
  }

  return (
    <section id="tiny-mystery" className={styles.puzzle} aria-labelledby="puzzle-title">
      <span className="eyebrow">{content.eyebrow}</span>
      <h2 id="puzzle-title">{content.title}</h2>
      <p>{content.intro}</p>
      <p className={styles.note}>{content.hint}</p>
      <div className={styles.doors} role="group" aria-label={content.title}>
        {content.doors.map((door, index) => (
          <button
            type="button"
            key={door.id}
            ref={index === 0 ? firstDoor : undefined}
            aria-pressed={selected === door.id}
            onClick={() => { setSelected(door.id); setResetMessage(""); }}
          >
            <span className={styles.doorLetter}>{door.id}<span aria-hidden="true"> ◇</span></span>
            <span>{door.clue}</span>
          </button>
        ))}
      </div>
      <p className={styles.puzzleStatus} role="status" aria-atomic="true">
        {result ? `${selected} 门：${result.count === 1 ? content.correct : content.incorrect}` : resetMessage}
      </p>
      {result ? (
        <div className={styles.explanation}>
          <h3>{content.solutionTitle}</h3>
          <div className={styles.tableWrap}>
            <table>
              <caption>{content.solutionTitle}</caption>
              <thead><tr>{content.tableHeaders.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
              <tbody>{possibilities.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.id}</th>
                  {row.truths.map((truth, index) => <td key={index}>{truth ? content.trueLabel : content.falseLabel}</td>)}
                  <td>{row.count}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <p>{content.explanation}</p>
        </div>
      ) : null}
      <button type="button" className={styles.copy} onClick={reset}>{content.resetLabel}</button>
      <div className={styles.more}><Link href="/cases/idea-gacha-lab">{content.guideLabel}</Link></div>
      <p className={styles.note}>{content.boundary}</p>
    </section>
  );
}
