// Pipeline store — the dashboard's data layer, entirely in the browser.
//
// localStorage rather than a database: the whole pipeline is one notary's working list, it must
// survive a page reload and nothing more, and shipping a datastore the day of a demo buys risk
// without buying anything the demo needs. The trade-off is real and worth naming: the pipeline
// lives on one browser profile. Moving it server-side later means swapping the four functions
// below for fetches — nothing above this file knows how it is stored.

import type { Lead } from "@/agent/leads";
import type { ConversionResult } from "./playbooks";

export const PIPELINE_KEY = "lead-radar-pipeline";
export const HISTORY_KEY = "lead-radar-history";
const BACKFILL_MARK_KEY = "lead-radar-pipeline-backfilled-through";
export const MAX_HISTORY = 10;

/** One scan, as stored by the Lead Radar page. */
export type RunRecord = {
  timestamp: number;
  leads: Lead[];
  digest: string;
  mode: "agent" | "fallback" | "";
};

export type PipelineStatus = "new" | "contacted" | "converted" | "discarded";

export const STATUS_ORDER: PipelineStatus[] = ["new", "contacted", "converted", "discarded"];

export type ExecutionState = {
  startedAt: number;
  result?: ConversionResult;
  checkedSteps: string[];
};

export type PipelineEntry = {
  lead: Lead;
  /** Stable id — the source URL, the same key discovery already dedupes on. */
  id: string;
  firstSeen: number;
  lastSeen: number;
  runCount: number;
  status: PipelineStatus;
  execution?: ExecutionState;
};

type Pipeline = Record<string, PipelineEntry>;

function read(): Pipeline {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PIPELINE_KEY) ?? "{}") as Pipeline;
  } catch {
    return {};
  }
}

function write(pipeline: Pipeline) {
  localStorage.setItem(PIPELINE_KEY, JSON.stringify(pipeline));
}

export function loadHistory(): RunRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as RunRecord[];
  } catch {
    return [];
  }
}

export function saveHistory(history: RunRecord[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

/**
 * File a scan's leads. New signals arrive as "new"; a signal seen again keeps its status and
 * whatever execution work has been done on it, and only its lastSeen/runCount move. A scan must
 * never undo the notary's own bookkeeping.
 */
export function upsertLeads(leads: Lead[], at = Date.now()): Pipeline {
  const pipeline = read();
  for (const lead of leads) {
    const id = lead.sourceUrl;
    const existing = pipeline[id];
    if (existing) {
      pipeline[id] = {
        ...existing,
        lead, // refresh the score/reason from the newest scan
        lastSeen: at,
        runCount: existing.runCount + 1,
      };
    } else {
      pipeline[id] = { id, lead, firstSeen: at, lastSeen: at, runCount: 1, status: "new" };
    }
  }
  write(pipeline);
  return pipeline;
}

/**
 * Record a finished scan: prepend it to the history, file its leads, and move the backfill mark
 * past it so the dashboard doesn't file the same scan a second time. Returns the trimmed history.
 */
export function recordRun(record: RunRecord, history: RunRecord[]): RunRecord[] {
  const next = [record, ...history].slice(0, MAX_HISTORY);
  saveHistory(next);
  upsertLeads(record.leads, record.timestamp);
  localStorage.setItem(BACKFILL_MARK_KEY, String(record.timestamp));
  return next;
}

/**
 * Replay the stored scan history into the pipeline, oldest first, so firstSeen reflects the scan a
 * signal actually first appeared in. Runs on dashboard load: history predates the pipeline, so
 * without this the earlier scans of the day would be invisible on the board.
 *
 * The high-water mark makes this idempotent — a scan is only replayed once, so revisiting the
 * dashboard doesn't inflate runCount or resurrect a signal the notary dismissed.
 */
export function backfillFromHistory() {
  const mark = Number(localStorage.getItem(BACKFILL_MARK_KEY) ?? 0);
  let highest = mark;
  for (const record of [...loadHistory()].reverse()) {
    if (record.timestamp <= mark) continue;
    upsertLeads(record.leads, record.timestamp);
    highest = Math.max(highest, record.timestamp);
  }
  localStorage.setItem(BACKFILL_MARK_KEY, String(highest));
}

export function loadPipeline(): PipelineEntry[] {
  return Object.values(read()).sort((a, b) => b.lead.score - a.lead.score);
}

export function setStatus(id: string, status: PipelineStatus): PipelineEntry[] {
  const pipeline = read();
  const entry = pipeline[id];
  if (entry) {
    pipeline[id] = { ...entry, status };
    write(pipeline);
  }
  return loadPipeline();
}

export function saveExecution(id: string, patch: Partial<ExecutionState>): PipelineEntry[] {
  const pipeline = read();
  const entry = pipeline[id];
  if (entry) {
    const base: ExecutionState = entry.execution ?? { startedAt: Date.now(), checkedSteps: [] };
    pipeline[id] = { ...entry, execution: { ...base, ...patch } };
    write(pipeline);
  }
  return loadPipeline();
}
