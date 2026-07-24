import { createAgentUIStreamResponse } from "ai";
import { pulseAgent } from "@/agent/pulse-agent";

export async function POST(request: Request) {
  const accessCode = process.env.PULSE_ACCESS_CODE;
  if (accessCode && request.headers.get("x-pulse-access-code") !== accessCode) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await request.json();
  return createAgentUIStreamResponse({ agent: pulseAgent, uiMessages: messages });
}
