"use client";

import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import { ArrowUp, BookOpen, RotateCcw, Sparkles } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: { label: string; href: string }[];
};

const suggestions = [
  "第一次使用 Codex，应该从哪里开始？",
  "帮我把一个模糊需求改成清晰任务",
  "AGENTS.md 和 Skill 有什么区别？",
];

export function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function ask(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: cleanQuestion }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-8) }),
      });

      if (!response.ok) throw new Error("request_failed");
      const data = (await response.json()) as {
        answer: string;
        sources?: { label: string; href: string }[];
      };
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer, sources: data.sources },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "刚才没有成功连接学习助手。你可以稍后重试，或先从下方实战案例开始。",
        },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) void ask(input);
    }
  }

  return (
    <div className={`assistant ${messages.length ? "assistant-active" : ""}`}>
      {messages.length ? (
        <div className="conversation" aria-live="polite">
          <div className="conversation-bar">
            <span>当前对话</span>
            <button
              aria-label="清空对话"
              onClick={() => setMessages([])}
              title="清空对话"
              type="button"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          {messages.map((message, index) => (
            <div className={`message message-${message.role}`} key={`${message.role}-${index}`}>
              <div className="message-role">
                {message.role === "assistant" ? <Sparkles size={15} /> : null}
                {message.role === "assistant" ? "Codex Study Club" : "你"}
              </div>
              <p>{message.content}</p>
              {message.sources?.length ? (
                <div className="message-sources">
                  <BookOpen size={14} />
                  {message.sources.map((source) => (
                    <a href={source.href} key={source.href} rel="noreferrer" target="_blank">
                      {source.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {loading ? (
            <div className="message message-assistant message-loading">
              <div className="message-role">
                <Sparkles size={15} />
                Codex Study Club
              </div>
              <div className="thinking-dots" aria-label="正在整理答案">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <form className="ask-form" onSubmit={handleSubmit}>
        <textarea
          aria-label="向 Codex 学习助手提问"
          maxLength={4000}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="问任何关于 Codex 的问题"
          ref={textareaRef}
          rows={1}
          value={input}
        />
        <button aria-label="发送问题" disabled={!canSubmit} title="发送" type="submit">
          <ArrowUp size={19} strokeWidth={2.4} />
        </button>
      </form>

      {!messages.length ? (
        <div className="suggestion-row" aria-label="常见问题">
          {suggestions.map((suggestion) => (
            <button onClick={() => void ask(suggestion)} type="button" key={suggestion}>
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
