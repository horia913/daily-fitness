import { groupSetsIntoBlocks } from "@/lib/workoutLog/groupSetsIntoBlocks";
import type { WorkoutLogSet } from "@/types/workoutLog";

function makeSet(overrides: Partial<WorkoutLogSet>): WorkoutLogSet {
  return {
    id: overrides.id ?? "set-1",
    workout_log_id: "log-1",
    client_id: "client-1",
    set_entry_id: overrides.set_entry_id ?? "entry-1",
    set_type: overrides.set_type ?? "straight_set",
    exercise_id: overrides.exercise_id ?? "ex-1",
    set_number: overrides.set_number ?? 1,
    weight: null,
    reps: null,
    rpe: null,
    completed_at: overrides.completed_at ?? "2026-01-01T10:00:00.000Z",
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
    superset_exercise_a_id: overrides.superset_exercise_a_id ?? null,
    superset_weight_a: null,
    superset_reps_a: null,
    superset_exercise_b_id: overrides.superset_exercise_b_id ?? null,
    superset_weight_b: null,
    superset_reps_b: null,
    giant_set_exercises: overrides.giant_set_exercises ?? null,
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
    round_number: overrides.round_number ?? null,
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
    exercises: overrides.exercises ?? null,
  };
}

describe("groupSetsIntoBlocks", () => {
  it("groups every supported block type", () => {
    const blockTypes = [
      "straight_set",
      "superset",
      "drop_set",
      "cluster_set",
      "giant_set",
      "rest_pause",
      "pre_exhaustion",
      "amrap",
      "emom",
      "tabata",
      "for_time",
      "speed_work",
      "endurance",
    ] as const;
    const setLogs = blockTypes.map((blockType, idx) =>
      makeSet({
        id: `set-${idx}`,
        set_entry_id: `entry-${idx}`,
        set_type: blockType,
        completed_at: `2026-01-01T10:${String(idx).padStart(2, "0")}:00.000Z`,
      })
    );

    const blocks = groupSetsIntoBlocks(setLogs);
    expect(blocks).toHaveLength(blockTypes.length);
    expect(blocks.map((block) => block.setType)).toEqual(blockTypes);
  });

  it("collects superset and giant-set exercise ids", () => {
    const blocks = groupSetsIntoBlocks([
      makeSet({
        id: "s1",
        set_entry_id: "superset-block",
        set_type: "superset",
        superset_exercise_a_id: "a",
        superset_exercise_b_id: "b",
      }),
      makeSet({
        id: "g1",
        set_entry_id: "giant-block",
        set_type: "giant_set",
        giant_set_exercises: [{ exercise_id: "c", exercise_name: "C" }, { exercise_id: "d", exercise_name: "D" }],
      }),
    ]);

    const superset = blocks.find((block) => block.setEntryId === "superset-block");
    const giant = blocks.find((block) => block.setEntryId === "giant-block");
    expect(superset?.exerciseIds).toEqual(expect.arrayContaining(["a", "b"]));
    expect(giant?.exerciseIds).toEqual(expect.arrayContaining(["c", "d"]));
  });

  it("derives roundCount for time blocks", () => {
    const block = groupSetsIntoBlocks([
      makeSet({ set_entry_id: "time-block", set_type: "emom", round_number: 1 }),
      makeSet({ id: "s2", set_entry_id: "time-block", set_type: "emom", round_number: 4 }),
    ])[0];

    expect(block.roundCount).toBe(4);
  });
});
