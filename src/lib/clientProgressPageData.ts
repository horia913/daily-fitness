/**
 * Batched data for the consolidated client Progress page (4 sections).
 * Reuses existing services — summaries only; drill-downs load full detail.
 */

import { supabase } from "./supabase";
import { withTimeout } from "./withTimeout";
import { dedupeAsync } from "./dedupeAsync";
import {
  getProgressDashboard,
  type ProgressDashboardPayload,
} from "./progressHubCardsService";
import {
  fetchClientProgramAdherenceSnapshot,
  resolveStatsTabTimezone,
} from "./clientAnalyticsService";
import { getWeeklyVolume, type VolumeStats } from "./volumeAnalytics";
import {
  getTopProgressions,
  getTrainedExercises,
  type ExerciseProgression,
  type StrengthTimeRange,
  type TrainedExercise,
} from "./strengthAnalytics";
import { fetchPersonalRecords, type PersonalRecord } from "./personalRecords";
import { getClientPerformanceTests, type PerformanceTestResult } from "./performanceTestService";
import { getPhotoTimelineWithPreviews } from "./progressPhotoService";
import {
  getActivitiesByDateRange,
  ACTIVITY_META,
  type ClientActivity,
} from "./clientActivityService";
import type { WorkoutLogCardLog } from "@/components/client/WorkoutLogCard";

const FETCH_MS = 24_000;

export type ProgressGoalsOnTrack = {
  onTrack: number;
  total: number;
};

export type ProgressHistoryItem =
  | {
      kind: "workout";
      id: string;
      title: string;
      dateIso: string;
      dateLabel: string;
      meta: string;
      log: WorkoutLogCardLog;
    }
  | {
      kind: "activity";
      id: string;
      title: string;
      dateIso: string;
      dateLabel: string;
      meta: string;
      activity: ClientActivity;
    };

export type ProgressExploreCounts = {
  personalRecords: number;
  performanceTests: number;
  mobilityAssessments: number;
  bodyWeightKg: number | null;
  recoveryStatus: string | null;
  activityCount30d: number;
};

export type ClientProgressPageData = {
  dashboard: ProgressDashboardPayload;
  programAdherence: Awaited<ReturnType<typeof fetchClientProgramAdherenceSnapshot>>;
  goalsOnTrack: ProgressGoalsOnTrack;
  volumeStats: VolumeStats | null;
  topProgressions: ExerciseProgression[];
  trainedExercises: TrainedExercise[];
  recentPr: PersonalRecord | null;
  performanceTests: PerformanceTestResult[];
  latestPhoto: { previewUrl: string | null; date: string } | null;
  historyItems: ProgressHistoryItem[];
  clientTimezone: string;
  explore: ProgressExploreCounts;
};

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function activityLabel(a: ClientActivity): string {
  return a.activity_type === "custom"
    ? (a.custom_activity_name ?? "Custom activity")
    : (ACTIVITY_META[a.activity_type]?.label ?? a.activity_type);
}

function recoveryStatusLabel(
  recovery: ProgressDashboardPayload["recovery"],
): string | null {
  if (!recovery.hasData || !recovery.data) return null;
  const soreness = recovery.data.sorenessAvg;
  if (soreness == null) return "Good";
  if (soreness <= 2.5) return "Good";
  if (soreness <= 3.5) return "Fair";
  return "High";
}

async function fetchGoalsOnTrack(clientId: string): Promise<ProgressGoalsOnTrack> {
  const { data: rows, error } = await supabase
    .from("goals")
    .select("status, progress_percentage")
    .eq("client_id", clientId);
  if (error || !rows?.length) return { onTrack: 0, total: 0 };

  const active = rows.filter((g) => g.status === "active");
  const onTrack = active.filter((g) => {
    const pct = g.progress_percentage;
    if (pct == null) return true;
    return pct >= 25;
  }).length;

  return { onTrack, total: active.length };
}

async function fetchRecentWorkoutLogs(clientId: string, limit = 3): Promise<WorkoutLogCardLog[]> {
  const { data: logs, error } = await supabase
    .from("workout_logs")
    .select(
      `
      id,
      started_at,
      completed_at,
      total_weight_lifted,
      total_duration_minutes,
      overall_difficulty_rating,
      notes,
      workout_assignments (
        name,
        workout_templates ( name )
      ),
      workout_set_logs (
        weight,
        reps,
        exercises ( id, name )
      )
    `,
    )
    .eq("client_id", clientId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error || !logs?.length) return [];

  return logs.map((log: any) => ({
    id: log.id,
    workoutName:
      log.workout_assignments?.name ||
      log.workout_assignments?.workout_templates?.name ||
      "Workout",
    totalSets: (log.workout_set_logs ?? []).length,
    totalWeight: Number(log.total_weight_lifted) || 0,
    total_duration_minutes: log.total_duration_minutes,
    started_at: log.started_at,
    completed_at: log.completed_at,
    overall_difficulty_rating: log.overall_difficulty_rating,
    notes: log.notes ?? null,
    workout_set_logs: log.workout_set_logs ?? [],
  }));
}

function buildHistoryStream(
  workouts: WorkoutLogCardLog[],
  activities: ClientActivity[],
  cap = 3,
): ProgressHistoryItem[] {
  const items: ProgressHistoryItem[] = [];

  for (const log of workouts) {
    const dateIso = log.completed_at ?? log.started_at;
    const vol =
      log.totalWeight > 0 ? `${Math.round(log.totalWeight).toLocaleString()} kg` : null;
    const dur =
      log.total_duration_minutes != null && log.total_duration_minutes > 0
        ? `${Math.round(log.total_duration_minutes)} min`
        : null;
    const meta = [formatShortDate(dateIso), vol, dur].filter(Boolean).join(" · ");
    items.push({
      kind: "workout",
      id: log.id,
      title: log.workoutName,
      dateIso,
      dateLabel: formatShortDate(dateIso),
      meta,
      log,
    });
  }

  for (const a of activities) {
    const dateIso = `${a.activity_date}T12:00:00.000Z`;
    items.push({
      kind: "activity",
      id: a.id,
      title: activityLabel(a),
      dateIso,
      dateLabel: formatShortDate(dateIso),
      meta: `${formatShortDate(dateIso)} · ${a.duration_minutes} min`,
      activity: a,
    });
  }

  items.sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());
  return items.slice(0, cap);
}

async function fetchMobilityAssessmentCount(clientId: string): Promise<number> {
  const { count, error } = await supabase
    .from("mobility_assessments")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);
  if (error) return 0;
  return count ?? 0;
}

async function fetchClientProgressPageDataUncached(
  clientId: string,
): Promise<ClientProgressPageData> {
  const [{ data: paRow }, { data: profRow }] = await Promise.all([
    supabase
      .from("program_assignments")
      .select("timezone_snapshot")
      .eq("client_id", clientId)
      .eq("status", "active")
      .maybeSingle(),
    supabase.from("profiles").select("timezone").eq("id", clientId).maybeSingle(),
  ]);
  const clientTimezone = resolveStatsTabTimezone(
    paRow?.timezone_snapshot as string | undefined,
    profRow?.timezone as string | undefined,
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const actStart = thirtyDaysAgo.toISOString().split("T")[0];
  const actEnd = new Date().toISOString().split("T")[0];

  const [
    dashboard,
    programAdherence,
    goalsOnTrack,
    volumeStats,
    topProgressions,
    trainedExercises,
    prs,
    performanceTests,
    photoTimeline,
    recentWorkouts,
    recentActivities,
    mobilityCount,
  ] = await Promise.all([
    withTimeout(getProgressDashboard(clientId), FETCH_MS, "progress-dash"),
    withTimeout(fetchClientProgramAdherenceSnapshot(clientId), FETCH_MS, "adherence"),
    withTimeout(fetchGoalsOnTrack(clientId), FETCH_MS, "goals-on-track"),
    withTimeout(getWeeklyVolume(clientId, 4, clientTimezone), FETCH_MS, "volume"),
    withTimeout(getTopProgressions(clientId, 3, "1M"), FETCH_MS, "top-prog"),
    withTimeout(getTrainedExercises(clientId), FETCH_MS, "trained"),
    withTimeout(fetchPersonalRecords(clientId), FETCH_MS, "prs"),
    withTimeout(getClientPerformanceTests(clientId), FETCH_MS, "perf-tests"),
    withTimeout(getPhotoTimelineWithPreviews(clientId, 1), FETCH_MS, "photos"),
    withTimeout(fetchRecentWorkoutLogs(clientId, 3), FETCH_MS, "recent-logs"),
    withTimeout(getActivitiesByDateRange(clientId, actStart, actEnd), FETCH_MS, "activities"),
    withTimeout(fetchMobilityAssessmentCount(clientId), FETCH_MS, "mobility-count"),
  ]);

  const recentPr = prs.length > 0 ? prs[0] : null;
  const latestPhotoEntry = photoTimeline[0];
  const latestPhoto = latestPhotoEntry
    ? {
        date: latestPhotoEntry.date,
        previewUrl: latestPhotoEntry.previewUrl ?? null,
      }
    : null;

  const activitiesSorted = [...recentActivities]
    .sort((a, b) => b.activity_date.localeCompare(a.activity_date))
    .slice(0, 3);

  return {
    dashboard,
    programAdherence,
    goalsOnTrack,
    volumeStats,
    topProgressions,
    trainedExercises,
    recentPr,
    performanceTests,
    latestPhoto,
    historyItems: buildHistoryStream(recentWorkouts, activitiesSorted, 3),
    clientTimezone,
    explore: {
      personalRecords: prs.length,
      performanceTests: performanceTests.length,
      mobilityAssessments: mobilityCount,
      bodyWeightKg: dashboard.body.data?.currentWeightKg ?? null,
      recoveryStatus: recoveryStatusLabel(dashboard.recovery),
      activityCount30d: recentActivities.length,
    },
  };
}

/**
 * Page data loader with in-flight dedupe so StrictMode double-effects share one resolve.
 */
export async function fetchClientProgressPageData(
  clientId: string,
): Promise<ClientProgressPageData> {
  return dedupeAsync("progress-page", clientId, () =>
    fetchClientProgressPageDataUncached(clientId),
  );
}

export type HubPageRange = "week" | "4w" | "3m";

export function hubRangeToVolumeWeeks(range: HubPageRange): 4 | 12 {
  if (range === "3m") return 12;
  return 4;
}

export function hubRangeToStrengthRange(range: HubPageRange): StrengthTimeRange {
  if (range === "3m") return "3M";
  return "1M";
}

export async function fetchHubRangeSlice(
  clientId: string,
  clientTimezone: string,
  range: HubPageRange,
): Promise<{ volumeStats: VolumeStats; topProgressions: ExerciseProgression[] }> {
  const weeks = hubRangeToVolumeWeeks(range);
  const strength = hubRangeToStrengthRange(range);
  const [volumeStats, topProgressions] = await Promise.all([
    getWeeklyVolume(clientId, weeks, clientTimezone),
    getTopProgressions(clientId, 3, strength),
  ]);
  return { volumeStats, topProgressions };
}

