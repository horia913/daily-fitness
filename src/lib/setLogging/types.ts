/**
 * Golden Logging Flow — Types
 *
 * Single source of truth for the set-logging state machine, idempotency keys,
 * pending entries, and sessionStorage serialization shapes.
 */

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export enum SetInstanceState {
  /** Set row is visible but not yet logged */
  Idle = "idle",
  /** Optimistic local write applied, UI shows "logged" immediately */
  PendingLocal = "pendingLocal",
  /** RPE modal is open for this set */
  AwaitingRPE = "awaitingRPE",
  /** Background sync in-flight (rest timer may be open in parallel — UI only) */
  PendingSync = "pendingSync",
  /** Successfully persisted to Supabase */
  Synced = "synced",
  /** Sync failed after retries; shown as "Not synced" with retry affordance */
  SyncFailed = "syncFailed",
}

// ---------------------------------------------------------------------------
// Pending entry (one per logged set instance)
// ---------------------------------------------------------------------------

export interface PendingSetEntry {
  /** Client-generated idempotency key */
  key: string;
  /** Current lifecycle state */
  state: SetInstanceState;

  // --- Data captured at log time (optimistic) ---
  blockId: string;
  blockType: string;
  exerciseId: string;
  setNumber: number;
  /** Full payload to send to /api/log-set */
  payload: Record<string, unknown>;

  // --- RPE (added after RPE confirm, null if skipped) ---
  rpe: number | null;

  // --- Sync metadata ---
  /** Number of sync attempts so far */
  syncAttempts: number;
  /** Timestamp of last sync attempt (ms) */
  lastSyncAttemptAt: number | null;
  /** set_log_id returned by server after successful sync */
  serverSetLogId: string | null;
  /** Timestamp when the entry was created (ms) */
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Idempotency key
// ---------------------------------------------------------------------------

export type IdempotencyKey = string;

/**
 * Build a deterministic idempotency key for a set instance.
 *
 * Format: `${sessionId}:${blockId}:${exerciseId}:${setNumber}:${YYYY-MM-DD}`
 */
export function buildIdempotencyKey(
  sessionId: string | null | undefined,
  blockId: string,
  exerciseId: string,
  setNumber: number,
): IdempotencyKey {
  const session = sessionId || "local";
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `${session}:${blockId}:${exerciseId}:${setNumber}:${date}`;
}

// ---------------------------------------------------------------------------
// sessionStorage serialization
// ---------------------------------------------------------------------------

/** Shape stored in sessionStorage under key `glf:${sessionId}` */
export interface GoldenLogStoragePayload {
  usedKeys: string[];
  pendingEntries: PendingSetEntry[];
}

/** sessionStorage key prefix */
export const GLF_STORAGE_PREFIX = "glf:";
