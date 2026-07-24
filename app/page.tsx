"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { PulseMessage, PulseSource } from "@/agent/pulse-agent";
import { AccessGate, useAccessCode } from "@/components/access-gate";

const SUGGESTIONS = [
  "Nvidia stock outlook",
  "Latest news on OpenAI",
  "Is the AI data center buildout a bubble?",
];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: PulseSource[];
  isError?: boolean;
};

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Research responses cite sources as inline markdown links, often with an empty label
// (e.g. "risks.[](url)"). We render the full source list separately below each briefing
// (title + domain, clickable), so inline links are redundant — strip the markdown syntax
// here rather than leaving raw "[](url)" clutter in the body text.
function stripInlineMarkdownLinks(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label: string) => label.trim())
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export default function Home() {
  const [input, setInput] = useState("");
  const { accessCode, unauthorized, setCode, reject } = useAccessCode();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const idPrefix = useId();

  if (!accessCode) {
    return <AccessGate unauthorized={unauthorized} onSubmit={setCode} />;
  }

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;

    const userMessage: ChatMessage = {
      id: `${idPrefix}-${Date.now()}-user`,
      role: "user",
      content: trimmed,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsBusy(true);

    const pulseMessages: PulseMessage[] = nextMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-pulse-access-code": accessCode },
        body: JSON.stringify({ messages: pulseMessages }),
      });

      if (res.status === 401) {
        reject();
        setMessages(messages); // drop the just-added user turn since it was never answered
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const data: { content: string; sources: PulseSource[] } = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `${idPrefix}-${Date.now()}-assistant`,
          role: "assistant",
          content: data.content,
          sources: data.sources,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${idPrefix}-${Date.now()}-error`,
          role: "assistant",
          content:
            error instanceof Error
              ? `Something went wrong: ${error.message}`
              : "Something went wrong. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Pulse
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Real-time, citation-backed briefings powered by You.com Research.
            </p>
          </div>
          <Link href="/lead-radar" className="text-sm text-zinc-500 underline dark:text-zinc-400">
            Lead Radar →
          </Link>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto">
          {messages.length === 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Try asking about:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition-colors hover:border-zinc-950 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-50 dark:hover:text-zinc-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}

          {isBusy && (
            <p className="animate-pulse text-sm text-zinc-400">
              Investigating live sources — this can take up to 30 seconds…
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="sticky bottom-6 mt-6 flex gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a topic, company, or ticker…"
            className="flex-1 bg-transparent px-3 py-2 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950"
          >
            Ask
          </button>
        </form>
      </main>
    </div>
  );
}

function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
            : message.isError
              ? "bg-red-50 text-red-700 shadow-sm dark:bg-red-950/40 dark:text-red-300"
              : "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
        }`}
      >
        <p className="whitespace-pre-wrap">
          {isUser ? message.content : stripInlineMarkdownLinks(message.content)}
        </p>

        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 border-t border-zinc-200 pt-2 dark:border-zinc-800">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Sources</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {message.sources.map((s, si) => (
                <li key={si} className="text-xs text-zinc-500 dark:text-zinc-400">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    {s.title ?? s.url}
                  </a>
                  <span className="ml-1">({domainOf(s.url)})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
