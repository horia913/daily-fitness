/**
 * Golden Logging Flow — Pure helpers
 *
 * No React dependencies. Stateless functions for:
 *  - creating pending entries
 *  - building the sync payload
 *  - exponential-backoff retry
 *  - sessionStorage persist / rehydrate
 */

import {
  type PendingSetEntry,
  type GoldenLogStoragePayload,
  type IdempotencyKey,
  SetInstanceState,
  GLF_STORAGE_PREFIX,
  buildIdempotencyKey,
} from "./types";

// Re-export for convenience
export { buildIdempotencyKey };

// ---------------------------------------------------------------------------
// Create a new pending entry (optimistic local write)
// ---------------------------------------------------------------------------

export function createPendingEntry(
  key: IdempotencyKey,
  blockId: string,
  blockType: string,
  exerciseId: string,
  setNumber: number,
  payload: Record<string, unknown>,
): PendingSetEntry {
  return {
    key,
    state: SetInstanceState.PendingLocal,
    blockId,
    blockType,
    exerciseId,
    setNumber,
    payload,
    rpe: null,
    syncAttempts: 0,
    lastSyncAttemptAt: null,
    serverSetLogId: null,
    createdAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Build the request body for POST /api/log-set
// ---------------------------------------------------------------------------

export function buildSyncPayload(entry: PendingSetEntry): Record<string, unknown> {
  const body: Record<string, unknown> = {
    ...entry.payload,
    idempotency_key: entry.key,
  };

  // Include RPE if user provided one
  if (entry.rpe !== null) {
    body.rpe = entry.rpe;
  }

  return body;
}

// ---------------------------------------------------------------------------
// Exponential backoff
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2_000;

/**
 * Returns delay in ms for the given attempt (0-indexed).
 * attempt 0 → 2 000 ms, attempt 1 → 4 000 ms, attempt 2 → 8 000 ms
 */
export function retryDelayMs(attempt: number): number {
  return BASE_DELAY_MS * Math.pow(2, attempt);
}

export function shouldRetry(entry: PendingSetEntry): boolean {
  return entry.syncAttempts < MAX_RETRIES;
}

export { MAX_RETRIES };

// ---------------------------------------------------------------------------
// Sync a single pending entry (fires fetch, handles success / failure)
// ---------------------------------------------------------------------------

const SYNC_TIMEOUT_MS = 10_000;

/** Matches `pr_detected` from POST /api/log-set (for PRCelebrationModal). */
export interface PrDetectedFromLogSet {
  type: "weight" | "reps";
  exercise_name: string;
  new_value: number;
  previous_value: number | null;
  unit: string;
  weight_kg?: number;
  reps?: number;
}

export interface LogSetPrSummary {
  any_weight_pr?: boolean;
  any_volume_pr?: boolean;
  message?: string | null;
  warning?: string;
}

export async function syncEntry(
  entry: PendingSetEntry,
): Promise<{
  success: boolean;
  set_log_id?: string;
  e1rm?: number;
  isNewPR?: boolean;
  deduplicated?: boolean;
  pr_detected?: PrDetectedFromLogSet | null;
  pr?: LogSetPrSummary;
  new_achievements?: unknown[];
  error?: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

  try {
    const response = await fetch("/api/log-set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSyncPayload(entry)),
      signal: controller.signal,
      credentials: "include",
    });

    clearTimeout(timeoutId);

    const text = await response.text().catch(() => "");
    let parsed: Record<string, unknown> = {};
    if (text.trim()) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { error: text };
      }
    }

    if (response.ok && parsed.success) {
      const prObj = parsed.pr as LogSetPrSummary | undefined;
      return {
        success: true,
        set_log_id: parsed.set_log_id as string | undefined,
        e1rm: (parsed.e1rm as { stored?: number; calculated?: number } | undefined)?.stored
          ?? (parsed.e1rm as { stored?: number; calculated?: number } | undefined)?.calculated,
        isNewPR: !!(
          prObj?.any_weight_pr ||
          prObj?.any_volume_pr
        ),
        deduplicated: !!parsed.deduplicated,
        pr_detected: (parsed.pr_detected as PrDetectedFromLogSet | null | undefined) ?? null,
        pr: prObj,
        new_achievements: Array.isArray(parsed.new_achievements)
          ? parsed.new_achievements
          : [],
      };
    }

    return {
      success: false,
      error: (parsed.error as string) || `HTTP ${response.status}`,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort =
      err instanceof DOMException && err.name === "AbortError";
    return {
      success: false,
      error: isAbort ? "Timeout" : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// sessionStorage helpers
// ---------------------------------------------------------------------------

function storageKey(sessionId: string | null | undefined): string {
  return `${GLF_STORAGE_PREFIX}${sessionId || "local"}`;
}

export function persistToStorage(
  sessionId: string | null | undefined,
  usedKeys: Set<string>,
  pendingEntries: Map<string, PendingSetEntry>,
): void {
  try {
    const payload: GoldenLogStoragePayload = {
      usedKeys: Array.from(usedKeys),
      pendingEntries: Array.from(pendingEntries.values()),
    };
    sessionStorage.setItem(storageKey(sessionId), JSON.stringify(payload));
  } catch {
    // sessionStorage full or unavailable — non-critical
  }
}

export function rehydrateFromStorage(
  sessionId: string | null | undefined,
): { usedKeys: Set<string>; pendingEntries: Map<string, PendingSetEntry> } {
  const empty = { usedKeys: new Set<string>(), pendingEntries: new Map<string, PendingSetEntry>() };
  try {
    const raw = sessionStorage.getItem(storageKey(sessionId));
    if (!raw) return empty;

    const payload: GoldenLogStoragePayload = JSON.parse(raw);
    const usedKeys = new Set(payload.usedKeys ?? []);
    const pendingEntries = new Map<string, PendingSetEntry>();
    for (const entry of payload.pendingEntries ?? []) {
      pendingEntries.set(entry.key, entry);
    }
    return { usedKeys, pendingEntries };
  } catch {
    return empty;
  }
}

export function clearStorageKey(
  sessionId: string | null | undefined,
  key: IdempotencyKey,
): void {
  try {
    const raw = sessionStorage.getItem(storageKey(sessionId));
    if (!raw) return;

    const payload: GoldenLogStoragePayload = JSON.parse(raw);
    payload.usedKeys = payload.usedKeys.filter((k) => k !== key);
    payload.pendingEntries = payload.pendingEntries.filter((e) => e.key !== key);
    sessionStorage.setItem(storageKey(sessionId), JSON.stringify(payload));
  } catch {
    // non-critical
  }
}
