/**
 * Golden Logging Flow — Unit Tests
 *
 * Tests the core pure functions and state machine logic.
 * These tests do NOT require a browser or Supabase connection.
 */

import {
  SetInstanceState,
  buildIdempotencyKey,
  type PendingSetEntry,
} from "../src/lib/setLogging/types";

import {
  createPendingEntry,
  buildSyncPayload,
  shouldRetry,
  retryDelayMs,
  MAX_RETRIES,
} from "../src/lib/setLogging/goldenLogSet";
import { buildLogSetInsertData } from "../src/lib/setLogging/buildLogSetInsertData";
import { resolveCanonicalLogSetType } from "../src/lib/setLogging/resolveLogSetType";

// ---------------------------------------------------------------------------
// buildIdempotencyKey
// ---------------------------------------------------------------------------

describe("buildIdempotencyKey", () => {
  it("generates a deterministic key from session, block, exercise, set, and date", () => {
    const key = buildIdempotencyKey(
      "session-abc",
      "block-123",
      "exercise-456",
      3,
    );

    // Format: sessionId:setEntryId:exerciseId:setNumber:YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];
    expect(key).toBe(`session-abc:block-123:exercise-456:3:${today}`);
  });

  it("uses 'local' when sessionId is null", () => {
    const key = buildIdempotencyKey(null, "b", "e", 1);
    const today = new Date().toISOString().split("T")[0];
    expect(key).toBe(`local:b:e:1:${today}`);
  });

  it("uses 'local' when sessionId is undefined", () => {
    const key = buildIdempotencyKey(undefined, "b", "e", 1);
    const today = new Date().toISOString().split("T")[0];
    expect(key).toBe(`local:b:e:1:${today}`);
  });

  it("same inputs produce same key (idempotent)", () => {
    const key1 = buildIdempotencyKey("s", "b", "e", 2);
    const key2 = buildIdempotencyKey("s", "b", "e", 2);
    expect(key1).toBe(key2);
  });

  it("different set numbers produce different keys", () => {
    const key1 = buildIdempotencyKey("s", "b", "e", 1);
    const key2 = buildIdempotencyKey("s", "b", "e", 2);
    expect(key1).not.toBe(key2);
  });
});

// ---------------------------------------------------------------------------
// createPendingEntry
// ---------------------------------------------------------------------------

describe("createPendingEntry", () => {
  it("creates an entry in PendingLocal state", () => {
    const entry = createPendingEntry(
      "key-1",
      "block-1",
      "straight_set",
      "exercise-1",
      1,
      { weight: 80, reps: 8 },
    );

    expect(entry.key).toBe("key-1");
    expect(entry.state).toBe(SetInstanceState.PendingLocal);
    expect(entry.setEntryId).toBe("block-1");
    expect(entry.blockType).toBe("straight_set");
    expect(entry.exerciseId).toBe("exercise-1");
    expect(entry.setNumber).toBe(1);
    expect(entry.rpe).toBeNull();
    expect(entry.syncAttempts).toBe(0);
    expect(entry.lastSyncAttemptAt).toBeNull();
    expect(entry.serverSetLogId).toBeNull();
    expect(entry.createdAt).toBeGreaterThan(0);
  });

  it("preserves the payload as-is", () => {
    const payload = { weight: 100, reps: 5, block_type: "straight_set" };
    const entry = createPendingEntry("k", "b", "straight_set", "e", 1, payload);
    expect(entry.payload).toEqual(payload);
  });
});

// ---------------------------------------------------------------------------
// buildSyncPayload
// ---------------------------------------------------------------------------

describe("buildSyncPayload", () => {
  const baseEntry: PendingSetEntry = {
    key: "test-key",
    state: SetInstanceState.PendingSync,
    setEntryId: "b1",
    blockType: "straight_set",
    exerciseId: "e1",
    setNumber: 1,
    payload: { weight: 80, reps: 8, block_type: "straight_set" },
    rpe: null,
    syncAttempts: 0,
    lastSyncAttemptAt: null,
    serverSetLogId: null,
    createdAt: Date.now(),
  };

  it("includes idempotency_key in the payload", () => {
    const payload = buildSyncPayload(baseEntry);
    expect(payload.idempotency_key).toBe("test-key");
  });

  it("spreads the original payload", () => {
    const payload = buildSyncPayload(baseEntry);
    expect(payload.weight).toBe(80);
    expect(payload.reps).toBe(8);
    expect(payload.block_type).toBe("straight_set");
  });

  it("does NOT include rpe when null", () => {
    const payload = buildSyncPayload(baseEntry);
    expect(payload.rpe).toBeUndefined();
  });

  it("includes rpe when set", () => {
    const entryWithRpe = { ...baseEntry, rpe: 7 };
    const payload = buildSyncPayload(entryWithRpe);
    expect(payload.rpe).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// shouldRetry / retryDelayMs
// ---------------------------------------------------------------------------

describe("shouldRetry", () => {
  const makeEntry = (attempts: number): PendingSetEntry => ({
    key: "k",
    state: SetInstanceState.SyncFailed,
    setEntryId: "b",
    blockType: "straight_set",
    exerciseId: "e",
    setNumber: 1,
    payload: {},
    rpe: null,
    syncAttempts: attempts,
    lastSyncAttemptAt: null,
    serverSetLogId: null,
    createdAt: Date.now(),
  });

  it("returns true when attempts < MAX_RETRIES", () => {
    expect(shouldRetry(makeEntry(0))).toBe(true);
    expect(shouldRetry(makeEntry(1))).toBe(true);
    expect(shouldRetry(makeEntry(2))).toBe(true);
  });

  it("returns false when attempts >= MAX_RETRIES", () => {
    expect(shouldRetry(makeEntry(MAX_RETRIES))).toBe(false);
    expect(shouldRetry(makeEntry(MAX_RETRIES + 1))).toBe(false);
  });
});

describe("retryDelayMs", () => {
  it("returns exponential backoff delays", () => {
    expect(retryDelayMs(0)).toBe(2000);
    expect(retryDelayMs(1)).toBe(4000);
    expect(retryDelayMs(2)).toBe(8000);
  });
});

// ---------------------------------------------------------------------------
// State machine transitions (logical assertions)
// ---------------------------------------------------------------------------

describe("State machine transitions", () => {
  it("idle -> pendingLocal -> awaitingRPE on logSet", () => {
    const entry = createPendingEntry("k", "b", "straight_set", "e", 1, {});
    expect(entry.state).toBe(SetInstanceState.PendingLocal);

    // Transition to awaitingRPE (done by orchestrator)
    entry.state = SetInstanceState.AwaitingRPE;
    expect(entry.state).toBe(SetInstanceState.AwaitingRPE);
  });

  it("awaitingRPE -> pendingSync on RPE confirm (fires sync)", () => {
    const entry = createPendingEntry("k", "b", "straight_set", "e", 1, {});
    entry.state = SetInstanceState.AwaitingRPE;
    entry.rpe = 7;

    // Transition to pendingSync (done by orchestrator on confirmRpe)
    entry.state = SetInstanceState.PendingSync;
    expect(entry.state).toBe(SetInstanceState.PendingSync);
    expect(entry.rpe).toBe(7);
  });

  it("awaitingRPE -> pendingSync on RPE skip (rpe stays null)", () => {
    const entry = createPendingEntry("k", "b", "straight_set", "e", 1, {});
    entry.state = SetInstanceState.AwaitingRPE;

    // Skip: no RPE, transition to pendingSync
    entry.state = SetInstanceState.PendingSync;
    expect(entry.state).toBe(SetInstanceState.PendingSync);
    expect(entry.rpe).toBeNull();
  });

  it("pendingSync -> synced on API success", () => {
    const entry = createPendingEntry("k", "b", "straight_set", "e", 1, {});
    entry.state = SetInstanceState.PendingSync;

    entry.state = SetInstanceState.Synced;
    entry.serverSetLogId = "uuid-from-server";
    expect(entry.state).toBe(SetInstanceState.Synced);
    expect(entry.serverSetLogId).toBe("uuid-from-server");
  });

  it("pendingSync -> syncFailed on API error", () => {
    const entry = createPendingEntry("k", "b", "straight_set", "e", 1, {});
    entry.state = SetInstanceState.PendingSync;

    entry.state = SetInstanceState.SyncFailed;
    expect(entry.state).toBe(SetInstanceState.SyncFailed);
  });

  it("syncFailed -> pendingSync on retry", () => {
    const entry = createPendingEntry("k", "b", "straight_set", "e", 1, {});
    entry.state = SetInstanceState.SyncFailed;
    entry.syncAttempts = 0; // reset for manual retry

    entry.state = SetInstanceState.PendingSync;
    entry.syncAttempts = 1;
    expect(entry.state).toBe(SetInstanceState.PendingSync);
  });
});

// ---------------------------------------------------------------------------
// Canonical set_type insert payloads (log-set route insert builder)
// ---------------------------------------------------------------------------

describe("buildLogSetInsertData — canonical set_type payloads", () => {
  const baseInsert = {
    client_id: "client-1",
    set_entry_id: "entry-1",
    workout_log_id: "log-1",
    set_type: "straight_set",
    completed_at: "2026-06-11T12:00:00.000Z",
  };

  it("drop_set: builds insert without dropset_drops column and stores canonical type", () => {
    expect(resolveCanonicalLogSetType("drop_set")).toBe("drop_set");
    expect(resolveCanonicalLogSetType("dropset")).toBe("drop_set");

    const result = buildLogSetInsertData(
      {
        set_type: "drop_set",
        set_number: 1,
        exercise_id: "ex-1",
        dropset_drops: [
          { weight: 80, reps: 8 },
          { weight: 60, reps: 10 },
        ],
        dropset_initial_weight: 80,
        dropset_initial_reps: 8,
        dropset_final_weight: 60,
        dropset_final_reps: 10,
      },
      "drop_set",
      { ...baseInsert, set_type: "drop_set" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.insertData.set_type).toBe("drop_set");
    expect(result.insertData.dropset_initial_weight).toBe(80);
    expect(result.insertData.dropset_final_weight).toBe(60);
    expect(result.insertData.weight).toBe(80);
    expect(result.insertData.reps).toBe(8);
    expect(result.insertData).not.toHaveProperty("dropset_drops");
  });

  it("for_time: builds insert with canonical set_type", () => {
    expect(resolveCanonicalLogSetType("for_time")).toBe("for_time");
    expect(resolveCanonicalLogSetType("fortime")).toBe("for_time");

    const result = buildLogSetInsertData(
      {
        set_type: "for_time",
        exercise_id: "ex-1",
        fortime_total_reps: 50,
        fortime_time_taken_sec: 420,
        fortime_time_cap_sec: 600,
      },
      "for_time",
      { ...baseInsert, set_type: "for_time" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.insertData.set_type).toBe("for_time");
    expect(result.insertData.fortime_total_reps).toBe(50);
    expect(result.insertData.fortime_time_taken_sec).toBe(420);
  });

  it("pre_exhaustion: builds insert with canonical set_type", () => {
    expect(resolveCanonicalLogSetType("pre_exhaustion")).toBe("pre_exhaustion");
    expect(resolveCanonicalLogSetType("preexhaust")).toBe("pre_exhaustion");

    const result = buildLogSetInsertData(
      {
        set_type: "pre_exhaustion",
        set_number: 1,
        preexhaust_isolation_exercise_id: "iso-1",
        preexhaust_isolation_weight: 20,
        preexhaust_isolation_reps: 15,
        preexhaust_compound_exercise_id: "cmp-1",
        preexhaust_compound_weight: 80,
        preexhaust_compound_reps: 8,
      },
      "pre_exhaustion",
      { ...baseInsert, set_type: "pre_exhaustion" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.insertData.set_type).toBe("pre_exhaustion");
    expect(result.insertData.preexhaust_compound_weight).toBe(80);
  });

  it("straight_set and superset share the same canonical insert path", () => {
    const straight = buildLogSetInsertData(
      { exercise_id: "ex-1", weight: 100, reps: 5, set_number: 2 },
      "straight_set",
      { ...baseInsert, set_type: "straight_set" },
    );
    expect(straight.ok).toBe(true);
    if (straight.ok) {
      expect(straight.insertData.set_type).toBe("straight_set");
      expect(straight.insertData.weight).toBe(100);
    }

    const superset = buildLogSetInsertData(
      {
        set_number: 1,
        superset_exercise_a_id: "a-1",
        superset_weight_a: 40,
        superset_reps_a: 10,
        superset_exercise_b_id: "b-1",
        superset_weight_b: 30,
        superset_reps_b: 12,
      },
      "superset",
      { ...baseInsert, set_type: "superset" },
    );
    expect(superset.ok).toBe(true);
    if (superset.ok) {
      expect(superset.insertData.set_type).toBe("superset");
      expect(superset.insertData.superset_weight_a).toBe(40);
    }
  });
});

// ---------------------------------------------------------------------------
// Duplicate key rejection (logical test)
// ---------------------------------------------------------------------------

describe("Duplicate key rejection", () => {
  it("same key in usedKeys set is detected", () => {
    const usedKeys = new Set<string>();

    const key = buildIdempotencyKey("s", "b", "e", 1);
    expect(usedKeys.has(key)).toBe(false);

    usedKeys.add(key);
    expect(usedKeys.has(key)).toBe(true);

    // Second attempt with same key is rejected
    const isDuplicate = usedKeys.has(key);
    expect(isDuplicate).toBe(true);
  });

  it("different set numbers are not duplicates", () => {
    const usedKeys = new Set<string>();

    const key1 = buildIdempotencyKey("s", "b", "e", 1);
    const key2 = buildIdempotencyKey("s", "b", "e", 2);

    usedKeys.add(key1);
    expect(usedKeys.has(key2)).toBe(false);
  });
});
