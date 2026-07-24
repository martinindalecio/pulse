# Pulse — Real-Time Intelligence + Agentic Lead Radar

Built for the **You.com Agentic AI Hackathon (SF Edition)**, Agent Systems track.

**Live:** https://pulse-app-navy-ten.vercel.app — both surfaces are behind a passcode gate
(see [Getting started](#getting-started)) so anonymous traffic can't burn API credits.

Pulse is a small platform with two surfaces, both running entirely on You.com — there is no
chat model anywhere in this app:

1. **Pulse chat** (`/`) — ask a topic, company, or ticker; a single You.com **Research** call
   returns a synthesized, citation-backed briefing, rendered with its sources as clickable
   links.
2. **Lead Radar** (`/lead-radar`) — a lead-scout for a real Mexican notary public (*notario*),
   built for a real jurisdiction, drafting a real WhatsApp digest from real public sources.

## Lead Radar — the use case

Lead Radar is built for a working *notaría* — a family member of mine is the *Notario Público* —
whose jurisdiction is the
**Cuarta Demarcación Notarial de Huayacocotla, Veracruz** — four municipios: **Huayacocotla**
(cabecera), **Ilamatlán**, **Texcatepec**, and **Zacualpan**. That territory is verifiably the
same area as the **Cuarto Distrito Judicial** and the **Cuarta Zona Registral** — three official
names for one place, all usable as search handles. See `lib/jurisdiction.ts` for the reference
data and sourcing. The localidad lists behind this are not complete (Zacualpan in particular has
none listed) — the geo-gate is deliberately built so a missing localidad causes a missed lead,
never a false admit.

Today, essentially every client arrives unprompted or by referral — there is no active
prospecting. Lead Radar looks for public signals that predict notary work before the client
walks in:

- **Property sales** near the four municipios — every sale needs an *escritura* (deed).
- **Legal notices** — *edictos* for *juicios sucesorios* (probate), *declaración de ausencia /
  presunción de muerte*, *remates judiciales*, and notarial heirship notices — sourced from the
  Poder Judicial de Veracruz and the Gaceta Oficial. These are direct, high-intent notary leads.
  Discovery here runs on You.com Research, which is non-deterministic by nature of the source
  material: the same query can come back with several real notices on one run and none on
  another. That's a property of what's actually published online for these small rural
  municipios, not a bug in the pipeline.

An earlier version of this feature looked for obituaries as a signal for inheritance work. That
was dropped after live API probes showed these rural municipios simply don't publish obituaries
online — searches only surfaced Spain-based esquela sites. Legal notices replaced it as a signal
that's both real and actually present in the source material.

The output is a Spanish-language WhatsApp-ready digest (copy button, no auto-send) plus the
underlying list of scored leads with their sources.

**Honest limitation:** lead volume is bounded by what's actually published, not by the
pipeline. These are small rural municipios, and on many days there is genuinely nothing new to
report. The app says so (an explicit empty state) rather than padding results to look busier
than the data supports.

## Agent-system architecture

Lead Radar is a goal-directed, adaptive orchestrator written in code — **there is no chat model
in this loop at all.** An earlier version used a model-driven `ToolLoopAgent`; that was removed
after the Vercel AI Gateway's free tier ran out mid-hackathon (every call to `amazon/nova-micro`
started throwing `GatewayRateLimitError`). Rather than patch around a rate limit, the orchestrator
was rewritten so You.com itself — not a wrapping chat model — does the intelligence work, and the
control flow (plan/observe/adapt/stop) is explicit code instead of an LLM's implicit reasoning:

- **Plan** (`agent/lead-radar-agent.ts`) — run four discovery specialists concurrently via
  `Promise.allSettled`, so one specialist failing never blocks the others:
  1. **Property listings** — You.com **Search** across four `site:`-scoped queries
     (lamudi.com.mx, propiedades.com, trovit.com.mx, MercadoLibre) — a search result *is* the
     lead directly; there's no extraction step.
  2. **Legal notices (general web)** — You.com **Research**, called with a strict
     `output_schema` (JSON Schema, `additionalProperties: false`) so the notice fields come back
     structured rather than as prose to parse.
  3. **Legal notices (Gaceta Oficial)** — a second Research call using `boostDomains` toward the
     official gazette and court domains, same structured schema.
  4. **Edictos scrape** — a deterministic fetch-and-parse of
     `pjeveracruz.gob.mx/edictos/` via You.com **Contents**; no model touches this path.
- **Observe** — after the four specialists return, compute per-municipio coverage using the
  deterministic geo-gate (below): which of the four municipios has at least one candidate that
  actually names it.
- **Adapt** — for any municipio still uncovered, issue a targeted You.com Search follow-up
  query, bounded to at most 2 rounds and 4 follow-up queries total, so a thin data day can't
  spin the loop.
- **Stop** — once all four municipios are covered, or the round/query budget is exhausted.
- **Deterministic fallback** — if the orchestrator itself throws, a fixed single-pass path
  (property search + general legal-notice research) still runs so the demo never lands on a
  hard error. The API response's `mode` field (`"agent"` vs `"fallback"`) reports which path
  ran, and the Lead Radar UI shows it.

Triage after discovery is **fully deterministic and explainable** — no LLM scoring pass:
- A **geo-gate** (`lib/jurisdiction.ts`) string-matches candidate text against the municipio
  names, rare local toponyms, and the jurisdiction's official aliases. It also rejects a
  candidate that names a state other than Veracruz alongside a toponym shared with that state
  (e.g. a Hidalgo-state Texcatepec listing) — verified against a real false positive from a
  live run.
- A candidate may only keep the "aviso legal" (legal notice) badge if its own text contains
  actual notice-language evidence (words like *sucesorio*, *edicto*, *remate*, *ausencia*, …).
  Without this, Research sometimes hands back the gazette or court *index page that lists*
  notices, badged as if it were a notice itself — a real bug this rule specifically closes.
- A transparent 0–100 score, composed from named rules (signal type, jurisdiction-match
  strength, source authority, date recency/staleness, specificity), with a Spanish `reason`
  string that states exactly which rules fired for that score.

## You.com APIs used

- **Search** — the property-listing specialist's four `site:`-scoped queries, and the
  orchestrator's targeted follow-up queries for uncovered municipios.
- **Research** — two of the four legal-notice discovery calls, both with a strict
  `output_schema` for structured, cited extraction, plus one of the two using `boostDomains`
  toward official sources. Pulse chat also uses Research directly for its briefings (below).
- **Contents** — the deterministic edictos scrape, and (verified separately) natively parsing
  PDFs for the Gaceta Oficial de Veracruz, whose actual gazette issues are PDF files.

All three are called directly via `fetch` (see `lib/you.ts`) rather than through the official
`@youdotcom-oss/sdk` — the SDK's generated response-parsing schemas reject real, valid 200
responses from the live API on optional fields, confirmed by live-testing both endpoints. Its
request-building and auth logic (`X-API-Key` header, not `Authorization: Bearer`) were still used
as the source of truth for how to call the API correctly.

## Pulse chat — how it works

1. You ask a question.
2. The server (`agent/pulse-agent.ts`) builds one prompt from the question plus a short tail of
   prior conversation, and makes a single You.com **Research** call
   (`research_effort: "standard"`).
3. The synthesized answer and its `sources[]` come back as plain JSON — not streamed, since
   Research returns a complete answer in roughly 10–30 seconds rather than incrementally — and
   render with the sources as clickable citations.

## Verified, on the record

- You.com **Contents parses PDFs** natively — verified live against Gaceta Oficial gazette
  issues.
- A live run extracted a **real succession notice** — "Juicio sucesorio intestamentario, María
  Rodríguez Hernández, expediente civil 74/2011, Juzgado Mixto de Primera Instancia de
  Huayacocotla, 19 Feb 2013" — from a 387 KB Gaceta PDF, and every field was confirmed correct
  against the source document. Its 2013 date is exactly why the scorer penalizes stale notices
  and labels them "antecedente histórico, no una oportunidad nueva" — a real find, correctly
  flagged as not a live opportunity.
- `npm run gate-check` runs 13 offline acceptance checks (geo-gate accept/reject
  cases, plus the deterministic triage rules) with no API key and no model call — the way to
  verify the deterministic stages independent of live API behavior.
- A recent live run returned 12–13 leads in `mode: "agent"`, in roughly 25–30 seconds.

No invented metrics, benchmark numbers, or user counts appear anywhere in this project —
everything above is either directly observed in a run or a documented code behavior.

## Stack

- Next.js 16 (App Router) + React 19
- You.com API — Search, Contents, and Research, called directly via `fetch` (see
  [`lib/you.ts`](lib/you.ts); the official SDK's response validation rejects valid live
  responses)
- No chat/completion model anywhere in the runtime path — the Vercel AI Gateway and the
  model-driven agent loop it powered were removed after the gateway's free tier was exhausted;
  You.com's own Search/Research/Contents now do the intelligence work directly.

## Getting started

```bash
npm install
```

Create `.env.local`:

```bash
YDC_API_KEY=your-you-com-api-key
PULSE_ACCESS_CODE=any-passcode-you-choose
```

`PULSE_ACCESS_CODE` gates both `/api/chat` and `/api/lead-radar` behind a passcode (checked
server-side, entered once client-side) so a public deployment can't be hit by strangers/bots
burning your API credits. **If deploying, set this env var on the host too** — if it's unset
there, the gate is skipped and the endpoint is open.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for Pulse chat, or
[http://localhost:3000/lead-radar](http://localhost:3000/lead-radar) for Lead Radar.

To verify the deterministic parts of Lead Radar without any API key:

```bash
npm run gate-check
```

## Project structure

- `lib/you.ts` — direct-fetch wrappers for You.com Search, Contents, and Research
- `lib/jurisdiction.ts` — the notary's jurisdiction reference data and the deterministic geo-gate
- `agent/pulse-agent.ts` — builds the Research prompt and normalizes the response for Pulse chat
- `agent/lead-radar-agent.ts` — the Lead Radar plan/observe/adapt/stop orchestrator
- `agent/leads.ts` — the four discovery specialists, deterministic triage/scoring, and digest
  composition
- `app/api/chat/route.ts` — Pulse chat route handler (plain JSON, not streaming)
- `app/api/lead-radar/route.ts` — Lead Radar route handler
- `app/page.tsx` — Pulse chat UI
- `app/lead-radar/page.tsx` — Lead Radar UI
- `scripts/gate-check.mts` — offline acceptance checks for the geo-gate and triage rules

---

## Submission checklist

- [x] Working end-to-end app (real query → You.com data → cited response)
- [x] Public GitHub repo
- [x] README
- [x] Access-code gate on `/api/chat` and `/api/lead-radar` (prevents anonymous token/credit
      burn if deployed publicly)
- [x] No chat-model dependency to break under rate limits — You.com is the only intelligence
      layer
- [x] Deployed to production, with `YDC_API_KEY` and `PULSE_ACCESS_CODE` set on the host
- [x] Live run verified on the deployed URL: `mode: "agent"`, 13 leads, 24s
- [ ] Demo video (1–3 min)
- [ ] ~200-word project description
