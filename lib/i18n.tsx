"use client";

// Hand-rolled i18n. No framework: the app has three screens and one dictionary, and a routing-based
// i18n setup would mean new route segments and a middleware rewrite — cost with no benefit here.
//
// Default is English. The product is for a notary in Veracruz and its real language is Spanish, but
// the demo opens in English so an English-speaking audience can read the screen; one click on the
// EN|ES pill shows the product as the notary actually uses it.

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "es";

const LANG_KEY = "pulse-lang";

type StringEntry = { en: string; es: string };

export const STRINGS = {
  // --- Access gate ---
  "gate.prompt": { en: "Enter access code to continue.", es: "Introduce el código de acceso." },
  "gate.wrong": { en: "Incorrect code — try again.", es: "Código incorrecto — inténtalo de nuevo." },
  "gate.unlock": { en: "Unlock", es: "Entrar" },

  // --- Shared nav ---
  "nav.pulse": { en: "← Pulse", es: "← Pulse" },
  "nav.radar": { en: "Lead Radar →", es: "Lead Radar →" },
  "nav.dashboard": { en: "Pipeline →", es: "Cartera →" },
  "nav.backToRadar": { en: "← Lead Radar", es: "← Lead Radar" },

  // --- Lead Radar ---
  "radar.subtitle": {
    en: "Properties for sale and legal notices (edicts, probate proceedings, judicial auctions) across the four municipalities of the Fourth Notarial District of Huayacocotla, Veracruz.",
    es: "Propiedades en venta y avisos legales (edictos, juicios sucesorios, remates) en los cuatro municipios de la Cuarta Demarcación Notarial de Huayacocotla, Veracruz.",
  },
  "radar.run": { en: "Run today's scan", es: "Buscar señales de hoy" },
  "radar.running": { en: "Scanning sources…", es: "Buscando señales…" },
  "radar.showHistory": { en: "View scan history", es: "Ver historial" },
  "radar.hideHistory": { en: "Hide scan history", es: "Ocultar historial" },
  "radar.previousRuns": { en: "Previous scans", es: "Ejecuciones anteriores" },
  "radar.signalsShort": { en: "signals", es: "señales" },
  "radar.viewingRun": { en: "Viewing the scan from", es: "Viendo ejecución del" },
  "radar.backToCurrent": { en: "Back to current results", es: "Volver a resultados actuales" },
  "radar.noChange": { en: "No change since the previous scan.", es: "Sin cambios desde la ejecución anterior." },
  "radar.digestTitle": {
    en: "Client outreach digest (WhatsApp — Spanish, as delivered)",
    es: "Borrador para WhatsApp",
  },
  "radar.copy": { en: "Copy message", es: "Copiar mensaje" },
  "radar.copied": { en: "Copied!", es: "¡Copiado!" },
  "radar.detected": { en: "Signals detected", es: "Señales detectadas" },
  "radar.none": { en: "No new signals found today.", es: "No se encontraron señales nuevas hoy." },
  "radar.mode": { en: "mode", es: "modo" },
  "radar.modeAgent": { en: "agentic", es: "agente" },
  "radar.modeFallback": { en: "fallback", es: "respaldo" },
  "radar.source": { en: "Source", es: "Fuente" },
  "radar.trackedNote": {
    en: "Every signal below is filed automatically in the pipeline.",
    es: "Cada señal se registra automáticamente en la cartera.",
  },

  // --- Dashboard ---
  "dash.title": { en: "Pipeline", es: "Cartera de asuntos" },
  "dash.subtitle": {
    en: "Every signal detected so far, with the status of each matter. Statuses are advanced by hand — nothing here moves on its own.",
    es: "Todas las señales detectadas hasta ahora, con el estado de cada asunto. El estado se cambia a mano — aquí nada avanza solo.",
  },
  "dash.total": { en: "Signals on file", es: "Señales registradas" },
  "dash.empty": {
    en: "No signals on file yet. Run a scan on Lead Radar and they will be filed here automatically.",
    es: "Aún no hay señales registradas. Ejecuta una búsqueda en Lead Radar y aparecerán aquí automáticamente.",
  },
  "dash.emptyFiltered": { en: "No signals match these filters.", es: "Ninguna señal coincide con estos filtros." },
  "dash.filterStatus": { en: "Status", es: "Estado" },
  "dash.filterCategory": { en: "Matter type", es: "Tipo de asunto" },
  "dash.filterMunicipio": { en: "Municipality", es: "Municipio" },
  "dash.all": { en: "All", es: "Todos" },
  "dash.firstSeen": { en: "First detected", es: "Detectada" },
  "dash.seenIn": { en: "seen in", es: "vista en" },
  "dash.scans": { en: "scans", es: "búsquedas" },
  "dash.execute": { en: "Start execution", es: "Iniciar ejecución" },
  "dash.reopenExecution": { en: "Open execution", es: "Abrir ejecución" },

  // --- Statuses ---
  "status.new": { en: "Detected", es: "Detectada" },
  "status.contacted": { en: "Outreach made", es: "Contactado" },
  "status.converted": { en: "Engaged — file opened", es: "Convertida — expediente abierto" },
  "status.discarded": { en: "Dismissed", es: "Descartada" },

  // --- Execution panel ---
  "exec.title": { en: "Agentic execution", es: "Ejecución agéntica" },
  "exec.close": { en: "Close", es: "Cerrar" },
  "exec.running": {
    en: "Researching this specific matter on You.com — this takes 20–40 seconds…",
    es: "Investigando este asunto en You.com — tarda entre 20 y 40 segundos…",
  },
  "exec.start": { en: "Run the conversion agent", es: "Ejecutar el agente de conversión" },
  "exec.rerun": { en: "Run again", es: "Ejecutar de nuevo" },
  "exec.playbook": { en: "Notarial procedure", es: "Procedimiento notarial" },
  "exec.playbookNote": {
    en: "Fixed checklist for this matter type. Written once, identical on every run — no model decides these steps.",
    es: "Lista fija para este tipo de asunto. Escrita una vez, idéntica en cada ejecución — ningún modelo decide estos pasos.",
  },
  "exec.research": { en: "Case research", es: "Investigación del caso" },
  "exec.liveBadge": { en: "Live", es: "En vivo" },
  "exec.researchNote": {
    en: "Live findings from You.com Research about this specific signal.",
    es: "Hallazgos en vivo de You.com Research sobre esta señal específica.",
  },
  "exec.summary": { en: "Summary", es: "Resumen" },
  "exec.parties": { en: "Parties identified", es: "Partes identificadas" },
  "exec.nextSteps": { en: "Immediate next steps", es: "Siguientes pasos inmediatos" },
  "exec.risks": { en: "Risks and deadlines", es: "Riesgos y plazos" },
  "exec.sources": { en: "Sources", es: "Fuentes" },
  "exec.degraded": {
    en: "Research is unavailable right now, so this run is the fixed procedure only. The checklist below is still complete and actionable.",
    es: "La investigación no está disponible ahora, así que esta ejecución trae solo el procedimiento fijo. La lista de abajo sigue completa y accionable.",
  },
  "exec.setStatus": { en: "Update status", es: "Actualizar estado" },
  "exec.ranAt": { en: "Last run", es: "Última ejecución" },

  // --- Language toggle ---
  "lang.label": { en: "Language", es: "Idioma" },
} satisfies Record<string, StringEntry>;

export type StringKey = keyof typeof STRINGS;

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always start on "en" so the server-rendered HTML and the first client render agree; the stored
  // preference is applied in the effect below, after hydration.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "es" || stored === "en") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next: Lang) => {
    localStorage.setItem(LANG_KEY, next);
    setLangState(next);
  };

  const t = (key: StringKey) => STRINGS[key][lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  );
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside <LanguageProvider>");
  return ctx;
}

/** EN | ES pill for page headers. */
export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div
      className="inline-flex overflow-hidden rounded-full border border-zinc-300 text-xs dark:border-zinc-700"
      role="group"
      aria-label={STRINGS["lang.label"][lang]}
    >
      {(["en", "es"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2.5 py-1 font-medium transition-colors ${
            lang === l
              ? "bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
