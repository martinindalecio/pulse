# Pulse — Real-Time Intelligence Briefings

Harness for the **You.com Agentic AI Hackathon (SF Edition)** — Real-Time Intelligence track.
Give it a topic, company, or ticker; it streams back a synthesized, citation-backed briefing
assembled live from the You.com Search and Research APIs.

## How it works

1. You ask a question.
2. A [`ToolLoopAgent`](agent/pulse-agent.ts) (Vercel AI SDK, via the Vercel AI Gateway) decides
   which You.com tools to call:
   - `webSearch` → You.com Search API, for fresh news/results
   - `deepResearch` → You.com Research API, for a synthesized, multi-source cited answer
3. The response streams into the browser along with the tool calls made and sources used.

## Stack

- Next.js 16 (App Router) + React 19
- Vercel AI SDK v7 — `ToolLoopAgent`, `createAgentUIStreamResponse`, `useChat`
- Vercel AI Gateway — currently pinned to `amazon/nova-micro` (cheapest tool-capable model) to
  conserve the $5 free credit during dev; swap to a stronger model in [`agent/pulse-agent.ts`](agent/pulse-agent.ts) for the actual demo
- You.com API — Search + Research, called directly via `fetch` (see [`lib/you.ts`](lib/you.ts);
  the official SDK's response validation rejects valid live responses)

## Getting started

```bash
npm install
```

Create `.env.local`:

```bash
YDC_API_KEY=your-you-com-api-key
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key
PULSE_ACCESS_CODE=any-passcode-you-choose
```

`PULSE_ACCESS_CODE` gates `/api/chat` behind a passcode (checked server-side, entered once
client-side) so a public deployment can't be hit by strangers/bots burning your API credits.
**If deploying, set this env var on the host too** — if it's unset there, the gate is skipped
and the endpoint is open.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `lib/you.ts` — direct-fetch wrappers for You.com Search + Research
- `agent/pulse-agent.ts` — the `ToolLoopAgent` definition and its two tools
- `app/api/chat/route.ts` — streaming chat route handler
- `app/page.tsx` — chat UI

---

## Submission checklist

- [x] Working end-to-end app (real query → You.com data → streamed, cited response)
- [x] Public GitHub repo
- [x] README
- [x] Access-code gate on `/api/chat` (prevents anonymous token/credit burn if deployed publicly)
- [ ] Swap `amazon/nova-micro` back to a stronger model before the demo
- [ ] Set `PULSE_ACCESS_CODE` on the deployment host (not just locally)
- [ ] Demo video (1–3 min)
- [ ] ~200-word project description
