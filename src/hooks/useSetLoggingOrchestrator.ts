/**
 * Golden Logging Flow — React Orchestrator Hook
 *
 * Manages per-set state machine, idempotency guards (persisted in sessionStorage),
 * RPE → rest-timer sequencing, and background sync with retry.
 *
 * KEY INVARIANT:
 *   RPE confirm/skip fires async sync AND opens rest timer in parallel.
 *   Rest timer is purely UI — it NEVER gates persistence.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type PendingSetEntry,
  type IdempotencyKey,
  SetInstanceState,
  buildIdempotencyKey,
} from "@/lib/setLogging/types";
import {
  createPendingEntry,
  syncEntry,
  shouldRetry,
  retryDelayMs,
  persistToStorage,
  rehydrateFromStorage,
  clearStorageKey,
  type PrDetectedFromLogSet,
  type LogSetPrSummary,
} from "@/lib/setLogging/goldenLogSet";

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface SetLoggingOrchestrator {
  /**
   * Log a set optimistically.
   * Returns `{ accepted: true }` if the entry was created,
   * or `{ accepted: false, reason }` if rejected (duplicate key, etc.).
   */
  logSet: (params: LogSetParams) => LogSetResult;

  /** Clear idempotency key so the same set can be logged again (e.g. after user deleted the set). */
  clearKey: (key: IdempotencyKey) => void;

  /** Confirm RPE for the active set → fires async sync + requests rest timer */
  confirmRpe: (rpe: number) => void;

  /** Skip RPE for the active set → fires async sync (no rpe) + requests rest timer */
  skipRpe: () => void;

  /** Manual retry for a syncFailed entry */
  retrySync: (key: IdempotencyKey) => void;

  /** Update RPE for a pending entry (for inline RPE updates) */
  updateRPE: (setLogId: string, rpe: number) => void;

  // --- State for UI bindings ---

  /** True when RPE modal should be shown (deprecated - kept for compatibility, always false now) */
  showRpeModal: boolean;

  /** True when rest timer should be shown (UI-only, does not gate sync) */
  shouldOpenRestTimer: boolean;

  /** Acknowledge rest timer opened (reset the flag) */
  ackRestTimerOpened: () => void;

  /** The currently active set entry (awaiting RPE or syncing) */
  activeEntry: PendingSetEntry | null;

  /** All pending entries (for unsynced indicator in UI) */
  pendingEntries: Map<string, PendingSetEntry>;
}

export interface LogSetParams {
  sessionId: string | null | undefined;
  blockId: string;
  blockType: string;
  exerciseId: string;
  setNumber: number;
  /** Full payload the old `logSetToDatabase` would send */
  payload: Record<string, unknown>;
  /** When true, do NOT open rest timer (last set of block) */
  isLastSet?: boolean;
}

export type LogSetResult =
  | { accepted: true; key: IdempotencyKey }
  | { accepted: false; reason: string };

// ---------------------------------------------------------------------------
// Sync success callback — allows parent to react to background sync results
// ---------------------------------------------------------------------------

export interface SyncSuccessResult {
  key: IdempotencyKey;
  entry: PendingSetEntry;
  set_log_id?: string;
  e1rm?: number;
  isNewPR?: boolean;
  deduplicated?: boolean;
  pr_detected?: PrDetectedFromLogSet | null;
  pr?: LogSetPrSummary;
  new_achievements?: unknown[];
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useSetLoggingOrchestrator(
  sessionId: string | null | undefined,
  /** Called when background sync completes successfully (for e1RM, PR toasts, etc.) */
  onSyncSuccess?: (result: SyncSuccessResult) => void,
): SetLoggingOrchestrator {
  // ---- Refs for mutable state that doesn't need re-renders ----
  const usedKeysRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<Map<string, PendingSetEntry>>(new Map());
  const rehydratedRef = useRef(false);

  // ---- React state (drives UI) ----
  const [showRpeModal, setShowRpeModal] = useState(false);
  const [shouldOpenRestTimer, setShouldOpenRestTimer] = useState(false);
  const [activeKey, setActiveKey] = useState<IdempotencyKey | null>(null);
  // Trigger re-renders when pending entries change (for UI indicators)
  const [pendingVersion, setPendingVersion] = useState(0);

  // ---- Rehydrate from sessionStorage on mount ----
  useEffect(() => {
    if (rehydratedRef.current) return;
    rehydratedRef.current = true;

    let { usedKeys, pendingEntries } = rehydrateFromStorage(sessionId);

    // Allow retry: remove keys whose pending entry never synced (SyncFailed)
    const failedKeys: string[] = [];
    for (const [k, entry] of pendingEntries.entries()) {
      if (entry.state === SetInstanceState.SyncFailed) failedKeys.push(k);
    }
    for (const k of failedKeys) {
      usedKeys.delete(k);
      pendingEntries.delete(k);
      clearStorageKey(sessionId, k);
    }
    persistToStorage(sessionId, usedKeys, pendingEntries);

    usedKeysRef.current = usedKeys;
    pendingRef.current = pendingEntries;

    // Re-trigger sync for any entries that were mid-sync before refresh
    for (const entry of pendingEntries.values()) {
      if (
        entry.state === SetInstanceState.PendingSync ||
        entry.state === SetInstanceState.SyncFailed
      ) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        startBackgroundSync(entry.key);
      }
    }

    if (pendingEntries.size > 0) {
      setPendingVersion((v) => v + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ---- Persist helper (called after every mutation) ----
  const persist = useCallback(() => {
    persistToStorage(sessionId, usedKeysRef.current, pendingRef.current);
  }, [sessionId]);

  // ---- Background sync with retry ----
  const startBackgroundSync = useCallback(
    (key: IdempotencyKey) => {
      const entry = pendingRef.current.get(key);
      if (!entry) return;

      // Mark as pendingSync
      entry.state = SetInstanceState.PendingSync;
      entry.syncAttempts += 1;
      entry.lastSyncAttemptAt = Date.now();
      persist();
      setPendingVersion((v) => v + 1);

      // Fire-and-forget async sync
      (async () => {
        const result = await syncEntry(entry);

        const current = pendingRef.current.get(key);
        if (!current) return; // entry was removed (e.g., by merge)

        if (result.success) {
          current.state = SetInstanceState.Synced;
          current.serverSetLogId = result.set_log_id ?? null;

          // Notify parent (e1RM updates, PR toasts, etc.)
          onSyncSuccess?.({
            key,
            entry: { ...current },
            set_log_id: result.set_log_id,
            e1rm: result.e1rm,
            isNewPR: result.isNewPR,
            deduplicated: result.deduplicated,
            pr_detected: result.pr_detected,
            pr: result.pr,
            new_achievements: result.new_achievements,
          });

          // Remove from pending + storage
          pendingRef.current.delete(key);
          clearStorageKey(sessionId, key);
          persist();
          setPendingVersion((v) => v + 1);
          return;
        }

        // Failure path
        if (shouldRetry(current)) {
          current.state = SetInstanceState.SyncFailed;
          persist();
          setPendingVersion((v) => v + 1);

          const delay = retryDelayMs(current.syncAttempts - 1);
          setTimeout(() => {
            startBackgroundSync(key);
          }, delay);
        } else {
          // Exhausted retries
          current.state = SetInstanceState.SyncFailed;
          persist();
          setPendingVersion((v) => v + 1);
        }
      })();
    },
    [persist, sessionId],
  );

  // ---- logSet ----
  const logSet = useCallback(
    (params: LogSetParams): LogSetResult => {
      const key = buildIdempotencyKey(
        params.sessionId,
        params.blockId,
        params.exerciseId,
        params.setNumber,
      );

      // Duplicate guard — allow retry if the existing entry never reached Synced (stale/failed/awaiting)
      if (usedKeysRef.current.has(key)) {
        const existing = pendingRef.current.get(key);
        const canRetry =
          existing &&
          existing.state !== SetInstanceState.Synced;
        if (canRetry) {
          usedKeysRef.current.delete(key);
          pendingRef.current.delete(key);
          clearStorageKey(sessionId, key);
          persist();
          // Fall through to create a fresh entry below (same key, now allowed)
        } else {
          return { accepted: false, reason: "duplicate_key" };
        }
      }

      // Create optimistic entry
      const entry = createPendingEntry(
        key,
        params.blockId,
        params.blockType,
        params.exerciseId,
        params.setNumber,
        params.payload,
      );

      // Transition: idle → pendingLocal → pendingSync (skip RPE modal)
      // RPE is now handled inline after set logging, not blocking
      entry.state = SetInstanceState.PendingSync;
      entry.rpe = null; // No RPE initially, can be added later via inline row

      usedKeysRef.current.add(key);
      pendingRef.current.set(key, entry);
      persist();

      // Start background sync immediately (no RPE modal delay)
      startBackgroundSync(key);

      // Signal rest timer should open only when NOT the last set of the block
      if (!params.isLastSet) {
        setShouldOpenRestTimer(true);
      }
      setActiveKey(key);
      setPendingVersion((v) => v + 1);

      return { accepted: true, key };
    },
    [persist],
  );

  // ---- confirmRpe ----
  const confirmRpe = useCallback(
    (rpe: number) => {
      if (!activeKey) return;
      const entry = pendingRef.current.get(activeKey);
      if (!entry) return;

      // Update entry with RPE
      entry.rpe = rpe;
      // Close RPE modal
      setShowRpeModal(false);

      // Fire async sync immediately (rest timer does NOT gate this)
      startBackgroundSync(activeKey);

      // Signal rest timer should open
      setShouldOpenRestTimer(true);
    },
    [activeKey, startBackgroundSync],
  );

  // ---- skipRpe ----
  const skipRpe = useCallback(() => {
    if (!activeKey) return;
    const entry = pendingRef.current.get(activeKey);
    if (!entry) return;

    // No RPE value
    entry.rpe = null;
    // Close RPE modal
    setShowRpeModal(false);

    // Fire async sync immediately
    startBackgroundSync(activeKey);

    // Signal rest timer should open
    setShouldOpenRestTimer(true);
  }, [activeKey, startBackgroundSync]);

  // ---- ackRestTimerOpened ----
  const ackRestTimerOpened = useCallback(() => {
    setShouldOpenRestTimer(false);
    // Active key stays set until next logSet call
  }, []);

  // ---- retrySync ----
  const retrySyncFn = useCallback(
    (key: IdempotencyKey) => {
      const entry = pendingRef.current.get(key);
      if (!entry || entry.state !== SetInstanceState.SyncFailed) return;

      // Reset attempts for manual retry
      entry.syncAttempts = 0;
      startBackgroundSync(key);
    },
    [startBackgroundSync],
  );

  // ---- clearKey (e.g. after user deletes a set so they can re-log that set number) ----
  const clearKey = useCallback(
    (key: IdempotencyKey) => {
      usedKeysRef.current.delete(key);
      pendingRef.current.delete(key);
      clearStorageKey(sessionId, key);
      persist();
      setPendingVersion((v) => v + 1);
    },
    [sessionId, persist],
  );

  // ---- updateRPE (for inline RPE updates after set is logged) ----
  const updateRPE = useCallback(
    (setLogId: string, rpe: number) => {
      // Find the pending entry by serverSetLogId (if synced) or by matching temp ID pattern
      // For optimistic sets, we match by finding the most recent entry with matching block/exercise
      let targetEntry: PendingSetEntry | null = null;
      
      // First try to find by serverSetLogId (synced sets)
      for (const entry of pendingRef.current.values()) {
        if (entry.serverSetLogId === setLogId) {
          targetEntry = entry;
          break;
        }
      }

      // If not found and setLogId looks like a temp ID, find the most recent pending entry
      // that hasn't synced yet (for optimistic sets)
      if (!targetEntry && setLogId.startsWith("temp-")) {
        const entries = Array.from(pendingRef.current.values())
          .filter(e => e.state === SetInstanceState.PendingSync || e.state === SetInstanceState.AwaitingRPE)
          .sort((a, b) => b.createdAt - a.createdAt);
        if (entries.length > 0) {
          targetEntry = entries[0]; // Most recent pending entry
        }
      }

      if (targetEntry) {
        targetEntry.rpe = rpe;
        persist();
        setPendingVersion((v) => v + 1);

        // If entry hasn't synced yet, update the payload so RPE is included in sync
        if (targetEntry.state === SetInstanceState.PendingSync || targetEntry.state === SetInstanceState.AwaitingRPE) {
          // RPE will be included in the next sync via buildSyncPayload
        } else if (targetEntry.state === SetInstanceState.Synced && targetEntry.serverSetLogId) {
          // Set is already synced, update via API
          (async () => {
            try {
              const res = await fetch(`/api/sets/${targetEntry!.serverSetLogId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rpe }),
                credentials: "include",
              });
              if (!res.ok) {
                console.error("Failed to update RPE for synced set:", await res.text());
              }
            } catch (err) {
              console.error("Error updating RPE for synced set:", err);
            }
          })();
        }
      }
    },
    [persist],
  );

  // ---- Derive activeEntry for UI ----
  const activeEntry = activeKey ? pendingRef.current.get(activeKey) ?? null : null;

  return {
    logSet,
    clearKey,
    confirmRpe,
    skipRpe,
    retrySync: retrySyncFn,
    updateRPE,
    showRpeModal: false, // Always false now - RPE modal is deprecated
    shouldOpenRestTimer,
    ackRestTimerOpened,
    activeEntry,
    // Return a snapshot map (refs don't trigger re-renders, so we use pendingVersion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    pendingEntries: new Map(pendingRef.current),
  };
}
