// Conversion agent — the second agent in the system.
//
// Lead Radar answers "is there anything worth looking at?". This one answers "what do I actually do
// with this one?", for a single signal the notary picked. It has two halves and they are
// deliberately different in kind:
//
//   - the playbook is deterministic (lib/playbooks.ts) — procedure doesn't get improvised;
//   - the research is a live You.com Research call scoped to that one matter — the part that
//     genuinely requires going out and reading the web.
//
// If the research half fails the agent still returns the playbook, flagged degraded. A notary
// standing in front of a signal with no next step is a worse outcome than one without live context.

import { strictObjectSchema, youResearchStructured } from "@/lib/you";
import {
  CONVERSION_PLAYBOOKS,
  type ConversionResearch,
  type ConversionResult,
} from "@/lib/playbooks";
import { CATEGORY_LABELS } from "@/lib/categories";
import type { Lead } from "./leads";

const RESEARCH_SCHEMA = strictObjectSchema({
  summary: {
    type: "string",
    description:
      "Two or three sentences on what this matter is and what stage it is at, for a notary.",
  },
  parties: {
    type: "array",
    items: { type: "string" },
    description:
      "People or entities named in or clearly connected to the matter, with their role. Empty array if none can be established.",
  },
  next_steps: {
    type: "array",
    items: { type: "string" },
    description: "Concrete actions a notary should take next on this specific matter.",
  },
  risks: {
    type: "array",
    items: { type: "string" },
    description:
      "Deadlines, jurisdictional problems, or reasons this may not be a real opportunity. Say so plainly if the matter looks closed or stale.",
  },
});

// The research half must not silently answer about a different matter. The prompt pins the source
// document and the district, and asks for the honest negative — an agent that always finds
// something is an agent that invents things.
function buildPrompt(lead: Lead, lang: "en" | "es"): string {
  const label = CATEGORY_LABELS[lead.category].en;
  const language = lang === "es" ? "Spanish" : "English";
  return [
    `A notary in the Cuarta Demarcación Notarial de Huayacocotla, Veracruz, Mexico is evaluating`,
    `this ${label} as potential work. Research this specific matter and nothing else.`,
    "",
    `Title: ${lead.title}`,
    `Detail: ${lead.detail}`,
    lead.municipio ? `Municipality: ${lead.municipio}` : "",
    lead.date ? `Date on the record: ${lead.date}` : "",
    `Source document: ${lead.sourceUrl}`,
    "",
    "Read the source document first. Then establish, using Mexican and Veracruz sources:",
    "the parties involved and their roles; the procedural stage; what a notary must verify before",
    "taking the matter; and any statutory deadline that is running.",
    "",
    "If the source document does not support a claim, do not make it. If the matter appears to be",
    "closed, historical, or outside this notarial district, say so in the risks and keep the",
    "summary short.",
    "",
    `Write every field in ${language}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function runConversion(lead: Lead, lang: "en" | "es"): Promise<ConversionResult> {
  const playbook = CONVERSION_PLAYBOOKS[lead.category];

  try {
    const { data, sources } = await youResearchStructured<Omit<ConversionResearch, "sources">>({
      input: buildPrompt(lead, lang),
      researchEffort: "standard",
      outputSchema: RESEARCH_SCHEMA,
    });

    const research: ConversionResearch = {
      summary: data.summary ?? "",
      parties: data.parties ?? [],
      next_steps: data.next_steps ?? [],
      risks: data.risks ?? [],
      sources: (sources ?? []).map((s) => ({ url: s.url, title: s.title ?? s.url })),
    };

    console.log(
      `[conversion] ${lead.category} — ${research.parties.length} parties, ` +
        `${research.next_steps.length} steps, ${research.sources.length} sources`,
    );
    return { category: lead.category, playbook, research, degraded: false, generatedAt: Date.now() };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "research unavailable";
    console.error(`[conversion] research failed, returning playbook only: ${reason}`);
    return {
      category: lead.category,
      playbook,
      research: null,
      degraded: true,
      degradedReason: reason,
      generatedAt: Date.now(),
    };
  }
}
