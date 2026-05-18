import {
  v2ShouldRecordMaxStrength,
  v2ShouldRecordStrengthEndurance,
  prDetectionHasResult,
  countDistinctPrMoments,
} from "../prService";

describe("PR v2 eligibility", () => {
  describe("v2ShouldRecordMaxStrength", () => {
    it("first-ever set (no current best)", () => {
      expect(v2ShouldRecordMaxStrength(null, 50)).toBe(true);
      expect(v2ShouldRecordMaxStrength(undefined, 50)).toBe(true);
    });

    it("heavier weight is PR", () => {
      expect(v2ShouldRecordMaxStrength(95, 100)).toBe(true);
    });

    it("same weight is not PR", () => {
      expect(v2ShouldRecordMaxStrength(100, 100)).toBe(false);
    });

    it("lower weight is not PR", () => {
      expect(v2ShouldRecordMaxStrength(100, 95)).toBe(false);
    });

    it("non-positive weight never PR", () => {
      expect(v2ShouldRecordMaxStrength(null, 0)).toBe(false);
      expect(v2ShouldRecordMaxStrength(100, -1)).toBe(false);
    });
  });

  describe("v2ShouldRecordStrengthEndurance", () => {
    it("first-ever volume", () => {
      expect(v2ShouldRecordStrengthEndurance(null, 400)).toBe(true);
    });

    it("higher volume is PR", () => {
      expect(v2ShouldRecordStrengthEndurance(440, 660)).toBe(true);
    });

    it("same volume is not PR", () => {
      expect(v2ShouldRecordStrengthEndurance(660, 660)).toBe(false);
    });

    it("max strength bump without volume bump: 55×8 vs 400 baseline — 440 > 400", () => {
      expect(v2ShouldRecordStrengthEndurance(400, 55 * 8)).toBe(true);
    });

    it("max strength only: 55×12 vs 440 — 660 > 440", () => {
      expect(v2ShouldRecordStrengthEndurance(440, 55 * 12)).toBe(true);
    });

    it("neither: 50×8 = 400 after 440 baseline", () => {
      expect(v2ShouldRecordStrengthEndurance(440, 50 * 8)).toBe(false);
    });
  });

  describe("countDistinctPrMoments", () => {
    it("dual record types on one set count as one moment", () => {
      expect(
        countDistinctPrMoments([
          { id: "a", workout_set_log_id: "set-1" },
          { id: "b", workout_set_log_id: "set-1" },
        ]),
      ).toBe(1);
    });

    it("different sets count separately", () => {
      expect(
        countDistinctPrMoments([
          { id: "a", workout_set_log_id: "set-1" },
          { id: "b", workout_set_log_id: "set-2" },
        ]),
      ).toBe(2);
    });

    it("legacy rows without set log id use row id", () => {
      expect(
        countDistinctPrMoments([
          { id: "legacy-a", workout_set_log_id: null },
          { id: "legacy-b", workout_set_log_id: null },
        ]),
      ).toBe(2);
    });
  });

  describe("prDetectionHasResult", () => {
    it("empty object is false", () => {
      expect(prDetectionHasResult({})).toBe(false);
    });

    it("either branch is true", () => {
      expect(
        prDetectionHasResult({
          max_strength: {
            record_id: "1",
            previous_value: 0,
            new_value: 50,
            improvement_pct: null,
          },
        }),
      ).toBe(true);
    });
  });
});
