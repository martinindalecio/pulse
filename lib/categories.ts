// Signal categories — the notary-facing taxonomy.
//
// The coarse `type` ("property" | "legal-notice") is what discovery produces; it is too blunt to
// act on. A juicio sucesorio and a remate judicial are both "legal-notice" but they are entirely
// different pieces of notarial work with different documents, deadlines and parties. The category
// is what the conversion playbooks key off of, so it has to be assigned deterministically — same
// rule as the rest of triage: no model decides what kind of matter this is.
//
// Kept in lib/ (not agent/) deliberately: the client imports the labels, and importing from
// agent/leads.ts would pull the You.com fetch wrappers into the browser bundle.

export type LeadCategory =
  | "succession" // juicio sucesorio — intestamentario or testamentario
  | "auction" // remate judicial / almoneda
  | "absence" // declaración de ausencia o presunción de muerte
  | "edict" // court edict that isn't one of the above
  | "property-sale"; // real-estate listing

export const CATEGORY_ORDER: LeadCategory[] = [
  "succession",
  "auction",
  "absence",
  "edict",
  "property-sale",
];

export const CATEGORY_LABELS: Record<LeadCategory, { en: string; es: string }> = {
  succession: { en: "Probate / Succession", es: "Juicio sucesorio" },
  auction: { en: "Judicial auction", es: "Remate judicial" },
  absence: { en: "Declaration of absence", es: "Declaración de ausencia" },
  edict: { en: "Court edict", es: "Edicto judicial" },
  "property-sale": { en: "Real-estate sale", es: "Compraventa inmobiliaria" },
};

/** Used only in the WhatsApp digest, where an emoji is the only formatting the channel has. */
export const CATEGORY_EMOJI: Record<LeadCategory, string> = {
  succession: "⚖️",
  auction: "🔨",
  absence: "📋",
  edict: "📜",
  "property-sale": "🏠",
};

/** One-line explanation of why this category is notarial work — shown on the dashboard. */
export const CATEGORY_BLURBS: Record<LeadCategory, { en: string; es: string }> = {
  succession: {
    en: "An estate is being settled. Succession proceedings are drawn up and formalised before a notary.",
    es: "Una sucesión está en trámite. El juicio sucesorio se protocoliza ante notario.",
  },
  auction: {
    en: "A property is being auctioned by court order. The transfer deed requires a notary.",
    es: "Un inmueble se remata por orden judicial. La escritura de adjudicación requiere notario.",
  },
  absence: {
    en: "An absence declaration is under way — a precursor to succession and asset administration.",
    es: "Hay una declaración de ausencia en curso — antesala de sucesión y administración de bienes.",
  },
  edict: {
    en: "A court edict published in the district. May precede notarial work; review to confirm.",
    es: "Edicto judicial publicado en el distrito. Puede anteceder trabajo notarial; revisar.",
  },
  "property-sale": {
    en: "A property is on the market. A completed sale needs a notarised deed (escrituración).",
    es: "Un inmueble está en venta. La operación cerrada requiere escrituración ante notario.",
  },
};

// Diacritic-insensitive so "sucesión"/"sucesion" and "declaración"/"declaracion" both match — the
// same normalisation the geo-gate and the notice-evidence gate in agent/leads.ts use.
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

// Order matters: the specific matters are checked before the generic "edict" fallback, so a
// "Edicto: juicio sucesorio intestamentario" is filed as a succession rather than a bare edict.
const CATEGORY_PATTERNS: Array<{ category: LeadCategory; pattern: RegExp }> = [
  {
    category: "succession",
    pattern: /\b(sucesori|sucesion|intestamentari|testamentari|herencia|heredero|albacea)/,
  },
  { category: "auction", pattern: /\b(remate|almoneda|adjudicacion)/ },
  { category: "absence", pattern: /\b(ausencia|presuncion de muerte)/ },
];

/**
 * Assign a category from the candidate's own text. Falls back on the coarse type so every lead
 * always has a category — an unclassifiable legal notice is still an edict, and anything of type
 * "property" is a property sale.
 */
export function classifyLead(input: {
  type: "property" | "legal-notice";
  title: string;
  detail: string;
}): LeadCategory {
  if (input.type === "property") return "property-sale";

  const text = normalize(`${input.title} ${input.detail}`);
  for (const { category, pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return "edict";
}
