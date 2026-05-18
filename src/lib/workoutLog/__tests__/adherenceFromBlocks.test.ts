/**
 * Phase 6 — adherence block evaluators (`buildAdherenceBlocks`).
 *
 * Rest-pause: only the first primary log row is graded (same rules as straight_set);
 * continuation rows are informational (`informationalRowBadge` → coach log UI).
 * Continuations do not change `setsOnTargetCount` (no sum-to-block-total model).
 *
 * PR_FLAG: AMRAP `setsOnTargetCount` only reflects duration completion (≥95% of
 * prescribed seconds); total reps vs target are not part of the on-target aggregate.
 *
 * PR_FLAG: Tabata `completed` ties `tabata_rounds_completed` on the first log row only;
 * per-round rep rows use `set_number` / `round_number` lookup — align fixtures with that.
 */

import { buildAdherenceBlocks, sumBlockAdherence } from "@/lib/workoutLog/adherenceFromBlocks";
import type { ProtocolSlice } from "@/lib/workoutLog/adherenceFromBlocks";
import type {
  AdherenceBlock,
  PerSetAdherenceBlock,
  SpeedEnduranceAdherenceBlock,
  TimeBlockAdherenceBlock,
} from "@/lib/workoutLog/adherenceTypes";
import type { PrescribedExerciseRow } from "@/lib/workoutLog/prescribedExerciseHelpers";
import type { WorkoutLogBlock, WorkoutLogBlockType, WorkoutLogSet } from "@/types/workoutLog";

jest.mock("@/lib/clientProgressionService", () => ({
  parseRepsRange: (value: string) => {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? { min: n, max: n } : null;
  },
}));

const NULL_LOG: Omit<WorkoutLogSet, "id" | "workout_log_id" | "set_entry_id" | "set_type"> = {
  client_id: "c1",
  exercise_id: null,
  set_number: 1,
  weight: null,
  reps: null,
  rpe: null,
  completed_at: "2026-01-01T12:00:00Z",
  actual_time_seconds: null,
  actual_distance_meters: null,
  actual_hr_avg: null,
  actual_speed_kmh: null,
  dropset_initial_weight: null,
  dropset_initial_reps: null,
  dropset_final_weight: null,
  dropset_final_reps: null,
  dropset_percentage: null,
  dropset_drops: null,
  superset_exercise_a_id: null,
  superset_weight_a: null,
  superset_reps_a: null,
  superset_exercise_b_id: null,
  superset_weight_b: null,
  superset_reps_b: null,
  giant_set_exercises: null,
  amrap_total_reps: null,
  amrap_duration_seconds: null,
  amrap_target_reps: null,
  fortime_total_reps: null,
  fortime_time_taken_sec: null,
  fortime_time_cap_sec: null,
  fortime_target_reps: null,
  emom_minute_number: null,
  emom_total_reps_this_min: null,
  emom_total_duration_sec: null,
  round_number: null,
  tabata_rounds_completed: null,
  tabata_total_duration_sec: null,
  cluster_number: null,
  rest_pause_initial_weight: null,
  rest_pause_initial_reps: null,
  rest_pause_reps_after: null,
  rest_pause_number: null,
  rest_pause_duration: null,
  max_rest_pauses: null,
  preexhaust_isolation_exercise_id: null,
  preexhaust_isolation_weight: null,
  preexhaust_isolation_reps: null,
  preexhaust_compound_exercise_id: null,
  preexhaust_compound_weight: null,
  preexhaust_compound_reps: null,
  exercise: null,
  exercises: null,
};

function mkLog(
  id: string,
  setEntryId: string,
  setType: WorkoutLogBlockType,
  patch: Partial<WorkoutLogSet>
): WorkoutLogSet {
  return {
    ...NULL_LOG,
    id,
    workout_log_id: "wl-1",
    set_entry_id: setEntryId,
    set_type: setType,
    ...patch,
  } as WorkoutLogSet;
}

function mkBlock(setEntryId: string, setType: WorkoutLogBlockType, sets: WorkoutLogSet[]): WorkoutLogBlock {
  const ids = new Set<string>();
  for (const s of sets) {
    if (s.exercise_id) ids.add(s.exercise_id);
    if (s.superset_exercise_a_id) ids.add(s.superset_exercise_a_id);
    if (s.superset_exercise_b_id) ids.add(s.superset_exercise_b_id);
    if (s.preexhaust_isolation_exercise_id) ids.add(s.preexhaust_isolation_exercise_id);
    if (s.preexhaust_compound_exercise_id) ids.add(s.preexhaust_compound_exercise_id);
    if (s.giant_set_exercises) {
      for (const g of s.giant_set_exercises) {
        if (g.exercise_id) ids.add(g.exercise_id);
      }
    }
  }
  const exerciseIds = [...ids];
  return {
    setEntryId,
    setType,
    blockOrder: 1,
    exerciseIds: exerciseIds.length ? exerciseIds : ["ex-unknown"],
    exerciseNames: exerciseIds.map(() => "X"),
    sets,
  };
}

function ex(
  setEntryId: string,
  exerciseId: string,
  reps: string,
  weightKg: number,
  rir: number
): PrescribedExerciseRow & { set_entry_id: string } {
  return {
    set_entry_id: setEntryId,
    exercise_id: exerciseId,
    reps,
    weight_kg: weightKg,
    rir,
  };
}

function run(
  block: WorkoutLogBlock,
  setType: string,
  entryExercises: Array<PrescribedExerciseRow & { set_entry_id: string }>,
  protocol: ProtocolSlice | null,
  presc?: import("@/lib/workoutLog/adherenceFromBlocks").SpeedEndurancePresc
): AdherenceBlock {
  const setEntries = [{ id: block.setEntryId, set_type: setType }];
  const headers = new Map<string, string | null>([[block.setEntryId, null]]);
  const [out] = buildAdherenceBlocks(
    [block],
    setEntries,
    entryExercises,
    new Map(),
    presc,
    protocol,
    headers
  );
  if (!out) throw new Error("expected one adherence block");
  return out;
}

function expectPerSet(b: AdherenceBlock): asserts b is PerSetAdherenceBlock {
  expect(b.kind).toBe("per_set");
}

function expectTime(b: AdherenceBlock): asserts b is TimeBlockAdherenceBlock {
  expect(b.kind).toBe("time_block");
}

function expectSpeedEnd(b: AdherenceBlock): asserts b is SpeedEnduranceAdherenceBlock {
  expect(b.kind).toBe("speed_endurance");
}

describe("buildAdherenceBlocks — straight_set", () => {
  const eid = "ex-s";
  const entry = "ent-s";

  it("hit all targets — two sets on prescription", () => {
    const block = mkBlock(
      entry,
      "straight_set",
      [
        mkLog("1", entry, "straight_set", { exercise_id: eid, set_number: 1, reps: 10, weight: 100, rpe: 8 }),
        mkLog("2", entry, "straight_set", { exercise_id: eid, set_number: 2, reps: 10, weight: 100, rpe: 8 }),
      ]
    );
    const b = run(block, "straight_set", [ex(entry, eid, "10", 100, 8)], null);
    expectPerSet(b);
    expect(b.totalPrescribedSets).toBe(2);
    expect(b.setsOnTargetCount).toBe(2);
    expect(b.setOutcomes.every((o) => o.row === "hit")).toBe(true);
  });

  it("missed some targets — second set low reps", () => {
    const block = mkBlock(
      entry,
      "straight_set",
      [
        mkLog("1", entry, "straight_set", { exercise_id: eid, set_number: 1, reps: 10, weight: 100, rpe: 8 }),
        mkLog("2", entry, "straight_set", { exercise_id: eid, set_number: 2, reps: 5, weight: 100, rpe: 8 }),
      ]
    );
    const b = run(block, "straight_set", [ex(entry, eid, "10", 100, 8)], null);
    expectPerSet(b);
    expect(b.setsOnTargetCount).toBe(1);
    expect(b.setOutcomes[0]?.row).toBe("hit");
    expect(b.setOutcomes[1]?.row).toBe("miss");
  });

  it("structural edge — weight at lower tolerance boundary (still hit)", () => {
    const block = mkBlock(entry, "straight_set", [
      mkLog("1", entry, "straight_set", { exercise_id: eid, set_number: 1, reps: 10, weight: 97.4, rpe: 8 }),
    ]);
    const b = run(block, "straight_set", [ex(entry, eid, "10", 100, 8)], null);
    expectPerSet(b);
    expect(b.setOutcomes[0]?.row).toBe("hit");
    expect(b.setsOnTargetCount).toBe(1);
  });
});

describe("buildAdherenceBlocks — superset", () => {
  const entry = "ent-ss";
  const a = "ex-a";
  const b = "ex-b";

  it("hit all targets — both sides + shared RPE vs RIR", () => {
    const block = mkBlock(entry, "superset", [
      mkLog("1", entry, "superset", {
        superset_exercise_a_id: a,
        superset_weight_a: 40,
        superset_reps_a: 10,
        superset_exercise_b_id: b,
        superset_weight_b: 20,
        superset_reps_b: 12,
        rpe: 8,
      }),
    ]);
    const presc = [ex(entry, a, "10", 40, 8), ex(entry, b, "12", 20, 8)];
    const out = run(block, "superset", presc, null);
    expectPerSet(out);
    expect(out.totalPrescribedSets).toBe(1);
    expect(out.setsOnTargetCount).toBe(1);
    expect(out.setOutcomes[0]?.row).toBe("hit");
  });

  it("missed some targets — side B under reps", () => {
    const block = mkBlock(entry, "superset", [
      mkLog("1", entry, "superset", {
        superset_exercise_a_id: a,
        superset_weight_a: 40,
        superset_reps_a: 10,
        superset_exercise_b_id: b,
        superset_weight_b: 20,
        superset_reps_b: 6,
        rpe: 8,
      }),
    ]);
    const out = run(block, "superset", [ex(entry, a, "10", 40, 8), ex(entry, b, "12", 20, 8)], null);
    expectPerSet(out);
    expect(out.setsOnTargetCount).toBe(0);
    expect(out.setOutcomes[0]?.row).toBe("miss");
  });

  it("regression — actual RPE is not ignored (shared RPE vs both RIR)", () => {
    const block = mkBlock(entry, "superset", [
      mkLog("1", entry, "superset", {
        superset_exercise_a_id: a,
        superset_weight_a: 40,
        superset_reps_a: 10,
        superset_exercise_b_id: b,
        superset_weight_b: 20,
        superset_reps_b: 12,
        rpe: 8,
      }),
    ]);
    const out = run(block, "superset", [ex(entry, a, "10", 40, 8), ex(entry, b, "12", 20, 8)], null);
    expectPerSet(out);
    expect(out.setOutcomes[0]?.row).toBe("hit");
    if (out.setOutcomes[0]?.row === "hit") {
      expect(out.setsOnTargetCount).toBe(1);
    }
  });
});

describe("buildAdherenceBlocks — drop_set", () => {
  const entry = "ent-ds";
  const eid = "ex-ds";
  const protocol: ProtocolSlice = {
    timeProtocols: [],
    dropSets: [
      { set_entry_id: entry, drop_order: 1, reps: "10", weight_kg: 100 },
      { set_entry_id: entry, drop_order: 2, reps: "8", weight_kg: 80 },
      { set_entry_id: entry, drop_order: 3, reps: "6", weight_kg: 60 },
    ],
    clusterSets: [],
    restPauseSets: [],
  };

  it("hit all targets — initial on target + two drop rows logged", () => {
    const block = mkBlock(entry, "drop_set", [
      mkLog("1", entry, "drop_set", {
        exercise_id: eid,
        set_number: 1,
        dropset_initial_weight: 100,
        dropset_initial_reps: 10,
        weight: 100,
        reps: 10,
        rpe: 8,
      }),
      mkLog("2", entry, "drop_set", { exercise_id: eid, set_number: 2, weight: 80, reps: 8 }),
      mkLog("3", entry, "drop_set", { exercise_id: eid, set_number: 3, weight: 60, reps: 6 }),
    ]);
    const b = run(block, "drop_set", [ex(entry, eid, "10", 100, 8)], protocol);
    expectPerSet(b);
    expect(b.totalPrescribedSets).toBe(1);
    expect(b.setsOnTargetCount).toBe(1);
    expect(b.setOutcomes[0]?.applyRowColor).toBe(true);
    expect(b.setOutcomes[0]?.row).toBe("hit");
    expect(b.setOutcomes[1]?.applyRowColor).toBe(false);
    expect(b.setOutcomes[2]?.applyRowColor).toBe(false);
  });

  it("missed some targets — initial miss (low reps) even if drops completed", () => {
    const block = mkBlock(entry, "drop_set", [
      mkLog("1", entry, "drop_set", {
        exercise_id: eid,
        set_number: 1,
        dropset_initial_weight: 100,
        dropset_initial_reps: 5,
        weight: 100,
        reps: 5,
        rpe: 8,
      }),
      mkLog("2", entry, "drop_set", { exercise_id: eid, set_number: 2, weight: 80, reps: 8 }),
      mkLog("3", entry, "drop_set", { exercise_id: eid, set_number: 3, weight: 60, reps: 6 }),
    ]);
    const b = run(block, "drop_set", [ex(entry, eid, "10", 100, 8)], protocol);
    expectPerSet(b);
    expect(b.setsOnTargetCount).toBe(0);
    expect(b.setOutcomes[0]?.row).toBe("miss");
  });

  it("structural edge — initial hit but missing one prescribed drop row", () => {
    const block = mkBlock(entry, "drop_set", [
      mkLog("1", entry, "drop_set", {
        exercise_id: eid,
        set_number: 1,
        dropset_initial_weight: 100,
        dropset_initial_reps: 10,
        weight: 100,
        reps: 10,
        rpe: 8,
      }),
      mkLog("2", entry, "drop_set", { exercise_id: eid, set_number: 2, weight: 80, reps: 8 }),
    ]);
    const b = run(block, "drop_set", [ex(entry, eid, "10", 100, 8)], protocol);
    expectPerSet(b);
    expect(b.setsOnTargetCount).toBe(0);
  });
});

describe("buildAdherenceBlocks — cluster_set", () => {
  const entry = "ent-cl";
  const eid = "ex-cl";
  const protocol: ProtocolSlice = {
    timeProtocols: [],
    dropSets: [],
    clusterSets: [{ set_entry_id: entry, reps_per_cluster: 5, clusters_per_set: 4, weight_kg: 80 }],
    restPauseSets: [],
  };

  it("hit all targets — total reps equals 20", () => {
    const sets = [1, 2, 3, 4].map((n) =>
      mkLog(`c${n}`, entry, "cluster_set", {
        exercise_id: eid,
        cluster_number: n,
        set_number: n,
        reps: 5,
        weight: 80,
        rpe: 8,
      })
    );
    const block = mkBlock(entry, "cluster_set", sets);
    const b = run(block, "cluster_set", [ex(entry, eid, "5", 80, 8)], protocol);
    expectPerSet(b);
    expect(b.totalPrescribedSets).toBe(1);
    expect(b.setsOnTargetCount).toBe(1);
    expect(b.setOutcomes.at(-1)?.row).toBe("hit");
  });

  it("missed some targets — sum below target", () => {
    const sets = [1, 2, 3, 4].map((n) =>
      mkLog(`c${n}`, entry, "cluster_set", {
        exercise_id: eid,
        cluster_number: n,
        set_number: n,
        reps: 3,
        weight: 80,
        rpe: 8,
      })
    );
    const block = mkBlock(entry, "cluster_set", sets);
    const b = run(block, "cluster_set", [ex(entry, eid, "5", 80, 8)], protocol);
    expectPerSet(b);
    expect(b.setsOnTargetCount).toBe(0);
    expect(b.setOutcomes.at(-1)?.row).toBe("miss");
  });

  it("structural edge — uneven mini-set distribution but total still hits", () => {
    const block = mkBlock(entry, "cluster_set", [
      mkLog("c1", entry, "cluster_set", { exercise_id: eid, cluster_number: 1, set_number: 1, reps: 10, weight: 80, rpe: 8 }),
      mkLog("c2", entry, "cluster_set", { exercise_id: eid, cluster_number: 2, set_number: 2, reps: 5, weight: 80, rpe: 8 }),
      mkLog("c3", entry, "cluster_set", { exercise_id: eid, cluster_number: 3, set_number: 3, reps: 3, weight: 80, rpe: 8 }),
      mkLog("c4", entry, "cluster_set", { exercise_id: eid, cluster_number: 4, set_number: 4, reps: 2, weight: 80, rpe: 8 }),
    ]);
    const b = run(block, "cluster_set", [ex(entry, eid, "5", 80, 8)], protocol);
    expectPerSet(b);
    expect(b.setsOnTargetCount).toBe(1);
  });
});

describe("buildAdherenceBlocks — giant_set", () => {
  const entry = "ent-gs";
  const e1 = "g1";
  const e2 = "g2";

  it("hit all targets — one round both segments on target", () => {
    const block = mkBlock(entry, "giant_set", [
      mkLog("1", entry, "giant_set", {
        round_number: 1,
        set_number: 1,
        rpe: 8,
        giant_set_exercises: [
          { exercise_id: e1, reps: 10, weight: 50 },
          { exercise_id: e2, reps: 12, weight: 30 },
        ],
      }),
    ]);
    const b = run(block, "giant_set", [ex(entry, e1, "10", 50, 8), ex(entry, e2, "12", 30, 8)], null);
    expectPerSet(b);
    expect(b.totalPrescribedSets).toBe(2);
    expect(b.setsOnTargetCount).toBe(2);
    expect(b.setOutcomes[0]?.row).toBe("hit");
  });

  it("missed some targets — round 1 one segment fails", () => {
    const block = mkBlock(entry, "giant_set", [
      mkLog("1", entry, "giant_set", {
        round_number: 1,
        set_number: 1,
        rpe: 8,
        giant_set_exercises: [
          { exercise_id: e1, reps: 10, weight: 50 },
          { exercise_id: e2, reps: 4, weight: 30 },
        ],
      }),
    ]);
    const b = run(block, "giant_set", [ex(entry, e1, "10", 50, 8), ex(entry, e2, "12", 30, 8)], null);
    expectPerSet(b);
    expect(b.setsOnTargetCount).toBe(1);
    expect(b.setOutcomes[0]?.row).toBe("miss");
  });

  it("structural edge — two rounds: first full hit, second partial", () => {
    const block = mkBlock(entry, "giant_set", [
      mkLog("1", entry, "giant_set", {
        round_number: 1,
        set_number: 1,
        rpe: 8,
        giant_set_exercises: [
          { exercise_id: e1, reps: 10, weight: 50 },
          { exercise_id: e2, reps: 12, weight: 30 },
        ],
      }),
      mkLog("2", entry, "giant_set", {
        round_number: 2,
        set_number: 2,
        rpe: 8,
        giant_set_exercises: [
          { exercise_id: e1, reps: 10, weight: 50 },
          { exercise_id: e2, reps: 6, weight: 30 },
        ],
      }),
    ]);
    const b = run(block, "giant_set", [ex(entry, e1, "10", 50, 8), ex(entry, e2, "12", 30, 8)], null);
    expectPerSet(b);
    expect(b.totalPrescribedSets).toBe(4);
    expect(b.setsOnTargetCount).toBe(3);
    expect(b.setOutcomes[0]?.row).toBe("hit");
    expect(b.setOutcomes[1]?.row).toBe("miss");
  });
});

describe("buildAdherenceBlocks — rest_pause", () => {
  const entry = "ent-rp";
  const eid = "ex-rp";
  const protocol: ProtocolSlice = {
    timeProtocols: [],
    dropSets: [],
    clusterSets: [],
    restPauseSets: [{ set_entry_id: entry, weight_kg: 100, max_rest_pauses: 3, rest_pause_duration: 15 }],
  };

  it("hit — primary meets prescription; no continuations", () => {
    const block = mkBlock(entry, "rest_pause", [
      mkLog("1", entry, "rest_pause", {
        exercise_id: eid,
        set_number: 1,
        rest_pause_number: 1,
        rest_pause_initial_weight: 100,
        rest_pause_initial_reps: 15,
        weight: 100,
        reps: 15,
        rpe: 8,
      }),
    ]);
    const b = run(block, "rest_pause", [ex(entry, eid, "15", 100, 8)], protocol);
    expectPerSet(b);
    expect(b.setOutcomes).toHaveLength(1);
    expect(b.setOutcomes[0]?.row).toBe("hit");
    expect(b.totalPrescribedSets).toBe(1);
    expect(b.setsOnTargetCount).toBe(1);
  });

  it("miss — primary under prescribed reps; no continuations", () => {
    const block = mkBlock(entry, "rest_pause", [
      mkLog("1", entry, "rest_pause", {
        exercise_id: eid,
        set_number: 1,
        rest_pause_number: 1,
        rest_pause_initial_weight: 100,
        rest_pause_initial_reps: 8,
        weight: 100,
        reps: 8,
        rpe: 8,
      }),
    ]);
    const b = run(block, "rest_pause", [ex(entry, eid, "15", 100, 8)], protocol);
    expectPerSet(b);
    expect(b.setOutcomes).toHaveLength(1);
    expect(b.setOutcomes[0]?.row).toBe("miss");
    expect(b.setsOnTargetCount).toBe(0);
    expect(b.totalPrescribedSets).toBe(1);
  });

  it("edge — primary on target; continuation rows informational only", () => {
    const block = mkBlock(entry, "rest_pause", [
      mkLog("1", entry, "rest_pause", {
        exercise_id: eid,
        set_number: 1,
        rest_pause_number: 1,
        rest_pause_initial_weight: 100,
        rest_pause_initial_reps: 15,
        weight: 100,
        reps: 15,
        rpe: 8,
      }),
      mkLog("2", entry, "rest_pause", {
        exercise_id: eid,
        set_number: 2,
        rest_pause_number: 2,
        rest_pause_reps_after: 3,
        reps: 3,
        weight: 100,
        rpe: 8,
      }),
      mkLog("3", entry, "rest_pause", {
        exercise_id: eid,
        set_number: 3,
        rest_pause_number: 3,
        rest_pause_reps_after: 4,
        reps: 4,
        weight: 100,
        rpe: 8,
      }),
    ]);
    const b = run(block, "rest_pause", [ex(entry, eid, "15", 100, 8)], protocol);
    expectPerSet(b);
    expect(b.setOutcomes).toHaveLength(3);
    expect(b.setOutcomes[0]?.row).toBe("hit");
    expect(b.setOutcomes[1]?.informationalRowBadge).toBe("Rest-pause continuation");
    expect(b.setOutcomes[2]?.informationalRowBadge).toBe("Rest-pause continuation");
    expect(b.setOutcomes[1]?.applyRowColor).toBe(false);
    expect(b.setsOnTargetCount).toBe(1);
    expect(b.totalPrescribedSets).toBe(1);
  });

  it("edge — primary miss; continuations do not rescue adherence", () => {
    const block = mkBlock(entry, "rest_pause", [
      mkLog("1", entry, "rest_pause", {
        exercise_id: eid,
        set_number: 1,
        rest_pause_number: 1,
        rest_pause_initial_weight: 100,
        rest_pause_initial_reps: 10,
        weight: 100,
        reps: 10,
        rpe: 8,
      }),
      mkLog("2", entry, "rest_pause", {
        exercise_id: eid,
        set_number: 2,
        rest_pause_number: 2,
        rest_pause_reps_after: 10,
        reps: 10,
        weight: 100,
        rpe: 8,
      }),
      mkLog("3", entry, "rest_pause", {
        exercise_id: eid,
        set_number: 3,
        rest_pause_number: 3,
        rest_pause_reps_after: 10,
        reps: 10,
        weight: 100,
        rpe: 8,
      }),
    ]);
    const b = run(block, "rest_pause", [ex(entry, eid, "15", 100, 8)], protocol);
    expectPerSet(b);
    expect(b.setOutcomes[0]?.row).toBe("miss");
    expect(b.setsOnTargetCount).toBe(0);
    expect(b.totalPrescribedSets).toBe(1);
  });
});

describe("buildAdherenceBlocks — pre_exhaustion", () => {
  const entry = "ent-pe";
  const iso = "ex-iso";
  const comp = "ex-comp";

  it("hit all targets — isolation + compound both on target", () => {
    const block = mkBlock(entry, "pre_exhaustion", [
      mkLog("1", entry, "pre_exhaustion", {
        exercise_id: iso,
        preexhaust_isolation_exercise_id: iso,
        preexhaust_isolation_reps: 12,
        preexhaust_isolation_weight: 20,
        preexhaust_compound_exercise_id: comp,
        preexhaust_compound_reps: 8,
        preexhaust_compound_weight: 100,
        rpe: 8,
      }),
    ]);
    const b = run(block, "pre_exhaustion", [ex(entry, iso, "12", 20, 8), ex(entry, comp, "8", 100, 8)], null);
    expectPerSet(b);
    expect(b.totalPrescribedSets).toBe(2);
    expect(b.setsOnTargetCount).toBe(2);
    expect(b.setOutcomes[0]?.row).toBe("hit");
  });

  it("missed some targets — both sides weak", () => {
    const block = mkBlock(entry, "pre_exhaustion", [
      mkLog("1", entry, "pre_exhaustion", {
        exercise_id: iso,
        preexhaust_isolation_exercise_id: iso,
        preexhaust_isolation_reps: 4,
        preexhaust_isolation_weight: 20,
        preexhaust_compound_exercise_id: comp,
        preexhaust_compound_reps: 3,
        preexhaust_compound_weight: 100,
        rpe: 8,
      }),
    ]);
    const b = run(block, "pre_exhaustion", [ex(entry, iso, "12", 20, 8), ex(entry, comp, "8", 100, 8)], null);
    expectPerSet(b);
    expect(b.setsOnTargetCount).toBe(0);
    expect(b.setOutcomes[0]?.row).toBe("miss");
  });

  it("structural edge — isolation hit, compound miss (split contribution)", () => {
    const block = mkBlock(entry, "pre_exhaustion", [
      mkLog("1", entry, "pre_exhaustion", {
        exercise_id: iso,
        preexhaust_isolation_exercise_id: iso,
        preexhaust_isolation_reps: 12,
        preexhaust_isolation_weight: 20,
        preexhaust_compound_exercise_id: comp,
        preexhaust_compound_reps: 4,
        preexhaust_compound_weight: 100,
        rpe: 8,
      }),
    ]);
    const b = run(block, "pre_exhaustion", [ex(entry, iso, "12", 20, 8), ex(entry, comp, "8", 100, 8)], null);
    expectPerSet(b);
    expect(b.totalPrescribedSets).toBe(2);
    expect(b.setsOnTargetCount).toBe(1);
    expect(b.setOutcomes[0]?.row).toBe("miss");
  });
});

describe("buildAdherenceBlocks — amrap", () => {
  const entry = "ent-am";
  const protocol = (min: number): ProtocolSlice => ({
    timeProtocols: [
      {
        set_entry_id: entry,
        protocol_type: "amrap",
        total_duration_minutes: min,
        target_reps: 200,
        reps_per_round: null,
        time_cap_minutes: null,
        work_seconds: null,
        rest_seconds: null,
        rounds: null,
      },
    ],
    dropSets: [],
    clusterSets: [],
    restPauseSets: [],
  });

  it("hit all targets — duration ≥ 95% of prescribed", () => {
    const block = mkBlock(entry, "amrap", [
      mkLog("1", entry, "amrap", {
        amrap_duration_seconds: 600,
        amrap_total_reps: 200,
        amrap_target_reps: 200,
      }),
    ]);
    const b = run(block, "amrap", [], protocol(10));
    expectTime(b);
    expect(b.completed).toBe(true);
    expect(b.setsOnTargetCount).toBe(1);
    expect(b.totalPrescribedSets).toBe(1);
  });

  it("missed some targets — duration short of 95%", () => {
    const block = mkBlock(entry, "amrap", [
      mkLog("1", entry, "amrap", {
        amrap_duration_seconds: 500,
        amrap_total_reps: 200,
        amrap_target_reps: 200,
      }),
    ]);
    const b = run(block, "amrap", [], protocol(10));
    expectTime(b);
    expect(b.completed).toBe(false);
    expect(b.setsOnTargetCount).toBe(0);
  });

  it("structural edge — time completed but reps far below target (evaluator still on-target if duration met)", () => {
    const block = mkBlock(entry, "amrap", [
      mkLog("1", entry, "amrap", {
        amrap_duration_seconds: 600,
        amrap_total_reps: 20,
        amrap_target_reps: 200,
      }),
    ]);
    const b = run(block, "amrap", [], protocol(10));
    expectTime(b);
    expect(b.completed).toBe(true);
    expect(b.setsOnTargetCount).toBe(1);
    expect(b.actualReps).toBe(20);
  });
});

describe("buildAdherenceBlocks — emom", () => {
  const entry = "ent-em";

  const protocol: ProtocolSlice = {
    timeProtocols: [
      {
        set_entry_id: entry,
        protocol_type: "emom",
        total_duration_minutes: 10,
        reps_per_round: 10,
        target_reps: null,
        time_cap_minutes: null,
        work_seconds: null,
        rest_seconds: null,
        rounds: null,
      },
    ],
    dropSets: [],
    clusterSets: [],
    restPauseSets: [],
  };

  it("hit all targets — 10/10 minutes at rep target", () => {
    const sets = Array.from({ length: 10 }, (_, i) =>
      mkLog(`e${i}`, entry, "emom", {
        emom_minute_number: i + 1,
        emom_total_reps_this_min: 10,
      })
    );
    const block = mkBlock(entry, "emom", sets);
    const b = run(block, "emom", [], protocol);
    expectTime(b);
    expect(b.totalPrescribedSets).toBe(10);
    expect(b.setsOnTargetCount).toBe(10);
    expect(b.intervalOutcomes.every((o) => o.row === "hit")).toBe(true);
  });

  it("missed some targets — several minutes under reps", () => {
    const sets = Array.from({ length: 10 }, (_, i) =>
      mkLog(`e${i}`, entry, "emom", {
        emom_minute_number: i + 1,
        emom_total_reps_this_min: i < 5 ? 10 : 4,
      })
    );
    const block = mkBlock(entry, "emom", sets);
    const b = run(block, "emom", [], protocol);
    expectTime(b);
    expect(b.setsOnTargetCount).toBe(5);
  });

  it("structural edge — 7 of 10 minutes at target (minutes 8–10 missing)", () => {
    const sets = Array.from({ length: 7 }, (_, i) =>
      mkLog(`e${i}`, entry, "emom", {
        emom_minute_number: i + 1,
        emom_total_reps_this_min: 10,
      })
    );
    const block = mkBlock(entry, "emom", sets);
    const b = run(block, "emom", [], protocol);
    expectTime(b);
    expect(b.setsOnTargetCount).toBe(7);
    expect(b.intervalOutcomes[6]?.row).toBe("hit");
    expect(b.intervalOutcomes[7]?.row).not.toBe("hit");
    expect(b.intervalOutcomes[9]?.row).not.toBe("hit");
  });
});

describe("buildAdherenceBlocks — tabata", () => {
  const entry = "ent-tb";
  const protocol: ProtocolSlice = {
    timeProtocols: [
      {
        set_entry_id: entry,
        protocol_type: "tabata",
        total_duration_minutes: null,
        reps_per_round: 10,
        target_reps: 10,
        time_cap_minutes: null,
        work_seconds: 20,
        rest_seconds: 10,
        rounds: 8,
      },
    ],
    dropSets: [],
    clusterSets: [],
    restPauseSets: [],
  };

  it("hit all targets — 8 rounds logged with reps at target", () => {
    const sets = Array.from({ length: 8 }, (_, i) =>
      mkLog(`t${i}`, entry, "tabata", {
        set_number: i + 1,
        round_number: i + 1,
        reps: 10,
        tabata_rounds_completed: 8,
      })
    );
    const block = mkBlock(entry, "tabata", sets);
    const b = run(block, "tabata", [], protocol);
    expectTime(b);
    expect(b.totalPrescribedSets).toBe(8);
    expect(b.setsOnTargetCount).toBe(8);
    expect(b.completed).toBe(true);
  });

  it("missed some targets — fewer than 8 rounds completed", () => {
    const sets = Array.from({ length: 4 }, (_, i) =>
      mkLog(`t${i}`, entry, "tabata", {
        set_number: i + 1,
        round_number: i + 1,
        reps: 10,
        tabata_rounds_completed: 4,
      })
    );
    const block = mkBlock(entry, "tabata", sets);
    const b = run(block, "tabata", [], protocol);
    expectTime(b);
    expect(b.setsOnTargetCount).toBe(4);
    expect(b.completed).toBe(false);
  });

  it("structural edge — 8 rounds flag but reps below target on some rows", () => {
    const repsVals = [10, 10, 10, 10, 10, 10, 10, 4];
    const sets = repsVals.map((reps, i) =>
      mkLog(`t${i}`, entry, "tabata", {
        set_number: i + 1,
        round_number: i + 1,
        reps,
        tabata_rounds_completed: 8,
      })
    );
    const block = mkBlock(entry, "tabata", sets);
    const b = run(block, "tabata", [], protocol);
    expectTime(b);
    expect(b.setsOnTargetCount).toBe(7);
    expect(b.completed).toBe(false);
  });
});

describe("buildAdherenceBlocks — for_time", () => {
  const entry = "ent-ft";
  const protocol: ProtocolSlice = {
    timeProtocols: [
      {
        set_entry_id: entry,
        protocol_type: "for_time",
        total_duration_minutes: null,
        reps_per_round: null,
        target_reps: 30,
        time_cap_minutes: 2,
        work_seconds: null,
        rest_seconds: null,
        rounds: null,
      },
    ],
    dropSets: [],
    clusterSets: [],
    restPauseSets: [],
  };

  it("hit all targets — reps + time within cap", () => {
    const block = mkBlock(entry, "for_time", [
      mkLog("1", entry, "for_time", {
        fortime_total_reps: 30,
        fortime_time_taken_sec: 90,
        fortime_time_cap_sec: 120,
        fortime_target_reps: 30,
      }),
    ]);
    const b = run(block, "for_time", [], protocol);
    expectTime(b);
    expect(b.completed).toBe(true);
    expect(b.dnf).toBe(false);
    expect(b.setsOnTargetCount).toBe(1);
  });

  it("missed some targets — reps short of 95% of target", () => {
    const block = mkBlock(entry, "for_time", [
      mkLog("1", entry, "for_time", {
        fortime_total_reps: 10,
        fortime_time_taken_sec: 60,
        fortime_time_cap_sec: 120,
        fortime_target_reps: 30,
      }),
    ]);
    const b = run(block, "for_time", [], protocol);
    expectTime(b);
    expect(b.completed).toBe(false);
    expect(b.setsOnTargetCount).toBe(0);
  });

  it("structural edge — DNF when time exceeds cap", () => {
    const block = mkBlock(entry, "for_time", [
      mkLog("1", entry, "for_time", {
        fortime_total_reps: 30,
        fortime_time_taken_sec: 150,
        fortime_time_cap_sec: 120,
        fortime_target_reps: 30,
      }),
    ]);
    const b = run(block, "for_time", [], protocol);
    expectTime(b);
    expect(b.completed).toBe(false);
    expect(b.dnf).toBe(true);
    expect(b.setsOnTargetCount).toBe(0);
  });
});

describe("buildAdherenceBlocks — speed_work", () => {
  const entry = "ent-sp";
  const ex = "ex-sp";

  it("hit all targets — intervals match prescription count with times", () => {
    const sets = [1, 2, 3].map((n) =>
      mkLog(`s${n}`, entry, "speed_work", {
        exercise_id: ex,
        set_number: n,
        actual_time_seconds: 40 + n,
      })
    );
    const block = mkBlock(entry, "speed_work", sets);
    const presc = {
      speedByKey: new Map([[`${entry}::${ex}`, { intervals: 3, distance_meters: 200 }]]),
    };
    const b = run(block, "speed_work", [], null, presc);
    expectSpeedEnd(b);
    expect(b.setType).toBe("speed_work");
    expect(b.totalPrescribedSets).toBe(3);
    expect(b.setsOnTargetCount).toBe(3);
    expect(b.intervalOutcomes.every((o) => o.row === "hit")).toBe(true);
  });

  it("missed some targets — one interval missing time", () => {
    const sets = [
      mkLog("s1", entry, "speed_work", { exercise_id: ex, set_number: 1, actual_time_seconds: 45 }),
      mkLog("s2", entry, "speed_work", { exercise_id: ex, set_number: 2, actual_time_seconds: null }),
      mkLog("s3", entry, "speed_work", { exercise_id: ex, set_number: 3, actual_time_seconds: 44 }),
    ];
    const block = mkBlock(entry, "speed_work", sets);
    const presc = {
      speedByKey: new Map([[`${entry}::${ex}`, { intervals: 3, distance_meters: 200 }]]),
    };
    const b = run(block, "speed_work", [], null, presc);
    expectSpeedEnd(b);
    expect(b.setsOnTargetCount).toBe(2);
    expect(b.intervalOutcomes[1]?.row).toBe("miss");
  });

  it("structural edge — more prescribed intervals than log rows", () => {
    const sets = [
      mkLog("s1", entry, "speed_work", { exercise_id: ex, set_number: 1, actual_time_seconds: 45 }),
      mkLog("s2", entry, "speed_work", { exercise_id: ex, set_number: 2, actual_time_seconds: 46 }),
    ];
    const block = mkBlock(entry, "speed_work", sets);
    const presc = {
      speedByKey: new Map([[`${entry}::${ex}`, { intervals: 4, distance_meters: 200 }]]),
    };
    const b = run(block, "speed_work", [], null, presc);
    expectSpeedEnd(b);
    expect(b.totalPrescribedSets).toBe(4);
    expect(b.setsOnTargetCount).toBe(2);
  });
});

describe("buildAdherenceBlocks — endurance", () => {
  const entry = "ent-en";
  const ex = "ex-en";

  it("hit all targets — distance, time, pace in range", () => {
    const block = mkBlock(entry, "endurance", [
      mkLog("1", entry, "endurance", {
        exercise_id: ex,
        actual_distance_meters: 5000,
        actual_time_seconds: 1200,
        actual_hr_avg: 150,
      }),
    ]);
    const presc = {
      enduranceByKey: new Map([
        [
          `${entry}::${ex}`,
          {
            target_distance_meters: 5000,
            target_time_seconds: 1260,
            target_pace_seconds_per_km: 252,
            hr_zone: 3,
            target_hr_pct: null,
          },
        ],
      ]),
    };
    const b = run(block, "endurance", [], null, presc);
    expectSpeedEnd(b);
    expect(b.setType).toBe("endurance");
    expect(b.setsOnTargetCount).toBe(1);
  });

  it("missed some targets — distance ratio below 0.92", () => {
    const block = mkBlock(entry, "endurance", [
      mkLog("1", entry, "endurance", {
        exercise_id: ex,
        actual_distance_meters: 4000,
        actual_time_seconds: 1200,
        actual_hr_avg: 150,
      }),
    ]);
    const presc = {
      enduranceByKey: new Map([
        [
          `${entry}::${ex}`,
          {
            target_distance_meters: 5000,
            target_time_seconds: 2000,
            target_pace_seconds_per_km: 300,
            hr_zone: 3,
            target_hr_pct: null,
          },
        ],
      ]),
    };
    const b = run(block, "endurance", [], null, presc);
    expectSpeedEnd(b);
    expect(b.setsOnTargetCount).toBe(0);
  });

  it("structural edge — distance in neutral band, time hit", () => {
    const block = mkBlock(entry, "endurance", [
      mkLog("1", entry, "endurance", {
        exercise_id: ex,
        actual_distance_meters: 4700,
        actual_time_seconds: 1180,
        actual_hr_avg: 150,
      }),
    ]);
    const presc = {
      enduranceByKey: new Map([
        [
          `${entry}::${ex}`,
          {
            target_distance_meters: 5000,
            target_time_seconds: 1260,
            target_pace_seconds_per_km: 252,
            hr_zone: 3,
            target_hr_pct: null,
          },
        ],
      ]),
    };
    const b = run(block, "endurance", [], null, presc);
    expectSpeedEnd(b);
    expect(b.setsOnTargetCount).toBe(1);
  });
});

describe("sumBlockAdherence", () => {
  it("sums contributions across mixed block kinds", () => {
    const straight = run(
      mkBlock(
        "e1",
        "straight_set",
        [mkLog("1", "e1", "straight_set", { exercise_id: "x", reps: 10, weight: 50, rpe: 8 })]
      ),
      "straight_set",
      [ex("e1", "x", "10", 50, 8)],
      null
    );
    const amrap = run(
      mkBlock("e2", "amrap", [
        mkLog("a1", "e2", "amrap", { amrap_duration_seconds: 300, amrap_total_reps: 50, amrap_target_reps: 50 }),
      ]),
      "amrap",
      [],
      {
        timeProtocols: [
          {
            set_entry_id: "e2",
            protocol_type: "amrap",
            total_duration_minutes: 5,
            target_reps: 50,
            reps_per_round: null,
            time_cap_minutes: null,
            work_seconds: null,
            rest_seconds: null,
            rounds: null,
          },
        ],
        dropSets: [],
        clusterSets: [],
        restPauseSets: [],
      }
    );
    const sum = sumBlockAdherence([straight, amrap]);
    expect(sum.totalPrescribedSets).toBe(straight.totalPrescribedSets + amrap.totalPrescribedSets);
    expect(sum.setsOnTarget).toBe(straight.setsOnTargetCount + amrap.setsOnTargetCount);
  });
});
