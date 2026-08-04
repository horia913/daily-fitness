import { computeWorkoutAdherence } from "@/lib/coachWorkoutAdherence";
import type { PerSetAdherenceBlock } from "@/lib/workoutLog/adherenceTypes";

jest.mock("@/lib/clientProgressionService", () => ({
  parseRepsRange: (value: string) => {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? { min: n, max: n } : null;
  },
}));

describe("coachWorkoutAdherence", () => {
  it("keeps actual superset RPE (regression)", () => {
    const result = computeWorkoutAdherence(
      [
        {
          workout_log_id: "wl-1",
          set_entry_id: "entry-1",
          set_type: "superset",
          set_number: 1,
          superset_exercise_a_id: "a",
          superset_weight_a: 40,
          superset_reps_a: 10,
          superset_exercise_b_id: "b",
          superset_weight_b: 20,
          superset_reps_b: 12,
          rpe: 8,
        },
      ],
      [{ id: "entry-1", set_type: "superset" }],
      [
        { set_entry_id: "entry-1", exercise_id: "a", reps: "10", weight_kg: 40, rpe: 8 },
        { set_entry_id: "entry-1", exercise_id: "b", reps: "12", weight_kg: 20, rpe: 8 },
      ],
      new Map([
        ["a", "Exercise A"],
        ["b", "Exercise B"],
      ])
    );

    const sup = result.blocks.find(
      (b): b is PerSetAdherenceBlock => b.kind === "per_set" && b.setType === "superset"
    );
    expect(sup).toBeDefined();
    expect(sup?.setOutcomes[0]?.row).toBe("hit");
  });

  it("creates speed and endurance blocks when prescriptions exist", () => {
    const result = computeWorkoutAdherence(
      [
        {
          workout_log_id: "wl-1",
          set_entry_id: "speed-entry",
          set_type: "speed_work",
          exercise_id: "speed-ex",
          set_number: 1,
          actual_time_seconds: 45,
        },
        {
          workout_log_id: "wl-1",
          set_entry_id: "endurance-entry",
          set_type: "endurance",
          exercise_id: "endurance-ex",
          set_number: 1,
          actual_time_seconds: 1200,
          actual_distance_meters: 5000,
          actual_hr_avg: 155,
        },
      ],
      [
        { id: "speed-entry", set_type: "speed_work" },
        { id: "endurance-entry", set_type: "endurance" },
      ],
      [],
      new Map(),
      {
        speedByKey: new Map([["speed-entry::speed-ex", { intervals: 1, distance_meters: 200 }]]),
        enduranceByKey: new Map([
          [
            "endurance-entry::endurance-ex",
            {
              target_distance_meters: 5000,
              target_time_seconds: 1260,
              target_pace_seconds_per_km: 252,
              hr_zone: 3,
              target_hr_pct: null,
            },
          ],
        ]),
      }
    );

    expect(
      result.blocks.some((b) => b.kind === "speed_endurance" && b.setType === "speed_work")
    ).toBe(true);
    expect(
      result.blocks.some((b) => b.kind === "speed_endurance" && b.setType === "endurance")
    ).toBe(true);
  });
});
