import {
  strictObjectSchema,
  youContents,
  youResearchStructured,
  youSearch,
} from "@/lib/you";
import {
  HIGH_PRECISION_TOPONYMS,
  JURISDICTION_ALIASES,
  matchJurisdiction,
  MUNICIPIOS_OR,
  SOURCE_DOMAINS,
  type GeoMatch,
} from "@/lib/jurisdiction";

// Vercel AI Gateway's free tier is exhausted (amazon/nova-micro returns GatewayRateLimitError on
// every request). Every source below runs on You.com only (Search, Research, Contents) or on
// deterministic code — this file makes no calls to any chat model at all.

// Raw candidate before triage assigns score/reason — kept separate from Lead (the fixed contract
// with the UI) so discovery functions can't accidentally skip triage by fabricating a score.
export type RawLead = {
  type: "property" | "legal-notice";
  title: string;
  detail: string;
  location?: string;
  municipio?: string;
  date?: string;
  sourceUrl: string;
  sourceName: string;
};

export type Lead = RawLead & {
  score: number; // 0-100 notary relevance
  reason: string; // one short Spanish line: why this matters to a notary
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Property leads — fully deterministic. A You.com search result already IS the lead (title +
// snippet + URL is all a notary needs to decide whether to look); no page-scrape, no extraction
// model call.
// ---------------------------------------------------------------------------

export async function findPropertyLeads(): Promise<RawLead[]> {
  // Widened from Huayacocotla-only to the whole jurisdiction — the notary's demarcación covers
  // four municipios, not one. No `freshness` param: measured against these four site: queries and
  // it degrades results (returns wrong-state listings).
  const queries = [
    `site:lamudi.com.mx (${MUNICIPIOS_OR}) Veracruz casa venta`,
    `site:propiedades.com (${MUNICIPIOS_OR}) Veracruz`,
    `site:trovit.com.mx (${MUNICIPIOS_OR}) venta terreno casa`,
    `MercadoLibre Inmuebles (${MUNICIPIOS_OR}) Veracruz venta`,
  ];

  const results = await Promise.all(
    queries.map((query) => youSearch({ query, count: 5, country: "MX", language: "ES" })),
  );

  const leads: RawLead[] = [];
  const seen = new Set<string>();
  for (const result of results) {
    for (const w of result.results?.web ?? []) {
      if (!w.url || seen.has(w.url)) continue;
      seen.add(w.url);
      const detail = w.description || w.snippets?.join(" ") || "Anuncio de propiedad sin descripción.";
      leads.push({
        type: "property",
        title: w.title || w.url,
        detail: detail.length > 300 ? `${detail.slice(0, 300)}…` : detail,
        sourceUrl: w.url,
        sourceName: hostnameOf(w.url),
      });
    }
  }
  console.log(`[property:search] ${leads.length} candidatos únicos de ${queries.length} búsquedas`);
  return leads;
}

// ---------------------------------------------------------------------------
// Legal notices — You.com Research, structured. Two independent Research calls (live notices,
// gazette PDFs) plus one deterministic court-site scrape. Each source logs its own count so an
// empty result is distinguishable from a silent failure.
// ---------------------------------------------------------------------------

type NoticeItem = {
  person_name: string;
  notice_type: string;
  court: string;
  municipio: string;
  date: string;
  summary: string;
  source_url: string;
};

type NoticesResearchResult = { notices: NoticeItem[] };

const NOTICE_ITEM_SCHEMA = strictObjectSchema({
  person_name: { type: "string" },
  notice_type: { type: "string" },
  court: { type: "string" },
  municipio: { type: "string" },
  date: { type: "string" },
  summary: { type: "string" },
  source_url: { type: "string" },
});

const NOTICES_RESEARCH_SCHEMA = strictObjectSchema({
  notices: { type: "array", items: NOTICE_ITEM_SCHEMA },
});

function noticeToLead(n: NoticeItem): RawLead {
  return {
    type: "legal-notice",
    title: `${n.notice_type || "Aviso legal"} — ${n.person_name || "sin nombre"}`,
    detail: n.summary || "Sin detalle adicional.",
    location: n.municipio || undefined,
    municipio: n.municipio || undefined,
    date: n.date || undefined,
    sourceUrl: n.source_url,
    sourceName: hostnameOf(n.source_url),
  };
}

const NOTICE_PROMPT_BASE =
  "en la Cuarta Demarcación Notarial de Huayacocotla, Veracruz, que comprende los municipios de " +
  "Huayacocotla, Ilamatlán, Texcatepec y Zacualpan (territorio también conocido como Cuarto " +
  "Distrito Judicial y Cuarta Zona Registral). Busca específicamente: juicios sucesorios " +
  "intestamentarios y testamentarios, declaraciones de ausencia o presunción de muerte, remates " +
  "judiciales, y avisos notariales de sucesión. Para cada aviso real que encuentres, reporta el " +
  "nombre de la persona involucrada, el tipo de aviso, el juzgado o notaría, el municipio, la fecha " +
  "y un resumen breve, junto con la URL exacta de la fuente. Si no encuentras avisos reales y " +
  "verificables, devuelve un arreglo vacío — no inventes avisos.";

// Source 1: live/general search-backed Research over the whole web.
export async function findLegalNoticeResearch(): Promise<RawLead[]> {
  const { data } = await youResearchStructured<NoticesResearchResult>({
    input: `Busca avisos legales publicados recientemente (edictos) ${NOTICE_PROMPT_BASE}`,
    researchEffort: "standard",
    sourceControl: { country: "MX" },
    outputSchema: NOTICES_RESEARCH_SCHEMA,
  });

  const leads = (data.notices ?? []).filter((n) => n.source_url).map(noticeToLead);
  console.log(`[legal-notice:research] ${leads.length} avisos encontrados`);
  return leads;
}

// Source 2: Research targeted at Gaceta Oficial del Estado de Veracruz edicts — Research can
// reach and read those PDFs itself, so no separate Contents fetch + extraction model call.
export async function findGazetteNotices(): Promise<RawLead[]> {
  const { data } = await youResearchStructured<NoticesResearchResult>({
    input:
      "Busca en ediciones de la Gaceta Oficial del Estado de Veracruz (sección de edictos y avisos " +
      `judiciales) ${NOTICE_PROMPT_BASE}`,
    researchEffort: "standard",
    sourceControl: { boostDomains: SOURCE_DOMAINS, country: "MX" },
    outputSchema: NOTICES_RESEARCH_SCHEMA,
  });

  const leads = (data.notices ?? []).filter((n) => n.source_url).map(noticeToLead);
  console.log(`[legal-notice:gazette] ${leads.length} avisos encontrados`);
  return leads;
}

// Source 3: deterministic edictos scrape — no model, zero hallucination risk.
const EDICTOS_URL = "https://www.pjeveracruz.gob.mx/edictos/";

// Verified by fetching the page directly: it does NOT crawl as a clean markdown pipe table with a
// header row. It crawls as one cell per line — fecha, expediente, distrito, juzgado, tipo, actor —
// with a lone "|" line as the separator between records, and no header at all survives the crawl.
// (The old parser looked for a "Distrito" header cell, found none, and silently skipped every run
// — that was the bug.) This parser groups lines into records using the separator, without assuming
// any header names.
function parseEdictosRecords(markdown: string): string[][] {
  const lines = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const records: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    const cell = line.replace(/^\|/, "").replace(/\|$/, "").trim();
    if (cell === "") {
      if (current.length > 0) records.push(current);
      current = [];
      continue;
    }
    current.push(cell);
  }
  if (current.length > 0) records.push(current);
  return records;
}

export async function findEdictosLeads(): Promise<RawLead[]> {
  let markdown: string | null | undefined;
  try {
    const [page] = await youContents([EDICTOS_URL], 20);
    markdown = page?.markdown;
  } catch (e) {
    console.log("[legal-notice:edictos] fetch failed:", e instanceof Error ? e.message : e);
    return [];
  }
  if (!markdown) {
    console.log("[legal-notice:edictos] fetch returned no content");
    return [];
  }

  const records = parseEdictosRecords(markdown);
  if (records.length === 0) {
    console.log(
      "[legal-notice:edictos] page fetched but 0 rows parsed — that means the parser broke " +
        "against the current page shape, not that the page is empty",
    );
    return [];
  }

  // Fields are positional (fecha, expediente, distrito, juzgado, tipo, actor) since the live page
  // has no header row to key off of — but matchJurisdiction scans the whole record, so a shifted
  // column still gets caught rather than silently missed.
  const leads: RawLead[] = [];
  for (const record of records) {
    const match = matchJurisdiction(...record);
    if (!match.inJurisdiction) continue;
    const [fecha, expediente, distrito, juzgado, tipo, actor] = record;
    leads.push({
      type: "legal-notice",
      title: actor ? `Edicto: ${actor}` : `Edicto judicial — ${distrito || "Veracruz"}`,
      detail:
        [juzgado, tipo, expediente].filter(Boolean).join(" · ") ||
        "Edicto judicial publicado en el Poder Judicial de Veracruz.",
      location: distrito,
      municipio: match.municipio,
      date: fecha,
      sourceUrl: EDICTOS_URL,
      sourceName: "Poder Judicial de Veracruz — Edictos",
    });
  }
  console.log(
    `[legal-notice:edictos] parsed ${records.length} filas, ${leads.length} coinciden con la ` +
      "jurisdicción (0 es lo esperado casi siempre: esta lista es estatal — verificado 322 filas, " +
      "todas Jurisdicción Voluntaria, cero de Huayacocotla)",
  );
  return leads;
}

// ---------------------------------------------------------------------------
// Ad-hoc jurisdiction follow-up — used by the orchestrator agent to chase a specific municipio
// that came back with no coverage from the discovery specialists above. Pure You.com search +
// string heuristics, no model call: triage stage 2 below re-derives the real score for every
// survivor anyway.
// ---------------------------------------------------------------------------

const PROPERTY_HINT_WORDS = ["venta", "casa", "terreno", "propiedad", "renta", "inmueble"];

export async function searchJurisdictionLeads(query: string): Promise<RawLead[]> {
  let web: Array<{ url?: string; title?: string; description?: string }>;
  try {
    const result = await youSearch({ query, count: 5, country: "MX", language: "ES" });
    web = result.results?.web ?? [];
  } catch (e) {
    console.log("[search-jurisdiction] search failed:", e instanceof Error ? e.message : e);
    return [];
  }

  return web
    .filter((w): w is { url: string; title?: string; description?: string } => !!w.url)
    .map((w) => {
      const haystack = `${w.title ?? ""} ${w.description ?? ""}`.toLowerCase();
      // Heuristic only — triageLeads re-derives the real type for every survivor.
      const isProperty = PROPERTY_HINT_WORDS.some((h) => haystack.includes(h));
      return {
        type: isProperty ? ("property" as const) : ("legal-notice" as const),
        title: w.title ?? w.url,
        detail: w.description ?? "Sin descripción disponible.",
        sourceUrl: w.url,
        sourceName: hostnameOf(w.url),
      };
    });
}

// ---------------------------------------------------------------------------
// Scoring — deterministic, explainable rules. Replaces the LLM triage pass entirely: every score
// traces to a named rule, which is strictly more useful to the notary than an opaque LLM number.
// ---------------------------------------------------------------------------

function parseFlexibleDate(dateStr: string): Date | null {
  const isoMs = Date.parse(dateStr);
  if (!Number.isNaN(isoMs)) return new Date(isoMs);
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // dd/mm/yyyy, as seen on pjeveracruz
  if (m) {
    const [, d, mo, y] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }
  return null;
}

const RECENT_WINDOW_DAYS = 365;

function isRecentDate(dateStr: string): boolean {
  const d = parseFlexibleDate(dateStr);
  if (!d) return false;
  const ageDays = (Date.now() - d.getTime()) / 86_400_000;
  return ageDays >= 0 && ageDays <= RECENT_WINDOW_DAYS;
}

/** Whole years between the notice's date and today; null when the date can't be parsed. */
function ageInYears(dateStr: string): number | null {
  const d = parseFlexibleDate(dateStr);
  if (!d) return null;
  const years = (Date.now() - d.getTime()) / (365.25 * 86_400_000);
  return years >= 0 ? years : null;
}

// A named person ("C. Nombre Apellido"), a case number, or a price/size figure beats a generic
// category or index page.
/**
 * Words that must appear before we are willing to CALL something an aviso legal. A gazette or court
 * page that mentions none of these is a publication, not a notice.
 *
 * Verified need: a run badged `wo43250.pdf` (the Ley Orgánica del Poder Judicial — the document we
 * originally used to confirm the district's composition) as "genera trabajo notarial directo
 * (sucesión, ausencia o remate)". Nothing in it supports that. Without this gate the type badge is
 * an unsupported claim, which is the exact mislabeling bug that made the earlier version untrusted.
 */
const NOTICE_EVIDENCE =
  /\b(sucesori|sucesion|intestamentari|testamentari|herencia|heredero|albacea|edicto|remate|almoneda|ausencia|presuncion de muerte|jurisdiccion voluntaria|denuncia de juicio)/;

function hasNoticeEvidence(candidate: RawLead): boolean {
  const text = `${candidate.title} ${candidate.detail}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  return NOTICE_EVIDENCE.test(text);
}

/**
 * Does this point at ONE thing, or at a portal's search page?
 *
 * For property the old test was `/\d/.test(text)` — any digit at all — so "30 terrenos en venta en
 * Huayacocotla" scored the specificity bonus and told the notary it "señala una propiedad concreta".
 * It does not. Individual listings carry a numeric id in the URL (propiedades.com `…-7766730`,
 * MercadoLibre item ids); taxonomy paths like `/huayacocotla/casas` or `/casa/for-sale/` do not.
 */
function looksSpecific(candidate: RawLead): boolean {
  const text = `${candidate.title} ${candidate.detail}`;
  if (candidate.type === "legal-notice") {
    return /\bC\.\s+[A-ZÁÉÍÓÚÑ]/.test(text) || /\b\d+\/\d{4}\b/.test(text);
  }
  return /\d{5,}/.test(candidate.sourceUrl);
}

function isOfficialDomain(url: string): boolean {
  const host = hostnameOf(url);
  return SOURCE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

function scoreLead(candidate: RawLead, match: GeoMatch): { score: number; reason: string } {
  const reasons: string[] = [];
  let score: number;

  // Signal type: a legal notice is a more direct notary lead than a property listing.
  if (candidate.type === "legal-notice") {
    score = 55;
    reasons.push("aviso legal: genera trabajo notarial directo (sucesión, ausencia o remate)");
  } else {
    score = 35;
    reasons.push("venta de propiedad: puede requerir escrituración");
  }

  // Strength of the jurisdiction match: a rare toponym or an official alias is stronger evidence
  // than a bare municipio name.
  const rareToponym = match.matched.find((m) => (HIGH_PRECISION_TOPONYMS as string[]).includes(m));
  const alias = match.matched.find((m) => (JURISDICTION_ALIASES as string[]).includes(m));
  if (rareToponym) {
    score += 20;
    reasons.push(`coincide con el topónimo local "${rareToponym}" (evidencia fuerte de jurisdicción)`);
  } else if (alias) {
    score += 15;
    reasons.push(`menciona "${alias}", nombre oficial de la demarcación`);
  } else if (match.municipio) {
    score += 8;
    reasons.push(`menciona el municipio de ${match.municipio}`);
  }

  // Source authority: an official domain outranks a listing aggregator.
  if (isOfficialDomain(candidate.sourceUrl)) {
    score += 15;
    reasons.push("fuente oficial (juzgado, gaceta o colegio de notarios)");
  }

  // Presence and recency of a date.
  if (candidate.date) {
    const years = ageInYears(candidate.date);
    if (isRecentDate(candidate.date)) {
      score += 12;
      reasons.push("fecha reciente");
    } else if (years !== null && years >= 3) {
      // Age is a first-class negative signal, not a missing bonus. Verified case: a real, exactly
      // extracted succession edict from the Juzgado Mixto de Huayacocotla — published in the 2013
      // Gaceta Oficial. Genuine, correctly located, and useless as business: that estate closed
      // over a decade ago. Ranking it first would misrepresent what the notary is looking at.
      score -= 35;
      const year = parseFlexibleDate(candidate.date)?.getFullYear();
      reasons.push(
        `aviso de ${year ?? "hace años"}: antecedente histórico, no una oportunidad nueva`,
      );
    } else {
      score += 4;
      reasons.push("incluye fecha");
    }
  }

  // Specificity: a named person or a single property beats a portal search page. Say which it is
  // either way — "here are 30 listings to review" is still useful, just not the same thing, and
  // pretending otherwise is what made the old scores untrustworthy.
  if (looksSpecific(candidate)) {
    score += 10;
    reasons.push("señala una persona o propiedad concreta");
  } else if (candidate.type === "property") {
    reasons.push("página de resultados del portal: varios anuncios por revisar, no uno solo");
  }

  score = Math.max(0, Math.min(100, score));
  return { score, reason: `${reasons.join("; ")}.` };
}

function dedupeLeads(leads: Lead[]): Lead[] {
  const seen = new Set<string>();
  return leads.filter((l) => {
    const key = `${l.type}:${l.title.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Triage — stage 1 is the deterministic geo-gate (unchanged); stage 2 is the deterministic scorer
// above, run over every survivor. No "below 55 discarded" cutoff: with deterministic scoring
// there's no hallucinated-relevance risk to filter out, and a hard cutoff on a thin day is how the
// demo ends up empty. Everything that passes the geo-gate is returned, ranked.
// ---------------------------------------------------------------------------

export function triageLeads(candidates: RawLead[]): Lead[] {
  const survivors: Array<{ candidate: RawLead; match: GeoMatch }> = [];
  let droppedGeo = 0;
  let droppedUnsupported = 0;
  for (const c of candidates) {
    const match = matchJurisdiction(c.title, c.detail, c.location, c.municipio);
    if (!match.inJurisdiction) {
      droppedGeo++;
      continue;
    }
    // Stage 1b: a candidate may only keep the "aviso legal" badge if its own text shows a notice.
    // Research sometimes returns the gazette or court page that CONTAINS notices rather than a
    // notice itself; that is a place to look, not a lead, and badging it as one is a false claim.
    if (c.type === "legal-notice" && !hasNoticeEvidence(c)) {
      droppedUnsupported++;
      continue;
    }
    survivors.push({ candidate: { ...c, municipio: c.municipio ?? match.municipio }, match });
  }
  console.log(
    `[triage] kept ${survivors.length} of ${candidates.length} — dropped ${droppedGeo} out of jurisdiction, ` +
      `${droppedUnsupported} badged as avisos legales without notice evidence`,
  );

  const scored = survivors.map(({ candidate, match }) => {
    const { score, reason } = scoreLead(candidate, match);
    return { ...candidate, score, reason };
  });

  return dedupeLeads(scored).sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Digest — deterministic template, no model call.
// ---------------------------------------------------------------------------

export function composeDigest(leads: Lead[]): string {
  if (leads.length === 0) {
    return (
      "Hola Martín 👋\n\nHoy no encontré señales nuevas de ventas de propiedades ni de avisos " +
      "legales (edictos, sucesiones, remates) en la Cuarta Demarcación Notarial de Huayacocotla. " +
      "Sigo monitoreando."
    );
  }

  const lines = [
    "Hola Martín 👋",
    "",
    `Encontré ${leads.length} ${leads.length === 1 ? "señal" : "señales"} hoy en la Cuarta ` +
      "Demarcación Notarial:",
    "",
    ...leads.map((l) => {
      const label = l.type === "property" ? "🏠 Propiedad" : "⚖️ Aviso legal";
      const where = l.municipio ? ` (${l.municipio})` : "";
      return `${label}${where}: ${l.title}\n${l.sourceUrl}`;
    }),
    "",
    "Revisa el detalle completo en Lead Radar.",
  ];
  return lines.join("\n");
}
