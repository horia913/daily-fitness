import {
  consolidateRowOutcome,
  isSetOnTarget,
  repsOutcome,
  rpeVsPrescribedRpeOutcome,
  weightOutcome,
} from "@/lib/workoutLogSetOutcome";

describe("workoutLogSetOutcome", () => {
  it("repsOutcome: hit band, under, miss, over", () => {
    expect(repsOutcome(10, 10)).toBe("hit");
    expect(repsOutcome(10, 11)).toBe("under");
    expect(repsOutcome(7, 10)).toBe("miss");
    expect(repsOutcome(13, 10)).toBe("over");
    expect(repsOutcome(null, 10)).toBe("neutral");
  });

  it("weightOutcome: within tolerance is hit", () => {
    expect(weightOutcome(100, 100)).toBe("hit");
    expect(weightOutcome(102.4, 100)).toBe("hit");
    expect(weightOutcome(97.4, 100)).toBe("hit");
    expect(weightOutcome(90, 100)).toBe("under");
    expect(weightOutcome(110, 100)).toBe("over");
  });

  it("rpeVsPrescribedRpeOutcome: ±1 is hit", () => {
    expect(rpeVsPrescribedRpeOutcome(8, 8)).toBe("hit");
    expect(rpeVsPrescribedRpeOutcome(9, 8)).toBe("hit");
    expect(rpeVsPrescribedRpeOutcome(10, 8)).toBe("flag");
  });

  it("consolidateRowOutcome picks worst signal", () => {
    expect(consolidateRowOutcome("hit", "hit", "flag")).toBe("flag");
    expect(consolidateRowOutcome("miss", "hit", "hit")).toBe("miss");
  });

  it("isSetOnTarget: hit / under / over count as on-target; miss and flag do not", () => {
    expect(
      isSetOnTarget({
        actualReps: 10,
        prescribedReps: 10,
        actualWeightKg: 100,
        prescribedWeightKg: 100,
        actualRpe: 8,
        prescribedRpe: 8,
      })
    ).toBe(true);
    expect(
      isSetOnTarget({
        actualReps: 8,
        prescribedReps: 10,
        actualWeightKg: 100,
        prescribedWeightKg: 100,
        actualRpe: 8,
        prescribedRpe: 8,
      })
    ).toBe(true);
    expect(
      isSetOnTarget({
        actualReps: 5,
        prescribedReps: 10,
        actualWeightKg: 100,
        prescribedWeightKg: 100,
        actualRpe: 8,
        prescribedRpe: 8,
      })
    ).toBe(false);
    expect(
      isSetOnTarget({
        actualReps: 10,
        prescribedReps: 10,
        actualWeightKg: 100,
        prescribedWeightKg: 100,
        actualRpe: 10,
        prescribedRpe: 8,
      })
    ).toBe(false);
  });
});
