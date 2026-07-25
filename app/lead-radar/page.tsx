"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lead } from "@/agent/leads";
import { AccessGate, useAccessCode } from "@/components/access-gate";
import { CATEGORY_LABELS } from "@/lib/categories";
import { LanguageToggle, useLang } from "@/lib/i18n";
import { loadHistory, recordRun, type RunRecord } from "@/lib/pipeline-store";

function formatTimestamp(ts: number, lang: string): string {
  return new Date(ts).toLocaleString(lang === "es" ? "es-MX" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LeadRadar() {
  const { accessCode, ready, unauthorized, setCode, reject } = useAccessCode();
  const { lang, t } = useLang();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [digest, setDigest] = useState("");
  const [mode, setMode] = useState<"agent" | "fallback" | "">("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [newSinceLast, setNewSinceLast] = useState<number | null>(null);
  const [history, setHistory] = useState<RunRecord[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  if (!ready) return null;
  if (!accessCode) {
    return <AccessGate unauthorized={unauthorized} onSubmit={setCode} />;
  }

  const run = async () => {
    setStatus("loading");
    setError("");
    setViewingIndex(null);
    try {
      const res = await fetch("/api/lead-radar", {
        method: "POST",
        headers: { "x-pulse-access-code": accessCode },
      });
      if (res.status === 401) {
        reject();
        setStatus("idle");
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      const runLeads: Lead[] = data.leads ?? [];
      const runDigest: string = data.digest ?? "";
      const runMode: "agent" | "fallback" | "" = data.mode ?? "";

      const previous = history[0];
      if (previous) {
        const previousUrls = new Set(previous.leads.map((l) => l.sourceUrl));
        setNewSinceLast(runLeads.filter((l) => !previousUrls.has(l.sourceUrl)).length);
      } else {
        setNewSinceLast(null);
      }

      const record: RunRecord = {
        timestamp: Date.now(),
        leads: runLeads,
        digest: runDigest,
        mode: runMode,
      };
      setHistory(recordRun(record, history));

      setLeads(runLeads);
      setDigest(runDigest);
      setMode(runMode);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  };

  const viewing = viewingIndex !== null ? history[viewingIndex] : null;
  const shownLeads = viewing ? viewing.leads : leads;
  const shownDigest = viewing ? viewing.digest : digest;
  const shownMode = viewing ? viewing.mode : mode;

  const copyDigest = () => {
    navigator.clipboard.writeText(shownDigest);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Lead Radar
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("radar.subtitle")}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <LanguageToggle />
            <Link href="/dashboard" className="text-sm text-zinc-500 underline dark:text-zinc-400">
              {t("nav.dashboard")}
            </Link>
            <Link href="/" className="text-sm text-zinc-500 underline dark:text-zinc-400">
              {t("nav.pulse")}
            </Link>
          </div>
        </header>

        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={run}
            disabled={status === "loading"}
            className="self-start rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950"
          >
            {status === "loading" ? t("radar.running") : t("radar.run")}
          </button>
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="text-sm text-zinc-500 underline dark:text-zinc-400"
            >
              {showHistory ? t("radar.hideHistory") : `${t("radar.showHistory")} (${history.length})`}
            </button>
          )}
        </div>

        {showHistory && (
          <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {t("radar.previousRuns")}
            </h2>
            <ul className="flex flex-col gap-1">
              {history.map((record, i) => (
                <li key={record.timestamp}>
                  <button
                    onClick={() => {
                      setViewingIndex(i);
                      setShowHistory(false);
                    }}
                    className={`w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      viewingIndex === i
                        ? "font-medium text-zinc-950 dark:text-zinc-50"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {formatTimestamp(record.timestamp, lang)} — {record.leads.length}{" "}
                    {t("radar.signalsShort")}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {viewing && (
          <div className="mb-6 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <span>
              {t("radar.viewingRun")} {formatTimestamp(viewing.timestamp, lang)}
            </span>
            <button onClick={() => setViewingIndex(null)} className="underline">
              {t("radar.backToCurrent")}
            </button>
          </div>
        )}

        {status === "error" && <p className="mb-6 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {(status === "done" || viewing) && (
          <div className="flex flex-col gap-8">
            {!viewing && newSinceLast !== null && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {newSinceLast > 0
                  ? lang === "es"
                    ? `🔺 ${newSinceLast} señal${newSinceLast === 1 ? "" : "es"} nueva${newSinceLast === 1 ? "" : "s"} desde la ejecución anterior.`
                    : `🔺 ${newSinceLast} new signal${newSinceLast === 1 ? "" : "s"} since the previous scan.`
                  : t("radar.noChange")}
              </p>
            )}

            <section>
              <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {t("radar.digestTitle")}
              </h2>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm whitespace-pre-wrap text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                {shownDigest}
              </div>
              <button
                onClick={copyDigest}
                className="mt-2 text-xs text-zinc-500 underline dark:text-zinc-400"
              >
                {copied ? t("radar.copied") : t("radar.copy")}
              </button>
            </section>

            <section>
              <div className="mb-1 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {t("radar.detected")} ({shownLeads.length})
                </h2>
                {shownMode && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    {t("radar.mode")}:{" "}
                    {shownMode === "agent" ? t("radar.modeAgent") : t("radar.modeFallback")}
                  </span>
                )}
              </div>
              <p className="mb-3 text-xs text-zinc-400 dark:text-zinc-500">
                {t("radar.trackedNote")}{" "}
                <Link href="/dashboard" className="underline">
                  {t("nav.dashboard")}
                </Link>
              </p>
              {shownLeads.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("radar.none")}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {shownLeads.map((lead, i) => (
                    <li
                      key={i}
                      className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            lead.type === "property"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                          }`}
                        >
                          {CATEGORY_LABELS[lead.category]?.[lang] ?? lead.type}
                        </span>
                        <span className="font-medium text-zinc-950 dark:text-zinc-50">
                          {lead.title}
                        </span>
                        <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
                          {lead.score}/100
                        </span>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300">{lead.detail}</p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {lang === "es" ? lead.reason : (lead.reasonEn ?? lead.reason)}
                      </p>
                      {(lead.municipio || lead.date) && (
                        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                          {[lead.municipio, lead.date].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <a
                        href={lead.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs text-zinc-500 underline dark:text-zinc-400"
                      >
                        {t("radar.source")}: {lead.sourceName}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
