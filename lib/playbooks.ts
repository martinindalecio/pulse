// Conversion playbooks — the fixed half of agentic execution.
//
// When the notary starts an execution on a signal, two things happen: a You.com Research call goes
// out about that specific matter (live, variable, occasionally unavailable), and this checklist is
// selected by category (fixed, identical every run, never wrong about procedure). Keeping the
// procedure deterministic is the same principle as the triage gates — the model contributes
// research on the case, not an opinion on how notarial work is done.
//
// Lives in lib/ so the dashboard can render a playbook without importing the You.com wrappers.

import type { LeadCategory } from "./categories";

export type PlaybookStep = {
  id: string;
  en: string;
  es: string;
};

/** What `runConversion` returns. Declared here so client components can type the response. */
export type ConversionResearch = {
  summary: string;
  parties: string[];
  next_steps: string[];
  risks: string[];
  sources: Array<{ url: string; title: string }>;
};

export type ConversionResult = {
  category: LeadCategory;
  playbook: PlaybookStep[];
  research: ConversionResearch | null;
  /** True when the Research call failed — the panel renders the playbook alone rather than an error. */
  degraded: boolean;
  degradedReason?: string;
  generatedAt: number;
};

export const CONVERSION_PLAYBOOKS: Record<LeadCategory, PlaybookStep[]> = {
  succession: [
    {
      id: "succession-1",
      en: "Confirm the case: court, docket number and current stage of the succession proceeding.",
      es: "Confirmar el asunto: juzgado, número de expediente y etapa actual del juicio sucesorio.",
    },
    {
      id: "succession-2",
      en: "Identify the heirs and the estate administrator (albacea), and whether a will exists.",
      es: "Identificar a los herederos y al albacea, y si existe testamento.",
    },
    {
      id: "succession-3",
      en: "Query the National Wills Registry (RENAT) and the state wills registry.",
      es: "Consultar el Registro Nacional de Testamentos (RENAT) y el registro estatal de testamentos.",
    },
    {
      id: "succession-4",
      en: "Pull the property records from the Public Registry for every asset in the estate.",
      es: "Obtener los antecedentes registrales del RPP para cada bien del acervo hereditario.",
    },
    {
      id: "succession-5",
      en: "Check whether the succession can be settled before a notary (all heirs of age, in agreement, no contest).",
      es: "Verificar si la sucesión puede tramitarse ante notario (herederos mayores, de acuerdo, sin controversia).",
    },
    {
      id: "succession-6",
      en: "Prepare the fee quote and the document checklist for the first client meeting.",
      es: "Preparar la cotización de honorarios y la lista de documentos para la primera reunión.",
    },
  ],
  auction: [
    {
      id: "auction-1",
      en: "Confirm the auction date, the court and the docket number of the enforcement proceeding.",
      es: "Confirmar la fecha del remate, el juzgado y el expediente del procedimiento de ejecución.",
    },
    {
      id: "auction-2",
      en: "Obtain the property's registry certificate and its certificate of no encumbrances.",
      es: "Obtener el certificado registral del inmueble y el certificado de libertad de gravamen.",
    },
    {
      id: "auction-3",
      en: "Verify the appraisal on file and the opening bid (postura legal).",
      es: "Verificar el avalúo en autos y la postura legal.",
    },
    {
      id: "auction-4",
      en: "Identify the likely bidders and the creditor pressing the enforcement.",
      es: "Identificar a los postores probables y al acreedor que ejecuta.",
    },
    {
      id: "auction-5",
      en: "Prepare the award deed (escritura de adjudicación) requirements and the tax calculation.",
      es: "Preparar los requisitos de la escritura de adjudicación y el cálculo de impuestos.",
    },
  ],
  absence: [
    {
      id: "absence-1",
      en: "Confirm the court, the docket number and the stage of the absence declaration.",
      es: "Confirmar el juzgado, el expediente y la etapa de la declaración de ausencia.",
    },
    {
      id: "absence-2",
      en: "Identify the petitioner and their relationship to the absent person.",
      es: "Identificar al promovente y su parentesco con la persona ausente.",
    },
    {
      id: "absence-3",
      en: "List the absent person's assets and check which ones are recorded in the Public Registry.",
      es: "Inventariar los bienes de la persona ausente y verificar cuáles están inscritos en el RPP.",
    },
    {
      id: "absence-4",
      en: "Track the statutory waiting periods — they determine when a succession can be opened.",
      es: "Dar seguimiento a los plazos legales — determinan cuándo puede abrirse la sucesión.",
    },
    {
      id: "absence-5",
      en: "Offer to act on the appointment of the representative or administrator of the estate.",
      es: "Ofrecer intervenir en el nombramiento del representante o depositario de los bienes.",
    },
  ],
  edict: [
    {
      id: "edict-1",
      en: "Read the full edict at the source and determine the type of proceeding.",
      es: "Leer el edicto completo en la fuente y determinar el tipo de procedimiento.",
    },
    {
      id: "edict-2",
      en: "Confirm the court has jurisdiction in the Fourth Notarial District.",
      es: "Confirmar que el juzgado corresponde a la Cuarta Demarcación Notarial.",
    },
    {
      id: "edict-3",
      en: "Identify the parties and whether any notarial instrument is required by the proceeding.",
      es: "Identificar a las partes y si el procedimiento requiere algún instrumento notarial.",
    },
    {
      id: "edict-4",
      en: "Note the publication deadlines stated in the edict.",
      es: "Anotar los plazos de publicación señalados en el edicto.",
    },
    {
      id: "edict-5",
      en: "Reclassify the matter and re-run this execution once the proceeding type is confirmed.",
      es: "Reclasificar el asunto y repetir esta ejecución una vez confirmado el procedimiento.",
    },
  ],
  "property-sale": [
    {
      id: "property-1",
      en: "Verify the listing is current and identify the seller or the listing agent.",
      es: "Verificar que el anuncio sigue vigente e identificar al vendedor o al asesor.",
    },
    {
      id: "property-2",
      en: "Pull the registry record: current owner, encumbrances, and the property's registry folio.",
      es: "Obtener el antecedente registral: propietario actual, gravámenes y folio real del inmueble.",
    },
    {
      id: "property-3",
      en: "Check the tax status — property tax and water charges paid up to date.",
      es: "Revisar la situación fiscal — predial y agua al corriente.",
    },
    {
      id: "property-4",
      en: "Confirm whether the land is ejidal or fully titled — this changes the entire procedure.",
      es: "Confirmar si el predio es ejidal o de propiedad privada — cambia todo el procedimiento.",
    },
    {
      id: "property-5",
      en: "Estimate closing costs (ISABI, appraisal, registry fees) and prepare the quote.",
      es: "Estimar los gastos de escrituración (ISABI, avalúo, derechos registrales) y preparar la cotización.",
    },
    {
      id: "property-6",
      en: "Reach out to the seller offering to handle the deed.",
      es: "Contactar al vendedor ofreciendo llevar la escrituración.",
    },
  ],
};
