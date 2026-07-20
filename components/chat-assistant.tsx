"use client";

import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import { ArrowUp, BookOpen, RotateCcw, Sparkles } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { label: string; href: string }[];
};

type StreamEvent =
  | { type: "sources"; sources: { label: string; href: string }[] }
  | { type: "delta"; delta: string }
  | { type: "error"; message?: string }
  | { type: "done" };

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
  const requestRef = useRef<AbortController | null>(null);

  const canSubmit = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function ask(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;

    const requestId = crypto.randomUUID();
    const nextMessages: Message[] = [
      ...messages,
      { id: `user-${requestId}`, role: "user", content: cleanQuestion },
    ];
    const assistantId = `assistant-${requestId}`;
    const controller = new AbortController();
    requestRef.current = controller;
    setMessages([...nextMessages, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-8).map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) throw new Error("request_failed");

      const updateAssistant = (update: (message: Message) => Message) => {
        setMessages((current) =>
          current.map((message) => (message.id === assistantId ? update(message) : message)),
        );
      };

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedText = false;

      const consumeLine = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line) as StreamEvent;
        if (event.type === "sources") {
          updateAssistant((message) => ({ ...message, sources: event.sources }));
        } else if (event.type === "delta") {
          receivedText = receivedText || Boolean(event.delta);
          updateAssistant((message) => ({ ...message, content: message.content + event.delta }));
        } else if (event.type === "error") {
          const errorMessage = event.message || "回答传输中断，请重试。";
          updateAssistant((message) => ({
            ...message,
            content: `${message.content}${message.content ? "\n\n" : ""}${errorMessage}`,
          }));
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) consumeLine(line);
      }
      buffer += decoder.decode();
      if (buffer) consumeLine(buffer);
      if (!receivedText) throw new Error("empty_response");
    } catch {
      if (!controller.signal.aborted) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId && !message.content
              ? {
                  ...message,
                  content: "刚才没有成功连接学习助手。你可以稍后重试，或先从下方实战案例开始。",
                }
              : message,
          ),
        );
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
        textareaRef.current?.focus();
      }
    }
  }

  function clearConversation() {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setMessages([]);
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
              onClick={clearConversation}
              title="清空对话"
              type="button"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          {messages.map((message) => (
            <div className={`message message-${message.role}`} key={message.id}>
              <div className="message-role">
                {message.role === "assistant" ? <Sparkles size={15} /> : null}
                {message.role === "assistant" ? "Codex Study Club" : "你"}
              </div>
              {message.content ? <p>{message.content}</p> : null}
              {message.role === "assistant" && !message.content && loading ? (
                <div className="thinking-dots" aria-label="正在整理答案">
                  <span />
                  <span />
                  <span />
                </div>
              ) : null}
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
