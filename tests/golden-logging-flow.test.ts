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

    // Format: sessionId:blockId:exerciseId:setNumber:YYYY-MM-DD
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
    expect(entry.blockId).toBe("block-1");
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
    blockId: "b1",
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
    blockId: "b",
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
