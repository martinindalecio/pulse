# Handoff — You.com Agentic AI Hackathon (SF Edition)

## 1. Chosen Track

**Real-Time Intelligence.**

Rationale: this track rewards agents that reason over live web/news/market data with
citations — which is exactly what the You.com Web Search + Finance Research APIs are built
for, and it's scoped tightly enough to ship a polished demo in a single hackathon day (vs.
"Deep Research," which implies longer-running multi-step jobs, or "Multi-Agent Systems,"
which adds coordination overhead we don't need to prove the core value prop).

**Product concept — "Pulse":** the user gives a topic, company, or ticker; the agent streams
back a synthesized, citation-backed briefing assembled live from You.com Search + Research
results, refreshable on demand. Single focused agent, not a multi-agent pipeline —
depth over breadth, given the time budget.

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

## 5. Partner Ecosystem & Additional Tooling — Evaluated, Not Adopted

The hackathon brief lists optional partner tools (AWS, Replit, Render, Opsera, CrewAI,
LlamaIndex, Agno, LangGraph, AutoGen, Parasail, MindStudio, One/Pica) and associated free
credits. Decision: **none adopted**, deliberately.

- The brief itself names the Vercel AI SDK as an accepted framework — already in use.
- No open problem in this app maps to what the other tools solve: deployment is already
  Vercel (linked project `pulse-app`), the data layer is two verified direct-`fetch` calls
  (no need for LlamaIndex), and there's a single agent with no multi-agent coordination need
  (no need for CrewAI/Agno/LangGraph/AutoGen).
- Judging is on the Real-Time Intelligence product, not partner-tool breadth. Adding an
  unfamiliar integration this close to the deadline trades tested, working code for
  integration risk with no clear judging upside.
- **Exception considered:** Opsera's $500 prize for Agents/Forge usage. Not pursued — would
  need net-new integration work with uncertain payoff this late. Revisit only if there's spare
  time after the video + description are done.
- Credits noted but unused: LlamaIndex $100, Render $50, AWS $25, Agno 1 month, Pica 1 month.
  You.com's $100 is the only credit pool this app actually draws on.
