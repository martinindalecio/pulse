import {
  composeDigest,
  findEdictosLeads,
  findGazetteNotices,
  findLegalNoticeResearch,
  findPropertyLeads,
  searchJurisdictionLeads,
  triageLeads,
  type Lead,
  type RawLead,
} from "@/agent/leads";
import { matchJurisdiction, MUNICIPIOS } from "@/lib/jurisdiction";

// Goal-directed, adaptive coverage orchestrator — no chat model anywhere in this loop. This
// replaces the old model-driven tool-calling loop that used to justify the Agent Systems track
// fit; the loop itself is now the fit: Plan (run the specialists) -> Observe (per-municipio
// coverage) -> Adapt (targeted follow-up for gaps) -> Stop (covered, or bound hit).

type Specialist = { label: string; run: () => Promise<RawLead[]> };

const MAX_ADAPTATION_ROUNDS = 2;
const MAX_FOLLOWUPS_TOTAL = 4;

// Coverage is judged only by a direct municipio-name match (matchJurisdiction.municipio) — a rare
// toponym or alias hit alone doesn't tell us WHICH of the four municipios it belongs to (the
// localidad lists are incomplete, per lib/jurisdiction.ts), so counting those toward coverage
// would be a guess dressed up as a measurement.
function computeCoverage(leads: RawLead[]): Set<string> {
  const covered = new Set<string>();
  for (const l of leads) {
    const match = matchJurisdiction(l.title, l.detail, l.location, l.municipio);
    if (match.municipio) covered.add(match.municipio);
  }
  return covered;
}

export async function runLeadRadar(): Promise<{
  leads: Lead[];
  digest: string;
  mode: "agent" | "fallback";
}> {
  const collected: RawLead[] = [];
  let mode: "agent" | "fallback" = "agent";

  try {
    // --- Plan: the four discovery specialists share no rate-limited resource anymore (no model
    // calls left in any of them), so nothing is gained by running them one at a time.
    const specialists: Specialist[] = [
      { label: "property-search", run: findPropertyLeads },
      { label: "legal-notice-research", run: findLegalNoticeResearch },
      { label: "gazette-research", run: findGazetteNotices },
      { label: "edictos-scrape", run: findEdictosLeads },
    ];
    console.log(`[lead-radar] plan: ${specialists.map((s) => s.label).join(", ")}`);

    const results = await Promise.allSettled(specialists.map((s) => s.run()));
    results.forEach((r, i) => {
      const label = specialists[i].label;
      if (r.status === "fulfilled") {
        console.log(`[lead-radar] ${label}: ${r.value.length} candidates`);
        collected.push(...r.value);
      } else {
        console.log(
          `[lead-radar] ${label} failed (one source failing does not stop the others):`,
          r.reason instanceof Error ? r.reason.message : r.reason,
        );
      }
    });

    // --- Observe + Adapt, bounded: at most 2 rounds, at most 4 follow-up queries total, so a
    // thin day cannot spin.
    let followupsUsed = 0;
    for (let round = 1; round <= MAX_ADAPTATION_ROUNDS && followupsUsed < MAX_FOLLOWUPS_TOTAL; round++) {
      const covered = computeCoverage(collected);
      const uncovered = MUNICIPIOS.filter((m) => !covered.has(m.name));

      if (uncovered.length === 0) {
        console.log(`[lead-radar] adapt round ${round}: all four municipios covered — stopping`);
        break;
      }
      console.log(
        `[lead-radar] adapt round ${round}: uncovered = ${uncovered.map((m) => m.name).join(", ")}`,
      );

      for (const m of uncovered) {
        if (followupsUsed >= MAX_FOLLOWUPS_TOTAL) {
          console.log(
            `[lead-radar] adapt round ${round}: follow-up budget exhausted (${MAX_FOLLOWUPS_TOTAL}) — stopping`,
          );
          break;
        }
        // Zacualpan is ambiguous (also names municipios in three other states) — quoting it and
        // pairing with "Veracruz" keeps the follow-up from drifting into the wrong state.
        const query = m.ambiguous
          ? `"${m.name}" Veracruz aviso legal OR venta propiedad`
          : `${m.name} Veracruz aviso legal OR venta propiedad`;
        followupsUsed++;
        console.log(`[lead-radar] follow-up ${followupsUsed}/${MAX_FOLLOWUPS_TOTAL} for ${m.name}: "${query}"`);
        const found = await searchJurisdictionLeads(query);
        console.log(`[lead-radar] follow-up for ${m.name} returned ${found.length} candidates`);
        collected.push(...found);
      }
    }
  } catch (e) {
    // Orchestrator itself failed (not an individual specialist — those are caught by
    // Promise.allSettled above). Fall back to a bare single-pass discovery so the demo never
    // shows a hard error.
    console.log(
      "[lead-radar] orchestrator failed, falling back to single-pass discovery:",
      e instanceof Error ? e.message : e,
    );
    mode = "fallback";
    if (collected.length === 0) {
      const [property, notices] = await Promise.all([findPropertyLeads(), findLegalNoticeResearch()]);
      collected.push(...property, ...notices);
    }
  }

  // Triage and digest run OUTSIDE the try on purpose. Both degrade internally rather than
  // throwing, and neither is a discovery step — letting a formatting failure trigger a
  // rediscovery is how an earlier version threw away 13 good leads to return zero.
  const leads = triageLeads(collected);
  const digest = composeDigest(leads);
  return { leads, digest, mode };
}
