/**
 * GET /api/coach/clients/[clientId]/summary
 *
 * Returns profile, streak, weekly progress, and status for the coach client detail page
 * in one server round-trip. Coach must own the client (clients.coach_id = coach, client_id = clientId).
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth';
import { handleApiError } from '@/lib/apiErrorHandler';
import {
  calculateStreakWithClient,
  calculateWeeklyProgressWithClient,
} from '@/lib/clientDashboardService';
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
  zonedCalendarDateString,
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

    const [
      streak,
      weeklyProgress,
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
      calculateStreakWithClient(supabaseAdmin, clientId),
      calculateWeeklyProgressWithClient(supabaseAdmin, clientId),
      getClientMetrics([clientId], supabaseAdmin),
      supabaseAdmin
        .from('program_assignments')
        .select('id, program_id, name, duration_weeks, progression_mode, coach_unlocked_week')
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
      duration_weeks: number | null;
      progression_mode?: string | null;
      coach_unlocked_week?: number | null;
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
    ] = await Promise.all([
      trainedTodayZoned
        ? buildTodayWorkoutSummary(supabaseAdmin, clientId, todayStart, todayEnd)
        : Promise.resolve(null),
      !trainedTodayZoned && pa
        ? buildNextScheduledWorkout(supabaseAdmin, clientId, pa.id, pa.program_id)
        : Promise.resolve(null),
      buildLatestCheckIn(supabaseAdmin, clientId),
      buildWeekWorkoutDots(supabaseAdmin, clientId, clientTz),
    ]);

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
