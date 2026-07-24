# Pulse / Lead Radar — submission materials

## Project description (~200 words)

Pulse is a two-surface app built entirely on You.com — no chat model anywhere in the runtime.

**Pulse chat** turns a question into one You.com Research call and renders the synthesized,
citation-backed answer with clickable sources.

**Lead Radar** is the harder problem: a lead-scout for a real notario público in Huayacocotla,
Veracruz, covering four small rural municipios where almost no one is actively prospecting for
work today. It's a goal-directed orchestrator written in code — Plan (four discovery specialists
run concurrently: property listings via Search, two legal-notice sources via Research with a
strict output schema, and a deterministic Contents scrape of the state court's edictos page) →
Observe (per-municipio coverage) → Adapt (bounded follow-up searches for any municipio still
uncovered) → Stop.

Triage is fully deterministic and explainable: a geo-gate rejects out-of-jurisdiction lookalikes,
a notice-evidence rule stops index pages from being badged as notices, and a transparent score
tells the notary exactly why each lead ranked where it did — including penalizing a real but
13-year-old succession edict instead of ranking it first. An empty result is treated as a correct
result, not a failure to paper over.

Live: https://pulse-app-navy-ten.vercel.app

## Demo video outline (1–3 min)

**0:00–0:20 — The problem.** One sentence on the notario, the four municipios, and the fact that
today all client work arrives unprompted. State the goal: surface public signals — property sales,
legal notices — that predict notary work before the client walks in.

**0:20–0:45 — Pulse chat, quickly.** Open `/`, ask one real question, show the answer landing with
clickable You.com sources. ~15–20s is enough; this is the simpler surface.

**0:45–1:45 — Lead Radar, the main event.**
- Open `/lead-radar`, enter the passcode, click "Buscar señales de hoy."
- While it runs (~25s), narrate the architecture out loud: four specialists running concurrently,
  Research with a structured schema for legal notices, a deterministic scrape for court edictos,
  and — this is the part worth saying on camera — no LLM makes the relevance call. A geo-gate and a
  rule-based scorer do, and every score comes with a Spanish sentence saying exactly why.
- When results land, point at one or two leads and read their `reason` string aloud — this is the
  moment that shows the scoring is inspectable, not a black box.
- If a legal notice with an old date shows up, point out the "antecedente histórico" penalty —
  concrete proof the system knows the difference between a real find and a live opportunity.

**1:45–2:15 — Honesty beat.** Show or mention the empty-state / low-count case: these are small
rural municipios, and some days there's genuinely little to report — the app says so rather than
manufacturing volume. This is a deliberate design choice, worth stating plainly.

**2:15–2:30 — Close.** One line on what's next (WhatsApp auto-send is deliberately not wired — the
copy button covers the demo) and the repo/live URL on screen.

### Recording notes
- The passcode is `PULSE_ACCESS_CODE` in `.env.local` — do not read it aloud on camera; type it or
  cut away.
- Run against the live URL (https://pulse-app-navy-ten.vercel.app), not localhost, so the recording
  doubles as proof the deployment works.
- A run takes ~25–30s — plan the narration to fill that window rather than sitting in silence.
