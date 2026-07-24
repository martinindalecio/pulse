import { runLeadRadar } from "@/agent/lead-radar-agent";

export async function POST(request: Request) {
  const accessCode = process.env.PULSE_ACCESS_CODE;
  if (accessCode && request.headers.get("x-pulse-access-code") !== accessCode) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { leads, digest, mode } = await runLeadRadar();
  return Response.json({ leads, digest, mode });
}
