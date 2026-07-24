import { runPulseResearch, type PulseMessage } from "@/agent/pulse-agent";

// Plain JSON request/response: You.com Research is single-shot and takes 10-30s to return a
// whole answer, so there is no incremental content to stream. The client shows a loading state
// and renders the finished briefing when this resolves.
export async function POST(request: Request) {
  const accessCode = process.env.PULSE_ACCESS_CODE;
  if (accessCode && request.headers.get("x-pulse-access-code") !== accessCode) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages must be a non-empty array" }, { status: 400 });
  }

  const pulseMessages: PulseMessage[] = messages.map((m) => ({
    role: m?.role === "assistant" ? "assistant" : "user",
    content: String(m?.content ?? ""),
  }));

  try {
    const briefing = await runPulseResearch(pulseMessages);
    return Response.json(briefing);
  } catch (error) {
    console.error("Pulse research failed:", error);
    return Response.json(
      { error: "Research failed — the live source investigation didn't complete. Please try again." },
      { status: 502 },
    );
  }
}
