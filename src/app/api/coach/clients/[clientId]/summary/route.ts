/**
 * GET /api/coach/clients/[clientId]/summary
 *
 * Returns profile, streak, weekly progress, and status for the coach client detail page
 * in one server round-trip. Coach must own the client (clients.coach_id = coach, client_id = clientId).
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth';
import { handleApiError } from '@/lib/apiErrorHandler';
import { fetchProgramWorkoutCounters } from '@/lib/clientDashboardService';
import { getClientMetrics, type ClientMetrics } from '@/lib/coachDashboardService';
import { computeClientAttention, type ClientRosterStatus } from '@/lib/coachClientAttention';
import {
  buildTodayWorkoutSummary,
  buildNextScheduledWorkout,
  buildLatestCheckIn,
  buildWeekWorkoutDots,
} from '@/lib/coachClientSummaryServer';
import {
  normalizeClientTimezone,
  addCalendarDaysYmd,
  diffCalendarDaysYmd,
  zonedCalendarDateString,
  zonedYmdFromIsoTimestamp,
  zonedDayInclusiveUtcBounds,
  mondayYmdOfZonedWeekContaining,
} from '@/lib/clientZonedCalendar';

async function assertCoachHasClient(
  coachId: string,
  clientId: string,
  supabaseAdmin: any
): Promise<{ status: string | null }> {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id, status')
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('Failed to verify client access');
  if (!data) throw new Error('Forbidden - Client not found or access denied');
  return { status: data.status ?? null };
}

type WeeklyReviewBucket = {
  weekStart: string;
  weekEnd: string;
  workouts: {
    completed: number;
    planned: number;
    workoutIds: string[];
  };
  volume: {
    totalKg: number;
  };
  prs: {
    count: number;
    items: Array<{
      exerciseId: string | null;
      exerciseName: string | null;
      weight: number | null;
      reps: number | null;
      achievedDate: string;
    }>;
  };
  checkIns: {
    daily: {
      submitted: number;
      total: 7;
      avgMood: number | null;
      avgEnergy: number | null;
      avgSleep: number | null;
      avgStress: number | null;
    };
    scheduled: {
      submitted: boolean;
      submittedDate: string | null;
    };
  };
  bodyMetrics: {
    weight: number | null;
    bodyFat: number | null;
  };
};

function averageOrNull(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (nums.length === 0) return null;
  const avg = nums.reduce((sum, value) => sum + value, 0) / nums.length;
  return Math.round(avg * 10) / 10;
}

function bucketByIsoRange(
  iso: string,
  current: { startIso: string; endIso: string },
  previous: { startIso: string; endIso: string }
): 'current' | 'previous' | null {
  if (iso >= current.startIso && iso <= current.endIso) return 'current';
  if (iso >= previous.startIso && iso <= previous.endIso) return 'previous';
  return null;
}

function bucketByYmdRange(
  ymd: string,
  current: { start: string; end: string },
  previous: { start: string; end: string }
): 'current' | 'previous' | null {
  if (ymd >= current.start && ymd <= current.end) return 'current';
  if (ymd >= previous.start && ymd <= previous.end) return 'previous';
  return null;
}

function computeProgramWeekForCalendarYmd(args: {
  assignmentStartDate: string | null;
  pauseAccumulatedDays: number | null | undefined;
  pauseStatus: string | null | undefined;
  pausedAt: string | null | undefined;
  targetYmd: string;
  clientTimezone: string;
}): number {
  const startRaw = typeof args.assignmentStartDate === 'string' ? args.assignmentStartDate.trim() : '';
  const startYmd = startRaw.length >= 10 ? startRaw.slice(0, 10) : startRaw;
  if (!startYmd) return 1;
  const pauseAccum = Math.max(0, Number(args.pauseAccumulatedDays) || 0);
  const effectiveStartYmd = addCalendarDaysYmd(startYmd, pauseAccum);
  const pausedYmd =
    args.pauseStatus === 'paused' && args.pausedAt
      ? zonedYmdFromIsoTimestamp(args.pausedAt, args.clientTimezone)
      : null;
  const effectiveTargetYmd =
    pausedYmd && args.targetYmd > pausedYmd ? pausedYmd : args.targetYmd;
  const elapsed = Math.max(0, diffCalendarDaysYmd(effectiveStartYmd, effectiveTargetYmd));
  return Math.floor(elapsed / 7) + 1;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(_req);
    const coachId = user.id;
    const { clientId } = await params;
    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    }

    const { status: clientDbStatus } = await assertCoachHasClient(coachId, clientId, supabaseAdmin);

    const profileResult = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, avatar_url, created_at, timezone')
      .eq('id', clientId)
      .single();

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json(
        { error: profileResult.error?.message ?? 'Failed to load client profile' },
        { status: 500 }
      );
    }

    const profile = profileResult.data;
    const clientTz = normalizeClientTimezone(
      (profile as { timezone?: string | null }).timezone
    );
    const now = new Date();
    const todayStr = zonedCalendarDateString(now, clientTz);
    const { startIso: todayStart, endIso: todayEnd } = zonedDayInclusiveUtcBounds(
      todayStr,
      clientTz
    );
    const weekStartStr = mondayYmdOfZonedWeekContaining(now, clientTz);
    const currentWeekStart = weekStartStr;
    const currentWeekEnd = addCalendarDaysYmd(currentWeekStart, 6);
    const previousWeekStart = addCalendarDaysYmd(currentWeekStart, -7);
    const previousWeekEnd = addCalendarDaysYmd(currentWeekStart, -1);
    const currentWeekIso = zonedDayInclusiveUtcBounds(currentWeekStart, clientTz);
    const currentWeekEndIso = zonedDayInclusiveUtcBounds(currentWeekEnd, clientTz);
    const previousWeekIso = zonedDayInclusiveUtcBounds(previousWeekStart, clientTz);
    const previousWeekEndIso = zonedDayInclusiveUtcBounds(previousWeekEnd, clientTz);

    const [
      workoutCounters,
      metricsMap,
      programAssignRes,
      mealAssignRes,
      recentWorkoutsRes,
      recentMealsRes,
      mealsTodayRes,
      checkinsWeekRes,
      recentWellnessRes,
      trainedTodayCountRes,
    ] = await Promise.all([
      fetchProgramWorkoutCounters(supabaseAdmin, clientId),
      getClientMetrics([clientId], supabaseAdmin),
      supabaseAdmin
        .from('program_assignments')
        .select('id, program_id, name, duration_weeks, progression_mode, coach_unlocked_week, start_date, pause_status, paused_at, pause_accumulated_days')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('meal_plan_assignments')
        .select('id, meal_plan_id')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('workout_logs')
        .select('completed_at')
        .eq('client_id', clientId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('meal_completions')
        .select('completed_at')
        .eq('client_id', clientId)
        .order('completed_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('meal_completions')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .gte('completed_at', todayStart)
        .lte('completed_at', todayEnd),
      supabaseAdmin
        .from('daily_wellness_logs')
        .select('log_date', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .gte('log_date', weekStartStr)
        .lte('log_date', todayStr)
        .not('sleep_hours', 'is', null)
        .not('sleep_quality', 'is', null)
        .not('stress_level', 'is', null)
        .not('soreness_level', 'is', null),
      supabaseAdmin
        .from('daily_wellness_logs')
        .select('log_date, sleep_hours, sleep_quality, stress_level, soreness_level')
        .eq('client_id', clientId)
        .order('log_date', { ascending: false })
        .limit(8),
      supabaseAdmin
        .from('workout_logs')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .not('completed_at', 'is', null)
        .gte('completed_at', todayStart)
        .lte('completed_at', todayEnd),
    ]);

    const streak = workoutCounters.streak;
    const weeklyProgress = workoutCounters.weeklyProgress;

    const trainedTodayZoned = (trainedTodayCountRes.count ?? 0) > 0;
    const compliance =
      weeklyProgress.goal > 0
        ? Math.round((weeklyProgress.current / weeklyProgress.goal) * 100)
        : 0;
    let status: 'active' | 'inactive' | 'at-risk' = 'active';
    if (compliance < 50) status = 'at-risk';
    else if (compliance === 0 && weeklyProgress.goal > 0) status = 'inactive';

    const rosterStatus: ClientRosterStatus =
      clientDbStatus === 'inactive'
        ? 'inactive'
        : clientDbStatus === 'pending'
          ? 'pending'
          : status === 'at-risk'
            ? 'at-risk'
            : 'active';

    const defaultMetrics: ClientMetrics = {
      clientId,
      lastActive: null,
      workoutsThisWeek: 0,
      checkinStreak: 0,
      programStatus: 'noProgram',
      programEndDate: null,
      latestStress: null,
      latestSoreness: null,
      trainedToday: false,
      checkedInToday: false,
      activeProgramName: null,
      programCurrentWeek: null,
      programDurationWeeks: null,
      mealCompliance7dPct: null,
      lastCheckinDate: null,
      weekReviewNeeded: false,
      completedWeekNumber: null,
      activeProgramId: null,
      activeProgramAssignmentId: null,
      subscriptionEndDate: null,
      subscriptionExpiringSoon: false,
    };
    const baseMetrics = metricsMap.get(clientId) ?? defaultMetrics;
    const checkedInTodayZoned = (recentWellnessRes.data ?? []).some((w) => {
      const r = w as {
        log_date: string;
        sleep_hours: number | null;
        sleep_quality: number | null;
        stress_level: number | null;
        soreness_level: number | null;
      };
      return (
        r.log_date === todayStr &&
        r.sleep_hours != null &&
        r.sleep_quality != null &&
        r.stress_level != null &&
        r.soreness_level != null
      );
    });
    const metrics: ClientMetrics = {
      ...baseMetrics,
      trainedToday: trainedTodayZoned,
      checkedInToday: checkedInTodayZoned,
    };
    const attention = computeClientAttention(rosterStatus, metrics);

    const pa = programAssignRes.data as {
      id: string;
      program_id: string;
      name: string | null;
      start_date?: string | null;
      duration_weeks: number | null;
      progression_mode?: string | null;
      coach_unlocked_week?: number | null;
      pause_status?: string | null;
      paused_at?: string | null;
      pause_accumulated_days?: number | null;
    } | null;

    let programCard: {
      assignmentId: string;
      programId: string;
      name: string;
      currentWeek: number | null;
      durationWeeks: number | null;
      progressionMode: string | null;
      coachUnlockedWeek: number | null;
      weekReviewNeeded: boolean;
      reviewWeekNumber: number | null;
      behindOnWeeklyWorkouts: boolean;
      programProgressPercent: number | null;
    } | null = null;

    if (pa) {
      const [{ data: wp }, { data: pp }] = await Promise.all([
        supabaseAdmin.from('workout_programs').select('name').eq('id', pa.program_id).maybeSingle(),
        supabaseAdmin
          .from('program_progress')
          .select('current_week_number')
          .eq('program_assignment_id', pa.id)
          .maybeSingle(),
      ]);
      const nm = (pa.name && pa.name.trim()) || wp?.name || 'Program';
      const cw = pp?.current_week_number ?? metrics.programCurrentWeek;
      const dw = pa.duration_weeks ?? metrics.programDurationWeeks;
      let programProgressPercent: number | null = null;
      if (
        cw != null &&
        dw != null &&
        dw > 0
      ) {
        programProgressPercent = Math.min(100, Math.round((cw / dw) * 100));
      }
      const goal = weeklyProgress.goal;
      const cur = weeklyProgress.current;
      programCard = {
        assignmentId: pa.id,
        programId: pa.program_id,
        name: nm,
        currentWeek: cw,
        durationWeeks: dw,
        progressionMode: pa.progression_mode ?? null,
        coachUnlockedWeek: pa.coach_unlocked_week ?? null,
        weekReviewNeeded: metrics.weekReviewNeeded === true,
        reviewWeekNumber: metrics.completedWeekNumber ?? null,
        behindOnWeeklyWorkouts: goal > 0 && cur < goal,
        programProgressPercent,
      };
    }

    const [
      todayWorkout,
      nextScheduledWorkout,
      latestCheckIn,
      weekWorkoutDots,
      workoutsTwoWeeksRes,
      prsTwoWeeksRes,
      wellnessTwoWeeksRes,
      bodyMetricsTwoWeeksRes,
    ] = await Promise.all([
      trainedTodayZoned
        ? buildTodayWorkoutSummary(supabaseAdmin, clientId, todayStart, todayEnd)
        : Promise.resolve(null),
      !trainedTodayZoned && pa
        ? buildNextScheduledWorkout(supabaseAdmin, clientId, pa.id, pa.program_id)
        : Promise.resolve(null),
      buildLatestCheckIn(supabaseAdmin, clientId),
      buildWeekWorkoutDots(supabaseAdmin, clientId, clientTz),
      supabaseAdmin
        .from('workout_logs')
        .select('id, completed_at')
        .eq('client_id', clientId)
        .not('completed_at', 'is', null)
        .gte('completed_at', previousWeekIso.startIso)
        .lte('completed_at', currentWeekEndIso.endIso),
      supabaseAdmin
        .from('personal_records')
        .select('exercise_id, record_type, record_value, achieved_date, exercises(name)')
        .eq('client_id', clientId)
        .gte('achieved_date', previousWeekStart)
        .lte('achieved_date', currentWeekEnd),
      supabaseAdmin
        .from('daily_wellness_logs')
        .select('log_date, mood_rating, energy_level, sleep_quality, stress_level')
        .eq('client_id', clientId)
        .gte('log_date', previousWeekStart)
        .lte('log_date', currentWeekEnd),
      supabaseAdmin
        .from('body_metrics')
        .select('measured_date, weight_kg, body_fat_percentage')
        .eq('client_id', clientId)
        .gte('measured_date', previousWeekStart)
        .lte('measured_date', currentWeekEnd)
        .order('measured_date', { ascending: false }),
    ]);

    let plannedCurrentWeek = 0;
    let plannedPreviousWeek = 0;
    if (pa?.program_id) {
      const currentProgramWeek = computeProgramWeekForCalendarYmd({
        assignmentStartDate: pa.start_date ?? null,
        pauseAccumulatedDays: pa.pause_accumulated_days ?? 0,
        pauseStatus: pa.pause_status ?? null,
        pausedAt: pa.paused_at ?? null,
        targetYmd: currentWeekStart,
        clientTimezone: clientTz,
      });
      const previousProgramWeek = computeProgramWeekForCalendarYmd({
        assignmentStartDate: pa.start_date ?? null,
        pauseAccumulatedDays: pa.pause_accumulated_days ?? 0,
        pauseStatus: pa.pause_status ?? null,
        pausedAt: pa.paused_at ?? null,
        targetYmd: previousWeekStart,
        clientTimezone: clientTz,
      });
      const weekNumbers = [...new Set([currentProgramWeek, previousProgramWeek])];
      const scheduleRes = await supabaseAdmin
        .from('program_schedule')
        .select('week_number')
        .eq('program_id', pa.program_id)
        .in('week_number', weekNumbers);
      const scheduleRows = (scheduleRes.data ?? []) as Array<{ week_number: number }>;
      for (const row of scheduleRows) {
        if (row.week_number === currentProgramWeek) plannedCurrentWeek += 1;
        if (row.week_number === previousProgramWeek) plannedPreviousWeek += 1;
      }
    }

    const workoutRows = (workoutsTwoWeeksRes.data ?? []) as Array<{ id: string; completed_at: string }>;
    const currentWorkoutIds: string[] = [];
    const previousWorkoutIds: string[] = [];
    for (const row of workoutRows) {
      const bucket = bucketByIsoRange(
        row.completed_at,
        { startIso: currentWeekIso.startIso, endIso: currentWeekEndIso.endIso },
        { startIso: previousWeekIso.startIso, endIso: previousWeekEndIso.endIso }
      );
      if (bucket === 'current') currentWorkoutIds.push(row.id);
      if (bucket === 'previous') previousWorkoutIds.push(row.id);
    }

    const allWorkoutIds = [...new Set([...currentWorkoutIds, ...previousWorkoutIds])];
    const setRowsRes = allWorkoutIds.length
      ? await supabaseAdmin
          .from('workout_set_logs')
          .select('workout_log_id, weight, reps')
          .eq('client_id', clientId)
          .in('workout_log_id', allWorkoutIds)
      : { data: [] };
    const logBucketMap = new Map<string, 'current' | 'previous'>();
    for (const id of currentWorkoutIds) logBucketMap.set(id, 'current');
    for (const id of previousWorkoutIds) logBucketMap.set(id, 'previous');
    let currentVolume = 0;
    let previousVolume = 0;
    for (const row of (setRowsRes.data ?? []) as Array<{ workout_log_id: string; weight: number | null; reps: number | null }>) {
      const bucket = logBucketMap.get(row.workout_log_id);
      if (!bucket) continue;
      const volume = (Number(row.weight) || 0) * (Number(row.reps) || 0);
      if (bucket === 'current') currentVolume += volume;
      if (bucket === 'previous') previousVolume += volume;
    }

    const currentPrItems: WeeklyReviewBucket['prs']['items'] = [];
    const previousPrItems: WeeklyReviewBucket['prs']['items'] = [];
    for (const row of (prsTwoWeeksRes.data ?? []) as Array<{
      exercise_id: string | null;
      record_type: string;
      record_value: number;
      achieved_date: string;
      exercises?: { name?: string | null } | Array<{ name?: string | null }> | null;
    }>) {
      const bucket = bucketByYmdRange(
        row.achieved_date,
        { start: currentWeekStart, end: currentWeekEnd },
        { start: previousWeekStart, end: previousWeekEnd }
      );
      if (!bucket) continue;
      const exerciseName = Array.isArray(row.exercises)
        ? row.exercises[0]?.name ?? null
        : row.exercises?.name ?? null;
      const item = {
        exerciseId: row.exercise_id ?? null,
        exerciseName,
        weight: row.record_type === 'weight' ? Number(row.record_value) : null,
        reps: row.record_type === 'reps' ? Number(row.record_value) : null,
        achievedDate: row.achieved_date,
      };
      if (bucket === 'current') currentPrItems.push(item);
      if (bucket === 'previous') previousPrItems.push(item);
    }

    const currentWellness: Array<{ mood_rating: number | null; energy_level: number | null; sleep_quality: number | null; stress_level: number | null }> = [];
    const previousWellness: Array<{ mood_rating: number | null; energy_level: number | null; sleep_quality: number | null; stress_level: number | null }> = [];
    for (const row of (wellnessTwoWeeksRes.data ?? []) as Array<{
      log_date: string;
      mood_rating: number | null;
      energy_level: number | null;
      sleep_quality: number | null;
      stress_level: number | null;
    }>) {
      const bucket = bucketByYmdRange(
        row.log_date,
        { start: currentWeekStart, end: currentWeekEnd },
        { start: previousWeekStart, end: previousWeekEnd }
      );
      if (!bucket) continue;
      if (bucket === 'current') currentWellness.push(row);
      if (bucket === 'previous') previousWellness.push(row);
    }

    const currentBodyRows: Array<{ measured_date: string; weight_kg: number | null; body_fat_percentage: number | null }> = [];
    const previousBodyRows: Array<{ measured_date: string; weight_kg: number | null; body_fat_percentage: number | null }> = [];
    for (const row of (bodyMetricsTwoWeeksRes.data ?? []) as Array<{
      measured_date: string;
      weight_kg: number | null;
      body_fat_percentage: number | null;
    }>) {
      const bucket = bucketByYmdRange(
        row.measured_date,
        { start: currentWeekStart, end: currentWeekEnd },
        { start: previousWeekStart, end: previousWeekEnd }
      );
      if (!bucket) continue;
      if (bucket === 'current') currentBodyRows.push(row);
      if (bucket === 'previous') previousBodyRows.push(row);
    }

    const latestBodyFor = (rows: Array<{ measured_date: string; weight_kg: number | null; body_fat_percentage: number | null }>) =>
      rows.slice().sort((a, b) => b.measured_date.localeCompare(a.measured_date))[0] ?? null;
    const latestCurrentBody = latestBodyFor(currentBodyRows);
    const latestPreviousBody = latestBodyFor(previousBodyRows);

    const currentWeekReview: WeeklyReviewBucket = {
      weekStart: currentWeekStart,
      weekEnd: currentWeekEnd,
      workouts: {
        completed: currentWorkoutIds.length,
        planned: plannedCurrentWeek,
        workoutIds: currentWorkoutIds,
      },
      volume: { totalKg: Math.round(currentVolume * 100) / 100 },
      prs: { count: currentPrItems.length, items: currentPrItems },
      checkIns: {
        daily: {
          submitted: currentWellness.length,
          total: 7,
          avgMood: averageOrNull(currentWellness.map((r) => r.mood_rating)),
          avgEnergy: averageOrNull(currentWellness.map((r) => r.energy_level)),
          avgSleep: averageOrNull(currentWellness.map((r) => r.sleep_quality)),
          avgStress: averageOrNull(currentWellness.map((r) => r.stress_level)),
        },
        scheduled: {
          submitted: currentBodyRows.length > 0,
          submittedDate: latestCurrentBody?.measured_date ?? null,
        },
      },
      bodyMetrics: {
        weight: latestCurrentBody?.weight_kg ?? null,
        bodyFat: latestCurrentBody?.body_fat_percentage ?? null,
      },
    };

    const previousWeekReview: WeeklyReviewBucket = {
      weekStart: previousWeekStart,
      weekEnd: previousWeekEnd,
      workouts: {
        completed: previousWorkoutIds.length,
        planned: plannedPreviousWeek,
        workoutIds: previousWorkoutIds,
      },
      volume: { totalKg: Math.round(previousVolume * 100) / 100 },
      prs: { count: previousPrItems.length, items: previousPrItems },
      checkIns: {
        daily: {
          submitted: previousWellness.length,
          total: 7,
          avgMood: averageOrNull(previousWellness.map((r) => r.mood_rating)),
          avgEnergy: averageOrNull(previousWellness.map((r) => r.energy_level)),
          avgSleep: averageOrNull(previousWellness.map((r) => r.sleep_quality)),
          avgStress: averageOrNull(previousWellness.map((r) => r.stress_level)),
        },
        scheduled: {
          submitted: previousBodyRows.length > 0,
          submittedDate: latestPreviousBody?.measured_date ?? null,
        },
      },
      bodyMetrics: {
        weight: latestPreviousBody?.weight_kg ?? null,
        bodyFat: latestPreviousBody?.body_fat_percentage ?? null,
      },
    };

    let nutritionCard: {
      assignmentId: string;
      planId: string;
      planName: string;
      compliance7dPct: number | null;
      mealsLoggedToday: number;
      checkinsThisWeek: number;
    } | null = null;

    const ma = mealAssignRes.data as { id: string; meal_plan_id: string } | null;
    if (ma) {
      const { data: mp } = await supabaseAdmin
        .from('meal_plans')
        .select('name')
        .eq('id', ma.meal_plan_id)
        .maybeSingle();
      nutritionCard = {
        assignmentId: ma.id,
        planId: ma.meal_plan_id,
        planName: mp?.name ?? 'Meal plan',
        compliance7dPct: metrics.mealCompliance7dPct,
        mealsLoggedToday: mealsTodayRes.count ?? 0,
        checkinsThisWeek: checkinsWeekRes.count ?? 0,
      };
    }

    type ActivityRow = { at: string; label: string; kind: 'workout' | 'checkin' | 'meal' };
    const activityItems: ActivityRow[] = [];
    for (const w of recentWorkoutsRes.data ?? []) {
      const at = (w as { completed_at: string }).completed_at;
      activityItems.push({
        at,
        kind: 'workout',
        label: 'Completed a workout',
      });
    }
    for (const m of recentMealsRes.data ?? []) {
      const at = (m as { completed_at: string }).completed_at;
      activityItems.push({
        at,
        kind: 'meal',
        label: 'Logged a meal',
      });
    }
    for (const wl of recentWellnessRes.data ?? []) {
      const row = wl as {
        log_date: string;
        sleep_hours: number | null;
        sleep_quality: number | null;
        stress_level: number | null;
        soreness_level: number | null;
      };
      if (
        row.sleep_hours != null &&
        row.sleep_quality != null &&
        row.stress_level != null &&
        row.soreness_level != null
      ) {
        activityItems.push({
          at: `${row.log_date}T12:00:00.000Z`,
          kind: 'checkin',
          label: 'Daily check-in',
        });
      }
    }
    activityItems.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    const recentActivity = activityItems.slice(0, 5).map((a) => ({
      kind: a.kind,
      label: a.label,
      at: a.at,
    }));

    const name =
      `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Client';
    const joinedDate = profile.created_at
      ? new Date(profile.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

    const subExpiring = metrics.subscriptionExpiringSoon === true;
    const subEnd = metrics.subscriptionEndDate ?? null;

    return NextResponse.json({
      profile: {
        id: profile.id,
        email: profile.email ?? '',
        first_name: profile.first_name ?? undefined,
        last_name: profile.last_name ?? undefined,
        avatar_url: profile.avatar_url ?? undefined,
        created_at: profile.created_at,
      },
      name,
      email: profile.email ?? '',
      joinedDate,
      streak,
      weeklyProgress: { current: weeklyProgress.current, goal: weeklyProgress.goal },
      status,
      attention: {
        level: attention.level,
        reasons: attention.reasons,
      },
      trainedToday: trainedTodayZoned,
      phone: null,
      todayWorkout,
      nextScheduledWorkout,
      latestCheckIn,
      weekWorkoutDots,
      metricsSummary: {
        mealCompliance7dPct: metrics.mealCompliance7dPct,
        lastCheckinDate: metrics.lastCheckinDate,
        activeProgramName: metrics.activeProgramName,
        programCurrentWeek: metrics.programCurrentWeek,
        programDurationWeeks: metrics.programDurationWeeks,
      },
      program: programCard,
      nutrition: nutritionCard,
      recentActivity,
      subscription: {
        expiringSoon: subExpiring,
        endDate: subEnd,
      },
      weeklyReview: {
        clientId,
        clientTimezone: clientTz,
        hasActiveAssignment: Boolean(pa),
        currentWeek: currentWeekReview,
        previousWeek: previousWeekReview,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'User not authenticated') {
      return createUnauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message?.includes('Forbidden')) {
      return createForbiddenResponse(error.message);
    }
    return handleApiError(error, 'Failed to load client summary');
  }
}
