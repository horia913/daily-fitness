import {
  computeRepsScore,
  computeWeightScore,
  computeRpeScore,
  intensityMultiplier,
  computeProgramAthleteScore,
} from "@/lib/athleteScoreScoringPure";

describe("athleteScoreScoringPure", () => {
  test("intensityMultiplier", () => {
    expect(intensityMultiplier("light")).toBe(1);
    expect(intensityMultiplier("moderate")).toBe(1.5);
    expect(intensityMultiplier("vigorous")).toBe(2);
    expect(intensityMultiplier(null)).toBe(1);
    expect(intensityMultiplier("")).toBe(1);
  });

  test("computeRepsScore", () => {
    expect(computeRepsScore(8, "8")).toBe(1);
    expect(computeRepsScore(6, "8")).toBe(0.75);
    expect(computeRepsScore(12, "8-10")).toBe(1);
    expect(computeRepsScore(7, "8-10")).toBe(0.875);
    expect(computeRepsScore(15, "8-10")).toBe(1);
    expect(computeRepsScore(10, "AMRAP")).toBe(1);
    expect(computeRepsScore(null, "8")).toBeNull();
  });

  test("computeWeightScore", () => {
    expect(computeWeightScore(50, 50)).toBe(1);
    expect(computeWeightScore(40, 50)).toBe(0.8);
    expect(computeWeightScore(60, 50)).toBe(1);
    expect(computeWeightScore(50, null)).toBeNull();
    expect(computeWeightScore(50, 0)).toBeNull();
  });

  test("computeRpeScore", () => {
    expect(computeRpeScore(7, 7)).toBe(1);
    expect(computeRpeScore(8, 7)).toBeCloseTo(2 / 3);
    expect(computeRpeScore(10, 7)).toBe(0);
    expect(computeRpeScore(null, 7)).toBeNull();
  });

  test("computeProgramAthleteScore", () => {
    expect(computeProgramAthleteScore(100, 100)).toBe(100);
    expect(computeProgramAthleteScore(100, 50)).toBe(65);
    expect(computeProgramAthleteScore(50, 100)).toBe(50);
    expect(computeProgramAthleteScore(50, 50)).toBe(33);
    expect(computeProgramAthleteScore(80, null)).toBe(80);
  });
});
