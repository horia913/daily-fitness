import {
  buildPrescribedWorkoutReference,
  formatPrescribedStrengthLine,
} from "@/lib/workoutLog/prescribedWorkoutReference";
import type { WorkoutLogBlock, WorkoutLogSet } from "@/types/workoutLog";

function baseSet(overrides: Partial<WorkoutLogSet>): WorkoutLogSet {
  return {
    id: overrides.id ?? "s1",
    workout_log_id: "l1",
    client_id: "c1",
    set_entry_id: overrides.set_entry_id ?? "e1",
    set_type: overrides.set_type ?? "straight_set",
    exercise_id: overrides.exercise_id ?? "ex1",
    set_number: overrides.set_number ?? 1,
    weight: overrides.weight ?? 12,
    reps: overrides.reps ?? 6,
    rpe: overrides.rpe ?? null,
    completed_at: overrides.completed_at ?? "2026-01-01T10:00:00Z",
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
  };
}

const emptyBundleExtras = {
  timeProtocols: [] as const,
  dropSets: [] as const,
  clusterSets: [] as const,
  restPauseSets: [] as const,
};

describe("formatPrescribedStrengthLine", () => {
  it("adds reps suffix for bare rep counts (no kg)", () => {
    expect(formatPrescribedStrengthLine({ prescribedReps: 6, prescribedRir: 8 })).toBe("6 reps @ RIR 8");
    expect(formatPrescribedStrengthLine({ prescribedReps: 10 })).toBe("10 reps");
    expect(formatPrescribedStrengthLine({ prescribedReps: 15 })).toBe("15 reps");
  });

  it("keeps kg × reps shape without extra reps word after the number", () => {
    expect(formatPrescribedStrengthLine({ prescribedWeightKg: 12, prescribedReps: 8, prescribedRir: 2 })).toBe(
      "12 kg × 8 @ RIR 2"
    );
  });
});

describe("buildPrescribedWorkoutReference", () => {
  it("builds straight_set block with header and per-set outcome", () => {
    const block: WorkoutLogBlock = {
      setEntryId: "e1",
      setType: "straight_set",
      blockOrder: 1,
      exerciseIds: ["ex1"],
      exerciseNames: ["Press"],
      sets: [baseSet({ weight: 12, reps: 6, rpe: 8 })],
    };
    const ref = buildPrescribedWorkoutReference([block], {
      ...emptyBundleExtras,
      setEntries: [{ id: "e1", set_type: "straight_set", total_sets: 3, reps_per_set: "8" }],
      entryExercises: [
        {
          set_entry_id: "e1",
          exercise_id: "ex1",
          reps: "8",
          weight_kg: 12,
          rir: 7,
        },
      ],
      exerciseNames: new Map([["ex1", "Press"]]),
    });
    expect(ref).not.toBeNull();
    const b = ref!.byBlockId.e1 as { headerSummary?: string; sets?: { outcome?: string }[] };
    expect(b.headerSummary).toMatch(/3 sets/);
    expect(b.sets?.[0]?.outcome).toBe("miss");
  });

  it("builds AMRAP time reference", () => {
    const block: WorkoutLogBlock = {
      setEntryId: "t1",
      setType: "amrap",
      blockOrder: 1,
      exerciseIds: ["ex1"],
      exerciseNames: ["Row"],
      sets: [baseSet({ set_entry_id: "t1", set_type: "amrap", amrap_total_reps: 40 })],
    };
    const ref = buildPrescribedWorkoutReference([block], {
      ...emptyBundleExtras,
      setEntries: [{ id: "t1", set_type: "amrap", total_sets: 1, reps_per_set: null }],
      entryExercises: [],
      exerciseNames: new Map(),
      timeProtocols: [
        {
          set_entry_id: "t1",
          protocol_type: "amrap",
          total_duration_minutes: 5,
          target_reps: 50,
        },
      ],
    });
    expect(ref).not.toBeNull();
    const t = ref!.byBlockId.t1 as { headerSummary?: string };
    expect(t.headerSummary).toMatch(/AMRAP/);
  });

  it("builds drop_set header from drop rows", () => {
    const block: WorkoutLogBlock = {
      setEntryId: "d1",
      setType: "drop_set",
      blockOrder: 1,
      exerciseIds: ["ex1"],
      exerciseNames: ["Curl"],
      sets: [baseSet({ set_entry_id: "d1", set_type: "drop_set", weight: 20, reps: 10 })],
    };
    const ref = buildPrescribedWorkoutReference([block], {
      ...emptyBundleExtras,
      setEntries: [{ id: "d1", set_type: "drop_set", total_sets: 1, reps_per_set: "10" }],
      entryExercises: [
        { set_entry_id: "d1", exercise_id: "ex1", reps: "10", weight_kg: 20, rir: null },
      ],
      exerciseNames: new Map([["ex1", "Curl"]]),
      dropSets: [
        { set_entry_id: "d1", drop_order: 1, reps: "10", weight_kg: 20 },
        { set_entry_id: "d1", drop_order: 2, reps: "8", weight_kg: 15 },
      ],
    });
    expect(ref).not.toBeNull();
    const b = ref!.byBlockId.d1 as { headerSummary?: string };
    expect(b.headerSummary).toMatch(/drops/);
  });
});
