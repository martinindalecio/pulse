# Handoff — You.com Agentic AI Hackathon (SF Edition)

## 0. Portability Note (read this first if you're a different tool/session)

This file is the single source of truth for the project, kept deliberately outside
gstack's private `~/.gstack/` storage and outside any Claude-specific memory —
if the session picking this up is Cursor, a fresh Claude Code session, or anything
else, **this file plus git history is everything you need.** No commits have been
made for today's (2026-07-24) work yet — as of this edit, all of §7-8 below is
uncommitted working-tree state only. If you're resuming cold: read §7 and §8 in
full before doing anything else; §8's "Open Decision" is the actual next step.

## 1. Track — Deferred by Design

No track is locked in yet. Rather than build a single-track product and hope it matches
whatever gets picked at the event, this repo is a **track-agnostic harness**: a working
Next.js + Vercel AI SDK app with a live `ToolLoopAgent`, real You.com Search + Research tool
calls, streaming UI, an access gate, and a linked Vercel deployment — all already tested
end-to-end. The only genuinely track-specific part is the agent's system prompt and tool set,
isolated in one file ([`agent/pulse-agent.ts`](agent/pulse-agent.ts)) and cheap to swap on the
day. See §6 for how to retarget it per track.

**Correction (2026-07-24, afternoon — see §9):** the `ToolLoopAgent` and streaming UI described
above were removed later the same day when the Vercel AI Gateway's free tier ran out. There is
no chat model or streaming response in this app anymore — see §9 for why and what replaced it.

The current default config — **"Pulse"**: user gives a topic/company/ticker, agent streams
back a synthesized, cited briefing — targets **Real-Time Intelligence** purely because it's
the smallest surface that exercises every part of the harness (both You.com tools, streaming,
citations). Not a commitment to that track.

**Confirmed** against the official night-before brief ("The Universal Scaffold," AWS Builder
Loft SF, July 24 2026): the three tracks are exactly **Real-Time Intelligence, Deep Research,
Multi-Agent Systems** — no others. The brief's own workflow defers the specific idea/track
choice to event morning (its "Prompt 3 — The Idea Pivot," to be run with Gemini at ~11:10 AM
once the track is picked), which is exactly what this harness is built to support.

**Other hard constraints from the same brief** (folds into §4):
- Any one of Search, Contents, Research, or Finance counts as "integrates a You.com API" —
  this app already uses two (Search + Research).
- In-person live demo is primary; the 1–3 min video is the secondary/backup, not optional.
- Citation/source quality is called out as ~25% of the technical score — worth extra polish
  time on demo day rather than new features.
- Day-of timeline: doors 9:30 AM, build window 11:10 AM, feature freeze 3:00 PM (switch to
  polishing citations), final push 5:00 PM, submit 6:25 PM.

**Correction (post-verification):** the hackathon brief mentions a separate "Finance Research
API." Direct inspection of the official `@youdotcom-oss/sdk` (v0.13.1) — reading its actual
generated source, not docs summaries — turned up only four operations: `search`, `research`,
`contents`, `agentsRuns`, which led to an earlier (wrong) note here claiming "no dedicated
finance endpoint." That was an SDK-coverage gap, not an API gap: the official docs document a
**Finance Research API** at `/docs/guides/finance-research`, so a dedicated finance endpoint
does exist — it's just not exposed through this SDK version. Finance/ticker queries in this app
still go through the general-purpose `research` operation (`POST /v1/research`, `{ input,
research_effort }`) rather than the dedicated Finance endpoint, which remains a valid choice but
should be understood as "not yet wired to the dedicated endpoint," not "no such endpoint
exists."

## 2. Architectural Blueprint

- **Framework:** Vercel AI SDK (`ai` v7), used directly via `ToolLoopAgent` — no
  crewAI/LangChain/LangGraph layer. Justification: the workload is "call You.com APIs →
  stream a synthesized answer with citations," which is the AI SDK's core use case, and it
  avoids orchestration overhead a graph framework would add for a single-agent flow.
- **App shell:** Next.js (App Router), deployed on Vercel. One route handler
  (`app/api/chat/route.ts`) runs the agent and streams via `createAgentUIStreamResponse`;
  the UI (`app/page.tsx`) is a single page using `useChat` with a query box and streaming
  output panel showing inline citations.
- **Orchestration harness:** Claude Code (this session), per the hackathon's supported-harness
  list.
- **Model:** `anthropic/claude-sonnet-5` via the Vercel AI Gateway (OIDC auth through
  `VERCEL_OIDC_TOKEN`, no separate provider key needed).

  **Correction (2026-07-24, afternoon — see §9):** the Framework, App shell, and Model bullets
  above are historical — the Vercel AI Gateway and every chat-model call were removed later the
  same day. `app/api/chat/route.ts` now returns plain JSON from a single You.com Research call;
  there is no streaming and no model in the loop.
- **You.com API usage — called directly via `fetch`, not the official SDK:**
  the installed `@youdotcom-oss/sdk`'s request-building and auth logic were verified correct,
  but its response-parsing layer (generated Zod schemas) rejects real, valid 200 responses
  from the live API (a schema-strictness bug on optional fields) — confirmed by live-testing
  both endpoints. Rather than fight a broken generated SDK, the app calls the two verified
  endpoints directly:
  - **Search** — `GET https://ydc-index.io/v1/search?query=...` — live web/news results.
  - **Research** — `POST https://api.you.com/v1/research` with `{ input, research_effort }`
    — synthesized, cited answer (used for finance/ticker-flavored queries too).
  - Auth for both: header `X-API-Key: <YDC_API_KEY>` (confirmed via the SDK's own
    `resolveGlobalSecurity` source — not `Authorization: Bearer`, which the API rejects).
  - Both wrapped as AI SDK `tool()`s the agent can call.
- **Dev-time MCP servers (for building, not shipped in the app):**
  - Search MCP — `https://api.you.com/mcp?profile=free` (`you-search`, and with an API key:
    `you-contents`, `you-research`, `you-finance`) — lets me query You.com directly while
    coding without writing throwaway scripts.
  - Docs MCP — `https://you.com/docs/_mcp/server` (`searchDocs`) — for looking up exact API
    request/response shapes instead of relying on possibly-stale training data.

## 3. Environment Setup Status

- [x] Official `@youdotcom-oss/sdk` installed (used for source-of-truth verification of
      request/response shapes and auth; not used at runtime — see §2)
- [x] Next.js app scaffolded (`create-next-app`, App Router, TypeScript, v16.2.11)
- [x] Vercel AI SDK (`ai` v7.0.37) installed
- [x] `YDC_API_KEY` provided by user, migrated into `.env.local` (gitignored), original
      plaintext file deleted
- [x] `.env.local` gitignored (Next.js default `.gitignore`)
- [x] `VERCEL_OIDC_TOKEN` pulled via `vercel link` + `vercel env pull` for AI Gateway auth
- [x] Both You.com endpoints live-tested end-to-end with the real key (search + research)
- [x] Search MCP server configured in workspace (`https://api.you.com/mcp?profile=free`)
- [x] Docs MCP server configured in workspace (`https://you.com/docs/_mcp/server`)
- [x] Agent/tool code, API routes, and UI — shipped; see the README for what was actually built

## 4. Submission Checklist

- [x] Integrates ≥1 You.com API endpoint (Search + Research, both live-verified; Contents and
      Finance are the other two options in the brief but aren't required beyond one)
- [x] Hosted on a public GitHub repository — https://github.com/martinindalecio/pulse
- [x] `README.md` with clear setup instructions
- [x] Deployed — https://pulse-app-navy-ten.vercel.app, with `YDC_API_KEY` and
      `PULSE_ACCESS_CODE` set on the host
- [x] Live in-person demo ready (this is the primary format per the brief) — script and
      pre-flight steps in [demo-script.md](demo-script.md)
- [ ] 1–3 minute demo video (secondary/backup, still required)
- [x] ~200-word project description (problem, track, stack, API usage) — see
      [submission.md](submission.md)

**This file is the pre-build planning record, kept for provenance.** Everything from §5 down
was written before the track was announced and before the app existed; where it disagrees with
the README, the README is what shipped.

## 5. Partner Ecosystem & Additional Tooling — Tool-by-Tool Review

Re-evaluated now that the harness is meant to be track-agnostic, not just for Real-Time
Intelligence. **Important constraint:** most of these require creating a new third-party
account (AWS, Render, Replit, LlamaIndex, Agno, Pica, Parasail, CrewAI's cloud, Opsera).
Account creation is on Claude's prohibited-actions list — I cannot sign up for these on your
behalf. Anything below marked "connect" means you'd need to create the account and hand me
the resulting key; I can wire it into the code immediately once you do.

| Tool | Verdict | Why |
|---|---|---|
| AWS | Skip | Vercel already hosts the app natively; nothing here needs AWS-specific compute/storage. |
| Replit | Skip | Redundant with the existing local-dev + Vercel deploy pipeline, which already works end-to-end. |
| Render | Skip | Same rationale as AWS — an alternative host we don't need a second one of. |
| Opsera | Skip (bonus only) | $500 side-prize for Agents/Forge usage, but it's net-new integration work unrelated to the core product. Only worth it as a post-submission stretch goal if time remains. |
| CrewAI | Skip | Multi-agent orchestration framework — redundant with the AI SDK's `ToolLoopAgent`, which the brief already accepts and which already works. If a multi-agent track is chosen, §6 shows how to get there without a new framework. |
| LlamaIndex ($750 LlamaParse credits) | Skip | Original reason recorded here was "our sources are HTML, not PDFs" — that premise was **false and has since been checked**: the best Veracruz notary source, the Gaceta Oficial, publishes as PDF. The actual reason to skip: You.com's Contents endpoint parses those PDFs natively (verified live, 2026-07-24), so LlamaParse would add a signup and a new dependency for zero gain over what's already wired in. |
| Agno | Skip | Another agent-orchestration layer — same redundancy as CrewAI. |
| LangGraph / AutoGen | Skip | Same reasoning as CrewAI/Agno. |
| Parasail | Skip | The Vercel AI Gateway (already wired in) already exposes 100+ models across providers under one key — Parasail only matters if it hosts something the Gateway doesn't. |
| MindStudio | Skip | A low-code app builder — would replace the hand-coded approach we're already using, not extend it. |
| One (Pica) | Skip for now | An integration platform for taking actions in third-party apps (Slack, email, etc.). None of our current tools need that. Worth reconsidering only if a chosen track requires the agent to act in another app, not just read/summarize data. |

Net: the harness intentionally stays on the stack already proven to work (Next.js + Vercel AI
SDK + You.com + Vercel deploy). None of the partner tools close a real gap; several are
mutually-exclusive alternatives to decisions already made. Credits noted but unused:
LlamaParse $750, Render $50, AWS $25, Agno 1 month, Pica 1 month. You.com's $100 is the only
credit pool this app draws on. The Vercel AI Gateway's $5 is no longer relevant — **correction,
2026-07-24, afternoon:** the gateway's free tier was exhausted (`amazon/nova-micro` started
throwing `GatewayRateLimitError` on every call), so rather than conserve it further the gateway
was removed outright. See §9.

## 6. Track Retargeting Guide

Everything below the agent's system prompt and tool set is track-agnostic. To retarget:

- **Real-Time Intelligence (current default):** topic/ticker → cited briefing. No changes
  needed.
- **Deep Research:** bump `deepResearch`'s `effort` default in
  [`agent/pulse-agent.ts`](agent/pulse-agent.ts) from `"standard"` to `"deep"`/`"exhaustive"`,
  and/or let the agent chain multiple `deepResearch` calls (sub-questions) before synthesizing
  a final answer. The tool and API already support this — it's a prompt/default change, not
  new code.
- **Multi-Agent Systems:** split the single `ToolLoopAgent` into two or more (e.g., a
  "researcher" agent that only calls the You.com tools, and a "writer/critic" agent that takes
  the researcher's output and produces/critiques the final briefing), orchestrated by a parent
  loop. This is a plain AI SDK pattern (multiple `ToolLoopAgent` instances called in sequence
  or by each other as tools) — no CrewAI/LangGraph/Agno needed, per §5.

  **Correction (2026-07-24, afternoon — see §9):** this recipe was never built. The actual Lead
  Radar submission uses no `ToolLoopAgent` at all — see §8.2's correction and §9.
- **Any other track:** if it needs a capability not covered above (e.g., taking actions in
  another app, retrieving from a private document store), that's the point at which one of the
  skipped tools in §5 (Pica, LlamaIndex) would actually earn its place — revisit that table
  rather than defaulting to "skip" if the chosen track genuinely needs it.

## 7. Live-Brief Corrections (2026-07-24 morning, from the actual event kickoff)

The night-before PDF brief (§1) named the tracks "Real-Time Intelligence, Deep Research,
Multi-Agent Systems." The live event brief (via a Granola transcript from the morning-of
kickoff) uses slightly different names and adds two MCP tools not previously documented:

| Track (night-before PDF) | Track (live brief, 2026-07-24) | Primary APIs |
|---|---|---|
| Real-Time Intelligence | **Real-Time Intelligence** (unchanged) | Web Search + Smart APIs |
| Deep Research | **Deep Knowledge** | Research + Deep Research APIs |
| Multi-Agent Systems | **Agent Systems** | Multi-API orchestration, MCP Server, frameworks |

**You.com MCP tools per the live brief** (5 total, vs. the 2 — Search, Research — wired into
this repo so far, per §2):
1. **Search** — outcome-based web search from trusted sources (already wired, §2)
2. **Content** — URL → clean markdown for agents (not yet wired)
3. **Research** — deep multi-source research, tunable depth/cost (already wired, §2)
4. **Discover** — find integration capabilities + latest docs (not yet wired)
5. **Balance** — budget control before agent actions (not yet wired — worth adding for an
   Agent Systems submission specifically, since "check budget before fanning out N search
   agents" is a legitimate feature for that track, not just plumbing)

Plus the **Finance** endpoint, confirmed API-only (not in the MCP tool list), per §1's
correction.

## 8. Chosen Idea — Notary Client Lead-Radar (Track: Agent Systems)

**Status as of this edit: idea and premises locked; one open decision blocking build start
(see "Open Decision" below). Nothing in this section has been committed to git yet.**

### 8.1 Grounding — the real user and the real problem

The named user is Martín Galaz López, the user's father — a state-appointed notary public
(*Notario Público Número Dos*) in Huayacocotla, Veracruz, Mexico. Full business context:
`/Users/martingalaz/claude/notaria-galaz/NOTARIA_GALAZ_BUSINESS_CONTEXT.md` (separate repo,
not this one — read it if picking this up cold).

Direct evidence from a WhatsApp conversation (screenshot, 2026-07-24 ~11:07 AM) between the
user and Martín:
- User asked how he currently gets clients: **"95 por ciento llegan solos o por recomendación
  de terceros"** (95% arrive on their own or via third-party referral).
- Follow-up contact happens via WhatsApp and phone, after the client has already arrived —
  i.e., **zero active prospecting today.**
- The user then asked the framing question that became the product spec: *"Si tuvieses una
  persona sentada todo el día buscando en internet, ¿qué le pedirías que buscara y dónde los
  encontrarías?"* (If you had a person sitting all day searching the internet for clients,
  what would you ask them to search, and where would you find them?)

This supersedes an earlier, discarded idea (a client-facing pre-consultation/document-checklist
assistant) — that would have improved an already-working channel (referral → WhatsApp
follow-up); the lead-radar idea opens a channel that doesn't exist today.

### 8.2 System design

**Correction (2026-07-24, afternoon — see §9): this plan was superseded by what actually got
built, after the Vercel AI Gateway's free tier was exhausted mid-hackathon.** There is no
model-driven multi-agent split in the shipped app — no `ToolLoopAgent`, no chat model anywhere.
What runs instead is a goal-directed orchestrator written in plain code:

- **Plan** (`agent/lead-radar-agent.ts`) — four discovery specialists (`agent/leads.ts`) run
  concurrently via `Promise.allSettled`: a property-listing search (You.com Search, four
  `site:`-scoped queries — a search result *is* the lead), two legal-notice discovery calls
  (You.com Research with a strict `output_schema`, one boosting official domains), and a
  deterministic edictos scrape (You.com Contents).
- **Observe** — per-municipio coverage is computed against the deterministic geo-gate
  (`lib/jurisdiction.ts`).
- **Adapt** — targeted You.com Search follow-ups for any municipio still uncovered, bounded to
  2 rounds / 4 queries total.
- **Stop** — once covered, or the bound is hit; a deterministic single-pass fallback runs if the
  orchestrator itself throws.
- **Triage/scoring/digest** — all deterministic, rule-based code (`agent/leads.ts`), not an LLM
  coordinator or writer: a geo-gate, a rule that a candidate keeps the "aviso legal" badge only
  if its own text shows notice evidence, a named-rule 0–100 score, and a template-composed
  Spanish digest.

The current, accurate description lives in `README.md`'s "Agent-system architecture" section —
read that, not this superseded plan, for how the shipped system actually works. This section is
kept for the historical record of what was originally scoped:

Original plan (superseded, kept for the record):

- **Property-listing agent** — searches local real-estate/marketplace sources (Vivanuncios,
  Facebook Marketplace, local classifieds) for property sales near Huayacocotla, Tlachichilco,
  Texcatepec, Zontecomatlán. Every property sale legally requires a notary — this is the
  highest-volume, most directly-tied-to-revenue signal (escrituras de compraventa is Martín's
  top service per the business-context doc).
- **Public/legal-notice agent** — searches for probate/inheritance filings, municipal legal
  notices, official gazette entries in the region. Lower volume, higher intent — ties to
  testamentos (wills) and inheritance adjudication.
- **Coordinator agent** — dedupes and scores what the two source agents find.
- **Digest agent** — turns scored leads into a Spanish, WhatsApp-ready daily brief, including a
  drafted (not sent) outreach message per lead for Martín to review.

Reuses the existing harness per §6's Multi-Agent retargeting recipe (split the single
`ToolLoopAgent` into N source agents + a coordinator + a writer, composed by a parent loop —
same AI SDK pattern, no new framework).

### 8.3 Confirmed premises (all agreed by user, 2026-07-24)

1. The unmet need is *prospecting*, not intake — confirmed via 8.1's evidence.
2. Property-sale posts and public/legal notices are the two strongest web-searchable signals
   of near-term notarial need; other services (poderes, constitución de sociedades) don't have
   a reliable public signal and are out of scope for v1.
3. The demo shape (user's answer: "1C") is a brief live search first (proves it's real-time,
   ~10s, doesn't need a lead to exist at that exact second) followed by a richer pre-run digest
   (carries the actual substance) — this avoids the demo depending on a live lead existing at
   the moment of presenting.
4. Building both source agents in parallel (user's answer: "2C") is worth the added complexity
   specifically because multi-source + coordinator is the thing being judged for Track 3 — a
   single-source agent wouldn't clearly demonstrate it.
5. **Scope boundary — AMENDED, see Open Decision below.** Original premise: system drafts a
   WhatsApp message per lead but never sends anything (Martín sends manually). User pushed
   back: wants an actual send to happen during the demo, even if the overall thing is "a mock."
   Never in scope regardless of A/B below: auto-contacting real strangers found via scraped
   listings (no reliable contact info for them anyway, and cold-contacting is a human-in-the-loop
   action either way).

### 8.4 Send mechanism — RESOLVED: (A) real send, via Twilio WhatsApp Sandbox

User confirmed 2026-07-24: no mocking — wants an actual send during the demo. Also flagged
that a past Twilio WhatsApp attempt (in `notaria-galaz`) **did not work — it "required a real
number."** Likely cause (inferred, not yet confirmed against actual Twilio console access):
Twilio trial accounts only deliver WhatsApp messages to numbers that have completed the
**Sandbox opt-in** (destination sends `join <code>` once to Twilio's sandbox number via
WhatsApp) — a bare Account SID/Auth Token pair isn't sufficient by itself, and that opt-in
step was likely skipped last time. Full detail saved to durable memory (outside this repo) so
this isn't rediscovered blind in a future session: see the `project_twilio_whatsapp_failed_before`
memory entry.

**Chosen path — real API call, not a mock, worked around via the Sandbox opt-in:**

1. **User action (not something this agent can do — account creation is off-limits):**
   confirm whether a Twilio account (trial is free and sufficient) already exists. If not,
   sign up at twilio.com.
2. **User action:** in the Twilio Console → Messaging → Try it out → Send a WhatsApp message,
   activate the Sandbox. This gives a sandbox sender number (commonly `+14155238886`) and a
   join code (e.g. `join some-word`).
3. **User/Martín action:** from the destination WhatsApp number, send `join <code>` to the
   sandbox number, once. This opts that number in for a rolling ~72h window (resets on any
   exchanged message) — **this is the exact step that was likely missed last time.**
4. **User action:** hand over `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and the sandbox
   `TWILIO_WHATSAPP_FROM` (`whatsapp:+14155238886`) as env vars/secrets — never typed into
   chat as plain values per this agent's standing rule on credentials.
5. **This agent's part:** wire the digest agent's final step to a real `POST
   https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json` call (Basic Auth
   `SID:Token`, form-encoded `From`/`To`/`Body`) sending the drafted lead digest to
   the destination number (kept out of this repo). Genuine API call, genuine delivery — "mock"
   only in the sense
   that the sender is a shared Twilio sandbox number, not a production WhatsApp Business
   number, which is the correct trade for a hackathon timeline.

**Demo-day risk to plan around:** the sandbox opt-in expires after ~72h of inactivity between
sends — re-send `join <code>` from Martín's WhatsApp the morning of the demo (2026-07-24) to
be safe, and do at least one real test send well before presenting.

**Still open:** whether a Twilio account/credentials are available *right now* to start
building against — needs a direct answer before step 5 can be implemented and tested.

## 9. Gateway Removal (2026-07-24, afternoon)

**What happened:** the Vercel AI Gateway's free tier was exhausted during the build —
`amazon/nova-micro` started throwing `GatewayRateLimitError` on every call. That broke every
chat-model call in the app: the Pulse chat `ToolLoopAgent` and the model-driven multi-agent
split planned for Lead Radar in §8.2.

**Decision:** remove the gateway and every chat-model call outright rather than switch models or
wait it out. Verified clean with `grep -rnE "generateObject|generateText|streamText|
ToolLoopAgent|@ai-sdk/gateway" agent/ app/ lib/` — no matches. You.com (Search, Research,
Contents) is now the only intelligence layer for both surfaces:

- **Pulse chat** — one You.com Research call per question, plain JSON (not streamed).
- **Lead Radar** — a plan/observe/adapt/stop orchestrator in code (`agent/lead-radar-agent.ts`,
  `agent/leads.ts`): four concurrent discovery specialists, coverage measured against the
  deterministic geo-gate, bounded follow-up searches for gaps, and fully deterministic
  triage/scoring/digest — no LLM judge, no LLM writer.

**Why this is a fine trade, not just a workaround:** the workload — apply jurisdiction rules,
score by named criteria, template a digest — never needed a chat model's judgment; deterministic
code does it more cheaply and more explainably (every score traces to a named rule). The Agent
Systems story shifts accordingly: it's a single adaptive, goal-directed orchestration loop
making its own control-flow decisions, not "agents calling agents" — still a legitimate agent
system, just not one built on a chat model.

**Docs affected:** §1's harness description, §2's Framework/Model bullets, §5's gateway-budget
line, §6's Multi-Agent retargeting recipe, and §8.2's original plan are all superseded by the
above — left in place with inline correction notes rather than deleted, per this file's own
convention (see the Finance API correction in §1). `README.md` has been rewritten to describe
only the current, accurate architecture.

**Security/scope constraints — unchanged by this refactor, restated for emphasis:** account
creation remains on the prohibited-actions list (§5); Twilio credentials, if and when wired in,
are handed over as env vars/secrets and never typed into chat as plain values (§8.4); and
auto-contacting real strangers found in scraped listings is never in scope, regardless of the
WhatsApp-send decision in §8.4 (§8.3).
