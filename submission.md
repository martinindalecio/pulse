# Pulse / Lead Radar — submission materials

## Project description (~245 words)

If the submission form caps this at 200, drop the "Pulse chat" paragraph — Lead Radar and the
pipeline are what the judging criteria reward, and chat is the one surface that explains itself.

Pulse is a three-surface app built entirely on You.com — no chat model anywhere in the runtime.

**Pulse chat** turns a question into one You.com Research call and renders the synthesized,
citation-backed answer with clickable sources.

**Lead Radar** is the harder problem: a lead-scout for a real notario público in Huayacocotla,
Veracruz, four small rural municipios where nobody prospects for work today. It's a goal-directed
orchestrator written in code — Plan (four discovery specialists run concurrently: property
listings via Search, two legal-notice sources via Research with a strict output schema, and a
deterministic Contents scrape of the state court's edictos page) → Observe (per-municipio
coverage) → Adapt (bounded follow-ups where coverage is missing) → Stop.

Triage is deterministic and explainable: a geo-gate rejects out-of-jurisdiction lookalikes, a
notice-evidence rule stops index pages being badged as notices, and a transparent score tells the
notary why each lead ranked where it did — including penalizing a real but 13-year-old succession
edict instead of ranking it first. An empty result is a correct result.

**The pipeline** keeps every signal on a board, and its agentic execution mode turns one into a
worked matter: a fixed notarial checklist for that matter type plus a You.com Research call scoped
to the single case, which on a real absence declaration returned the docket number, the court, and
the statutory appearance window. The UI toggles EN|ES; the digest stays Spanish, because the
notary's clients are.

Live: https://pulse-app-navy-ten.vercel.app

## Demo video outline (1–3 min)

**0:00–0:15 — The problem.** One sentence on the notario, the four municipios, and the fact that
today all client work arrives unprompted. State the goal: surface public signals — property sales,
legal notices — that predict notary work before the client walks in.

**0:15–0:35 — Pulse chat, quickly.** Open `/`, ask one real question, show the answer landing with
clickable You.com sources. ~15s is enough; this is the simpler surface.

**0:35–1:30 — Lead Radar, the main event.**
- Open `/lead-radar`, enter the passcode, click "Run today's scan."
- While it runs (~25s), narrate the architecture out loud: four specialists running concurrently,
  Research with a structured schema for legal notices, a deterministic scrape for court edictos,
  and — this is the part worth saying on camera — no LLM makes the relevance call. A geo-gate and a
  rule-based scorer do, and every score comes with a sentence saying exactly why.
- When results land, point at one or two leads and read their reason line aloud — this is the
  moment that shows the scoring is inspectable, not a black box.
- If a legal notice with an old date shows up, point out the historical-record penalty — concrete
  proof the system knows the difference between a real find and a live opportunity.
- **Flip EN → ES once, here.** One sentence: the interface is bilingual so it demos in English and
  ships in Spanish; the WhatsApp digest below stays Spanish either way, because the client is. Then
  flip back to English and leave it there for the rest of the recording.

**1:30–2:05 — Pipeline and agentic execution.**
- Click through to `/dashboard`. The board is already seeded from the day's scans — say that it
  fills itself from every run and that nothing on it moves without the notary clicking.
- Open the execution drawer on the *declaración de ausencia* signal (already run, so it opens
  instantly — no dead air). Point at the two halves: the fixed notarial checklist on top, written
  once and identical every run, and below it the live You.com Research on that one case, which
  found the expediente number, the court, and the three-month appearance window.
- Advance that signal's status to "Outreach made" so the counters move on camera.
- If time allows, hit "Run again" on a second signal to show the call happening live rather than
  replayed — but only if the pacing has room; a stored result is the safe take.

**2:05–2:25 — Honesty beat.** Show or mention the empty-state / low-count case: these are small
rural municipios, and some days there's genuinely little to report — the app says so rather than
manufacturing volume. This is a deliberate design choice, worth stating plainly.

**2:25–2:40 — Close.** One line on what's next (WhatsApp auto-send is deliberately not wired — the
copy button covers the demo) and the repo/live URL on screen.

### Recording notes
- The passcode is `PULSE_ACCESS_CODE` in `.env.local` — do not read it aloud on camera; type it or
  cut away.
- Run against the live URL (https://pulse-app-navy-ten.vercel.app), not localhost, so the recording
  doubles as proof the deployment works.
- A run takes ~25–30s — plan the narration to fill that window rather than sitting in silence.
- **Seed the pipeline on the recording browser before rolling.** The board and the language setting
  live in that browser's localStorage, so run at least two scans and one execution on the exact
  profile you record with, or the dashboard beat opens empty.
- A stored execution shows its research in whatever language it was run in. Run the one you plan to
  open while the UI is in English, so the drawer reads English on camera.
