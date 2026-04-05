/**
 * Coach-facing adherence: prescribed vs actual for workout_set_logs.
 * Used by summary API, workout log detail, and Training recent sessions.
 *
 * Rules (product spec):
 * - Reps: actual >= prescribed target (range uses min) → good; else short.
 * - Weight: actual >= prescribed kg → good; load-% only → no compare (neutral).
 * - RPE: stored prescribed value in `rir` column vs actual `rpe` on log — lower actual is better.
 *
 * DB note: `rir` on prescriptions is the literal prescribed RPE to display/compare (see workoutTargetIntensity).
 */

import { parseRepsRange } from "@/lib/clientProgressionService";
import { formatPaceMinSecPerKm } from "@/lib/enduranceFormUtils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CellOutcome = "green" | "red" | "neutral";

export type AdherenceTier = "green" | "amber" | "red";

/** Minimal row from workout_set_logs (straight_set / superset focused). */
export type CoachSetLogRow = {
  set_entry_id?: string | null;
  block_id?: string | null;
  block_type?: string | null;
  set_type?: string | null;
  exercise_id?: string | null;
  set_number?: number | null;
  weight?: number | string | null;
  reps?: number | null;
  rpe?: number | string | null;
  superset_exercise_a_id?: string | null;
  superset_weight_a?: number | string | null;
  superset_reps_a?: number | null;
  superset_exercise_b_id?: string | null;
  superset_weight_b?: number | string | null;
  superset_reps_b?: number | null;
  actual_time_seconds?: number | null;
  actual_distance_meters?: number | null;
  actual_hr_avg?: number | null;
  actual_speed_kmh?: number | null;
};

export type PrescribedExerciseRow = {
  exercise_id: string;
  reps?: string | null;
  weight_kg?: number | string | null;
  load_percentage?: number | string | null;
  /** Prescribed RPE — stored in `rir` column in DB. */
  rir?: number | string | null;
};

export type WorkoutLogTotals = {
  total_weight_lifted?: number | string | null;
  total_sets_completed?: number | null;
};

/** Per-set evaluation for UI (log detail). */
export type SetEvaluation = {
  setNumber: number;
  weight: { outcome: CellOutcome; actual: number | null; prescribed: number | null };
  reps: { outcome: CellOutcome; actual: number | null; prescribedMin: number | null };
  rpe: { outcome: CellOutcome; actual: number | null; prescribed: number | null };
};

export type SpeedIntervalCoachRow = {
  setNumber: number;
  timeSeconds: number | null;
  rpe: number | null;
};

export type EnduranceCoachSummary = {
  prescribedDistanceM: number | null;
  prescribedTimeSec: number | null;
  prescribedPaceSecPerKm: number | null;
  prescribedHrZone: number | null;
  prescribedHrPct: number | null;
  actualDistanceM: number | null;
  actualTimeSec: number | null;
  actualPaceSecPerKm: number | null;
  actualHrAvg: number | null;
  distanceOutcome: CellOutcome;
  timeOutcome: CellOutcome;
  paceOutcome: CellOutcome;
  hrOutcome: CellOutcome;
};

export type ExerciseAdherenceBlock = {
  exerciseId: string;
  exerciseName?: string;
  blockTypeLabel: string;
  prescribedSummary: string;
  sets: SetEvaluation[];
  /** Sets that count toward adherence denom for this exercise. */
  setsOnTarget: number;
  setsEvaluated: number;
  /** When set, coach detail page renders speed interval table instead of weight/reps. */
  displayVariant?: "standard" | "speed_work" | "endurance";
  speedIntervals?: SpeedIntervalCoachRow[];
  speedConsistencyPct?: number | null;
  prescribedSpeedIntervals?: number | null;
  prescribedSpeedDistanceM?: number | null;
  enduranceSummary?: EnduranceCoachSummary;
};

export type WorkoutAdherenceResult = {
  setsOnTarget: number;
  totalPrescribedSets: number;
  /** 0–100, or null if nothing to compare */
  adherencePercent: number | null;
  tier: AdherenceTier | null;
  exerciseBlocks: ExerciseAdherenceBlock[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getSetEntryId(row: CoachSetLogRow): string | null {
  const id = row.set_entry_id ?? row.block_id;
  return id && String(id).length > 0 ? String(id) : null;
}

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function numInt(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function prescKey(setEntryId: string, exerciseId: string): string {
  return `${setEntryId}::${exerciseId}`;
}

/** Higher = more consistent interval times (100 = identical). */
function intervalTimeConsistencyPct(times: number[]): number | null {
  if (times.length < 2) return null;
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  if (mean <= 0) return null;
  const variance =
    times.reduce((s, t) => s + (t - mean) * (t - mean), 0) / times.length;
  const sd = Math.sqrt(variance);
  const cv = sd / mean;
  return Math.max(0, Math.min(100, Math.round(100 * (1 - Math.min(1, cv)))));
}

function prescribedRpe(pe: PrescribedExerciseRow): number | null {
  return numInt(pe.rir);
}

function repsTargetMin(pe: PrescribedExerciseRow): number | null {
  const raw = pe.reps;
  if (raw === null || raw === undefined) return null;
  const r = parseRepsRange(typeof raw === "string" ? raw : String(raw));
  return r ? r.min : null;
}

/** Prescribed weight in kg when comparable; null if only % or nothing. */
function prescribedWeightKg(pe: PrescribedExerciseRow): number | null {
  const w = num(pe.weight_kg);
  if (w !== null && w > 0) return w;
  const lp = num(pe.load_percentage);
  if (lp !== null) return null;
  return null;
}

function compareReps(
  actual: number | null,
  prescribedMin: number | null
): CellOutcome {
  if (prescribedMin === null || actual === null) return "neutral";
  return actual >= prescribedMin ? "green" : "red";
}

function compareWeight(
  actual: number | null,
  prescribed: number | null
): CellOutcome {
  if (prescribed === null || actual === null) return "neutral";
  return actual >= prescribed ? "green" : "red";
}

function compareRpe(actual: number | null, prescribed: number | null): CellOutcome {
  if (prescribed === null || actual === null) return "neutral";
  return actual <= prescribed ? "green" : "red";
}

function hasAnyPrescription(pe: PrescribedExerciseRow): boolean {
  const r = repsTargetMin(pe);
  const w = prescribedWeightKg(pe);
  const p = prescribedRpe(pe);
  return r !== null || w !== null || p !== null;
}

function setMeetsAllPrescribed(
  e: SetEvaluation,
  pe: PrescribedExerciseRow
): boolean {
  const needReps = repsTargetMin(pe) !== null;
  const needW = prescribedWeightKg(pe) !== null;
  const needRpe = prescribedRpe(pe) !== null;
  if (needReps && e.reps.outcome !== "green") return false;
  if (needW && e.weight.outcome !== "green") return false;
  if (needRpe && e.rpe.outcome !== "green") return false;
  return needReps || needW || needRpe;
}

export function adherenceTierFromPercent(
  pct: number | null | undefined
): AdherenceTier | null {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return null;
  if (pct >= 80) return "green";
  if (pct >= 50) return "amber";
  return "red";
}

export function totalVolumeNumber(
  v: number | string | null | undefined
): number | null {
  return num(v);
}

/**
 * Volume delta: current − previous (positive = client lifted more this time).
 */
export function volumeDeltaKg(
  current: WorkoutLogTotals | null | undefined,
  previous: WorkoutLogTotals | null | undefined
): number | null {
  const c = totalVolumeNumber(current?.total_weight_lifted);
  const p = totalVolumeNumber(previous?.total_weight_lifted);
  if (c === null || p === null) return null;
  return Math.round((c - p) * 10) / 10;
}

export function setsDelta(
  current: WorkoutLogTotals | null | undefined,
  previous: WorkoutLogTotals | null | undefined
): number | null {
  const c = current?.total_sets_completed;
  const p = previous?.total_sets_completed;
  if (c === null || c === undefined || p === null || p === undefined) return null;
  return c - p;
}

// ─── Template index ──────────────────────────────────────────────────────────

export function buildPrescriptionMaps(
  setEntries: Array<{ id: string; set_type: string }>,
  exercises: Array<PrescribedExerciseRow & { set_entry_id: string }>
): {
  bySetEntry: Map<string, Map<string, PrescribedExerciseRow>>;
  setTypeByEntry: Map<string, string>;
} {
  const setTypeByEntry = new Map<string, string>();
  for (const e of setEntries) {
    setTypeByEntry.set(e.id, String(e.set_type || "").toLowerCase());
  }
  const bySetEntry = new Map<string, Map<string, PrescribedExerciseRow>>();
  for (const row of exercises) {
    const sid = row.set_entry_id;
    if (!bySetEntry.has(sid)) bySetEntry.set(sid, new Map());
    bySetEntry.get(sid)!.set(row.exercise_id, row);
  }
  return { bySetEntry, setTypeByEntry };
}

// ─── Straight set row ────────────────────────────────────────────────────────

function evaluateStraightSet(
  log: CoachSetLogRow,
  pe: PrescribedExerciseRow | undefined
): SetEvaluation | null {
  const setNumber = log.set_number ?? 1;
  const actualReps = numInt(log.reps);
  const actualWeight = num(log.weight);
  const actualRpe = numInt(log.rpe);

  if (!pe || !hasAnyPrescription(pe)) {
    return {
      setNumber,
      weight: {
        outcome: "neutral",
        actual: actualWeight,
        prescribed: pe ? prescribedWeightKg(pe) : null,
      },
      reps: {
        outcome: "neutral",
        actual: actualReps,
        prescribedMin: pe ? repsTargetMin(pe) : null,
      },
      rpe: {
        outcome: "neutral",
        actual: actualRpe,
        prescribed: pe ? prescribedRpe(pe) : null,
      },
    };
  }

  const pMin = repsTargetMin(pe);
  const pW = prescribedWeightKg(pe);
  const pRpe = prescribedRpe(pe);

  return {
    setNumber,
    reps: {
      outcome: compareReps(actualReps, pMin),
      actual: actualReps,
      prescribedMin: pMin,
    },
    weight: {
      outcome: compareWeight(actualWeight, pW),
      actual: actualWeight,
      prescribed: pW,
    },
    rpe: {
      outcome: compareRpe(actualRpe, pRpe),
      actual: actualRpe,
      prescribed: pRpe,
    },
  };
}

// ─── Superset row (one DB row, two exercises) ─────────────────────────────────

function evaluateSuperset(
  log: CoachSetLogRow,
  map: Map<string, PrescribedExerciseRow>
): { evaluations: SetEvaluation[]; combinedOnTarget: boolean } | null {
  const setNumber = log.set_number ?? 1;
  const idA = log.superset_exercise_a_id;
  const idB = log.superset_exercise_b_id;
  const peA = idA ? map.get(idA) : undefined;
  const peB = idB ? map.get(idB) : undefined;

  const evalA: SetEvaluation = {
    setNumber,
    weight: {
      outcome: "neutral",
      actual: num(log.superset_weight_a),
      prescribed: peA ? prescribedWeightKg(peA) : null,
    },
    reps: {
      outcome: "neutral",
      actual: numInt(log.superset_reps_a),
      prescribedMin: peA ? repsTargetMin(peA) : null,
    },
    rpe: {
      outcome: "neutral",
      actual: null,
      prescribed: peA ? prescribedRpe(peA) : null,
    },
  };
  if (peA && hasAnyPrescription(peA)) {
    evalA.reps.outcome = compareReps(
      numInt(log.superset_reps_a),
      repsTargetMin(peA)
    );
    evalA.weight.outcome = compareWeight(
      num(log.superset_weight_a),
      prescribedWeightKg(peA)
    );
    evalA.rpe.outcome = "neutral";
  }

  const evalB: SetEvaluation = {
    setNumber,
    weight: {
      outcome: "neutral",
      actual: num(log.superset_weight_b),
      prescribed: peB ? prescribedWeightKg(peB) : null,
    },
    reps: {
      outcome: "neutral",
      actual: numInt(log.superset_reps_b),
      prescribedMin: peB ? repsTargetMin(peB) : null,
    },
    rpe: {
      outcome: "neutral",
      actual: null,
      prescribed: peB ? prescribedRpe(peB) : null,
    },
  };
  if (peB && hasAnyPrescription(peB)) {
    evalB.reps.outcome = compareReps(
      numInt(log.superset_reps_b),
      repsTargetMin(peB)
    );
    evalB.weight.outcome = compareWeight(
      num(log.superset_weight_b),
      prescribedWeightKg(peB)
    );
  }

  const okA =
    !peA || !hasAnyPrescription(peA) || setMeetsAllPrescribed(evalA, peA);
  const okB =
    !peB || !hasAnyPrescription(peB) || setMeetsAllPrescribed(evalB, peB);
  const hasPresc = Boolean(
    (peA && hasAnyPrescription(peA)) || (peB && hasAnyPrescription(peB))
  );

  return {
    evaluations: [evalA, evalB],
    combinedOnTarget: hasPresc && okA && okB,
  };
}

// ─── Aggregate workout ───────────────────────────────────────────────────────

export type WorkoutAdherencePrescriptions = {
  speedByKey?: Map<string, { intervals: number; distance_meters: number }>;
  enduranceByKey?: Map<
    string,
    {
      target_distance_meters: number;
      target_time_seconds: number | null;
      target_pace_seconds_per_km: number | null;
      hr_zone: number | null;
      target_hr_pct: number | null;
    }
  >;
};

/**
 * Compute adherence and per-exercise blocks for one workout log.
 * Processes straight_set, superset, speed_work, and endurance rows.
 */
export function computeWorkoutAdherence(
  logs: CoachSetLogRow[],
  setEntries: Array<{ id: string; set_type: string }>,
  entryExercises: Array<PrescribedExerciseRow & { set_entry_id: string }>,
  exerciseNames?: Map<string, string>,
  presc?: WorkoutAdherencePrescriptions
): WorkoutAdherenceResult {
  const { bySetEntry, setTypeByEntry } = buildPrescriptionMaps(
    setEntries,
    entryExercises
  );

  let setsOnTarget = 0;
  let totalPrescribedSets = 0;

  type BlockKey = string;
  const blockMap = new Map<
    BlockKey,
    {
      setEntryId: string;
      exerciseId: string;
      blockType: string;
      sets: SetEvaluation[];
    }
  >();

  const blockKey = (setEntryId: string, exerciseId: string) =>
    `${setEntryId}::${exerciseId}`;

  for (const log of logs) {
    const entryId = getSetEntryId(log);
    if (!entryId) continue;

    const st = String(
      setTypeByEntry.get(entryId) ||
        log.block_type ||
        log.set_type ||
        ""
    ).toLowerCase();
    const prescMap = bySetEntry.get(entryId);

    if (st === "straight_set") {
      const exId = log.exercise_id;
      if (!exId || !prescMap) continue;
      const pe = prescMap.get(exId);
      const ev = evaluateStraightSet(log, pe);
      if (!ev) continue;

      if (pe && hasAnyPrescription(pe)) {
        totalPrescribedSets += 1;
        if (setMeetsAllPrescribed(ev, pe)) setsOnTarget += 1;
      }

      const bk = blockKey(entryId, exId);
      if (!blockMap.has(bk)) {
        blockMap.set(bk, {
          setEntryId: entryId,
          exerciseId: exId,
          blockType: "straight_set",
          sets: [],
        });
      }
      blockMap.get(bk)!.sets.push(ev);
      continue;
    }

    if (st === "superset" && prescMap) {
      const sup = evaluateSuperset(log, prescMap);
      if (!sup) continue;
      const idA = log.superset_exercise_a_id;
      const idB = log.superset_exercise_b_id;

      const peA = idA ? prescMap.get(idA) : undefined;
      const peB = idB ? prescMap.get(idB) : undefined;
      const hasDenom =
        (peA && hasAnyPrescription(peA)) || (peB && hasAnyPrescription(peB));
      if (hasDenom) {
        totalPrescribedSets += 1;
        if (sup.combinedOnTarget) setsOnTarget += 1;
      }

      if (idA) {
        const bk = blockKey(entryId, idA);
        if (!blockMap.has(bk)) {
          blockMap.set(bk, {
            setEntryId: entryId,
            exerciseId: idA,
            blockType: "superset",
            sets: [],
          });
        }
        const e0 = sup.evaluations[0];
        if (e0) blockMap.get(bk)!.sets.push(e0);
      }
      if (idB) {
        const bk = blockKey(entryId, idB);
        if (!blockMap.has(bk)) {
          blockMap.set(bk, {
            setEntryId: entryId,
            exerciseId: idB,
            blockType: "superset",
            sets: [],
          });
        }
        const e1 = sup.evaluations[1];
        if (e1) blockMap.get(bk)!.sets.push(e1);
      }
    }
  }

  const speedPresc = presc?.speedByKey;
  const endurancePresc = presc?.enduranceByKey;
  const speedAgg = new Map<
    string,
    { setEntryId: string; exerciseId: string; logs: CoachSetLogRow[] }
  >();
  const enduranceAgg = new Map<
    string,
    { setEntryId: string; exerciseId: string; logs: CoachSetLogRow[] }
  >();

  for (const log of logs) {
    const entryId = getSetEntryId(log);
    if (!entryId) continue;
    const st = String(
      setTypeByEntry.get(entryId) ||
        log.block_type ||
        log.set_type ||
        ""
    ).toLowerCase();
    const exId = log.exercise_id;
    if (!exId) continue;
    if (st === "speed_work") {
      const k = prescKey(entryId, exId);
      if (!speedAgg.has(k))
        speedAgg.set(k, { setEntryId: entryId, exerciseId: exId, logs: [] });
      speedAgg.get(k)!.logs.push(log);
    }
    if (st === "endurance") {
      const k = prescKey(entryId, exId);
      if (!enduranceAgg.has(k))
        enduranceAgg.set(k, { setEntryId: entryId, exerciseId: exId, logs: [] });
      enduranceAgg.get(k)!.logs.push(log);
    }
  }

  const extraBlocks: ExerciseAdherenceBlock[] = [];

  for (const agg of speedAgg.values()) {
    const k = prescKey(agg.setEntryId, agg.exerciseId);
    const sorted = [...agg.logs].sort(
      (a, b) => (a.set_number ?? 0) - (b.set_number ?? 0)
    );
    const p = speedPresc?.get(k);
    const prescribedN = p?.intervals ?? sorted.length;
    totalPrescribedSets += prescribedN;
    const withTime = sorted.filter((l) => num(l.actual_time_seconds) != null)
      .length;
    setsOnTarget += Math.min(prescribedN, withTime);

    const times = sorted
      .map((l) => num(l.actual_time_seconds))
      .filter((t): t is number => t != null && t > 0);
    const consistency = intervalTimeConsistencyPct(times);

    const speedIntervals: SpeedIntervalCoachRow[] = sorted.map((l) => ({
      setNumber: l.set_number ?? 0,
      timeSeconds: num(l.actual_time_seconds),
      rpe: numInt(l.rpe),
    }));

    const parts: string[] = [];
    if (p?.intervals != null) parts.push(`${p.intervals}×`);
    if (p?.distance_meters != null) parts.push(`${p.distance_meters}m`);
    const prescribedSummary = parts.length ? parts.join("") : "Speed work";

    extraBlocks.push({
      exerciseId: agg.exerciseId,
      exerciseName: exerciseNames?.get(agg.exerciseId),
      blockTypeLabel: "SPEED WORK",
      prescribedSummary,
      sets: [],
      setsOnTarget: Math.min(prescribedN, withTime),
      setsEvaluated: prescribedN,
      displayVariant: "speed_work",
      speedIntervals,
      speedConsistencyPct: consistency,
      prescribedSpeedIntervals: p?.intervals ?? null,
      prescribedSpeedDistanceM: p?.distance_meters ?? null,
    });
  }

  for (const agg of enduranceAgg.values()) {
    const k = prescKey(agg.setEntryId, agg.exerciseId);
    const p = endurancePresc?.get(k);
    const log0 = agg.logs[0];
    const actD = num(log0?.actual_distance_meters);
    const actT = num(log0?.actual_time_seconds);
    const actHr = num(log0?.actual_hr_avg);
    const prescD = p?.target_distance_meters ?? null;
    const prescT = p?.target_time_seconds ?? null;
    const prescP = p?.target_pace_seconds_per_km ?? null;
    const actPace =
      actD != null && actT != null && actD > 0
        ? actT / (actD / 1000)
        : null;

    const distanceOutcome: CellOutcome = (() => {
      if (prescD == null || actD == null || prescD <= 0) return "neutral";
      const r = actD / prescD;
      if (r >= 1) return "green";
      if (r >= 0.92) return "neutral";
      return "red";
    })();

    const timeOutcome: CellOutcome = (() => {
      if (prescT == null || actT == null || prescT <= 0) return "neutral";
      if (actT <= prescT) return "green";
      if (actT <= prescT * 1.12) return "neutral";
      return "red";
    })();

    const paceOutcome: CellOutcome = (() => {
      if (prescP == null || actPace == null) return "neutral";
      if (actPace <= prescP) return "green";
      if (actPace <= prescP * 1.08) return "neutral";
      return "red";
    })();

    totalPrescribedSets += 1;
    const outs = [distanceOutcome, timeOutcome, paceOutcome];
    const onTarget = !outs.some((o) => o === "red");
    if (onTarget) setsOnTarget += 1;

    const prescribedSummary =
      prescD != null
        ? `${(prescD / 1000).toFixed(1)} km` +
          (prescP != null ? ` · ${formatPaceMinSecPerKm(prescP)}` : "")
        : "Endurance";

    extraBlocks.push({
      exerciseId: agg.exerciseId,
      exerciseName: exerciseNames?.get(agg.exerciseId),
      blockTypeLabel: "ENDURANCE",
      prescribedSummary,
      sets: [],
      setsOnTarget: onTarget ? 1 : 0,
      setsEvaluated: 1,
      displayVariant: "endurance",
      enduranceSummary: {
        prescribedDistanceM: prescD,
        prescribedTimeSec: prescT,
        prescribedPaceSecPerKm: prescP,
        prescribedHrZone: p?.hr_zone ?? null,
        prescribedHrPct: p?.target_hr_pct ?? null,
        actualDistanceM: actD,
        actualTimeSec: actT,
        actualPaceSecPerKm: actPace,
        actualHrAvg: actHr,
        distanceOutcome,
        timeOutcome,
        paceOutcome,
        hrOutcome: "neutral",
      },
    });
  }

  const adherencePercent =
    totalPrescribedSets > 0
      ? Math.round((setsOnTarget / totalPrescribedSets) * 1000) / 10
      : null;

  const exerciseBlocks: ExerciseAdherenceBlock[] = [];
  for (const v of blockMap.values()) {
    const name = exerciseNames?.get(v.exerciseId);
    const pe = bySetEntry.get(v.setEntryId)?.get(v.exerciseId);

    let prescribedSummary = "—";
    if (pe) {
      const parts: string[] = [];
      const r = pe.reps?.trim();
      if (r) parts.push(`${r} reps`);
      const w = prescribedWeightKg(pe);
      if (w !== null) parts.push(`${w} kg`);
      else if (num(pe.load_percentage) !== null)
        parts.push(`${num(pe.load_percentage)}%`);
      const rp = prescribedRpe(pe);
      if (rp !== null) parts.push(`RPE ${rp}`);
      prescribedSummary = parts.length ? parts.join(" · ") : "—";
    }

    let exOn = 0;
    let exTot = 0;
    for (const s of v.sets) {
      if (pe && hasAnyPrescription(pe)) {
        exTot += 1;
        if (setMeetsAllPrescribed(s, pe)) exOn += 1;
      }
    }

    exerciseBlocks.push({
      exerciseId: v.exerciseId,
      exerciseName: name,
      blockTypeLabel: v.blockType.replace(/_/g, " ").toUpperCase(),
      prescribedSummary,
      sets: [...v.sets].sort((a, b) => a.setNumber - b.setNumber),
      setsOnTarget: exOn,
      setsEvaluated: exTot,
      displayVariant: "standard",
    });
  }

  exerciseBlocks.push(...extraBlocks);

  return {
    setsOnTarget,
    totalPrescribedSets,
    adherencePercent,
    tier: adherenceTierFromPercent(adherencePercent),
    exerciseBlocks,
  };
}

/**
 * Average weight and reps per exercise for logs (straight_set rows only),
 * used for "vs last time" on the same exercise.
 */
export function averageStraightSetPerformanceByExercise(
  logs: CoachSetLogRow[]
): Map<string, { avgWeight: number | null; avgReps: number | null; count: number }> {
  const sums = new Map<
    string,
    { wSum: number; rSum: number; n: number }
  >();
  for (const log of logs) {
    const st = String(log.block_type || log.set_type || "").toLowerCase();
    if (st !== "straight_set") continue;
    const ex = log.exercise_id;
    if (!ex) continue;
    const w = num(log.weight);
    const r = numInt(log.reps);
    if (!sums.has(ex)) sums.set(ex, { wSum: 0, rSum: 0, n: 0 });
    const row = sums.get(ex)!;
    row.n += 1;
    if (w !== null) row.wSum += w;
    if (r !== null) row.rSum += r;
  }
  const out = new Map<
    string,
    { avgWeight: number | null; avgReps: number | null; count: number }
  >();
  for (const [ex, row] of sums) {
    out.set(ex, {
      avgWeight: row.n > 0 ? Math.round((row.wSum / row.n) * 10) / 10 : null,
      avgReps: row.n > 0 ? Math.round((row.rSum / row.n) * 10) / 10 : null,
      count: row.n,
    });
  }
  return out;
}

export function deltaTone(
  delta: number | null,
  /** When true, lower is better (e.g. stress). */
  lowerIsBetter?: boolean
): "green" | "red" | "neutral" {
  if (delta === null || delta === 0 || Number.isNaN(delta)) return "neutral";
  if (lowerIsBetter) return delta < 0 ? "green" : "red";
  return delta > 0 ? "green" : "red";
}
