"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccessGate, useAccessCode } from "@/components/access-gate";
import { CATEGORY_BLURBS, CATEGORY_LABELS, CATEGORY_ORDER, type LeadCategory } from "@/lib/categories";
import { LanguageToggle, useLang, type StringKey } from "@/lib/i18n";
import { CONVERSION_PLAYBOOKS, type ConversionResult } from "@/lib/playbooks";
import {
  backfillFromHistory,
  loadPipeline,
  saveExecution,
  setStatus,
  STATUS_ORDER,
  type PipelineEntry,
  type PipelineStatus,
} from "@/lib/pipeline-store";

const STATUS_KEY: Record<PipelineStatus, StringKey> = {
  new: "status.new",
  contacted: "status.contacted",
  converted: "status.converted",
  discarded: "status.discarded",
};

const STATUS_CLASS: Record<PipelineStatus, string> = {
  new: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  contacted: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  converted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  discarded: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default function Dashboard() {
  const { accessCode, ready, unauthorized, setCode, reject } = useAccessCode();
  const { lang, t } = useLang();
  const [entries, setEntries] = useState<PipelineEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<PipelineStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<LeadCategory | "all">("all");
  const [municipioFilter, setMunicipioFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  // Reading localStorage happens after mount so the server and first client render agree.
  useEffect(() => {
    backfillFromHistory();
    setEntries(loadPipeline());
  }, []);

  if (!ready) return null;
  if (!accessCode) {
    return <AccessGate unauthorized={unauthorized} onSubmit={setCode} />;
  }

  const municipios = Array.from(
    new Set(entries.map((e) => e.lead.municipio).filter((m): m is string => !!m)),
  ).sort();

  const shown = entries.filter(
    (e) =>
      (statusFilter === "all" || e.status === statusFilter) &&
      (categoryFilter === "all" || e.lead.category === categoryFilter) &&
      (municipioFilter === "all" || e.lead.municipio === municipioFilter),
  );

  const open = openId ? (entries.find((e) => e.id === openId) ?? null) : null;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-4xl flex-1 flex-col px-6 py-10">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {t("dash.title")}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("dash.subtitle")}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <LanguageToggle />
            <Link href="/lead-radar" className="text-sm text-zinc-500 underline dark:text-zinc-400">
              {t("nav.backToRadar")}
            </Link>
            <Link href="/" className="text-sm text-zinc-500 underline dark:text-zinc-400">
              {t("nav.pulse")}
            </Link>
          </div>
        </header>

        {/* Status counters double as the status filter — one row, no separate control. */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Counter
            label={t("dash.total")}
            count={entries.length}
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          {STATUS_ORDER.map((s) => (
            <Counter
              key={s}
              label={t(STATUS_KEY[s])}
              count={entries.filter((e) => e.status === s).length}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </section>

        <section className="mb-6 flex flex-wrap items-center gap-3 text-sm">
          <Select
            label={t("dash.filterCategory")}
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v as LeadCategory | "all")}
            options={[
              { value: "all", label: t("dash.all") },
              ...CATEGORY_ORDER.map((c) => ({
                value: c,
                label: `${CATEGORY_LABELS[c][lang]} (${entries.filter((e) => e.lead.category === c).length})`,
              })),
            ]}
          />
          <Select
            label={t("dash.filterMunicipio")}
            value={municipioFilter}
            onChange={setMunicipioFilter}
            options={[
              { value: "all", label: t("dash.all") },
              ...municipios.map((m) => ({ value: m, label: m })),
            ]}
          />
        </section>

        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("dash.empty")}{" "}
            <Link href="/lead-radar" className="underline">
              Lead Radar
            </Link>
          </p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("dash.emptyFiltered")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {shown.map((entry) => (
              <SignalRow
                key={entry.id}
                entry={entry}
                onStatus={(s) => setEntries(setStatus(entry.id, s))}
                onOpen={() => setOpenId(entry.id)}
              />
            ))}
          </ul>
        )}
      </main>

      {open && (
        <ExecutionPanel
          entry={open}
          accessCode={accessCode}
          onUnauthorized={reject}
          onClose={() => setOpenId(null)}
          onPersist={(next) => setEntries(next)}
        />
      )}
    </div>
  );
}

function Counter({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-3 py-2 text-left transition-colors ${
        active
          ? "border-zinc-950 bg-white shadow-sm ring-1 ring-zinc-950 dark:border-zinc-50 dark:bg-zinc-900 dark:ring-zinc-50"
          : "border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{count}</div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SignalRow({
  entry,
  onStatus,
  onOpen,
}: {
  entry: PipelineEntry;
  onStatus: (s: PipelineStatus) => void;
  onOpen: () => void;
}) {
  const { lang, t } = useLang();
  const { lead } = entry;
  const category = lead.category ?? "edict";

  return (
    <li
      className={`rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${
        lead.score >= 80 ? "border-l-4 border-l-zinc-950 dark:border-l-zinc-50" : ""
      }`}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {CATEGORY_LABELS[category][lang]}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[entry.status]}`}>
          {t(STATUS_KEY[entry.status])}
        </span>
        <span className="font-medium text-zinc-950 dark:text-zinc-50">{lead.title}</span>
        <span
          className={`ml-auto font-mono tabular-nums ${
            lead.score >= 80
              ? "text-2xl font-bold text-zinc-950 dark:text-zinc-50"
              : lead.score >= 50
                ? "text-base font-semibold text-zinc-700 dark:text-zinc-300"
                : "text-xs font-medium text-zinc-400 dark:text-zinc-500"
          }`}
        >
          {lead.score}
          <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">/100</span>
        </span>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">{CATEGORY_BLURBS[category][lang]}</p>

      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
        {[
          lead.municipio,
          lead.date,
          `${t("dash.firstSeen")} ${new Date(entry.firstSeen).toLocaleDateString(lang === "es" ? "es-MX" : "en-US")}`,
          `${t("dash.seenIn")} ${entry.runCount} ${t("dash.scans")}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={onOpen}
          className="rounded-xl bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
        >
          {entry.execution ? t("dash.reopenExecution") : t("dash.execute")}
        </button>
        {STATUS_ORDER.filter((s) => s !== entry.status).map((s) => (
          <button
            key={s}
            onClick={() => onStatus(s)}
            className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
          >
            {t(STATUS_KEY[s])}
          </button>
        ))}
        <a
          href={lead.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-zinc-500 underline dark:text-zinc-400"
        >
          {lead.sourceName}
        </a>
      </div>
    </li>
  );
}

function ExecutionPanel({
  entry,
  accessCode,
  onUnauthorized,
  onClose,
  onPersist,
}: {
  entry: PipelineEntry;
  accessCode: string;
  onUnauthorized: () => void;
  onClose: () => void;
  onPersist: (entries: PipelineEntry[]) => void;
}) {
  const { lang, t } = useLang();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const result: ConversionResult | undefined = entry.execution?.result;
  const checked = entry.execution?.checkedSteps ?? [];
  const category = entry.lead.category ?? "edict";
  // Shown before the agent runs, not just after: the procedure for this matter type is known
  // without asking anything, so the panel opens with work already on it.
  const playbook = CONVERSION_PLAYBOOKS[category];

  const start = async () => {
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "content-type": "application/json", "x-pulse-access-code": accessCode },
        body: JSON.stringify({ lead: entry.lead, lang }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data: ConversionResult = await res.json();
      onPersist(saveExecution(entry.id, { startedAt: Date.now(), result: data }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRunning(false);
    }
  };

  const toggleStep = (id: string) => {
    const next = checked.includes(id) ? checked.filter((s) => s !== id) : [...checked, id];
    onPersist(saveExecution(entry.id, { checkedSteps: next }));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-zinc-50 p-6 shadow-2xl dark:bg-zinc-950"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              {t("exec.title")}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {entry.lead.title}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {CATEGORY_LABELS[category][lang]}
              {entry.lead.municipio ? ` · ${entry.lead.municipio}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-sm text-zinc-500 underline dark:text-zinc-400">
            {t("exec.close")}
          </button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={start}
            disabled={running}
            className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950"
          >
            {result ? t("exec.rerun") : t("exec.start")}
          </button>
          {result && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {t("exec.ranAt")}:{" "}
              {new Date(result.generatedAt).toLocaleTimeString(lang === "es" ? "es-MX" : "en-US")}
            </span>
          )}
        </div>

        {running && (
          <p className="mb-6 animate-pulse text-sm text-zinc-500 dark:text-zinc-400">
            {t("exec.running")}
          </p>
        )}
        {error && <p className="mb-6 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {playbook && (
          <section className="mb-8">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {t("exec.playbook")}
            </h3>
            <p className="mt-1 mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              {t("exec.playbookNote")}
            </p>
            <ul className="flex flex-col gap-1 rounded-2xl border border-dashed border-zinc-300 bg-zinc-100/60 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
              {playbook.map((step) => (
                <li key={step.id}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-transparent bg-white/60 p-2.5 text-sm hover:border-zinc-200 dark:bg-zinc-950/40 dark:hover:border-zinc-800">
                    <input
                      type="checkbox"
                      checked={checked.includes(step.id)}
                      onChange={() => toggleStep(step.id)}
                      className="mt-0.5"
                    />
                    <span
                      className={
                        checked.includes(step.id)
                          ? "text-zinc-400 line-through dark:text-zinc-500"
                          : "text-zinc-800 dark:text-zinc-200"
                      }
                    >
                      {step[lang]}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}

        {result?.degraded && (
          <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            {t("exec.degraded")}
          </p>
        )}

        {result?.research && (
          <section className="mb-8">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {t("exec.research")}
              <span className="ml-2 rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-50 uppercase dark:bg-zinc-50 dark:text-zinc-950">
                {t("exec.liveBadge")}
              </span>
            </h3>
            <p className="mt-1 mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              {t("exec.researchNote")}
            </p>

            <div className="flex flex-col gap-4 rounded-2xl border-2 border-zinc-950 bg-white p-4 text-sm shadow-sm dark:border-zinc-50 dark:bg-zinc-900">
              <Field label={t("exec.summary")}>
                <p className="text-zinc-800 dark:text-zinc-200">{result.research.summary}</p>
              </Field>
              <ListField label={t("exec.parties")} items={result.research.parties} />
              <ListField label={t("exec.nextSteps")} items={result.research.next_steps} />
              <ListField label={t("exec.risks")} items={result.research.risks} />
              {result.research.sources.length > 0 && (
                <Field label={t("exec.sources")}>
                  <ul className="flex flex-col gap-1.5">
                    {result.research.sources.map((s, i) => (
                      <li key={i}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          <span className="truncate">{s.title}</span>
                          <span className="ml-auto shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">
                            {hostOf(s.url) === s.title.trim() ? "" : hostOf(s.url)}
                          </span>
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="shrink-0"
                            aria-hidden="true"
                          >
                            <path d="M7 17L17 7M17 7H8M17 7v9" />
                          </svg>
                        </a>
                      </li>
                    ))}
                  </ul>
                </Field>
              )}
            </div>
          </section>
        )}

        <section className="mt-auto pt-6">
          <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {t("exec.setStatus")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => onPersist(setStatus(entry.id, s))}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium ${
                  entry.status === s
                    ? STATUS_CLASS[s]
                    : "border border-zinc-300 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400"
                }`}
              >
                {t(STATUS_KEY[s])}
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      {children}
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Field label={label}>
      <ul className="list-inside list-disc space-y-1 text-zinc-800 dark:text-zinc-200">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </Field>
  );
}
