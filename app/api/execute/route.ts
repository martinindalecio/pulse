import { runConversion } from "@/agent/conversion-agent";
import type { Lead } from "@/agent/leads";

export const maxDuration = 300;

export async function POST(request: Request) {
  const accessCode = process.env.PULSE_ACCESS_CODE;
  if (accessCode && request.headers.get("x-pulse-access-code") !== accessCode) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { lead, lang } = (await request.json()) as { lead: Lead; lang?: "en" | "es" };
  if (!lead?.sourceUrl || !lead?.category) {
    return Response.json({ error: "A lead with a category is required" }, { status: 400 });
  }

  const result = await runConversion(lead, lang === "es" ? "es" : "en");
  return Response.json(result);
}
