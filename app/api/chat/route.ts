import { createAgentUIStreamResponse } from "ai";
import { pulseAgent } from "@/agent/pulse-agent";

export async function POST(request: Request) {
  const { messages } = await request.json();
  return createAgentUIStreamResponse({ agent: pulseAgent, uiMessages: messages });
}
