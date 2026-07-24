"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lead } from "@/agent/leads";

const ACCESS_CODE_KEY = "pulse-access-code";

export default function LeadRadar() {
  const [accessCode] = useState(() =>
    typeof window === "undefined" ? "" : sessionStorage.getItem(ACCESS_CODE_KEY) ?? "",
  );
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [digest, setDigest] = useState("");
  const [mode, setMode] = useState<"agent" | "fallback" | "">("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/lead-radar", {
        method: "POST",
        headers: { "x-pulse-access-code": accessCode },
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setLeads(data.leads ?? []);
      setDigest(data.digest ?? "");
      setMode(data.mode ?? "");
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  };

  const copyDigest = () => {
    navigator.clipboard.writeText(digest);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Lead Radar
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Propiedades en venta y avisos legales (edictos, juicios sucesorios, remates) en los
              cuatro municipios de la Cuarta Demarcación Notarial de Huayacocotla, Veracruz.
            </p>
          </div>
          <Link href="/" className="text-sm text-zinc-500 underline dark:text-zinc-400">
            ← Pulse
          </Link>
        </header>

        <button
          onClick={run}
          disabled={status === "loading"}
          className="mb-8 self-start rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950"
        >
          {status === "loading" ? "Buscando señales…" : "Buscar señales de hoy"}
        </button>

        {status === "error" && (
          <p className="mb-6 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {status === "done" && (
          <div className="flex flex-col gap-8">
            <section>
              <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Mensaje para WhatsApp
              </h2>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm whitespace-pre-wrap text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                {digest}
              </div>
              <button
                onClick={copyDigest}
                className="mt-2 text-xs text-zinc-500 underline dark:text-zinc-400"
              >
                {copied ? "¡Copiado!" : "Copiar mensaje"}
              </button>
            </section>

            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Señales encontradas ({leads.length})
                </h2>
                {mode && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    modo: {mode === "agent" ? "agente" : "respaldo"}
                  </span>
                )}
              </div>
              {leads.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No se encontraron señales nuevas hoy.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {leads.map((lead, i) => (
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
                          {lead.type === "property" ? "Propiedad" : "Aviso legal"}
                        </span>
                        <span className="font-medium text-zinc-950 dark:text-zinc-50">
                          {lead.title}
                        </span>
                        <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
                          {lead.score}/100
                        </span>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300">{lead.detail}</p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{lead.reason}</p>
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
                        Fuente: {lead.sourceName}
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
