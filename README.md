# Pulse — Real-Time Intelligence Briefings

Built for the **You.com Agentic AI Hackathon (SF Edition)** — Real-Time Intelligence track.

Give Pulse a topic, company, or ticker and it streams back a synthesized, citation-backed
briefing assembled live from the [You.com](https://you.com) Search and Research APIs — no
static knowledge, every claim sourced.

## How it works

1. You ask a question ("Nvidia stock outlook", "Latest news on OpenAI"…).
2. A [`ToolLoopAgent`](agent/pulse-agent.ts) (Vercel AI SDK, `anthropic/claude-sonnet-5` via
   the Vercel AI Gateway) decides which You.com tools to call:
   - `webSearch` → You.com Search API, for fresh news/results
   - `deepResearch` → You.com Research API, for a synthesized, multi-source answer with citations
3. The agent's response streams into the browser as it's generated, along with the tool calls
   it made and the sources it used.

## Stack

- **Next.js 16** (App Router) + React 19
- **Vercel AI SDK v7** — `ToolLoopAgent`, `createAgentUIStreamResponse`, `useChat`
- **Vercel AI Gateway** — model routing (`anthropic/claude-sonnet-5`)
- **You.com API** — Search + Research, called directly via `fetch` (see note below)

### Why direct `fetch` instead of the official You.com SDK

The official `@youdotcom-oss/sdk` builds requests correctly, but its generated Zod response
schemas reject valid live API responses (over-strict on optional fields). [`lib/you.ts`](lib/you.ts)
calls the REST endpoints directly instead, using the exact endpoint/header/auth shape confirmed
from the SDK's own source:

- Search: `GET https://ydc-index.io/v1/search` — header `X-API-Key`
- Research: `POST https://api.you.com/v1/research` — header `X-API-Key` (different base URL than search)

## Getting started

```bash
npm install
```

Create `.env.local`:

```bash
YDC_API_KEY=your-you-com-api-key
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key
```

- Get a You.com API key at [you.com](https://you.com) (API/developer settings).
- Get an AI Gateway key from your [Vercel dashboard](https://vercel.com/dashboard) → project →
  AI Gateway. (Alternatively, run `vercel env pull` on a linked project to use OIDC auth instead
  of a static key.)

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and ask about a topic, company, or ticker.

## Project structure

- `lib/you.ts` — direct-fetch wrappers for You.com Search + Research
- `agent/pulse-agent.ts` — the `ToolLoopAgent` definition and its two tools
- `app/api/chat/route.ts` — streaming chat route handler
- `app/page.tsx` — chat UI (suggestions, streamed text, tool-call/source rendering)
