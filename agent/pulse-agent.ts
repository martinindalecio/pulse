// Pulse's "agent" is now a thin wrapper around the You.com Research API: it builds a single
// research prompt from the conversation, calls youResearch, and normalizes the result into the
// shape the chat UI renders. No model-calling primitives from the `ai` package are used here —
// You.com Research is itself the agentic system (it plans its own searches and cites sources).

import { youResearch, type ResearchSource } from "@/lib/you";

export type PulseMessage = {
  role: "user" | "assistant";
  content: string;
};

export type PulseSource = {
  url: string;
  title?: string;
};

export type PulseBriefing = {
  content: string;
  sources: PulseSource[];
};

// How many prior turns to fold in as context. Research is single-shot (no server-side chat
// session), so we keep only a short tail of history to keep the prompt small and cheap.
const MAX_CONTEXT_TURNS = 6;

const INSTRUCTIONS = `You are Pulse, a real-time intelligence briefing agent.

The user gives you a topic, company, or ticker. Produce a synthesized, well-organized,
citation-backed briefing drawn from live web sources. Keep it concise, scannable, and organized
with headers or bullet points where useful. Cite sources inline as markdown links wherever you
state a fact drawn from a source.`;

// Builds the single prompt string sent to You.com Research: product instructions, a short
// tail of prior conversation for context, then the current question.
export function buildResearchInput(messages: PulseMessage[]): string {
  if (messages.length === 0) {
    throw new Error("buildResearchInput: at least one message is required");
  }

  const current = messages[messages.length - 1];
  const priorContext = messages.slice(0, -1).slice(-MAX_CONTEXT_TURNS);

  let prompt = `${INSTRUCTIONS}\n\n`;

  if (priorContext.length > 0) {
    prompt += "Prior conversation (for context only, do not re-answer these):\n";
    for (const m of priorContext) {
      prompt += `${m.role === "user" ? "User" : "Pulse"}: ${m.content}\n`;
    }
    prompt += "\n";
  }

  prompt += `Now answer this question:\n${current.content}`;
  return prompt;
}

function normalizeSources(sources: ResearchSource[] | undefined): PulseSource[] {
  if (!sources) return [];
  return sources
    .filter((s): s is ResearchSource => Boolean(s?.url))
    .map((s) => ({ url: s.url, title: s.title }));
}

// Runs the You.com Research call for the given conversation and returns a normalized briefing.
export async function runPulseResearch(messages: PulseMessage[]): Promise<PulseBriefing> {
  const input = buildResearchInput(messages);
  const result = await youResearch({ input, researchEffort: "standard" });
  return {
    content: result.content,
    sources: normalizeSources(result.sources),
  };
}
