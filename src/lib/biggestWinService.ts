import type { SupabaseClient } from "@supabase/supabase-js";

/** Monday 00:00:00 in the user's local timezone */
export function getWeekStartMondayLocal(now = new Date()): Date {
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type ExerciseJoin = { id?: string; name?: string } | null;

export type BiggestWinImprovementType =
  | "weight"
  | "reps"
  | "volume"
  | "time"
  | "distance"
  | "pace"
  | "score";

export interface BiggestWin {
  exerciseName: string;
  exerciseId: string;
  improvementType: BiggestWinImprovementType;
  /** Human-readable primary delta, e.g. "+5 kg" */
  improvementValue: string;
  improvementUnit: string;
  currentBest: string;
  previousBest: string;
  /** When true, show PR / improvement card; false = consistency / top effort */
  hasImprovement: boolean;
  /** Heaviest set line for consistency state, e.g. "100 kg × 8" */
  consistencySummary?: string;
  /** Optional heading for consistency card (default: "Heaviest set this week") */
  consistencyLabel?: string;
  /**
   * Positive improvement % (1 decimal) for PR row; omit when baseline is invalid (e.g. previous 0).
   */
  improvementPercent?: number | null;
}

function roundImprovementPercent(pct: number): number {
  return Math.round(pct * 10) / 10;
}

/** Strength / reps / volume / distance: higher is better. */
function pctHigherIsBetter(previous: number, current: number): number | null {
  if (!(previous > 0) || !Number.isFinite(previous) || !Number.isFinite(current)) return null;
  if (current <= previous) return null;
  const p = ((current - previous) / previous) * 100;
  if (!Number.isFinite(p)) return null;
  const r = roundImprovementPercent(p);
  return r > 0 ? r : null;
}

/** Time / pace: lower is better. */
function pctLowerIsBetter(previous: number, current: number): number | null {
  if (!(previous > 0) || !Number.isFinite(previous) || !Number.isFinite(current)) return null;
  if (current >= previous) return null;
  const p = ((previous - current) / previous) * 100;
  if (!Number.isFinite(p)) return null;
  const r = roundImprovementPercent(p);
  return r > 0 ? r : null;
}

interface StrengthSlice {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  volume: number;
}

function exerciseNameFromRow(row: { exercises?: ExerciseJoin }, fallback: string): string {
  return row.exercises?.name?.trim() || fallback;
}

/** Expand a workout_set_logs row into strength slices (schema-aligned columns). */
function strengthSlicesFromRow(
  row: Record<string, unknown>,
  nameById: Map<string, string>,
): StrengthSlice[] {
  const out: StrengthSlice[] = [];
  const fallback = "Exercise";

  const exId = row.exercise_id as string | null | undefined;
  const w = Number(row.weight);
  const r = row.reps != null ? Number(row.reps) : NaN;
  if (exId && w > 0 && r > 0) {
    const nm = exerciseNameFromRow(row as { exercises?: ExerciseJoin }, nameById.get(exId) || fallback);
    out.push({ exerciseId: exId, exerciseName: nm, weight: w, reps: r, volume: w * r });
  }

  const aId = row.superset_exercise_a_id as string | null | undefined;
  const aw = Number(row.superset_weight_a);
  const ar = row.superset_reps_a != null ? Number(row.superset_reps_a) : NaN;
  if (aId && aw > 0 && ar > 0) {
    out.push({
      exerciseId: aId,
      exerciseName: nameById.get(aId) || fallback,
      weight: aw,
      reps: ar,
      volume: aw * ar,
    });
  }

  const bId = row.superset_exercise_b_id as string | null | undefined;
  const bw = Number(row.superset_weight_b);
  const br = row.superset_reps_b != null ? Number(row.superset_reps_b) : NaN;
  if (bId && bw > 0 && br > 0) {
    out.push({
      exerciseId: bId,
      exerciseName: nameById.get(bId) || fallback,
      weight: bw,
      reps: br,
      volume: bw * br,
    });
  }

  const drw = Number(row.dropset_initial_weight);
  const drr = row.dropset_initial_reps != null ? Number(row.dropset_initial_reps) : NaN;
  const dropEx = (row.exercise_id as string | null | undefined) || null;
  if (dropEx && drw > 0 && drr > 0) {
    out.push({
      exerciseId: dropEx,
      exerciseName: nameById.get(dropEx) || exerciseNameFromRow(row as { exercises?: ExerciseJoin }, fallback),
      weight: drw,
      reps: drr,
      volume: drw * drr,
    });
  }

  const rpw = Number(row.rest_pause_initial_weight);
  const rpr = row.rest_pause_initial_reps != null ? Number(row.rest_pause_initial_reps) : NaN;
  const rpEx = row.exercise_id as string | null | undefined;
  if (rpEx && rpw > 0 && rpr > 0) {
    out.push({
      exerciseId: rpEx,
      exerciseName: nameById.get(rpEx) || exerciseNameFromRow(row as { exercises?: ExerciseJoin }, fallback),
      weight: rpw,
      reps: rpr,
      volume: rpw * rpr,
    });
  }

  const pew = Number(row.preexhaust_compound_weight);
  const per = row.preexhaust_compound_reps != null ? Number(row.preexhaust_compound_reps) : NaN;
  const peEx = row.preexhaust_compound_exercise_id as string | null | undefined;
  if (peEx && pew > 0 && per > 0) {
    out.push({
      exerciseId: peEx,
      exerciseName: nameById.get(peEx) || fallback,
      weight: pew,
      reps: per,
      volume: pew * per,
    });
  }

  return out;
}

function uniq(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

async function fetchExerciseNames(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase.from("exercises").select("id, name").in("id", ids);
  if (error || !data) return map;
  for (const row of data as { id: string; name: string }[]) {
    map.set(row.id, row.name);
  }
  return map;
}

interface PrRow {
  exercise_id: string;
  record_type: string;
  record_value: number;
  record_unit: string;
  previous_record_value: number | null;
  improvement_percentage: number | null;
  exercises?: { id?: string; name?: string } | null;
}

function rankPr(row: PrRow): number {
  const prev = row.previous_record_value;
  const cur = row.record_value;
  if (cur <= 0) return 0;

  if (row.record_type === "time") {
    if (prev == null || prev <= 0) return 0;
    if (cur >= prev) return 0;
    return ((prev - cur) / prev) * 100;
  }

  if (prev == null || prev <= 0) return 100;

  if (cur <= prev) return 0;

  if (
    row.improvement_percentage != null &&
    Number.isFinite(row.improvement_percentage) &&
    row.improvement_percentage !== 0
  ) {
    return Math.abs(row.improvement_percentage);
  }

  return ((cur - prev) / prev) * 100;
}

function formatWeightKg(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} kg`;
}

function biggestWinFromPr(row: PrRow): BiggestWin {
  const name = row.exercises?.name?.trim() || "Exercise";
  const prev = row.previous_record_value;
  const cur = row.record_value;
  const unit = row.record_unit || "";

  if (row.record_type === "weight") {
    const u = unit || "kg";
    const delta = prev != null ? cur - prev : cur;
    const imp =
      prev != null
        ? `${delta >= 0 ? "+" : ""}${Math.round(delta * 10) / 10} ${u}`.trim()
        : `${Math.round(cur * 10) / 10} ${u} PR`;
    return {
      exerciseId: row.exercise_id,
      exerciseName: name,
      improvementType: "weight",
      improvementValue: imp,
      improvementUnit: u,
      currentBest: `${Math.round(cur * 10) / 10} ${u}`,
      previousBest: prev != null ? `${Math.round(prev * 10) / 10} ${u}` : "—",
      hasImprovement: prev == null || cur > prev,
      improvementPercent:
        prev != null && prev > 0 && cur > prev ? pctHigherIsBetter(prev, cur) : null,
    };
  }

  if (row.record_type === "reps") {
    const delta = prev != null ? cur - prev : cur;
    return {
      exerciseId: row.exercise_id,
      exerciseName: name,
      improvementType: "reps",
      improvementValue: `${delta >= 0 ? "+" : ""}${Math.round(delta)} ${unit || "reps"}`.trim(),
      improvementUnit: unit || "reps",
      currentBest: `${cur} ${unit || "reps"}`,
      previousBest: prev != null ? `${prev} ${unit || "reps"}` : "—",
      hasImprovement: prev == null || cur > prev,
      improvementPercent:
        prev != null && prev > 0 && cur > prev ? pctHigherIsBetter(prev, cur) : null,
    };
  }

  if (row.record_type === "time") {
    const delta = prev != null && prev > 0 ? prev - cur : 0;
    return {
      exerciseId: row.exercise_id,
      exerciseName: name,
      improvementType: "time",
      improvementValue: delta > 0 ? `−${delta}s` : `${cur}s`,
      improvementUnit: unit || "s",
      currentBest: `${cur}${unit ? ` ${unit}` : " s"}`,
      previousBest: prev != null ? `${prev}${unit ? ` ${unit}` : " s"}` : "—",
      hasImprovement: prev != null && cur < prev,
      improvementPercent:
        prev != null && prev > 0 && cur < prev ? pctLowerIsBetter(prev, cur) : null,
    };
  }

  if (row.record_type === "distance") {
    const delta = prev != null ? cur - prev : cur;
    return {
      exerciseId: row.exercise_id,
      exerciseName: name,
      improvementType: "distance",
      improvementValue: `${delta >= 0 ? "+" : ""}${Math.round(delta * 10) / 10} ${unit || "m"}`,
      improvementUnit: unit || "m",
      currentBest: `${cur} ${unit || "m"}`,
      previousBest: prev != null ? `${prev} ${unit || "m"}` : "—",
      hasImprovement: prev == null || cur > prev,
      improvementPercent:
        prev != null && prev > 0 && cur > prev ? pctHigherIsBetter(prev, cur) : null,
    };
  }

  const delta = prev != null ? cur - prev : cur;
  return {
    exerciseId: row.exercise_id,
    exerciseName: name,
    improvementType: "score",
    improvementValue: `${delta >= 0 ? "+" : ""}${Math.round(delta * 10) / 10}${unit ? ` ${unit}` : ""}`,
    improvementUnit: unit,
    currentBest: `${cur}${unit ? ` ${unit}` : ""}`,
    previousBest: prev != null ? `${prev}` : "—",
    hasImprovement: prev == null || cur > prev,
    improvementPercent:
      prev != null && prev > 0 && cur > prev ? pctHigherIsBetter(prev, cur) : null,
  };
}

/**
 * Best celebration for the client for the current week (Mon start, local).
 * Uses personal_records for the week when present, else compares workout_set_logs to pre-week history.
 */
export async function getBiggestWinForWeek(
  clientId: string,
  supabase: SupabaseClient,
): Promise<BiggestWin | null> {
  const weekStart = getWeekStartMondayLocal();
  const weekStartIso = weekStart.toISOString();
  const weekStartYmd = formatLocalYmd(weekStart);

  const { count: trainedCount, error: countErr } = await supabase
    .from("workout_set_logs")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("completed_at", weekStartIso);

  if (countErr || !trainedCount || trainedCount < 1) {
    return null;
  }

  const { data: weekPrs, error: prErr } = await supabase
    .from("personal_records")
    .select(
      "exercise_id, record_type, record_value, record_unit, previous_record_value, improvement_percentage, achieved_date, exercises(id, name)",
    )
    .eq("client_id", clientId)
    .eq("is_current_record", true)
    .gte("achieved_date", weekStartYmd);

  if (!prErr && weekPrs?.length) {
    const ranked = (weekPrs as PrRow[])
      .map((r) => ({ r, score: rankPr(r) }))
      .filter((x) => x.r.record_value > 0 && x.score > 0)
      .sort((a, b) => b.score - a.score);

    if (ranked.length > 0) {
      const win = biggestWinFromPr(ranked[0].r);
      if (win.hasImprovement) return win;
    }
  }

  const selectCols = `
    exercise_id, weight, reps, completed_at, set_type,
    superset_exercise_a_id, superset_weight_a, superset_reps_a,
    superset_exercise_b_id, superset_weight_b, superset_reps_b,
    dropset_initial_weight, dropset_initial_reps,
    rest_pause_initial_weight, rest_pause_initial_reps,
    preexhaust_compound_exercise_id, preexhaust_compound_weight, preexhaust_compound_reps,
    fortime_time_taken_sec, hr_distance_meters, amrap_total_reps,
    exercises (id, name)
  `;

  const { data: weekRows, error: weekErr } = await supabase
    .from("workout_set_logs")
    .select(selectCols)
    .eq("client_id", clientId)
    .gte("completed_at", weekStartIso);

  if (weekErr || !weekRows?.length) {
    return null;
  }

  const weekRowArr = weekRows as Record<string, unknown>[];
  const idSet = new Set<string>();
  for (const row of weekRowArr) {
    const e = row.exercise_id as string | undefined;
    if (e) idSet.add(e);
    const a = row.superset_exercise_a_id as string | undefined;
    if (a) idSet.add(a);
    const b = row.superset_exercise_b_id as string | undefined;
    if (b) idSet.add(b);
    const pe = row.preexhaust_compound_exercise_id as string | undefined;
    if (pe) idSet.add(pe);
  }
  const nameById = await fetchExerciseNames(supabase, uniq([...idSet]));
  for (const row of weekRowArr) {
    const ej = row.exercises as { id?: string; name?: string } | null | undefined;
    if (ej?.id && ej?.name) nameById.set(ej.id, ej.name);
  }

  const weekStrength: StrengthSlice[] = [];
  for (const row of weekRowArr) {
    weekStrength.push(...strengthSlicesFromRow(row, nameById));
  }

  const bestWeekByEx = new Map<string, StrengthSlice>();
  for (const s of weekStrength) {
    const prev = bestWeekByEx.get(s.exerciseId);
    if (!prev || s.volume > prev.volume || (s.volume === prev.volume && s.weight > prev.weight)) {
      bestWeekByEx.set(s.exerciseId, s);
    }
  }

  const exerciseIds = uniq([...bestWeekByEx.keys()]);
  let preWeekStrength: StrengthSlice[] = [];
  if (exerciseIds.length > 0) {
    const idList = exerciseIds.join(",");
    const orFilter = `exercise_id.in.(${idList}),superset_exercise_a_id.in.(${idList}),superset_exercise_b_id.in.(${idList})`;

    const { data: preRows } = await supabase
      .from("workout_set_logs")
      .select(selectCols)
      .eq("client_id", clientId)
      .lt("completed_at", weekStartIso)
      .or(orFilter);

    if (preRows?.length) {
      for (const row of preRows as Record<string, unknown>[]) {
        preWeekStrength.push(...strengthSlicesFromRow(row, nameById));
      }
    }
  }

  const bestPreByEx = new Map<string, StrengthSlice>();
  for (const s of preWeekStrength) {
    if (!exerciseIds.includes(s.exerciseId)) continue;
    const prev = bestPreByEx.get(s.exerciseId);
    if (!prev || s.volume > prev.volume || (s.volume === prev.volume && s.weight > prev.weight)) {
      bestPreByEx.set(s.exerciseId, s);
    }
  }

  let bestLogWin: {
    slice: StrengthSlice;
    prev: StrengthSlice | null;
    pct: number;
    abs: number;
  } | null = null;

  for (const [, slice] of bestWeekByEx) {
    const pre = bestPreByEx.get(slice.exerciseId) || null;
    if (!pre) {
      const score = slice.volume > 0 ? 100 : 0;
      if (
        !bestLogWin ||
        score > bestLogWin.pct ||
        (score === bestLogWin.pct && slice.volume > bestLogWin.slice.volume)
      ) {
        bestLogWin = { slice, prev: null, pct: score, abs: slice.volume };
      }
      continue;
    }
    if (slice.volume <= pre.volume) continue;
    const pct = ((slice.volume - pre.volume) / pre.volume) * 100;
    const abs = slice.volume - pre.volume;
    if (!bestLogWin || pct > bestLogWin.pct || (pct === bestLogWin.pct && abs > bestLogWin.abs)) {
      bestLogWin = { slice, prev: pre, pct, abs };
    }
  }

  if (bestLogWin && bestLogWin.prev && bestLogWin.slice.volume > bestLogWin.prev.volume) {
    const s = bestLogWin.slice;
    const p = bestLogWin.prev;
    const dw = Math.round((s.weight - p.weight) * 10) / 10;
    const dr = s.reps - p.reps;
    let imp = `+${Math.round(bestLogWin.pct * 10) / 10}% volume`;
    if (dw > 0) imp = `+${dw} kg`;
    else if (dr > 0) imp = `+${dr} reps`;
    let impPct: number | null = null;
    if (dw > 0) impPct = pctHigherIsBetter(p.weight, s.weight);
    else if (dr > 0) impPct = pctHigherIsBetter(p.reps, s.reps);
    else if (p.volume > 0 && s.volume > p.volume) {
      const raw = ((s.volume - p.volume) / p.volume) * 100;
      const r = roundImprovementPercent(raw);
      impPct = r > 0 ? r : null;
    }
    return {
      exerciseId: s.exerciseId,
      exerciseName: s.exerciseName,
      improvementType: dw > 0 ? "weight" : dr > 0 ? "reps" : "volume",
      improvementValue: imp,
      improvementUnit: dw > 0 ? "kg" : dr > 0 ? "reps" : "%",
      currentBest: `${formatWeightKg(s.weight)} × ${s.reps}`,
      previousBest: `${formatWeightKg(p.weight)} × ${p.reps}`,
      hasImprovement: true,
      improvementPercent: impPct,
    };
  }

  if (bestLogWin && !bestLogWin.prev && bestLogWin.slice.volume > 0) {
    const s = bestLogWin.slice;
    return {
      exerciseId: s.exerciseId,
      exerciseName: s.exerciseName,
      improvementType: "weight",
      improvementValue: "New best",
      improvementUnit: "",
      currentBest: `${formatWeightKg(s.weight)} × ${s.reps}`,
      previousBest: "—",
      hasImprovement: true,
      improvementPercent: null,
    };
  }

  if (weekStrength.length > 0) {
    const top = weekStrength.reduce((a, b) =>
      b.volume > a.volume || (b.volume === a.volume && b.weight > a.weight) ? b : a,
    );
    return {
      exerciseId: top.exerciseId,
      exerciseName: top.exerciseName,
      improvementType: "weight",
      improvementValue: "",
      improvementUnit: "",
      currentBest: formatWeightKg(top.weight),
      previousBest: "",
      hasImprovement: false,
      consistencySummary: `${formatWeightKg(top.weight)} × ${top.reps}`,
    };
  }

  let bestTime: { exerciseId: string; name: string; sec: number } | null = null;
  let bestDist: { exerciseId: string; name: string; m: number } | null = null;
  let bestAmrap: { exerciseId: string; name: string; reps: number } | null = null;

  for (const row of weekRowArr) {
    const exId = row.exercise_id as string | undefined;
    if (!exId) continue;
    const nm = nameById.get(exId) || exerciseNameFromRow(row as { exercises?: ExerciseJoin }, "Exercise");
    const ft = row.fortime_time_taken_sec != null ? Number(row.fortime_time_taken_sec) : NaN;
    if (Number.isFinite(ft) && ft > 0) {
      if (!bestTime || ft < bestTime.sec) bestTime = { exerciseId: exId, name: nm, sec: ft };
    }
    const hm = row.hr_distance_meters != null ? Number(row.hr_distance_meters) : NaN;
    if (Number.isFinite(hm) && hm > 0) {
      if (!bestDist || hm > bestDist.m) bestDist = { exerciseId: exId, name: nm, m: hm };
    }
    const ar = row.amrap_total_reps != null ? Number(row.amrap_total_reps) : NaN;
    if (Number.isFinite(ar) && ar > 0) {
      if (!bestAmrap || ar > bestAmrap.reps) bestAmrap = { exerciseId: exId, name: nm, reps: ar };
    }
  }

  if (bestAmrap) {
    return {
      exerciseId: bestAmrap.exerciseId,
      exerciseName: bestAmrap.name,
      improvementType: "reps",
      improvementValue: "",
      improvementUnit: "",
      currentBest: `${bestAmrap.reps} reps`,
      previousBest: "",
      hasImprovement: false,
      consistencySummary: `${bestAmrap.reps} reps (AMRAP)`,
    };
  }
  if (bestDist) {
    return {
      exerciseId: bestDist.exerciseId,
      exerciseName: bestDist.name,
      improvementType: "distance",
      improvementValue: "",
      improvementUnit: "m",
      currentBest: `${Math.round(bestDist.m * 10) / 10} m`,
      previousBest: "",
      hasImprovement: false,
      consistencySummary: `${Math.round(bestDist.m * 10) / 10} m`,
    };
  }
  if (bestTime) {
    return {
      exerciseId: bestTime.exerciseId,
      exerciseName: bestTime.name,
      improvementType: "time",
      improvementValue: "",
      improvementUnit: "s",
      currentBest: `${bestTime.sec}s`,
      previousBest: "",
      hasImprovement: false,
      consistencySummary: `${bestTime.sec}s`,
    };
  }

  const anyEx = weekRowArr.map((r) => r.exercise_id as string | undefined).find(Boolean) || "";
  const nm = anyEx ? nameById.get(anyEx) || "Training" : "Training";
  return {
    exerciseId: anyEx,
    exerciseName: nm,
    improvementType: "score",
    improvementValue: "",
    improvementUnit: "",
    currentBest: "",
    previousBest: "",
    hasImprovement: false,
    consistencySummary: "Great work logging sessions this week",
  };
}
