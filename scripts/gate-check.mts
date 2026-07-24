// Acceptance check for the deterministic parts of the pipeline: the geo-gate and the triage rules.
// Run with `npx tsx scripts/gate-check.mts`. No network, no API key, no model — every case here is
// a fixed input with a known-correct verdict, which is the point of making these stages rule-based.
import { matchJurisdiction } from "../lib/jurisdiction";
import { triageLeads, type RawLead } from "../agent/leads";

const cases: Array<{ label: string; expect: boolean; parts: string[] }> = [
  // Must REJECT: the live-run false positive (shared toponym, wrong state).
  { label: "Texcatepec, Chilcuautla - Hidalgo", expect: false, parts: ["Terrenos en Venta en Texcatepec, Chilcuautla - Hidalgo"] },
  // Must REJECT: out-of-jurisdiction Veracruz notices (same state, wrong district).
  { label: "Xalapa succession notice", expect: false, parts: ["Juicio sucesorio intestamentario, Juzgado Primero de Xalapa, Veracruz"] },
  { label: "Poza Rica remate", expect: false, parts: ["Remate judicial de inmueble en Poza Rica, Veracruz"] },
  // Must REJECT: ambiguous name, wrong state.
  { label: "Zacualpan, Morelos", expect: false, parts: ["Casa en venta en Zacualpan, Morelos"] },
  // Must ACCEPT: the four municipios.
  { label: "Huayacocotla", expect: true, parts: ["Casa en venta en Huayacocotla, Veracruz"] },
  { label: "Ilamatlan sin acento", expect: true, parts: ["Terreno en Ilamatlan Veracruz"] },
  { label: "Zacualpan + Veracruz", expect: true, parts: ["Predio en Zacualpan, Veracruz"] },
  // Must ACCEPT: rare toponym and official alias.
  { label: "rare toponym Petlacuatla", expect: true, parts: ["Edicto relativo a Petlacuatla, Veracruz"] },
  { label: "alias Cuarto Distrito Judicial", expect: true, parts: ["Juzgado Mixto del Cuarto Distrito Judicial"] },
];

let failed = 0;
for (const c of cases) {
  const got = matchJurisdiction(...c.parts);
  const ok = got.inJurisdiction === c.expect;
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  expect=${c.expect} got=${got.inJurisdiction} municipio=${got.municipio ?? "-"} matched=[${got.matched.join(", ")}]  ${c.label}`,
  );
}
// --- Triage rules -----------------------------------------------------------------------------
// Fixtures taken from real runs, not invented: the 2013 edict is the verified one from Gaceta
// wo80125.pdf (Juzgado Mixto de Huayacocotla, expediente 74/2011), and the gazette-index case is
// the wo43250.pdf false positive that used to rank first at 92/100.
const notice2013: RawLead = {
  type: "legal-notice",
  title: "Juicio sucesorio intestamentario — María Rodríguez Hernández",
  detail:
    "Se publica edicto dentro del expediente civil 74/2011 en el que Marcos, Carlota, Elías, " +
    "Petronila e Higinia Rodríguez Hernández denuncian la muerte sin testar de María Rodríguez " +
    "Hernández ante el Juzgado Mixto de Huayacocotla, Veracruz.",
  municipio: "Huayacocotla",
  date: "2013-02-19",
  sourceUrl: "http://www.ordenjuridico.gob.mx/Documentos/Estatal/Veracruz/x/wo80125.pdf",
  sourceName: "www.ordenjuridico.gob.mx",
};

const gazetteIndex: RawLead = {
  type: "legal-notice",
  title: "gaceta oficial - Veracruz",
  detail: "Ley Orgánica del Poder Judicial del Estado de Veracruz, publicada en la Gaceta Oficial.",
  municipio: "Huayacocotla",
  sourceUrl: "http://www.ordenjuridico.gob.mx/Documentos/Estatal/Veracruz/wo43250.pdf",
  sourceName: "www.ordenjuridico.gob.mx",
};

const portalIndex: RawLead = {
  type: "property",
  title: "30 terrenos en venta en Huayacocotla - Trovit",
  detail: "30 terrenos en venta en Huayacocotla desde $150,000.",
  sourceUrl: "https://casas.trovit.com.mx/terreno-huayacocotla",
  sourceName: "casas.trovit.com.mx",
};

const singleListing: RawLead = {
  type: "property",
  title: "Terreno habitacional en venta en Huayacocotla, Veracruz",
  detail: "Terreno de 300 m² en Huayacocotla, Veracruz.",
  sourceUrl: "https://propiedades.com/inmuebles/terreno-habitacional-huayacocotla-veracruz-7766730",
  sourceName: "propiedades.com",
};

console.log("\n--- triage rules ---");
const triaged = triageLeads([notice2013, gazetteIndex, portalIndex, singleListing]);
const byTitle = (t: string) => triaged.find((l) => l.title === t);

const checks: Array<{ label: string; ok: boolean; detail: string }> = [
  {
    label: "gazette index dropped (no notice evidence)",
    ok: byTitle(gazetteIndex.title) === undefined,
    detail: `present=${byTitle(gazetteIndex.title) !== undefined}`,
  },
  {
    label: "2013 edict kept but penalized as historical",
    ok: (() => {
      const l = byTitle(notice2013.title);
      return !!l && l.score < 60 && /antecedente hist/.test(l.reason);
    })(),
    detail: `score=${byTitle(notice2013.title)?.score} reason="${byTitle(notice2013.title)?.reason}"`,
  },
  {
    label: "portal index NOT claimed as a concrete property",
    ok: !/propiedad concreta/.test(byTitle(portalIndex.title)?.reason ?? ""),
    detail: `reason="${byTitle(portalIndex.title)?.reason}"`,
  },
  {
    label: "single listing IS claimed as concrete, and outranks the index",
    ok: (() => {
      const one = byTitle(singleListing.title);
      const many = byTitle(portalIndex.title);
      return !!one && !!many && /propiedad concreta/.test(one.reason) && one.score > many.score;
    })(),
    detail: `single=${byTitle(singleListing.title)?.score} index=${byTitle(portalIndex.title)?.score}`,
  },
];

for (const c of checks) {
  if (!c.ok) failed++;
  console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.label}\n      ${c.detail}`);
}

console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
