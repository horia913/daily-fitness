import {
  buildPrescriptionMaps,
  hasAnyPrescription,
  prescribedRpe,
  prescribedWeightKg,
  repsTargetMin,
  type PrescribedExerciseRow,
} from "@/lib/workoutLog/prescribedExerciseHelpers";
import {
  consolidateRowOutcome,
  repsOutcome,
  rpeVsPrescribedRpeOutcome,
  weightOutcome,
  worstOfOutcomes,
} from "@/lib/workoutLogSetOutcome";
import type {
  PrescribedBlockReference,
  PrescribedSetReference,
  PrescribedTimeBlockReference,
  PrescribedWorkoutReference,
  WorkoutLogBlock,
  WorkoutLogBlockType,
  WorkoutLogSet,
} from "@/types/workoutLog";

export type SetEntryRow = { id: string; set_type: string; total_sets?: number | null; reps_per_set?: string | null };

export type TimeProtocolRow = {
  set_entry_id: string;
  protocol_type?: string | null;
  total_duration_minutes?: number | null;
  reps_per_round?: number | null;
  target_reps?: number | null;
  time_cap_minutes?: number | null;
  work_seconds?: number | null;
  rest_seconds?: number | null;
  rounds?: number | null;
};

export type DropSetRow = {
  set_entry_id: string;
  drop_order?: number | null;
  reps?: string | null;
  weight_kg?: number | string | null;
};

export type ClusterSetRow = {
  set_entry_id: string;
  reps_per_cluster?: number | null;
  clusters_per_set?: number | null;
  weight_kg?: number | string | null;
};

export type RestPauseRow = {
  set_entry_id: string;
  weight_kg?: number | string | null;
  max_rest_pauses?: number | null;
  rest_pause_duration?: number | null;
};

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

function firstDropRow(rows: DropSetRow[], setEntryId: string, dropOrder: number): DropSetRow | undefined {
  return rows.find((r) => r.set_entry_id === setEntryId && numInt(r.drop_order) === dropOrder);
}

function firstClusterRow(rows: ClusterSetRow[], setEntryId: string): ClusterSetRow | undefined {
  return rows.find((r) => r.set_entry_id === setEntryId);
}

function firstRestPauseRow(rows: RestPauseRow[], setEntryId: string): RestPauseRow | undefined {
  return rows.find((r) => r.set_entry_id === setEntryId);
}

function formatKgRepsRpe(weight: number | null, reps: number | null, rpe: number | null, rpeLabel: "RPE"): string | null {
  const parts: string[] = [];
  if (weight != null) parts.push(`${weight} kg`);
  if (reps != null) parts.push(parts.length ? `× ${reps}` : `${reps}`);
  const base = parts.join(" ");
  if (rpe != null) {
    return base ? `${base} @ ${rpeLabel} ${rpe}` : `@ ${rpeLabel} ${rpe}`;
  }
  return base || null;
}

/**
 * Prescribed column only: after a bare rep count (no kg), append "reps" so values are not ambiguous.
 * When weight is present, `kg × N` is left unchanged (× already signals reps).
 */
function formatPrescribedKgRepsRpe(
  weight: number | null,
  reps: number | null,
  rpe: number | null,
  rpeLabel: "RPE"
): string | null {
  if (weight != null) {
    return formatKgRepsRpe(weight, reps, rpe, rpeLabel);
  }
  if (reps != null) {
    const repS = `${reps} reps`;
    if (rpe != null) return `${repS} @ ${rpeLabel} ${rpe}`;
    return repS;
  }
  if (rpe != null) return `@ ${rpeLabel} ${rpe}`;
  return null;
}

function evaluateStraightLikeSet(log: WorkoutLogSet, pe: PrescribedExerciseRow | undefined): PrescribedSetReference {
  const actualW = num(log.weight);
  const actualR = numInt(log.reps);
  const actualRpe = numInt(log.rpe);
  if (!pe || !hasAnyPrescription(pe)) {
    return {
      prescribedReps: pe ? repsTargetMin(pe) : null,
      prescribedWeightKg: pe ? prescribedWeightKg(pe) : null,
      prescribedRpe: pe ? prescribedRpe(pe) : null,
      outcome: "neutral",
    };
  }
  const pR = repsTargetMin(pe);
  const pW = prescribedWeightKg(pe);
  const pRir = prescribedRpe(pe);
  return {
    prescribedReps: pR,
    prescribedWeightKg: pW,
    prescribedRpe: pRir,
    outcome: consolidateRowOutcome(
      repsOutcome(actualR, pR),
      weightOutcome(actualW, pW),
      rpeVsPrescribedRpeOutcome(actualRpe, pRir)
    ),
  };
}

function evaluateSupersetSet(
  log: WorkoutLogSet,
  map: Map<string, PrescribedExerciseRow>
): PrescribedSetReference {
  const idA = log.superset_exercise_a_id;
  const idB = log.superset_exercise_b_id;
  const peA = idA ? map.get(idA) : undefined;
  const peB = idB ? map.get(idB) : undefined;

  const wa = num(log.superset_weight_a);
  const ra = numInt(log.superset_reps_a);
  const wb = num(log.superset_weight_b);
  const rb = numInt(log.superset_reps_b);
  const actualRpe = numInt(log.rpe);

  const parts: NonNullable<PrescribedSetReference["prescribedParts"]> = [];
  if (peA && hasAnyPrescription(peA)) {
    parts.push({
      weightKg: prescribedWeightKg(peA),
      reps: repsTargetMin(peA),
      rpe: prescribedRpe(peA),
    });
  }
  if (peB && hasAnyPrescription(peB)) {
    parts.push({
      weightKg: prescribedWeightKg(peB),
      reps: repsTargetMin(peB),
      rpe: prescribedRpe(peB),
    });
  }

  const outA =
    peA && hasAnyPrescription(peA)
      ? consolidateRowOutcome(
          repsOutcome(ra, repsTargetMin(peA)),
          weightOutcome(wa, prescribedWeightKg(peA)),
          rpeVsPrescribedRpeOutcome(actualRpe, prescribedRpe(peA))
        )
      : "neutral";
  const outB =
    peB && hasAnyPrescription(peB)
      ? consolidateRowOutcome(
          repsOutcome(rb, repsTargetMin(peB)),
          weightOutcome(wb, prescribedWeightKg(peB)),
          rpeVsPrescribedRpeOutcome(actualRpe, prescribedRpe(peB))
        )
      : "neutral";

  const outcome =
    peA && hasAnyPrescription(peA) && peB && hasAnyPrescription(peB)
      ? worstOfOutcomes(outA, outB)
      : peA && hasAnyPrescription(peA)
        ? outA
        : peB && hasAnyPrescription(peB)
          ? outB
          : "neutral";

  return {
    prescribedParts: parts.length ? parts : undefined,
    outcome,
  };
}

function buildStraightLikeHeader(
  setType: WorkoutLogBlockType,
  block: WorkoutLogBlock,
  pe: PrescribedExerciseRow | undefined,
  entryMeta: SetEntryRow | undefined,
  dropRows: DropSetRow[],
  clusterRows: ClusterSetRow[],
  restRows: RestPauseRow[],
  exerciseNames: Map<string, string>,
  prescMap: Map<string, PrescribedExerciseRow>
): string | null {
  const nSets = entryMeta?.total_sets ?? block.sets.length;
  const entryId = block.setEntryId;

  if (setType === "straight_set" && pe) {
    const r = repsTargetMin(pe);
    const prescribed = prescribedRpe(pe);
    const bits: string[] = [];
    if (nSets != null && nSets > 0) bits.push(`${nSets} sets`);
    if (r != null) bits.push(`× ${r} reps`);
    if (prescribed != null) bits.push(`@ RPE ${prescribed}`);
    return bits.length ? bits.join(" ") : null;
  }

  if (setType === "superset") {
    const idA = block.sets[0]?.superset_exercise_a_id;
    const idB = block.sets[0]?.superset_exercise_b_id;
    const peA = idA ? prescMap.get(idA) : undefined;
    const peB = idB ? prescMap.get(idB) : undefined;
    const n = entryMeta?.total_sets ?? block.sets.length;
    const na = idA ? exerciseNames.get(idA) ?? "Ex1" : "Ex1";
    const nb = idB ? exerciseNames.get(idB) ?? "Ex2" : "Ex2";
    const seg: string[] = [];
    if (peA && hasAnyPrescription(peA)) {
      const r = repsTargetMin(peA);
      const prescribed = prescribedRpe(peA);
      if (r != null && prescribed != null) seg.push(`${na} ${r} reps @ RPE ${prescribed}`);
      else if (r != null) seg.push(`${na} ${r} reps`);
    }
    if (peB && hasAnyPrescription(peB)) {
      const r = repsTargetMin(peB);
      const prescribed = prescribedRpe(peB);
      if (r != null && prescribed != null) seg.push(`${nb} ${r} reps @ RPE ${prescribed}`);
      else if (r != null) seg.push(`${nb} ${r} reps`);
    }
    if (n > 0 && seg.length) return `${n} rounds: ${seg.join(" + ")}`;
    if (seg.length) return seg.join(" + ");
    return null;
  }

  if (setType === "drop_set") {
    const initial = firstDropRow(dropRows, entryId, 1);
    const ir = initial?.reps != null
      ? repsTargetMin({
          exercise_id: "",
          reps: String(initial.reps),
        } as PrescribedExerciseRow)
      : pe
        ? repsTargetMin(pe)
        : null;
    const iw = initial ? num(initial.weight_kg) : pe ? prescribedWeightKg(pe) : null;
    const drops = dropCountForEntry(dropRows, entryId);
    const bits: string[] = [];
    if (ir != null) bits.push(`${ir} reps`);
    if (iw != null) bits.push(`@ ${iw} kg`);
    if (drops > 0) bits.push(`then ${drops} drops`);
    return bits.length ? bits.join(", ") : null;
  }

  if (setType === "cluster_set") {
    const c = firstClusterRow(clusterRows, entryId);
    const mini = c?.reps_per_cluster ?? null;
    const clusters = c?.clusters_per_set ?? null;
    const bits: string[] = [];
    if (clusters != null && mini != null) bits.push(`${clusters} mini-sets × ${mini} reps`);
    else if (mini != null) bits.push(`${mini} reps per mini-set`);
    return bits.length ? bits.join("") : null;
  }

  if (setType === "giant_set") {
    const n = entryMeta?.total_sets ?? block.sets.length;
    const exCount = prescMap.size > 0 ? prescMap.size : block.exerciseIds.length;
    if (n > 0 && exCount > 0) return `${n} rounds × ${exCount} exercises`;
    return null;
  }

  if (setType === "rest_pause") {
    const rp = firstRestPauseRow(restRows, entryId);
    const ir = pe ? repsTargetMin(pe) : null;
    const w = rp?.weight_kg != null ? num(rp.weight_kg) : pe ? prescribedWeightKg(pe) : null;
    const bits: string[] = [];
    if (ir != null) bits.push(`${ir} reps`);
    if (w != null) bits.push(`@ ${w} kg`);
    bits.push("+ rest-pause");
    return bits.join(" ");
  }

  if (setType === "pre_exhaustion") {
    const ids =
      block.exerciseIds.length >= 2
        ? block.exerciseIds
        : [...prescMap.keys()];
    const iso = ids[0];
    const comp = ids[1];
    const peIso = iso ? prescMap.get(iso) : undefined;
    const peComp = comp ? prescMap.get(comp) : undefined;
    const isoN = iso ? exerciseNames.get(iso) ?? "Iso" : "Iso";
    const compN = comp ? exerciseNames.get(comp) ?? "Compound" : "Compound";
    const isoR = peIso ? repsTargetMin(peIso) : null;
    const compR = peComp ? repsTargetMin(peComp) : null;
    if (isoR != null && compR != null)
      return `${isoN} (${isoR} reps) → ${compN} (${compR} reps)`;
    return null;
  }

  if (setType === "speed_work") {
    return null;
  }

  if (setType === "endurance") {
    return null;
  }

  return null;
}

function buildTimeHeader(
  setType: WorkoutLogBlockType,
  tp: TimeProtocolRow | undefined,
  entryMeta: SetEntryRow | undefined
): { header: string | null; ref: Omit<PrescribedTimeBlockReference, "setType"> } {
  if (!tp && !entryMeta) return { header: null, ref: {} };

  if (setType === "amrap") {
    const durMin = tp?.total_duration_minutes ?? null;
    const durSec = durMin != null ? Math.round(durMin * 60) : null;
    const header = durSec != null ? `AMRAP — ${durSec}s` : "AMRAP";
    return {
      header,
      ref: {
        headerSummary: header,
        prescribedDurationSeconds: durSec,
        prescribedRepsPerRound: tp?.target_reps ?? null,
      },
    };
  }

  if (setType === "emom") {
    const minutes = tp?.total_duration_minutes ?? null;
    const rpr = tp?.reps_per_round ?? null;
    const bits: string[] = ["EMOM"];
    if (minutes != null) bits.push(`— ${minutes} min`);
    if (rpr != null) bits.push(`× ${rpr} reps`);
    const header = bits.join(" ");
    return {
      header,
      ref: {
        headerSummary: header,
        prescribedEmomMinutes: minutes,
        prescribedRepsPerRound: rpr,
        prescribedDurationSeconds: minutes != null ? minutes * 60 : null,
      },
    };
  }

  if (setType === "tabata") {
    const header = "Tabata — 8 rounds × 20s/10s";
    return {
      header,
      ref: {
        headerSummary: header,
        prescribedRounds: tp?.rounds ?? 8,
      },
    };
  }

  if (setType === "for_time") {
    const target = tp?.target_reps ?? null;
    const capMin = tp?.time_cap_minutes ?? null;
    const capSec = capMin != null ? Math.round(capMin * 60) : null;
    const bits: string[] = [];
    if (target != null) bits.push(`${target} reps for time`);
    if (capSec != null) bits.push(`(cap ${capSec}s)`);
    const header = bits.length ? bits.join(" ") : "For time";
    return {
      header,
      ref: {
        headerSummary: header,
        prescribedTargetReps: target,
        prescribedTimeCapSeconds: capSec,
      },
    };
  }

  return { header: null, ref: {} };
}

export type PrescriptionProtocolBundle = {
  setEntries: SetEntryRow[];
  entryExercises: Array<PrescribedExerciseRow & { set_entry_id: string }>;
  exerciseNames: Map<string, string>;
  timeProtocols: TimeProtocolRow[];
  dropSets: DropSetRow[];
  clusterSets: ClusterSetRow[];
  restPauseSets: RestPauseRow[];
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

export function buildPrescribedWorkoutReference(
  blocks: WorkoutLogBlock[],
  bundle: PrescriptionProtocolBundle
): PrescribedWorkoutReference | null {
  const { bySetEntry } = buildPrescriptionMaps(
    bundle.setEntries.map((e) => ({ id: e.id, set_type: e.set_type })),
    bundle.entryExercises
  );

  const entryMetaById = new Map(bundle.setEntries.map((e) => [e.id, e]));

  const byBlockId: PrescribedWorkoutReference["byBlockId"] = {};
  let any = false;

  for (const block of blocks) {
    const entryId = block.setEntryId;
    const setType = block.setType;
    const prescMap = bySetEntry.get(entryId);
    const entryMeta = entryMetaById.get(entryId);
    if (setType === "amrap" || setType === "emom" || setType === "tabata" || setType === "for_time") {
      const tp = firstTimeProtocol(bundle.timeProtocols, entryId, setType);
      const { header, ref } = buildTimeHeader(setType, tp, entryMeta);
      if (header) any = true;
      const timeRef: PrescribedTimeBlockReference = {
        setType: setType as PrescribedTimeBlockReference["setType"],
        ...ref,
      };
      byBlockId[entryId] = timeRef;
      continue;
    }

    if (setType === "superset" && prescMap) {
      const sets: PrescribedSetReference[] = block.sets.map((log) => evaluateSupersetSet(log, prescMap));
      const header = buildStraightLikeHeader(
        setType,
        block,
        undefined,
        entryMeta,
        bundle.dropSets,
        bundle.clusterSets,
        bundle.restPauseSets,
        bundle.exerciseNames,
        prescMap
      );
      if (header || sets.some((s) => s.outcome && s.outcome !== "neutral")) any = true;
      const ref: PrescribedBlockReference = {
        setEntryId: entryId,
        setType,
        headerSummary: header,
        sets,
      };
      byBlockId[entryId] = ref;
      continue;
    }

    if (
      setType === "straight_set" ||
      setType === "drop_set" ||
      setType === "cluster_set" ||
      setType === "giant_set" ||
      setType === "rest_pause" ||
      setType === "pre_exhaustion"
    ) {
      const exId0 = block.sets[0]?.exercise_id ?? block.exerciseIds[0];
      const pe0 = exId0 && prescMap ? prescMap.get(exId0) : undefined;
      const sets: PrescribedSetReference[] = block.sets.map((log) => {
        const ex = log.exercise_id;
        const rowPe = ex && prescMap ? prescMap.get(ex) : undefined;
        return evaluateStraightLikeSet(log, rowPe);
      });
      const header = buildStraightLikeHeader(
        setType,
        block,
        pe0,
        entryMeta,
        bundle.dropSets,
        bundle.clusterSets,
        bundle.restPauseSets,
        bundle.exerciseNames,
        prescMap ?? new Map()
      );
      const hasPresc = sets.some((_, i) => {
        const log = block.sets[i];
        const ex = log?.exercise_id;
        const p = ex && prescMap ? prescMap.get(ex) : undefined;
        return p ? hasAnyPrescription(p) : false;
      });
      if (header || hasPresc) any = true;
      const ref: PrescribedBlockReference = {
        setEntryId: entryId,
        setType,
        headerSummary: header,
        setCount: entryMeta?.total_sets ?? null,
        prescribedReps: pe0 ? repsTargetMin(pe0) : null,
        prescribedWeightKg: pe0 ? prescribedWeightKg(pe0) : null,
        prescribedRpe: pe0 ? prescribedRpe(pe0) : null,
        sets,
      };
      byBlockId[entryId] = ref;
      continue;
    }

    if (setType === "speed_work") {
      const log0 = block.sets[0];
      const exId = log0?.exercise_id;
      const key = exId ? `${entryId}::${exId}` : "";
      const p = exId && key ? bundle.speedByKey?.get(key) : undefined;
      const intervals = p?.intervals ?? block.sets.length;
      const dist = p?.distance_meters ?? null;
      const headerParts: string[] = [];
      if (intervals > 0 && dist != null) headerParts.push(`${intervals}× ${dist}m`);
      const header = headerParts.length ? headerParts.join(" ") : null;
      const line = header ?? null;
      const sets: PrescribedSetReference[] = block.sets.map(() => ({
        outcome: "neutral" as const,
        prescribedLine: line,
      }));
      const ref: PrescribedBlockReference = {
        setEntryId: entryId,
        setType,
        headerSummary: header,
        sets,
      };
      if (header) any = true;
      byBlockId[entryId] = ref;
      continue;
    }

    if (setType === "endurance") {
      const log0 = block.sets[0];
      const exId = log0?.exercise_id;
      const key = exId ? `${entryId}::${exId}` : "";
      const p = exId && key ? bundle.enduranceByKey?.get(key) : undefined;
      const durMin =
        p?.target_time_seconds != null ? Math.round(p.target_time_seconds / 60) : null;
      const kmh =
        p?.target_pace_seconds_per_km != null && p.target_pace_seconds_per_km > 0
          ? Math.round((3600 / p.target_pace_seconds_per_km) * 10) / 10
          : null;
      const bits: string[] = [];
      if (durMin != null) bits.push(`${durMin} min`);
      if (kmh != null) bits.push(`@ ${kmh} km/h`);
      const header = bits.length ? bits.join(" ") : null;
      const line = header;
      const ref: PrescribedBlockReference = {
        setEntryId: entryId,
        setType,
        headerSummary: header,
        prescribedEnduranceMinutes: durMin,
        prescribedEnduranceKmh: kmh,
        sets: block.sets.map(() => ({
          outcome: "neutral" as const,
          prescribedLine: line,
        })),
      };
      if (header) any = true;
      byBlockId[entryId] = ref;
      continue;
    }

    const exId2 = block.sets[0]?.exercise_id;
    const pe2 = exId2 && prescMap ? prescMap.get(exId2) : undefined;
    if (exId2 && prescMap) {
      const sets = block.sets.map((log) => evaluateStraightLikeSet(log, pe2));
      const header =
        pe2 && hasAnyPrescription(pe2)
          ? buildStraightLikeHeader(
              "straight_set",
              block,
              pe2,
              entryMeta,
              bundle.dropSets,
              bundle.clusterSets,
              bundle.restPauseSets,
              bundle.exerciseNames,
              prescMap
            )
          : null;
      if (header || (pe2 && hasAnyPrescription(pe2))) any = true;
      byBlockId[entryId] = {
        setEntryId: entryId,
        setType,
        headerSummary: header,
        sets,
      };
    }
  }

  if (Object.keys(byBlockId).length === 0) return null;
  return { byBlockId };
}

export function formatActualStrengthLine(log: WorkoutLogSet, setType: WorkoutLogBlockType): string {
  if (setType === "superset") {
    const a = formatKgRepsRpe(num(log.superset_weight_a), numInt(log.superset_reps_a), null, "RPE");
    const b = formatKgRepsRpe(num(log.superset_weight_b), numInt(log.superset_reps_b), null, "RPE");
    const segs = [a, b].filter(Boolean) as string[];
    const joined = segs.join(" + ");
    const rp = numInt(log.rpe);
    if (rp != null) return joined ? `${joined} @ RPE ${rp}` : `@ RPE ${rp}`;
    return joined || "—";
  }
  const w = num(log.weight);
  const r = numInt(log.reps);
  const rp = numInt(log.rpe);
  const core = formatKgRepsRpe(w, r, null, "RPE");
  if (rp != null) return core ? `${core} @ RPE ${rp}` : `@ RPE ${rp}`;
  return core ?? "—";
}

export function formatPrescribedStrengthLine(ref: PrescribedSetReference): string | null {
  if (ref.prescribedParts?.length) {
    const segs = ref.prescribedParts
      .map((p) => formatPrescribedKgRepsRpe(p.weightKg, p.reps, p.rpe, "RPE"))
      .filter(Boolean) as string[];
    return segs.length ? segs.join(" + ") : null;
  }
  return formatPrescribedKgRepsRpe(
    ref.prescribedWeightKg ?? null,
    ref.prescribedReps ?? null,
    ref.prescribedRpe ?? null,
    "RPE"
  );
}
