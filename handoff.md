# Handoff — You.com Agentic AI Hackathon (SF Edition)

## 1. Track — Deferred by Design

No track is locked in yet. Rather than build a single-track product and hope it matches
whatever gets picked at the event, this repo is a **track-agnostic harness**: a working
Next.js + Vercel AI SDK app with a live `ToolLoopAgent`, real You.com Search + Research tool
calls, streaming UI, an access gate, and a linked Vercel deployment — all already tested
end-to-end. The only genuinely track-specific part is the agent's system prompt and tool set,
isolated in one file ([`agent/pulse-agent.ts`](agent/pulse-agent.ts)) and cheap to swap on the
day. See §6 for how to retarget it per track.

The current default config — **"Pulse"**: user gives a topic/company/ticker, agent streams
back a synthesized, cited briefing — targets **Real-Time Intelligence** purely because it's
the smallest surface that exercises every part of the harness (both You.com tools, streaming,
citations). Not a commitment to that track.

*Note: only three track names are on record from earlier in this session — Real-Time
Intelligence, Deep Research, Multi-Agent Systems. If the real list is longer, say so and §6
gets extended to cover the rest.*

**Correction (post-verification):** the hackathon brief mentions a separate "Finance Research
API." Direct inspection of the official `@youdotcom-oss/sdk` (v0.13.1) — reading its actual
generated source, not docs summaries — confirms only four operations exist: `search`,
`research`, `contents`, `agentsRuns`. There is no dedicated finance endpoint. Finance/ticker
queries are handled by passing a finance-flavored prompt into the general-purpose `research`
operation (`POST /v1/research`, `{ input, research_effort }`), which accepts arbitrary
natural-language questions and returns a cited Markdown answer — this covers the "Finance
Research" use case without a separate primitive.

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
- [ ] Agent/tool code, API route, and UI — in progress (next step)

## 4. Submission Checklist

- [x] Integrates ≥1 You.com API endpoint (Search + Research, both live-verified)
- [x] Hosted on a public GitHub repository — https://github.com/martinindalecio/pulse
- [x] `README.md` with clear setup instructions
- [ ] Deployed (Vercel project `pulse-app` already linked, zero env vars set yet — see §5)
- [ ] 1–3 minute demo video
- [ ] ~200-word project description (problem, track, stack, API usage)

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
| LlamaIndex | Skip | Solves "connect custom data sources to an LLM" — we don't have a custom/private data source; You.com's APIs already are the data source. Would matter only if a track needed retrieval over a private document set. |
| Agno | Skip | Another agent-orchestration layer — same redundancy as CrewAI. |
| LangGraph / AutoGen | Skip | Same reasoning as CrewAI/Agno. |
| Parasail | Skip | The Vercel AI Gateway (already wired in) already exposes 100+ models across providers under one key — Parasail only matters if it hosts something the Gateway doesn't. |
| MindStudio | Skip | A low-code app builder — would replace the hand-coded approach we're already using, not extend it. |
| One (Pica) | Skip for now | An integration platform for taking actions in third-party apps (Slack, email, etc.). None of our current tools need that. Worth reconsidering only if a chosen track requires the agent to act in another app, not just read/summarize data. |

Net: the harness intentionally stays on the stack already proven to work (Next.js + Vercel AI
SDK + You.com + Vercel deploy). None of the partner tools close a real gap; several are
mutually-exclusive alternatives to decisions already made. Credits noted but unused:
LlamaIndex $100, Render $50, AWS $25, Agno 1 month, Pica 1 month. You.com's $100 is the only
credit pool this app draws on, plus the Vercel AI Gateway's $5 (currently conserved — see
`agent/pulse-agent.ts`, pinned to the cheap `amazon/nova-micro` model until the real demo).

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
- **Any other track:** if it needs a capability not covered above (e.g., taking actions in
  another app, retrieving from a private document store), that's the point at which one of the
  skipped tools in §5 (Pica, LlamaIndex) would actually earn its place — revisit that table
  rather than defaulting to "skip" if the chosen track genuinely needs it.
