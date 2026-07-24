// The notary's actual jurisdiction: Cuarta Demarcación Notarial de Huayacocotla, Veracruz.
//
// Verified coextensive with the Cuarto Distrito Judicial ("Cuarto Distrito: Huayacocotla,
// Zacualpan, Ilamatlán y Texcatepec." — Gaceta Oficial, ordenjuridico.gob.mx/.../wo43250.pdf)
// and the Cuarta Zona Registral (Ley del Registro Público, .../wo77667.pdf). One territory,
// three official names — all three are valid search handles.
//
// Full dataset with sources and completeness caveats:
//   ~/claude/reference/veracruz-cuarta-demarcacion-notarial.md
//
// The localidad lists are INCOMPLETE (Zacualpan has none at all). Everything below is therefore
// designed so a missing localidad causes a false NEGATIVE (a real lead dropped), never a false
// positive (an out-of-jurisdiction lead admitted).

export type Municipio = {
  name: string;
  clave: string;
  /** True when the name also belongs to municipios in other states — needs "Veracruz" to count. */
  ambiguous: boolean;
};

export const MUNICIPIOS: Municipio[] = [
  { name: "Huayacocotla", clave: "30072", ambiguous: false },
  { name: "Ilamatlán", clave: "30076", ambiguous: false },
  { name: "Texcatepec", clave: "30170", ambiguous: false },
  // Zacualpan also names municipios in Nayarit, Estado de México and Morelos.
  { name: "Zacualpan", clave: "30198", ambiguous: true },
];

/**
 * Rare toponyms — distinctive enough that a match is near-proof of jurisdiction, and safe to use
 * as standalone search terms when paired with "Veracruz".
 */
export const HIGH_PRECISION_TOPONYMS = [
  "Petlacuatla",
  "Tzitzabí",
  "Tlaxháhuatl",
  "Dejigüí",
  "Zilacatipan",
  "Ayotuxtla",
  "Chichapala",
  "Tzimentey",
  "Zonzonapa",
  "Huitztipan",
  "Tlatlazoquico",
  "Xoxocapa",
  "Conquextla",
  "Mitecatlán",
  "Donangú",
  "Ixtatetla",
  "Tenantitlán",
  "Teximalpa",
  "Chahuatlán",
  "Tlamacuimpa",
  "Selekxiuiko",
  "Tonalixco",
  "Achiyahual",
  "Xaltipa",
  "Coacoaco",
  "Chochotla",
  "Apachitla",
  "Toltepec",
  "Tenexco",
  "Tzicatlán",
  "Petandú",
  "Atecongo",
  "Tenaxcalzingo",
];

/**
 * Names that exist inside the demarcación but are far too generic to prove anything on their own
 * ("El Plan", "Santa Cruz", "Buenavista" appear in every Mexican state). Kept for reference and
 * deliberately EXCLUDED from the geo-gate — admitting them would reintroduce the false-positive
 * class we are trying to kill.
 */
export const AMBIGUOUS_LOCALIDADES = [
  "El Plan",
  "El Capulín",
  "Buenavista",
  "Santa Cruz",
  "La Loma",
  "El Naranjo",
  "Rancho Nuevo",
  "Ojo de Agua",
  "El Puerto",
  "El Llano",
  "Loma Alta",
  "Santiago",
  "La Ceiba",
  "El Zapote",
  "Tlaxco",
  "Altamira",
  "Chapala",
  "San Mateo",
  "San Gregorio",
  "Tecapa",
  "La Florida",
  "Agua Linda",
  "Las Canoas",
  "Amatepec",
];

/** The jurisdiction's other official names — a document naming any of these is on-topic. */
export const JURISDICTION_ALIASES = [
  "Cuarta Demarcación Notarial",
  "Cuarto Distrito Judicial",
  "Cuarta Zona Registral",
];

/**
 * States that also host places sharing our toponyms. Verified false positive from a live run:
 * "Terrenos en Venta en Texcatepec, Chilcuautla - Hidalgo" passed the gate on the bare name.
 * Naming any of these WITHOUT naming Veracruz is positive evidence of being somewhere else —
 * stronger evidence than a shared place name is of being here.
 */
const CONFLICTING_STATES = [
  "Hidalgo",
  "Puebla",
  "Nayarit",
  "Morelos",
  "Estado de Mexico",
  "Edomex",
  "Guerrero",
  "Oaxaca",
  "Tlaxcala",
];

/** Domains that actually publish notices for this territory. */
export const SOURCE_DOMAINS = [
  "notariosveracruz.mx",
  "ordenjuridico.gob.mx",
  "pjeveracruz.gob.mx",
  "veracruz.gob.mx",
  "rematesjudicialesdgp.com.mx",
];

/** Lowercase and strip diacritics so "Ilamatlán" matches "ilamatlan". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Whole-word search on already-normalized text. */
function containsWord(haystack: string, needle: string): boolean {
  const escaped = normalize(needle).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}

export type GeoMatch = {
  inJurisdiction: boolean;
  /** The municipio the text points at, when one is identifiable. */
  municipio?: string;
  /** Every jurisdiction term matched — the audit trail for why a lead was admitted. */
  matched: string[];
};

/**
 * Deterministic geo-relevance gate. No LLM: this turns "is this lead relevant?" from a judgment
 * call into a verifiable string match, which is what kills the false positives we saw — a
 * cemetery-cleanup workday and a fiscalía building takeover both got badged as death notices.
 *
 * A text is inside the jurisdiction when it names a municipio, a rare local toponym, or one of
 * the jurisdiction's official aliases. "Zacualpan" additionally requires "Veracruz", because
 * three other states have one.
 */
export function matchJurisdiction(...parts: Array<string | undefined | null>): GeoMatch {
  const text = normalize(parts.filter(Boolean).join(" \n "));
  const mentionsVeracruz = containsWord(text, "Veracruz");
  const matched: string[] = [];
  let municipio: string | undefined;

  // Another state named and Veracruz absent — reject outright, before any name can match. Cheap
  // and it costs us nothing real: a genuine lead from this territory names Veracruz.
  const conflicting = CONFLICTING_STATES.find((s) => containsWord(text, s));
  if (conflicting && !mentionsVeracruz) {
    return { inJurisdiction: false, matched: [] };
  }

  for (const m of MUNICIPIOS) {
    if (!containsWord(text, m.name)) continue;
    if (m.ambiguous && !mentionsVeracruz) continue;
    matched.push(m.name);
    municipio ??= m.name;
  }

  for (const t of HIGH_PRECISION_TOPONYMS) {
    if (containsWord(text, t)) matched.push(t);
  }

  for (const alias of JURISDICTION_ALIASES) {
    if (containsWord(text, alias)) matched.push(alias);
  }

  return { inJurisdiction: matched.length > 0, municipio, matched };
}

export const MUNICIPIO_NAMES = MUNICIPIOS.map((m) => m.name);

/** e.g. `Huayacocotla OR Ilamatlán OR Texcatepec OR Zacualpan` */
export const MUNICIPIOS_OR = MUNICIPIO_NAMES.join(" OR ");
