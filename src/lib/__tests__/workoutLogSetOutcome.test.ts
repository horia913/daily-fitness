import {
  consolidateRowOutcome,
  repsOutcome,
  rpeVsPrescribedRirOutcome,
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

  it("rpeVsPrescribedRirOutcome: ±1 is hit", () => {
    expect(rpeVsPrescribedRirOutcome(8, 8)).toBe("hit");
    expect(rpeVsPrescribedRirOutcome(9, 8)).toBe("hit");
    expect(rpeVsPrescribedRirOutcome(10, 8)).toBe("flag");
  });

  it("consolidateRowOutcome picks worst signal", () => {
    expect(consolidateRowOutcome("hit", "hit", "flag")).toBe("flag");
    expect(consolidateRowOutcome("miss", "hit", "hit")).toBe("miss");
  });
});
