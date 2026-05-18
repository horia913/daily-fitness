import { NextRequest, NextResponse } from "next/server";

import {
  validateApiAuth,
  createForbiddenResponse,
  createUnauthorizedResponse,
} from "@/lib/apiAuth";

import {
  formatPersonalRecordCaption,
  formatPrKindTag,
  formatPrRecentListLine,
} from "@/lib/personalRecordDisplay";

/** Most recent PR rows returned for coach client stats "Recent PRs" (achieved_date desc, id desc). */
const RECENT_PRS_DISPLAY_LIMIT = 10;

type PrRow = {
  id: string;

  exercise_id: string | null;

  record_type: string;

  record_value: number;

  record_unit: string | null;

  weight_at_record: number | null;

  reps_at_record: number | null;

  achieved_date: string;

  workout_assignment_id: string | null;

  is_current_record: boolean | null;

  exercises?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

function exerciseNameFromRow(r: PrRow): string {
  const e = r.exercises;

  if (Array.isArray(e)) return e[0]?.name ?? "Exercise";

  return e?.name ?? "Exercise";
}

/** Normalized `personal_records.record_type` for map keys (CHECK uses lowercase). */
function normalizedRecordType(r: PrRow): string {
  return String(r.record_type ?? "")
    .trim()
    .toLowerCase();
}

/** Stable series key; must match `buildSeries` map keys. */
function seriesKeyFromRow(r: PrRow): string {
  if (!r.exercise_id) return "";
  return `${r.exercise_id}|${normalizedRecordType(r)}`;
}

/**
 * Row counts as "current" unless explicitly superseded (`false`).
 * Matches SQL `is_current_record IS NOT FALSE` so nullable / legacy rows still compete for default.
 */
function isCurrentRecordForDefault(r: PrRow): boolean {
  return r.is_current_record !== false;
}

export type PrTimelineSeries = {
  key: string;

  exerciseId: string;

  exerciseName: string;

  recordType: string;

  recordUnit: string | null;

  milestones: { date: string; value: number }[];
};

function buildSeries(prRows: PrRow[]): PrTimelineSeries[] {
  type Acc = {
    exerciseId: string;

    exerciseName: string;

    recordType: string;

    recordUnit: string | null;

    milestones: { date: string; value: number }[];
  };

  const map = new Map<string, Acc>();

  for (const r of prRows) {
    if (!r.exercise_id) continue;

    const v = Number(r.record_value);

    if (!Number.isFinite(v)) continue;

    const key = seriesKeyFromRow(r);

    const name = exerciseNameFromRow(r);

    if (!map.has(key)) {
      map.set(key, {
        exerciseId: r.exercise_id,

        exerciseName: name,

        recordType: normalizedRecordType(r),

        recordUnit: r.record_unit ?? null,

        milestones: [],
      });
    }

    const entry = map.get(key)!;

    entry.milestones.push({ date: r.achieved_date, value: v });

    if (r.record_unit) entry.recordUnit = r.record_unit;
  }

  const series: PrTimelineSeries[] = [];

  for (const [key, acc] of map) {
    acc.milestones.sort((a, b) => a.date.localeCompare(b.date));

    series.push({
      key,

      exerciseId: acc.exerciseId,

      exerciseName: acc.exerciseName,

      recordType: acc.recordType,

      recordUnit: acc.recordUnit,

      milestones: acc.milestones,
    });
  }

  series.sort((a, b) =>
    `${a.exerciseName}|${a.recordType}`.localeCompare(
      `${b.exerciseName}|${b.recordType}`,
      "en",
    ),
  );

  return series;
}

function sortDefaultWeightCandidates(a: PrRow, b: PrRow): number {
  const va = Number(a.record_value);
  const vb = Number(b.record_value);
  if (vb !== va) return vb - va;
  const nameCmp = exerciseNameFromRow(a).localeCompare(
    exerciseNameFromRow(b),
    "en",
  );
  if (nameCmp !== 0) return nameCmp;
  return b.achieved_date.localeCompare(a.achieved_date);
}

function pickDefaultSeriesKey(
  prRows: PrRow[],
  series: PrTimelineSeries[],
): string | null {
  if (series.length === 0) return null;

  const isFiniteWeightRow = (r: PrRow) =>
    Boolean(r.exercise_id) &&
    (normalizedRecordType(r) === "max_strength" ||
      normalizedRecordType(r) === "weight") &&
    Number.isFinite(Number(r.record_value));

  const currentWeight = prRows.filter(
    (r) => isFiniteWeightRow(r) && isCurrentRecordForDefault(r),
  );

  if (currentWeight.length > 0) {
    const chosen = [...currentWeight].sort(sortDefaultWeightCandidates)[0];
    return seriesKeyFromRow(chosen);
  }

  const dated = prRows.filter(
    (r) => r.exercise_id && Number.isFinite(Number(r.record_value)),
  );

  if (dated.length === 0) return series[0]?.key ?? null;

  dated.sort((a, b) => {
    const c = b.achieved_date.localeCompare(a.achieved_date);

    if (c !== 0) return c;

    return b.id.localeCompare(a.id);
  });

  const latest = dated[0];

  return seriesKeyFromRow(latest);
}

/** If computed key ever drifts from stored `record_type` casing, map to an existing series entry. */
function coerceDefaultKeyToSeries(
  key: string | null,
  series: PrTimelineSeries[],
): string | null {
  if (!key || series.length === 0) return null;
  if (series.some((s) => s.key === key)) return key;
  const pipe = key.indexOf("|");
  if (pipe <= 0) return null;
  const exId = key.slice(0, pipe);
  const rt = key.slice(pipe + 1).trim().toLowerCase();
  const hit = series.find(
    (s) => s.exerciseId === exId && s.recordType.trim().toLowerCase() === rt,
  );
  return hit?.key ?? null;
}

export async function GET(
  request: NextRequest,

  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request);

    const { clientId } = await params;

    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    const { data: clientLink, error: clientErr } = await supabaseAdmin

      .from("clients")

      .select("id")

      .eq("coach_id", user.id)

      .eq("client_id", clientId)

      .limit(1)

      .maybeSingle();

    if (clientErr) {
      return NextResponse.json(
        { error: "Failed to verify client access" },
        { status: 500 },
      );
    }

    if (!clientLink) {
      return createForbiddenResponse(
        "Forbidden - Client not found or access denied",
      );
    }

    const { data: rows, error: prErr } = await supabaseAdmin

      .from("personal_records")

      .select(
        "id, exercise_id, record_type, record_value, record_unit, weight_at_record, reps_at_record, achieved_date, workout_assignment_id, is_current_record, exercises(name)",
      )

      .eq("client_id", clientId)

      .order("achieved_date", { ascending: true })

      .order("id", { ascending: true })

      .limit(2000);

    if (prErr) {
      return NextResponse.json(
        { error: "Failed to load PR history" },
        { status: 500 },
      );
    }

    const prRows = (rows ?? []) as PrRow[];

    const series = buildSeries(prRows);

    let defaultSeriesKey = coerceDefaultKeyToSeries(
      pickDefaultSeriesKey(prRows, series),
      series,
    );

    if (!defaultSeriesKey) {
      defaultSeriesKey = series[0]?.key ?? null;
    }

    const recentSource = [...prRows].sort((a, b) => {
      const c = b.achieved_date.localeCompare(a.achieved_date);

      if (c !== 0) return c;

      return b.id.localeCompare(a.id);
    });

    const recent = recentSource.slice(0, RECENT_PRS_DISPLAY_LIMIT).map((r) => {
      const exerciseName = exerciseNameFromRow(r);

      return {
        exerciseId: r.exercise_id,

        exerciseName,

        recordType: r.record_type,

        recordValue: Number(r.record_value),

        recordUnit: r.record_unit ?? null,

        caption: formatPrRecentListLine({
          record_type: r.record_type,
          record_value: r.record_value,
          record_unit: r.record_unit,
          weight_at_record: r.weight_at_record,
          reps_at_record: r.reps_at_record,
        }),

        achievedDate: r.achieved_date,

        workoutLogId: r.workout_assignment_id,
      };
    });

    return NextResponse.json({
      clientId,

      /** Total PR rows returned for this client (same cap as query limit). */
      lifetimePrCount: prRows.length,

      chart: {
        series,

        defaultSeriesKey,
      },

      recent,
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";

    if (msg === "User not authenticated") {
      return createUnauthorizedResponse();
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
