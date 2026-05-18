import {
  buildPrescriptionMaps,
  hasAnyPrescription,
  prescribedRpe,
  prescribedWeightKg,
  repsTargetMin,
  type PrescribedExerciseRow,
} from "@/lib/workoutLog/prescribedExerciseHelpers";
import type {
  DropSetRow,
  ClusterSetRow,
  RestPauseRow,
  TimeProtocolRow,
} from "@/lib/workoutLog/prescribedWorkoutReference";
import {
  consolidateRowOutcome,
  isSetOnTarget,
  repsOutcome,
  rpeVsPrescribedRirOutcome,
  weightOutcome,
  worstOfOutcomes,
} from "@/lib/workoutLogSetOutcome";
import type {
  AdherenceBlock,
  PerSetAdherenceBlock,
  SetOutcome,
  SpeedEnduranceAdherenceBlock,
  TimeBlockAdherenceBlock,
} from "@/lib/workoutLog/adherenceTypes";
import type { WorkoutLogBlock, WorkoutLogSet } from "@/types/workoutLog";

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

function firstTimeProtocol(
  rows: TimeProtocolRow[],
  setEntryId: string,
  setType: string
): TimeProtocolRow | undefined {
  const t = setType.toLowerCase();
  return rows.find(
    (r) =>
      r.set_entry_id === setEntryId &&
      String(r.protocol_type ?? "").toLowerCase() === t
  );
}

function dropCountForEntry(rows: DropSetRow[], setEntryId: string): number {
  const forEntry = rows.filter((r) => r.set_entry_id === setEntryId);
  const orders = forEntry
    .map((r) => numInt(r.drop_order))
    .filter((n): n is number => n != null && n > 1);
  return orders.length > 0 ? orders.length : Math.max(0, forEntry.length - 1);
}

function firstClusterRow(
  rows: ClusterSetRow[],
  setEntryId: string
): ClusterSetRow | undefined {
  return rows.find((r) => r.set_entry_id === setEntryId);
}

function strengthOutcome(
  log: WorkoutLogSet,
  pe: PrescribedExerciseRow | undefined,
  applyRowColor: boolean
): SetOutcome {
  const setNumber = log.set_number ?? 1;
  const actualReps = numInt(log.reps);
  const actualWeight = num(log.weight);
  const actualRpe = numInt(log.rpe);
  const pR = pe ? repsTargetMin(pe) : null;
  const pW = pe ? prescribedWeightKg(pe) : null;
  const pRir = pe ? prescribedRpe(pe) : null;
  const reps = repsOutcome(actualReps, pR);
  const weight = weightOutcome(actualWeight, pW);
  const rpe = rpeVsPrescribedRirOutcome(actualRpe, pRir);
  const consolidated = consolidateRowOutcome(reps, weight, rpe);
  return {
    setNumber,
    reps,
    weight,
    rpe,
    row: applyRowColor && pe && hasAnyPrescription(pe) ? consolidated : "neutral",
    applyRowColor,
  };
}

function supersetOutcomesForLog(
  log: WorkoutLogSet,
  prescMap: Map<string, PrescribedExerciseRow>
): SetOutcome {
  const setNumber = log.set_number ?? 1;
  const idA = log.superset_exercise_a_id;
  const idB = log.superset_exercise_b_id;
  const peA = idA ? prescMap.get(idA) : undefined;
  const peB = idB ? prescMap.get(idB) : undefined;
  const wa = num(log.superset_weight_a);
  const ra = numInt(log.superset_reps_a);
  const wb = num(log.superset_weight_b);
  const rb = numInt(log.superset_reps_b);
  const actualRpe = numInt(log.rpe);

  const outA =
    peA && hasAnyPrescription(peA)
      ? consolidateRowOutcome(
          repsOutcome(ra, repsTargetMin(peA)),
          weightOutcome(wa, prescribedWeightKg(peA)),
          rpeVsPrescribedRirOutcome(actualRpe, prescribedRpe(peA))
        )
      : ("neutral" as const);
  const outB =
    peB && hasAnyPrescription(peB)
      ? consolidateRowOutcome(
          repsOutcome(rb, repsTargetMin(peB)),
          weightOutcome(wb, prescribedWeightKg(peB)),
          rpeVsPrescribedRirOutcome(actualRpe, prescribedRpe(peB))
        )
      : ("neutral" as const);

  const row =
    peA && hasAnyPrescription(peA) && peB && hasAnyPrescription(peB)
      ? worstOfOutcomes(outA, outB)
      : peA && hasAnyPrescription(peA)
        ? outA
        : peB && hasAnyPrescription(peB)
          ? outB
          : ("neutral" as const);

  return {
    setNumber,
    reps: "neutral",
    weight: "neutral",
    rpe: "neutral",
    row,
    applyRowColor: true,
  };
}

export type ProtocolSlice = {
  timeProtocols: TimeProtocolRow[];
  dropSets: DropSetRow[];
  clusterSets: ClusterSetRow[];
  restPauseSets: RestPauseRow[];
};

export type SpeedEndurancePresc = {
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

function prescKey(setEntryId: string, exerciseId: string): string {
  return `${setEntryId}::${exerciseId}`;
}

function perSetBlock(
  block: WorkoutLogBlock,
  setOutcomes: SetOutcome[],
  setsOnTargetCount: number,
  totalPrescribedSets: number,
  headerSummary: string | null
): PerSetAdherenceBlock {
  return {
    kind: "per_set",
    setEntryId: block.setEntryId,
    setType: block.setType,
    exerciseIds: block.exerciseIds,
    exerciseNames: block.exerciseNames,
    headerSummary,
    setOutcomes,
    setsOnTargetCount,
    totalPrescribedSets,
  };
}

function evaluateStraightLikeBlock(
  block: WorkoutLogBlock,
  prescMap: Map<string, PrescribedExerciseRow> | undefined,
  headerSummary: string | null
): PerSetAdherenceBlock {
  const setOutcomes: SetOutcome[] = [];
  let setsOnTargetCount = 0;
  let totalPrescribedSets = 0;
  for (const log of block.sets) {
    const ex = log.exercise_id;
    const pe = ex && prescMap ? prescMap.get(ex) : undefined;
    const o = strengthOutcome(log, pe, true);
    setOutcomes.push(o);
    if (pe && hasAnyPrescription(pe)) {
      totalPrescribedSets += 1;
      if (
        isSetOnTarget({
          actualReps: numInt(log.reps),
          prescribedReps: repsTargetMin(pe),
          actualWeightKg: num(log.weight),
          prescribedWeightKg: prescribedWeightKg(pe),
          actualRpe: numInt(log.rpe),
          prescribedRir: prescribedRpe(pe),
        })
      ) {
        setsOnTargetCount += 1;
      }
    }
  }
  return perSetBlock(block, setOutcomes, setsOnTargetCount, totalPrescribedSets, headerSummary);
}

function evaluateSupersetBlock(
  block: WorkoutLogBlock,
  prescMap: Map<string, PrescribedExerciseRow>,
  headerSummary: string | null
): PerSetAdherenceBlock {
  const setOutcomes: SetOutcome[] = [];
  let setsOnTargetCount = 0;
  let totalPrescribedSets = 0;
  for (const log of block.sets) {
    setOutcomes.push(supersetOutcomesForLog(log, prescMap));
    const idA = log.superset_exercise_a_id;
    const idB = log.superset_exercise_b_id;
    const peA = idA ? prescMap.get(idA) : undefined;
    const peB = idB ? prescMap.get(idB) : undefined;
    const hasDenom =
      (peA && hasAnyPrescription(peA)) || (peB && hasAnyPrescription(peB));
    if (hasDenom) {
      totalPrescribedSets += 1;
      const okA =
        !peA || !hasAnyPrescription(peA)
          ? true
          : isSetOnTarget({
              actualReps: numInt(log.superset_reps_a),
              prescribedReps: repsTargetMin(peA),
              actualWeightKg: num(log.superset_weight_a),
              prescribedWeightKg: prescribedWeightKg(peA),
              actualRpe: numInt(log.rpe),
              prescribedRir: prescribedRpe(peA),
            });
      const okB =
        !peB || !hasAnyPrescription(peB)
          ? true
          : isSetOnTarget({
              actualReps: numInt(log.superset_reps_b),
              prescribedReps: repsTargetMin(peB),
              actualWeightKg: num(log.superset_weight_b),
              prescribedWeightKg: prescribedWeightKg(peB),
              actualRpe: numInt(log.rpe),
              prescribedRir: prescribedRpe(peB),
            });
      if (okA && okB) setsOnTargetCount += 1;
    }
  }
  return perSetBlock(block, setOutcomes, setsOnTargetCount, totalPrescribedSets, headerSummary);
}

function evaluateDropSetBlock(
  block: WorkoutLogBlock,
  prescMap: Map<string, PrescribedExerciseRow> | undefined,
  protocol: ProtocolSlice | null,
  headerSummary: string | null
): PerSetAdherenceBlock {
  const sorted = [...block.sets].sort(
    (a, b) => (a.set_number ?? 0) - (b.set_number ?? 0)
  );
  const prescribedDrops = protocol
    ? dropCountForEntry(protocol.dropSets, block.setEntryId)
    : 0;
  const setOutcomes: SetOutcome[] = [];
  let initialOnTarget = false;
  let hasPrescribedInitial = false;
  let dropsLogged = 0;

  sorted.forEach((log, idx) => {
    const isInitial = idx === 0;
    const ex = log.exercise_id;
    const pe = ex && prescMap ? prescMap.get(ex) : undefined;
    if (isInitial) {
      const w = num(log.dropset_initial_weight ?? log.weight);
      const r = numInt(log.dropset_initial_reps ?? log.reps);
      const synthetic = { ...log, weight: w ?? log.weight, reps: r ?? log.reps };
      setOutcomes.push(strengthOutcome(synthetic, pe, true));
      if (pe && hasAnyPrescription(pe)) {
        hasPrescribedInitial = true;
        initialOnTarget = isSetOnTarget({
          actualReps: r,
          prescribedReps: repsTargetMin(pe),
          actualWeightKg: w,
          prescribedWeightKg: prescribedWeightKg(pe),
          actualRpe: numInt(log.rpe),
          prescribedRir: prescribedRpe(pe),
        });
      }
    } else {
      dropsLogged += 1;
      setOutcomes.push({
        setNumber: log.set_number ?? idx + 1,
        reps: "neutral",
        weight: "neutral",
        rpe: "neutral",
        row: "neutral",
        applyRowColor: false,
      });
    }
  });

  const allDropsPresent =
    prescribedDrops <= 0 || dropsLogged >= prescribedDrops;
  const totalPrescribedSets = hasPrescribedInitial ? 1 : 0;
  const setsOnTargetCount =
    totalPrescribedSets === 1 && initialOnTarget && allDropsPresent ? 1 : 0;

  return perSetBlock(block, setOutcomes, setsOnTargetCount, totalPrescribedSets, headerSummary);
}

function evaluateClusterBlock(
  block: WorkoutLogBlock,
  prescMap: Map<string, PrescribedExerciseRow> | undefined,
  protocol: ProtocolSlice | null,
  headerSummary: string | null
): PerSetAdherenceBlock {
  const cr = protocol
    ? firstClusterRow(protocol.clusterSets, block.setEntryId)
    : undefined;
  const mini = cr?.reps_per_cluster ?? null;
  const clusters = cr?.clusters_per_set ?? null;
  const targetTotal =
    mini != null && clusters != null ? mini * clusters : mini ?? null;

  const sortedMini = [...block.sets].sort(
    (a, b) => (a.cluster_number ?? 0) - (b.cluster_number ?? 0)
  );
  const setOutcomes: SetOutcome[] = [];
  for (const log of sortedMini) {
    setOutcomes.push({
      setNumber: log.cluster_number ?? log.set_number ?? 1,
      reps: "neutral",
      weight: "neutral",
      rpe: "neutral",
      row: "neutral",
      applyRowColor: false,
    });
  }
  const sumReps = sortedMini.reduce((s, l) => s + (numInt(l.reps) ?? 0), 0);
  let row: SetOutcome["row"] = "neutral";
  if (targetTotal != null && targetTotal > 0) {
    row = consolidateRowOutcome(
      repsOutcome(sumReps, targetTotal),
      "neutral",
      "neutral"
    );
  }
  const blockLevel: SetOutcome = {
    setNumber: sortedMini.length + 1,
    reps: repsOutcome(sumReps, targetTotal),
    weight: "neutral",
    rpe: "neutral",
    row,
    applyRowColor: true,
  };
  setOutcomes.push(blockLevel);

  const totalPrescribedSets = targetTotal != null ? 1 : 0;
  const setsOnTargetCount =
    totalPrescribedSets === 1 &&
    targetTotal != null &&
    isSetOnTarget({
      actualReps: sumReps,
      prescribedReps: targetTotal,
      actualWeightKg: null,
      prescribedWeightKg: null,
      actualRpe: null,
      prescribedRir: null,
    })
      ? 1
      : 0;

  void prescMap;
  return perSetBlock(block, setOutcomes, setsOnTargetCount, totalPrescribedSets, headerSummary);
}

function evaluateGiantSetBlock(
  block: WorkoutLogBlock,
  prescMap: Map<string, PrescribedExerciseRow> | undefined,
  headerSummary: string | null
): PerSetAdherenceBlock {
  const setOutcomes: SetOutcome[] = [];
  let setsOnTargetCount = 0;
  let totalPrescribedSets = 0;

  for (const log of block.sets) {
    const round = log.round_number ?? log.set_number ?? 1;
    const parts = log.giant_set_exercises ?? [];
    if (parts.length > 0) {
      let worst: SetOutcome["row"] = "neutral";
      for (const seg of parts) {
        const exId = seg.exercise_id ?? null;
        const pe =
          exId && prescMap ? prescMap.get(exId) : undefined;
        const ar = numInt(seg.reps);
        const aw = num(seg.weight);
        if (pe && hasAnyPrescription(pe)) {
          totalPrescribedSets += 1;
          const r = repsOutcome(ar, repsTargetMin(pe));
          const w = weightOutcome(aw, prescribedWeightKg(pe));
          const rp = rpeVsPrescribedRirOutcome(numInt(log.rpe), prescribedRpe(pe));
          const row = consolidateRowOutcome(r, w, rp);
          worst = worstOfOutcomes(worst, row);
          if (
            isSetOnTarget({
              actualReps: ar,
              prescribedReps: repsTargetMin(pe),
              actualWeightKg: aw,
              prescribedWeightKg: prescribedWeightKg(pe),
              actualRpe: numInt(log.rpe),
              prescribedRir: prescribedRpe(pe),
            })
          ) {
            setsOnTargetCount += 1;
          }
        }
      }
      setOutcomes.push({
        setNumber: round,
        reps: "neutral",
        weight: "neutral",
        rpe: "neutral",
        row: worst,
        applyRowColor: true,
      });
    } else {
      const ex = log.exercise_id;
      const pe = ex && prescMap ? prescMap.get(ex) : undefined;
      setOutcomes.push(strengthOutcome(log, pe, true));
      if (pe && hasAnyPrescription(pe)) {
        totalPrescribedSets += 1;
        if (
          isSetOnTarget({
            actualReps: numInt(log.reps),
            prescribedReps: repsTargetMin(pe),
            actualWeightKg: num(log.weight),
            prescribedWeightKg: prescribedWeightKg(pe),
            actualRpe: numInt(log.rpe),
            prescribedRir: prescribedRpe(pe),
          })
        ) {
          setsOnTargetCount += 1;
        }
      }
    }
  }

  return perSetBlock(block, setOutcomes, setsOnTargetCount, totalPrescribedSets, headerSummary);
}

function evaluateRestPauseBlock(
  block: WorkoutLogBlock,
  prescMap: Map<string, PrescribedExerciseRow> | undefined,
  _protocol: ProtocolSlice | null,
  headerSummary: string | null
): PerSetAdherenceBlock {
  const setOutcomes: SetOutcome[] = [];
  let firstPrimaryConsumed = false;

  const anchorLog =
    block.sets.find(
      (l) =>
        (l.rest_pause_number == null || l.rest_pause_number <= 1) &&
        l.exercise_id
    ) ?? block.sets[0];
  const pe0 =
    anchorLog?.exercise_id && prescMap
      ? prescMap.get(anchorLog.exercise_id)
      : undefined;
  const totalPrescribedSets = pe0 && hasAnyPrescription(pe0) ? 1 : 0;

  let firstPrimaryLog: WorkoutLogSet | null = null;

  for (let i = 0; i < block.sets.length; i++) {
    const log = block.sets[i];
    const isPrimary = log.rest_pause_number == null || log.rest_pause_number <= 1;
    const ex = log.exercise_id;
    const pe = ex && prescMap ? prescMap.get(ex) : undefined;

    if (isPrimary && !firstPrimaryConsumed) {
      firstPrimaryConsumed = true;
      firstPrimaryLog = log;
      const w = num(log.rest_pause_initial_weight ?? log.weight);
      const r = numInt(log.rest_pause_initial_reps ?? log.reps);
      const synthetic = { ...log, weight: w, reps: r };
      setOutcomes.push(strengthOutcome(synthetic, pe, true));
    } else {
      const badge =
        isPrimary && firstPrimaryConsumed
          ? "Rest-pause (not graded)"
          : "Rest-pause continuation";
      setOutcomes.push({
        setNumber: log.set_number ?? i + 1,
        reps: "neutral",
        weight: "neutral",
        rpe: "neutral",
        row: "neutral",
        applyRowColor: false,
        informationalRowBadge: badge,
      });
    }
  }

  let setsOnTargetCount = 0;
  if (totalPrescribedSets === 1 && firstPrimaryLog && pe0) {
    const w = num(
      firstPrimaryLog.rest_pause_initial_weight ?? firstPrimaryLog.weight
    );
    const r = numInt(
      firstPrimaryLog.rest_pause_initial_reps ?? firstPrimaryLog.reps
    );
    if (
      isSetOnTarget({
        actualReps: r,
        prescribedReps: repsTargetMin(pe0),
        actualWeightKg: w,
        prescribedWeightKg: prescribedWeightKg(pe0),
        actualRpe: numInt(firstPrimaryLog.rpe),
        prescribedRir: prescribedRpe(pe0),
      })
    ) {
      setsOnTargetCount = 1;
    }
  }

  void _protocol;
  return perSetBlock(block, setOutcomes, setsOnTargetCount, totalPrescribedSets, headerSummary);
}

function evaluatePreExhaustionBlock(
  block: WorkoutLogBlock,
  prescMap: Map<string, PrescribedExerciseRow> | undefined,
  headerSummary: string | null
): PerSetAdherenceBlock {
  const setOutcomes: SetOutcome[] = [];
  let setsOnTargetCount = 0;
  let totalPrescribedSets = 0;

  for (const log of block.sets) {
    const isoId = log.preexhaust_isolation_exercise_id ?? log.exercise_id;
    const compId = log.preexhaust_compound_exercise_id;

    const peIso = isoId && prescMap ? prescMap.get(isoId) : undefined;
    const peComp = compId && prescMap ? prescMap.get(compId) : undefined;

    let rowA: SetOutcome["row"] = "neutral";
    let rowB: SetOutcome["row"] = "neutral";

    if (peIso && hasAnyPrescription(peIso)) {
      totalPrescribedSets += 1;
      rowA = consolidateRowOutcome(
        repsOutcome(
          numInt(log.preexhaust_isolation_reps ?? log.reps),
          repsTargetMin(peIso)
        ),
        weightOutcome(
          num(log.preexhaust_isolation_weight ?? log.weight),
          prescribedWeightKg(peIso)
        ),
        rpeVsPrescribedRirOutcome(numInt(log.rpe), prescribedRpe(peIso))
      );
      if (
        isSetOnTarget({
          actualReps: numInt(log.preexhaust_isolation_reps ?? log.reps),
          prescribedReps: repsTargetMin(peIso),
          actualWeightKg: num(log.preexhaust_isolation_weight ?? log.weight),
          prescribedWeightKg: prescribedWeightKg(peIso),
          actualRpe: numInt(log.rpe),
          prescribedRir: prescribedRpe(peIso),
        })
      ) {
        setsOnTargetCount += 1;
      }
    }

    if (peComp && hasAnyPrescription(peComp)) {
      totalPrescribedSets += 1;
      rowB = consolidateRowOutcome(
        repsOutcome(
          numInt(log.preexhaust_compound_reps ?? log.reps),
          repsTargetMin(peComp)
        ),
        weightOutcome(
          num(log.preexhaust_compound_weight ?? log.weight),
          prescribedWeightKg(peComp)
        ),
        rpeVsPrescribedRirOutcome(numInt(log.rpe), prescribedRpe(peComp))
      );
      if (
        isSetOnTarget({
          actualReps: numInt(log.preexhaust_compound_reps ?? log.reps),
          prescribedReps: repsTargetMin(peComp),
          actualWeightKg: num(log.preexhaust_compound_weight ?? log.weight),
          prescribedWeightKg: prescribedWeightKg(peComp),
          actualRpe: numInt(log.rpe),
          prescribedRir: prescribedRpe(peComp),
        })
      ) {
        setsOnTargetCount += 1;
      }
    }

    const combinedRow =
      peIso && hasAnyPrescription(peIso) && peComp && hasAnyPrescription(peComp)
        ? worstOfOutcomes(rowA, rowB)
        : peIso && hasAnyPrescription(peIso)
          ? rowA
          : peComp && hasAnyPrescription(peComp)
            ? rowB
            : ("neutral" as const);

    if (
      (!peIso || !hasAnyPrescription(peIso)) &&
      (!peComp || !hasAnyPrescription(peComp))
    ) {
      setOutcomes.push(
        strengthOutcome(log, prescMap?.get(log.exercise_id ?? "") ?? undefined, true)
      );
    } else {
      setOutcomes.push({
        setNumber: log.set_number ?? 1,
        reps: "neutral",
        weight: "neutral",
        rpe: "neutral",
        row: combinedRow,
        applyRowColor: true,
      });
    }
  }

  return perSetBlock(block, setOutcomes, setsOnTargetCount, totalPrescribedSets, headerSummary);
}

function evaluateAmrapBlock(
  block: WorkoutLogBlock,
  protocol: ProtocolSlice | null,
  headerSummary: string | null
): TimeBlockAdherenceBlock {
  const tp = protocol
    ? firstTimeProtocol(protocol.timeProtocols, block.setEntryId, "amrap")
    : undefined;
  const prescribedDuration =
    tp?.total_duration_minutes != null
      ? Math.round(tp.total_duration_minutes * 60)
      : null;
  const prescribedRepsPer = tp?.target_reps ?? tp?.reps_per_round ?? null;
  const log0 = block.sets[0];
  const actualDur = numInt(log0?.amrap_duration_seconds);
  const actualReps = numInt(log0?.amrap_total_reps) ?? 0;
  const completed =
    prescribedDuration != null &&
    actualDur != null &&
    actualDur >= prescribedDuration * 0.95;

  return {
    kind: "time_block",
    setEntryId: block.setEntryId,
    setType: "amrap",
    exerciseIds: block.exerciseIds,
    exerciseNames: block.exerciseNames,
    headerSummary,
    prescribedDurationSeconds: prescribedDuration,
    prescribedRounds: null,
    prescribedRepsPerRound: prescribedRepsPer,
    prescribedTargetReps: tp?.target_reps ?? null,
    prescribedTimeCapSeconds: null,
    prescribedEmomMinutes: null,
    actualRounds: 1,
    actualReps,
    actualDurationSeconds: actualDur,
    completed: Boolean(completed),
    dnf: false,
    intervalOutcomes: [],
    setsOnTargetCount: completed ? 1 : 0,
    totalPrescribedSets: 1,
  };
}

function evaluateEmomBlock(
  block: WorkoutLogBlock,
  protocol: ProtocolSlice | null,
  headerSummary: string | null
): TimeBlockAdherenceBlock {
  const tp = protocol
    ? firstTimeProtocol(protocol.timeProtocols, block.setEntryId, "emom")
    : undefined;
  const minutes = tp?.total_duration_minutes ?? null;
  const rpr = tp?.reps_per_round ?? null;
  const prescribedMinutes = minutes != null ? Math.round(minutes) : null;
  const intervalOutcomes: SetOutcome[] = [];
  let setsOnTargetCount = 0;
  let totalPrescribedSets = prescribedMinutes ?? 0;

  const byMinute = new Map<number, WorkoutLogSet>();
  for (const log of block.sets) {
    const m = log.emom_minute_number;
    if (m != null) byMinute.set(m, log);
  }

  for (let m = 1; m <= (prescribedMinutes ?? 0); m++) {
    const log = byMinute.get(m);
    const ar = numInt(log?.emom_total_reps_this_min);
    const row =
      rpr != null && ar != null
        ? consolidateRowOutcome(repsOutcome(ar, rpr), "neutral", "neutral")
        : ("neutral" as const);
    intervalOutcomes.push({
      setNumber: m,
      reps: repsOutcome(ar, rpr),
      weight: "neutral",
      rpe: "neutral",
      row,
      applyRowColor: true,
    });
    if (rpr != null && isSetOnTarget({
      actualReps: ar,
      prescribedReps: rpr,
      actualWeightKg: null,
      prescribedWeightKg: null,
      actualRpe: null,
      prescribedRir: null,
    })) {
      setsOnTargetCount += 1;
    }
  }

  const actualDur = numInt(block.sets[0]?.emom_total_duration_sec);
  return {
    kind: "time_block",
    setEntryId: block.setEntryId,
    setType: "emom",
    exerciseIds: block.exerciseIds,
    exerciseNames: block.exerciseNames,
    headerSummary,
    prescribedDurationSeconds: prescribedMinutes != null ? prescribedMinutes * 60 : null,
    prescribedRounds: prescribedMinutes,
    prescribedRepsPerRound: rpr,
    prescribedTargetReps: null,
    prescribedTimeCapSeconds: null,
    prescribedEmomMinutes: prescribedMinutes,
    actualRounds: byMinute.size,
    actualReps: block.sets.reduce((s, l) => s + (numInt(l.emom_total_reps_this_min) ?? 0), 0),
    actualDurationSeconds: actualDur,
    completed: prescribedMinutes != null && byMinute.size >= prescribedMinutes,
    dnf: false,
    intervalOutcomes,
    setsOnTargetCount,
    totalPrescribedSets: totalPrescribedSets || 0,
  };
}

function evaluateTabataBlock(
  block: WorkoutLogBlock,
  protocol: ProtocolSlice | null,
  headerSummary: string | null
): TimeBlockAdherenceBlock {
  const tp = protocol
    ? firstTimeProtocol(protocol.timeProtocols, block.setEntryId, "tabata")
    : undefined;
  const prescribedRounds = tp?.rounds ?? 8;
  const rpr = tp?.reps_per_round ?? tp?.target_reps ?? null;
  const roundsDone = numInt(block.sets[0]?.tabata_rounds_completed) ?? 0;
  const intervalOutcomes: SetOutcome[] = [];
  let setsOnTargetCount = 0;
  for (let r = 1; r <= 8; r++) {
    const log = block.sets.find((l) => (l.set_number ?? l.round_number) === r) ?? block.sets[r - 1];
    const ar = numInt(log?.reps);
    const row =
      rpr != null && ar != null
        ? consolidateRowOutcome(repsOutcome(ar, rpr), "neutral", "neutral")
        : ("neutral" as const);
    intervalOutcomes.push({
      setNumber: r,
      reps: repsOutcome(ar, rpr),
      weight: "neutral",
      rpe: "neutral",
      row,
      applyRowColor: true,
    });
    if (
      r <= roundsDone &&
      rpr != null &&
      isSetOnTarget({
        actualReps: ar,
        prescribedReps: rpr,
        actualWeightKg: null,
        prescribedWeightKg: null,
        actualRpe: null,
        prescribedRir: null,
      })
    ) {
      setsOnTargetCount += 1;
    }
  }
  const completed =
    roundsDone >= 8 &&
    (rpr == null ||
      block.sets.every((l) => {
        const ar = numInt(l.reps);
        return ar == null || isSetOnTarget({
          actualReps: ar,
          prescribedReps: rpr,
          actualWeightKg: null,
          prescribedWeightKg: null,
          actualRpe: null,
          prescribedRir: null,
        });
      }));

  return {
    kind: "time_block",
    setEntryId: block.setEntryId,
    setType: "tabata",
    exerciseIds: block.exerciseIds,
    exerciseNames: block.exerciseNames,
    headerSummary,
    prescribedDurationSeconds: null,
    prescribedRounds: prescribedRounds,
    prescribedRepsPerRound: rpr,
    prescribedTargetReps: null,
    prescribedTimeCapSeconds: null,
    prescribedEmomMinutes: null,
    actualRounds: roundsDone,
    actualReps: block.sets.reduce((s, l) => s + (numInt(l.reps) ?? 0), 0),
    actualDurationSeconds: numInt(block.sets[0]?.tabata_total_duration_sec),
    completed: Boolean(completed),
    dnf: false,
    intervalOutcomes,
    setsOnTargetCount,
    totalPrescribedSets: 8,
  };
}

function evaluateForTimeBlock(
  block: WorkoutLogBlock,
  protocol: ProtocolSlice | null,
  headerSummary: string | null
): TimeBlockAdherenceBlock {
  const tp = protocol
    ? firstTimeProtocol(protocol.timeProtocols, block.setEntryId, "for_time")
    : undefined;
  const target = tp?.target_reps ?? null;
  const capSec =
    tp?.time_cap_minutes != null ? Math.round(tp.time_cap_minutes * 60) : null;
  const log0 = block.sets[0];
  const actualReps = numInt(log0?.fortime_total_reps) ?? 0;
  const taken = numInt(log0?.fortime_time_taken_sec);
  const cap = numInt(log0?.fortime_time_cap_sec) ?? capSec;
  const completed =
    target != null &&
    actualReps >= target * 0.95 &&
    (cap == null || taken == null || taken <= cap);

  return {
    kind: "time_block",
    setEntryId: block.setEntryId,
    setType: "for_time",
    exerciseIds: block.exerciseIds,
    exerciseNames: block.exerciseNames,
    headerSummary,
    prescribedDurationSeconds: cap,
    prescribedRounds: null,
    prescribedRepsPerRound: null,
    prescribedTargetReps: target,
    prescribedTimeCapSeconds: cap,
    prescribedEmomMinutes: null,
    actualRounds: 1,
    actualReps,
    actualDurationSeconds: taken,
    completed: Boolean(completed),
    dnf: cap != null && taken != null && taken > cap,
    intervalOutcomes: [],
    setsOnTargetCount: completed ? 1 : 0,
    totalPrescribedSets: 1,
  };
}

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

function evaluateSpeedWorkBlock(
  block: WorkoutLogBlock,
  presc: SpeedEndurancePresc | undefined,
  headerSummary: string | null
): SpeedEnduranceAdherenceBlock {
  const log0 = block.sets[0];
  const exId = log0?.exercise_id ?? block.exerciseIds[0] ?? "";
  const k = prescKey(block.setEntryId, exId);
  const p = presc?.speedByKey?.get(k);
  const sorted = [...block.sets].sort(
    (a, b) => (a.set_number ?? 0) - (b.set_number ?? 0)
  );
  const prescribedN = p?.intervals ?? sorted.length;
  const intervalOutcomes: SetOutcome[] = sorted.map((l) => {
    const t = num(l.actual_time_seconds);
    const row: SetOutcome["row"] =
      t != null && t > 0 ? ("hit" as const) : ("miss" as const);
    return {
      setNumber: l.set_number ?? 0,
      reps: "neutral",
      weight: "neutral",
      rpe: "neutral",
      row,
      applyRowColor: true,
    };
  });
  const withTime = sorted.filter((l) => num(l.actual_time_seconds) != null).length;
  const times = sorted
    .map((l) => num(l.actual_time_seconds))
    .filter((t): t is number => t != null && t > 0);
  void intervalTimeConsistencyPct(times);

  return {
    kind: "speed_endurance",
    setEntryId: block.setEntryId,
    setType: "speed_work",
    exerciseIds: block.exerciseIds,
    exerciseNames: block.exerciseNames,
    headerSummary,
    prescribedDurationSeconds: null,
    prescribedDistanceMeters: p?.distance_meters ?? null,
    prescribedSpeedKmh: null,
    prescribedHrPercentage: null,
    actualDurationSeconds: num(log0?.actual_time_seconds),
    actualDistanceMeters: null,
    actualSpeedKmh: num(log0?.actual_speed_kmh),
    actualHrPercentage: null,
    intervalOutcomes,
    setsOnTargetCount: Math.min(prescribedN, withTime),
    totalPrescribedSets: prescribedN,
  };
}

function evaluateEnduranceBlock(
  block: WorkoutLogBlock,
  presc: SpeedEndurancePresc | undefined,
  headerSummary: string | null
): SpeedEnduranceAdherenceBlock {
  const log0 = block.sets[0];
  const exId = log0?.exercise_id ?? block.exerciseIds[0] ?? "";
  const k = prescKey(block.setEntryId, exId);
  const p = presc?.enduranceByKey?.get(k);
  const actD = num(log0?.actual_distance_meters);
  const actT = num(log0?.actual_time_seconds);
  const actHr = num(log0?.actual_hr_avg);
  const prescD = p?.target_distance_meters ?? null;
  const prescT = p?.target_time_seconds ?? null;
  const prescP = p?.target_pace_seconds_per_km ?? null;
  const actPace =
    actD != null && actT != null && actD > 0 ? actT / (actD / 1000) : null;

  const distanceOutcome = (() => {
    if (prescD == null || actD == null || prescD <= 0) return "neutral" as const;
    const r = actD / prescD;
    if (r >= 1) return "hit" as const;
    if (r >= 0.92) return "neutral" as const;
    return "miss" as const;
  })();
  const timeOutcome = (() => {
    if (prescT == null || actT == null || prescT <= 0) return "neutral" as const;
    if (actT <= prescT) return "hit" as const;
    if (actT <= prescT * 1.12) return "neutral" as const;
    return "miss" as const;
  })();
  const paceOutcome = (() => {
    if (prescP == null || actPace == null) return "neutral" as const;
    if (actPace <= prescP) return "hit" as const;
    if (actPace <= prescP * 1.08) return "neutral" as const;
    return "miss" as const;
  })();

  const outs = [distanceOutcome, timeOutcome, paceOutcome];
  const onTarget = !outs.some((o) => o === "miss");

  return {
    kind: "speed_endurance",
    setEntryId: block.setEntryId,
    setType: "endurance",
    exerciseIds: block.exerciseIds,
    exerciseNames: block.exerciseNames,
    headerSummary,
    prescribedDurationSeconds: prescT,
    prescribedDistanceMeters: prescD,
    prescribedSpeedKmh: prescP != null && prescP > 0 ? 3600 / prescP : null,
    prescribedHrPercentage: p?.target_hr_pct ?? null,
    actualDurationSeconds: actT,
    actualDistanceMeters: actD,
    actualSpeedKmh: null,
    actualHrPercentage: actHr,
    intervalOutcomes: [],
    setsOnTargetCount: onTarget ? 1 : 0,
    totalPrescribedSets: 1,
  };
}

/** Header text aligned with `buildStraightLikeHeader` / `buildTimeHeader` inputs (caller supplies or null). */
export function buildAdherenceBlocks(
  blocks: WorkoutLogBlock[],
  setEntries: Array<{ id: string; set_type: string }>,
  entryExercises: Array<PrescribedExerciseRow & { set_entry_id: string }>,
  exerciseNames: Map<string, string>,
  presc: SpeedEndurancePresc | undefined,
  protocol: ProtocolSlice | null,
  headerByBlockId: Map<string, string | null>
): AdherenceBlock[] {
  const { bySetEntry, setTypeByEntry } = buildPrescriptionMaps(
    setEntries,
    entryExercises
  );

  const out: AdherenceBlock[] = [];

  for (const block of blocks) {
    const entryId = block.setEntryId;
    const st = String(
      setTypeByEntry.get(entryId) || block.setType || ""
    ).toLowerCase();
    const prescMap = bySetEntry.get(entryId);
    const header = headerByBlockId.get(entryId) ?? null;

    switch (st) {
      case "straight_set":
        out.push(
          evaluateStraightLikeBlock(block, prescMap, header)
        );
        break;
      case "superset":
        if (prescMap) {
          out.push(evaluateSupersetBlock(block, prescMap, header));
        }
        break;
      case "drop_set":
        out.push(evaluateDropSetBlock(block, prescMap, protocol, header));
        break;
      case "cluster_set":
        out.push(evaluateClusterBlock(block, prescMap, protocol, header));
        break;
      case "giant_set":
        out.push(evaluateGiantSetBlock(block, prescMap, header));
        break;
      case "rest_pause":
        out.push(evaluateRestPauseBlock(block, prescMap, protocol, header));
        break;
      case "pre_exhaustion":
        out.push(evaluatePreExhaustionBlock(block, prescMap, header));
        break;
      case "amrap":
        out.push(evaluateAmrapBlock(block, protocol, header));
        break;
      case "emom":
        out.push(evaluateEmomBlock(block, protocol, header));
        break;
      case "tabata":
        out.push(evaluateTabataBlock(block, protocol, header));
        break;
      case "for_time":
        out.push(evaluateForTimeBlock(block, protocol, header));
        break;
      case "speed_work":
        out.push(evaluateSpeedWorkBlock(block, presc, header));
        break;
      case "endurance":
        out.push(evaluateEnduranceBlock(block, presc, header));
        break;
      default:
        out.push(evaluateStraightLikeBlock(block, prescMap, header));
        break;
    }
  }

  return out;
}

export function sumBlockAdherence(blocks: AdherenceBlock[]): {
  setsOnTarget: number;
  totalPrescribedSets: number;
} {
  let setsOnTarget = 0;
  let totalPrescribedSets = 0;
  for (const b of blocks) {
    setsOnTarget += b.setsOnTargetCount;
    totalPrescribedSets += b.totalPrescribedSets;
  }
  return { setsOnTarget, totalPrescribedSets };
}
