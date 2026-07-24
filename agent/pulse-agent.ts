import { ToolLoopAgent, tool } from "ai";
import { z } from "zod";
import { youResearch, youSearch } from "@/lib/you";

export const pulseAgent = new ToolLoopAgent({
  // Cheapest tool-capable model on the AI Gateway — conserves the $5 free credit
  // during dev/harness testing. Swap back to a stronger model for the hackathon demo.
  model: "amazon/nova-micro",
  instructions: `You are Pulse, a real-time intelligence briefing agent.

The user gives you a topic, company, or ticker. Produce a synthesized, well-organized
briefing using live data from your tools:

- Use "webSearch" for fresh news, prices, or general web results on the topic.
- Use "deepResearch" for a thorough, cited answer synthesizing multiple sources —
  use this for anything requiring analysis, context, or multi-source reasoning
  (including financial/company outlook questions).

Always cite sources inline as markdown links. Keep the briefing concise, scannable,
and organized with headers or bullet points where useful. If the user asks a follow-up,
use the tools again to get fresh data rather than relying on earlier results.`,
  tools: {
    webSearch: tool({
      description:
        "Search the live web for recent news, prices, or general information on a topic.",
      inputSchema: z.object({
        query: z.string().describe("The search query"),
      }),
      execute: async ({ query }) => {
        const result = await youSearch(query);
        return result;
      },
    }),
    deepResearch: tool({
      description:
        "Get a synthesized, citation-backed answer to a research question by investigating " +
        "multiple web sources. Use for financial outlook, analysis, or any question needing " +
        "depth beyond a simple search.",
      inputSchema: z.object({
        question: z.string().describe("The research question"),
        effort: z
          .enum(["lite", "standard", "deep", "exhaustive"])
          .default("standard")
          .describe("How much time/depth to spend researching"),
      }),
      execute: async ({ question, effort }) => {
        const result = await youResearch(question, effort);
        return result;
      },
    }),
  },
});

export type PulseAgentUIMessage = import("ai").InferAgentUIMessage<typeof pulseAgent>;
