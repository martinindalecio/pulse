"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import type { PulseAgentUIMessage } from "@/agent/pulse-agent";

const SUGGESTIONS = [
  "Nvidia stock outlook",
  "Latest news on OpenAI",
  "Is the AI data center buildout a bubble?",
];

export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat<PulseAgentUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Pulse
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Real-time, citation-backed briefings powered by You.com Search &amp; Research.
          </p>
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
            <p className="animate-pulse text-sm text-zinc-400">Gathering intelligence…</p>
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

function Message({ message }: { message: PulseAgentUIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
            : "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <p key={i} className="whitespace-pre-wrap">
                {part.text}
              </p>
            );
          }

          if (part.type === "tool-webSearch") {
            return (
              <p key={i} className="text-xs italic text-zinc-500 dark:text-zinc-400">
                {part.state === "output-available"
                  ? `Searched: ${part.input?.query ?? "…"}`
                  : `Searching: ${part.input?.query ?? "…"}`}
              </p>
            );
          }

          if (part.type === "tool-deepResearch") {
            return (
              <div key={i} className="text-xs italic text-zinc-500 dark:text-zinc-400">
                <p>
                  {part.state === "output-available"
                    ? `Researched: ${part.input?.question ?? "…"}`
                    : `Researching: ${part.input?.question ?? "…"}`}
                </p>
                {part.state === "output-available" && part.output?.sources?.length > 0 && (
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {part.output.sources.slice(0, 5).map((s, si) => (
                      <li key={si}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="not-italic underline"
                        >
                          {s.title ?? s.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
