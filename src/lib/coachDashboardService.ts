/**
 * Coach Dashboard Service
 * Handles coach dashboard data: stats, clients
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { dbToUiScale } from './wellnessService';

/** Compute program end date from start_date + duration_weeks (program_assignments has no end_date column). */
function computeProgramEndDate(start_date: string | null, duration_weeks: number | null): string | null {
  if (!start_date || duration_weeks == null || duration_weeks <= 0) return null;
  const d = new Date(start_date + 'T12:00:00Z');
  if (isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + duration_weeks * 7);
  return d.toISOString().split('T')[0];
}

export interface CoachStats {
  totalClients: number;
  activeClients: number;
  totalWorkouts: number;
  totalMealPlans: number;
}

/**
 * Get coach dashboard statistics
 */
export async function getCoachStats(coachId: string): Promise<CoachStats> {
  try {
    const [
      { data: clientsData, error: clientsError },
      { data: workoutsData, error: workoutsError },
      { data: mealPlansData, error: mealPlansError },
    ] = await Promise.all([
      supabase.from('clients').select('client_id, status').eq('coach_id', coachId),
      supabase.from('workout_templates').select('id').eq('coach_id', coachId).eq('is_active', true),
      supabase.from('meal_plans').select('id').eq('coach_id', coachId).eq('is_active', true),
    ]);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
    }
    if (workoutsError) {
      console.error('Error fetching workouts:', workoutsError);
    }
    if (mealPlansError) {
      console.error('Error fetching meal plans:', mealPlansError);
    }

    const totalClients = clientsData?.length || 0;
    const activeClients = clientsData?.filter((c) => c.status === 'active').length || 0;

    return {
      totalClients,
      activeClients,
      totalWorkouts: workoutsData?.length || 0,
      totalMealPlans: mealPlansData?.length || 0,
    };
  } catch (error) {
    console.error('Error getting coach stats:', error);
    return {
      totalClients: 0,
      activeClients: 0,
      totalWorkouts: 0,
      totalMealPlans: 0,
    };
  }
}

/**
 * Get recent clients for coach dashboard
 */
export interface RecentClient {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  status?: string;
  last_active?: string;
}

export async function getRecentClients(coachId: string, limit: number = 5): Promise<RecentClient[]> {
  try {
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('client_id, status')
      .eq('coach_id', coachId)
      .limit(limit);

    if (clientsError || !clientsData || clientsData.length === 0) {
      return [];
    }

    const clientIds = clientsData.map((c) => c.client_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .in('id', clientIds);

    if (profilesError) {
      console.error('Error fetching client profiles:', profilesError);
      return [];
    }

    return (profilesData || []).map((profile) => ({
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      avatar_url: profile.avatar_url,
      status: clientsData.find((c) => c.client_id === profile.id)?.status,
    }));
  } catch (error) {
    console.error('Error getting recent clients:', error);
    return [];
  }
}

/**
 * Client Alert interface for morning briefing
 */
export interface ClientAlert {
  clientId: string;
  clientName: string;
  detail: string;
  type: 'highStress' | 'highSoreness' | 'lowSleep' | 'noCheckIn3Days' | 'missedWorkouts' | 'programEnding' | 'noProgram' | 'noMealPlan' | 'overdueCheckIn' | 'achievementUnlocked';
  severity: 'high' | 'medium' | 'low';
}

/**
 * Client Summary interface for morning briefing
 */
export interface ClientSummary {
  clientId: string;
  firstName: string;
  lastName: string;
  status: string;
  avatarUrl: string | null;
  trainedToday: boolean;
  checkedInToday: boolean;
  checkinStreak: number;
  lastWorkoutDate: string | null;
  lastCheckinDate: string | null;
  programCompliance: number | null;
  latestSleep: number | null;
  latestStress: number | null;
  latestSoreness: number | null;
  athleteScore: number | null;
  hasActiveProgram: boolean;
  hasActiveMealPlan: boolean;
}

/**
 * Morning Briefing interface
 */
export interface MorningBriefing {
  totalClients: number;
  activeClients: number;
  clientsTrainedToday: number;
  clientsCheckedInToday: number;
  avgProgramCompliance: number;
  avgCheckinCompliance: number;
  alerts: {
    noCheckIn3Days: ClientAlert[];
    highStress: ClientAlert[];
    highSoreness: ClientAlert[];
    lowSleep: ClientAlert[];
    missedWorkouts: ClientAlert[];
    programEnding: ClientAlert[];
    noProgram: ClientAlert[];
    noMealPlan: ClientAlert[];
    overdueCheckIn: ClientAlert[];
    achievementUnlocked: ClientAlert[];
  };
  clientSummaries: ClientSummary[];
}

/**
 * Get morning briefing data for all coach's clients
 * Optimized with batch queries to avoid N+1 problems
 */
export async function getMorningBriefing(coachId: string, supabaseClient?: SupabaseClient): Promise<MorningBriefing> {
  const db = supabaseClient ?? supabase;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const todayStart = `${todayStr}T00:00:00.000Z`;
    const todayEnd = `${todayStr}T23:59:59.999Z`;
    
    // Calculate date ranges
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    const weekStart = new Date(today);
    const day = weekStart.getUTCDay();
    const monOffset = day === 0 ? -6 : 1 - day;
    weekStart.setUTCDate(weekStart.getUTCDate() + monOffset);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split('T')[0];

    // 1. Get all coach's clients with profiles
    const { data: clientsData, error: clientsError } = await db
      .from('clients')
      .select('client_id, status')
      .eq('coach_id', coachId);

    if (clientsError || !clientsData) {
      console.error('Error fetching clients:', clientsError);
      return getEmptyBriefing();
    }

    const totalClients = clientsData.length;
    const activeClients = clientsData.filter((c) => c.status === 'active');
    const activeClientIds = activeClients.map((c) => c.client_id);
    const allClientIds = clientsData.map((c) => c.client_id);

    if (allClientIds.length === 0) {
      return getEmptyBriefing();
    }

    // 2–13, 15–16: Run in parallel (only step 14 depends on step 13)
    const [
      { data: profilesData, error: profilesError },
      { data: todayWorkouts, error: workoutsError },
      { data: todayCheckins, error: checkinsError },
      { data: recentWellnessLogs, error: recentWellnessError },
      { data: weekWellnessLogs, error: weekWellnessError },
      { data: lastWorkouts, error: lastWorkoutsError },
      { data: lastCheckins, error: lastCheckinsError },
      { data: activePrograms, error: programsError },
      { data: activeMealPlans, error: mealPlansError },
      { data: athleteScores, error: scoresError },
      { data: recentAssignments, error: assignmentsError },
      { data: clientRecords, error: clientRecordsError },
      { data: allWellnessLogsEver, error: allWellnessEverError },
    ] = await Promise.all([
      db.from('profiles').select('id, first_name, last_name, avatar_url').in('id', allClientIds),
      db.from('workout_logs').select('client_id, completed_at').in('client_id', allClientIds).not('completed_at', 'is', null).gte('completed_at', todayStart).lte('completed_at', todayEnd),
      db.from('daily_wellness_logs').select('client_id, log_date').in('client_id', allClientIds).eq('log_date', todayStr),
      db.from('daily_wellness_logs').select('client_id, log_date, sleep_hours, stress_level, soreness_level').in('client_id', activeClientIds).gte('log_date', threeDaysAgoStr).lte('log_date', todayStr).order('log_date', { ascending: false }),
      db.from('daily_wellness_logs').select('client_id, log_date').in('client_id', activeClientIds).gte('log_date', weekStartStr).lte('log_date', todayStr),
      db.from('workout_logs').select('client_id, completed_at').in('client_id', allClientIds).not('completed_at', 'is', null).order('completed_at', { ascending: false }),
      db.from('daily_wellness_logs').select('client_id, log_date').in('client_id', allClientIds).order('log_date', { ascending: false }),
      db.from('program_assignments').select('client_id, id, program_id, start_date, duration_weeks').in('client_id', activeClientIds).eq('status', 'active').order('updated_at', { ascending: false }),
      db.from('meal_plan_assignments').select('client_id').in('client_id', activeClientIds).eq('is_active', true),
      db.from('athlete_scores').select('client_id, score').in('client_id', activeClientIds).order('calculated_at', { ascending: false }),
      db.from('workout_assignments').select('id, client_id, scheduled_date, status').in('client_id', activeClientIds).gte('scheduled_date', sevenDaysAgoStr).lte('scheduled_date', todayStr).in('status', ['assigned', 'in_progress']),
      db.from('clients').select('client_id, created_at').in('client_id', activeClientIds),
      db.from('daily_wellness_logs').select('client_id, log_date').in('client_id', activeClientIds).order('log_date', { ascending: false }),
    ]);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return getEmptyBriefing();
    }

    const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]));
    const trainedTodaySet = new Set((todayWorkouts || []).map((w) => w.client_id));
    const clientsTrainedToday = trainedTodaySet.size;
    const checkedInTodaySet = new Set((todayCheckins || []).map((c) => c.client_id));
    const clientsCheckedInToday = checkedInTodaySet.size;

    if (workoutsError) console.error('Error fetching today workouts:', workoutsError);
    if (checkinsError) console.error('Error fetching today checkins:', checkinsError);
    if (recentWellnessError) console.error('Error fetching recent wellness logs:', recentWellnessError);
    if (weekWellnessError) console.error('Error fetching week wellness logs:', weekWellnessError);
    if (lastWorkoutsError) console.error('Error fetching last workouts:', lastWorkoutsError);
    if (lastCheckinsError) console.error('Error fetching last checkins:', lastCheckinsError);
    if (programsError) console.error('Error fetching active programs:', programsError);
    if (mealPlansError) console.error('Error fetching active meal plans:', mealPlansError);
    if (scoresError) console.error('Error fetching athlete scores:', scoresError);
    if (assignmentsError) console.error('Error fetching recent assignments:', assignmentsError);
    if (clientRecordsError) console.error('Error fetching client creation dates:', clientRecordsError);
    if (allWellnessEverError) console.error('Error fetching all wellness logs:', allWellnessEverError);

    const lastWorkoutMap = new Map<string, string>();
    (lastWorkouts || []).forEach((w) => {
      if (!lastWorkoutMap.has(w.client_id)) {
        const dateStr = w.completed_at.split('T')[0];
        lastWorkoutMap.set(w.client_id, dateStr);
      }
    });
    const lastCheckinMap = new Map<string, string>();
    (lastCheckins || []).forEach((c) => {
      if (!lastCheckinMap.has(c.client_id)) {
        lastCheckinMap.set(c.client_id, c.log_date);
      }
    });
    const activeProgramMap = new Map<string, { id: string; end_date: string | null; program_id: string }>();
    (activePrograms || []).forEach((p: any) => {
      if (!activeProgramMap.has(p.client_id)) {
        const end_date = computeProgramEndDate(p.start_date, p.duration_weeks);
        activeProgramMap.set(p.client_id, { id: p.id, end_date, program_id: p.program_id });
      }
    });

    // Batch fetch program compliance data (current week, schedule, completions) for per-client %
    const assignmentIdsForCompliance = Array.from(activeProgramMap.values()).map((p) => p.id);
    const programIdsForCompliance = [...new Set(Array.from(activeProgramMap.values()).map((p) => p.program_id))];
    let progressMap = new Map<string, number>();
    let scheduleByProgram = new Map<string, Array<{ id: string; program_id: string; week_number: number; day_number: number }>>();
    let completionRowsCompliance: Array<{ program_assignment_id: string; program_schedule_id: string }> = [];
    if (assignmentIdsForCompliance.length > 0) {
      const [
        { data: progressRows },
        { data: scheduleRows },
        { data: completionRowsComp },
      ] = await Promise.all([
        db.from('program_progress').select('program_assignment_id, current_week_number').in('program_assignment_id', assignmentIdsForCompliance),
        db.from('program_schedule').select('id, program_id, week_number, day_number').in('program_id', programIdsForCompliance).order('week_number', { ascending: true }).order('day_number', { ascending: true }),
        db.from('program_day_completions').select('program_assignment_id, program_schedule_id').in('program_assignment_id', assignmentIdsForCompliance),
      ]);
      for (const r of progressRows ?? []) {
        if (r.current_week_number != null) progressMap.set(r.program_assignment_id, r.current_week_number);
      }
      for (const s of scheduleRows ?? []) {
        const list = scheduleByProgram.get(s.program_id) ?? [];
        list.push({ id: s.id, program_id: s.program_id, week_number: s.week_number, day_number: s.day_number ?? 1 });
        scheduleByProgram.set(s.program_id, list);
      }
      completionRowsCompliance = (completionRowsComp ?? []) as typeof completionRowsCompliance;
    }
    const activeMealPlanSet = new Set((activeMealPlans || []).map((m) => m.client_id));
    const athleteScoreMap = new Map<string, number>();
    (athleteScores || []).forEach((s) => {
      if (!athleteScoreMap.has(s.client_id)) {
        athleteScoreMap.set(s.client_id, s.score);
      }
    });
    const clientCreatedAtMap = new Map<string, string>();
    (clientRecords || []).forEach((c: any) => {
      clientCreatedAtMap.set(c.client_id, c.created_at);
    });
    const hasEverCheckedInSet = new Set((allWellnessLogsEver || []).map((l: any) => l.client_id));

    // 14. Batch fetch completed workout logs for those assignments (depends on step 13)
    const assignmentIds = (recentAssignments || []).map((a: any) => a.id);
    let completedLogs: any[] = [];
    if (assignmentIds.length > 0) {
      const { data, error: logsError } = await db
        .from('workout_logs')
        .select('workout_assignment_id, completed_at')
        .in('workout_assignment_id', assignmentIds)
        .not('completed_at', 'is', null);
      if (logsError) {
        console.error('Error fetching completed workout logs:', logsError);
      } else {
        completedLogs = data || [];
      }
    }
    const completedAssignmentIds = new Set(completedLogs.map((l: any) => l.workout_assignment_id));

    // Group wellness logs by client for alert calculations
    const wellnessByClient = new Map<string, Array<{ log_date: string; sleep_hours: number | null; stress_level: number | null; soreness_level: number | null }>>();
    (recentWellnessLogs || []).forEach((log: any) => {
      if (!wellnessByClient.has(log.client_id)) {
        wellnessByClient.set(log.client_id, []);
      }
      wellnessByClient.get(log.client_id)!.push({
        log_date: log.log_date,
        sleep_hours: log.sleep_hours,
        stress_level: log.stress_level,
        soreness_level: log.soreness_level,
      });
    });

    // Group week check-ins by client
    const checkinsByClient = new Map<string, Set<string>>();
    (weekWellnessLogs || []).forEach((log: any) => {
      if (!checkinsByClient.has(log.client_id)) {
        checkinsByClient.set(log.client_id, new Set());
      }
      checkinsByClient.get(log.client_id)!.add(log.log_date);
    });

    // Batch fetch check-in configs and last body_metrics for overdueCheckIn alerts
    let checkInConfigByClient = new Map<string, number>();
    let lastBodyMetricDateByClient = new Map<string, string>();
    if (activeClientIds.length > 0) {
      const [configsRes, bodyMetricsRes] = await Promise.all([
        db.from('check_in_configs').select('client_id, frequency_days').eq('coach_id', coachId),
        db.from('body_metrics').select('client_id, measured_date').in('client_id', activeClientIds).order('measured_date', { ascending: false }),
      ]);
      const configs = (configsRes.data ?? []) as Array<{ client_id: string | null; frequency_days: number }>;
      const clientSpecific = configs.filter((c) => c.client_id != null);
      const defaultConfig = configs.find((c) => c.client_id == null);
      const defaultFreq = defaultConfig?.frequency_days ?? 30;
      for (const id of activeClientIds) {
        const row = clientSpecific.find((c) => c.client_id === id);
        checkInConfigByClient.set(id, row?.frequency_days ?? defaultFreq);
      }
      const bodyMetrics = (bodyMetricsRes.data ?? []) as Array<{ client_id: string; measured_date: string }>;
      for (const row of bodyMetrics) {
        if (!lastBodyMetricDateByClient.has(row.client_id)) {
          const d = typeof row.measured_date === 'string' ? row.measured_date.split('T')[0] : row.measured_date;
          lastBodyMetricDateByClient.set(row.client_id, d);
        }
      }
    }

    // Recent achievement unlocks (last 24h) for coach's clients
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const recentAchievementsRes = await db
      .from('user_achievements')
      .select('id, client_id, tier, earned_at, achievement_templates(name)')
      .in('client_id', allClientIds)
      .gte('earned_at', twentyFourHoursAgo.toISOString())
      .order('earned_at', { ascending: false });
    type RecentAchievementRow = {
      client_id: string;
      tier: string | null;
      achievement_templates: { name: string } | null;
    };
    const recentAchievements = (recentAchievementsRes.data ?? []) as unknown as Array<RecentAchievementRow>;

    // Calculate alerts and summaries
    const alerts: MorningBriefing['alerts'] = {
      noCheckIn3Days: [],
      highStress: [],
      highSoreness: [],
      lowSleep: [],
      missedWorkouts: [],
      programEnding: [],
      noProgram: [],
      noMealPlan: [],
      overdueCheckIn: [],
      achievementUnlocked: recentAchievements.map((r) => {
        const profile = profilesMap.get(r.client_id);
        const clientName = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Client' : 'Client';
        const name = r.achievement_templates?.name ?? 'Achievement';
        const tierLabel = r.tier ? ` — ${r.tier.charAt(0).toUpperCase() + r.tier.slice(1)}` : '';
        return {
          clientId: r.client_id,
          clientName,
          detail: `Earned ${name}${tierLabel}`,
          type: 'achievementUnlocked' as const,
          severity: 'low' as const,
        };
      }),
    };

    const clientSummaries: ClientSummary[] = [];
    let totalCheckinCompliance = 0;
    let clientsWithCheckins = 0;

    // Calculate grace period threshold (7 days ago)
    const gracePeriodDate = new Date(today);
    gracePeriodDate.setDate(gracePeriodDate.getDate() - 7);
    const gracePeriodStr = gracePeriodDate.toISOString().split('T')[0];

    for (const client of activeClients) {
      const clientId = client.client_id;
      const profile = profilesMap.get(clientId);
      if (!profile) continue;

      const firstName = profile.first_name || '';
      const lastName = profile.last_name || '';
      const clientName = `${firstName} ${lastName}`.trim() || 'Client';

      // Check if client is new (within grace period)
      const clientCreatedAt = clientCreatedAtMap.get(clientId);
      const isNewClient = clientCreatedAt && clientCreatedAt >= gracePeriodStr;

      // Calculate check-in streak
      let checkinStreak = 0;
      const clientCheckins = checkinsByClient.get(clientId) || new Set();
      if (clientCheckins.has(todayStr)) {
        checkinStreak = 1;
        let checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - 1);
        for (let i = 0; i < 365; i++) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (clientCheckins.has(dateStr)) {
            checkinStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      // Get latest wellness values
      const clientWellness = wellnessByClient.get(clientId) || [];
      const latestWellness = clientWellness[0] || null;
      const latestSleep = latestWellness?.sleep_hours ?? null;
      const latestStressDb = latestWellness?.stress_level ?? null;
      const latestSorenessDb = latestWellness?.soreness_level ?? null;
      const latestStress = latestStressDb != null ? dbToUiScale(latestStressDb) : null;
      const latestSoreness = latestSorenessDb != null ? dbToUiScale(latestSorenessDb) : null;

      // Get last 3 wellness log entries (for stress/soreness/sleep alerts)
      const last3Logs = clientWellness.slice(0, 3).filter((l) => l.log_date >= threeDaysAgoStr);
      
      // Calculate averages from last 3 entries only
      const stressValues = last3Logs
        .map((l) => l.stress_level != null ? dbToUiScale(l.stress_level) : null)
        .filter((v): v is number => v != null);
      const avgStress = stressValues.length > 0
        ? stressValues.reduce((sum, v) => sum + v, 0) / stressValues.length
        : null;

      const sorenessValues = last3Logs
        .map((l) => l.soreness_level != null ? dbToUiScale(l.soreness_level) : null)
        .filter((v): v is number => v != null);
      const avgSoreness = sorenessValues.length > 0
        ? sorenessValues.reduce((sum, v) => sum + v, 0) / sorenessValues.length
        : null;

      const sleepValues = last3Logs
        .map((l) => l.sleep_hours)
        .filter((v): v is number => v != null);
      const avgSleep = sleepValues.length > 0
        ? sleepValues.reduce((sum, v) => sum + v, 0) / sleepValues.length
        : null;

      // ALERT: No check-in 3+ days
      // Only alert if: client has checked in at least once ever AND not a new client
      const hasEverCheckedIn = hasEverCheckedInSet.has(clientId);
      const lastCheckinDate = lastCheckinMap.get(clientId);
      if (hasEverCheckedIn && !isNewClient) {
        if (!lastCheckinDate || lastCheckinDate < threeDaysAgoStr) {
          const daysSince = lastCheckinDate
            ? Math.floor((today.getTime() - new Date(lastCheckinDate + 'T12:00:00Z').getTime()) / (1000 * 60 * 60 * 24))
            : 999;
          if (daysSince >= 3) {
            alerts.noCheckIn3Days.push({
              clientId,
              clientName,
              detail: `No check-in for ${daysSince} day${daysSince !== 1 ? 's' : ''}`,
              type: 'noCheckIn3Days',
              severity: 'medium',
            });
          }
        }
      }

      // ALERT: High stress (avg >= 4 in last 3 entries)
      if (avgStress != null && avgStress >= 4 && last3Logs.length >= 1) {
        alerts.highStress.push({
          clientId,
          clientName,
          detail: `Avg stress ${avgStress.toFixed(1)}/5 over last ${last3Logs.length} check-in${last3Logs.length !== 1 ? 's' : ''}`,
          type: 'highStress',
          severity: 'high',
        });
      }

      // ALERT: High soreness (avg >= 4 in last 3 entries)
      if (avgSoreness != null && avgSoreness >= 4 && last3Logs.length >= 1) {
        alerts.highSoreness.push({
          clientId,
          clientName,
          detail: `Avg soreness ${avgSoreness.toFixed(1)}/5 over last ${last3Logs.length} check-in${last3Logs.length !== 1 ? 's' : ''}`,
          type: 'highSoreness',
          severity: 'high',
        });
      }

      // ALERT: Low sleep (avg < 6h in last 3 entries)
      if (avgSleep != null && avgSleep < 6 && last3Logs.length >= 1) {
        alerts.lowSleep.push({
          clientId,
          clientName,
          detail: `Avg sleep ${avgSleep.toFixed(1)}h over last ${last3Logs.length} night${last3Logs.length !== 1 ? 's' : ''}`,
          type: 'lowSleep',
          severity: 'high',
        });
      }

      // ALERT: Missed workouts (assignments without completed logs)
      // Only check if not a new client
      if (!isNewClient) {
        const clientAssignments = (recentAssignments || []).filter((a: any) => a.client_id === clientId);
        const missedAssignments = clientAssignments.filter((a: any) => {
          // Assignment must be scheduled in the past (not today or future)
          const assignmentDate = a.scheduled_date.split('T')[0];
          if (assignmentDate >= todayStr) return false; // Future assignment, not missed yet
          
          // Check if this assignment has a completed workout_log
          return !completedAssignmentIds.has(a.id);
        });
        if (missedAssignments.length > 0) {
          alerts.missedWorkouts.push({
            clientId,
            clientName,
            detail: `Missed ${missedAssignments.length} scheduled workout${missedAssignments.length !== 1 ? 's' : ''} this week`,
            type: 'missedWorkouts',
            severity: 'medium',
          });
        }
      }

      // ALERT: Program ending (within 7 days)
      const program = activeProgramMap.get(clientId);
      if (program?.end_date) {
        const endDate = new Date(program.end_date + 'T12:00:00Z');
        const daysUntil = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= 7) {
          alerts.programEnding.push({
            clientId,
            clientName,
            detail: `Program ends in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
            type: 'programEnding',
            severity: 'low',
          });
        }
      }

      // ALERT: No active program
      if (!program) {
        alerts.noProgram.push({
          clientId,
          clientName,
          detail: 'No active program assigned',
          type: 'noProgram',
          severity: 'low',
        });
      }

      // ALERT: No meal plan
      if (!activeMealPlanSet.has(clientId)) {
        alerts.noMealPlan.push({
          clientId,
          clientName,
          detail: 'No meal plan assigned',
          type: 'noMealPlan',
          severity: 'low',
        });
      }

      // ALERT: Overdue scheduled check-in (has body_metrics before; now past frequency_days)
      const lastMeasuredDate = lastBodyMetricDateByClient.get(clientId);
      if (lastMeasuredDate) {
        const frequencyDays = checkInConfigByClient.get(clientId) ?? 30;
        const lastDate = new Date(lastMeasuredDate + 'T12:00:00Z');
        const daysSinceLast = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLast > frequencyDays) {
          const overdueDays = daysSinceLast - frequencyDays;
          alerts.overdueCheckIn.push({
            clientId,
            clientName,
            detail: `Scheduled check-in overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`,
            type: 'overdueCheckIn',
            severity: 'medium',
          });
        }
      }

      // Calculate check-in compliance (days checked in / 7)
      const checkinDays = checkinsByClient.get(clientId)?.size || 0;
      const checkinCompliance = (checkinDays / 7) * 100;
      if (checkinDays > 0) {
        totalCheckinCompliance += checkinCompliance;
        clientsWithCheckins++;
      }

      // Per-client program compliance: completed this week / total scheduled this week (reuse program from above)
      let programCompliance: number | null = null;
      if (program) {
        const assignmentId = program.id;
        const programId = program.program_id;
        const currentWeek = progressMap.get(assignmentId) ?? 1;
        const slots = scheduleByProgram.get(programId) ?? [];
        const scheduleIdsThisWeek = slots.filter((s) => s.week_number === currentWeek).map((s) => s.id);
        const total = scheduleIdsThisWeek.length;
        const completedThisWeek = completionRowsCompliance.filter(
          (c) => c.program_assignment_id === assignmentId && scheduleIdsThisWeek.includes(c.program_schedule_id)
        ).length;
        programCompliance = total > 0 ? Math.round((completedThisWeek / total) * 100) : 0;
      }

      clientSummaries.push({
        clientId,
        firstName,
        lastName,
        status: client.status,
        avatarUrl: profile.avatar_url,
        trainedToday: trainedTodaySet.has(clientId),
        checkedInToday: checkedInTodaySet.has(clientId),
        checkinStreak,
        lastWorkoutDate: lastWorkoutMap.get(clientId) || null,
        lastCheckinDate: lastCheckinMap.get(clientId) || null,
        programCompliance,
        latestSleep,
        latestStress,
        latestSoreness,
        athleteScore: athleteScoreMap.get(clientId) || null,
        hasActiveProgram: !!program,
        hasActiveMealPlan: activeMealPlanSet.has(clientId),
      });
    }

    // Calculate average check-in compliance
    const avgCheckinCompliance = clientsWithCheckins > 0
      ? Math.round(totalCheckinCompliance / clientsWithCheckins)
      : 0;

    // Get program compliance from control room (we'll fetch it separately or pass it in)
    // For now, we'll set it to null and let the page fetch it from control room API
    const avgProgramCompliance = 0; // Will be fetched from control room API

    return {
      totalClients,
      activeClients: activeClients.length,
      clientsTrainedToday,
      clientsCheckedInToday,
      avgProgramCompliance,
      avgCheckinCompliance,
      alerts,
      clientSummaries: clientSummaries.sort((a, b) => {
        // Sort by: trained today first, then checked in today, then by name
        if (a.trainedToday !== b.trainedToday) return a.trainedToday ? -1 : 1;
        if (a.checkedInToday !== b.checkedInToday) return a.checkedInToday ? -1 : 1;
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      }),
    };
  } catch (error) {
    console.error('Error getting morning briefing:', error);
    return getEmptyBriefing();
  }
}

function getEmptyBriefing(): MorningBriefing {
  return {
    totalClients: 0,
    activeClients: 0,
    clientsTrainedToday: 0,
    clientsCheckedInToday: 0,
    avgProgramCompliance: 0,
    avgCheckinCompliance: 0,
    alerts: {
      noCheckIn3Days: [],
      highStress: [],
      highSoreness: [],
      lowSleep: [],
      missedWorkouts: [],
      programEnding: [],
      noProgram: [],
      noMealPlan: [],
      overdueCheckIn: [],
      achievementUnlocked: [],
    },
    clientSummaries: [],
  };
}

/**
 * Sort alerts by severity (high → medium → low), then by recency
 * This function is used by the dashboard to display alerts in priority order
 */
export function sortAlertsByPriority(alerts: ClientAlert[]): ClientAlert[] {
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return alerts.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    // Within same severity, sort by type (health alerts first)
    const typeOrder: Record<string, number> = {
      highStress: 0,
      highSoreness: 1,
      lowSleep: 2,
      noCheckIn3Days: 3,
      missedWorkouts: 4,
      overdueCheckIn: 5,
      programEnding: 6,
      noProgram: 7,
      noMealPlan: 8,
      achievementUnlocked: 9,
    };
    return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
  });
}

/**
 * Client Metrics interface for client list page
 */
export interface ClientMetrics {
  clientId: string;
  lastActive: string | null; // ISO date string (most recent of workout or check-in)
  workoutsThisWeek: number;
  checkinStreak: number;
  programStatus: 'active' | 'noProgram' | 'endingSoon';
  programEndDate: string | null;
  latestStress: number | null; // UI scale 1-5
  latestSoreness: number | null; // UI scale 1-5
  trainedToday: boolean;
  checkedInToday: boolean;
}

/**
 * Get metrics for multiple clients (batch query)
 * Optimized to avoid N+1 queries
 */
export async function getClientMetrics(clientIds: string[], supabaseClient?: SupabaseClient): Promise<Map<string, ClientMetrics>> {
  if (clientIds.length === 0) {
    return new Map();
  }

  const db = supabaseClient ?? supabase;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const todayStart = `${todayStr}T00:00:00.000Z`;
    const todayEnd = `${todayStr}T23:59:59.999Z`;
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    const sevenDaysAgoStart = `${sevenDaysAgoStr}T00:00:00.000Z`;
    
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split('T')[0];

    // Batch fetch workout logs (last 7 days + today)
    const { data: workoutLogs, error: workoutsError } = await db
      .from('workout_logs')
      .select('client_id, completed_at')
      .in('client_id', clientIds)
      .not('completed_at', 'is', null)
      .gte('completed_at', sevenDaysAgoStart)
      .order('completed_at', { ascending: false });

    if (workoutsError) {
      console.error('Error fetching workout logs:', workoutsError);
    }

    // Batch fetch wellness logs (last 7 days + today)
    const { data: wellnessLogs, error: wellnessError } = await db
      .from('daily_wellness_logs')
      .select('client_id, log_date, stress_level, soreness_level, sleep_hours, sleep_quality')
      .in('client_id', clientIds)
      .gte('log_date', sevenDaysAgoStr)
      .lte('log_date', todayStr)
      .order('log_date', { ascending: false });

    if (wellnessError) {
      console.error('Error fetching wellness logs:', wellnessError);
    }

    // Batch fetch active programs (end_date does not exist; compute from start_date + duration_weeks)
    const { data: activePrograms, error: programsError } = await db
      .from('program_assignments')
      .select('client_id, start_date, duration_weeks, status')
      .in('client_id', clientIds)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (programsError) {
      console.error('Error fetching active programs:', programsError);
    }

    // Batch fetch all wellness logs for streak calculation (last 365 days)
    const { data: allWellnessLogs, error: allWellnessError } = await db
      .from('daily_wellness_logs')
      .select('client_id, log_date, sleep_hours, sleep_quality, stress_level, soreness_level')
      .in('client_id', clientIds)
      .lte('log_date', todayStr)
      .order('log_date', { ascending: false })
      .limit(10000); // Reasonable limit for streak calculation

    if (allWellnessError) {
      console.error('Error fetching all wellness logs:', allWellnessError);
    }

    // Aggregate data per client
    const metricsMap = new Map<string, ClientMetrics>();

    // Group data by client
    const workoutsByClient = new Map<string, Array<{ completed_at: string }>>();
    (workoutLogs || []).forEach((w: any) => {
      if (!workoutsByClient.has(w.client_id)) {
        workoutsByClient.set(w.client_id, []);
      }
      workoutsByClient.get(w.client_id)!.push({ completed_at: w.completed_at });
    });

    const wellnessByClient = new Map<string, Array<{ log_date: string; stress_level: number | null; soreness_level: number | null; sleep_hours: number | null; sleep_quality: number | null }>>();
    (wellnessLogs || []).forEach((w: any) => {
      if (!wellnessByClient.has(w.client_id)) {
        wellnessByClient.set(w.client_id, []);
      }
      wellnessByClient.get(w.client_id)!.push({
        log_date: w.log_date,
        stress_level: w.stress_level,
        soreness_level: w.soreness_level,
        sleep_hours: w.sleep_hours,
        sleep_quality: w.sleep_quality,
      });
    });

    const allWellnessByClient = new Map<string, Set<string>>();
    (allWellnessLogs || []).forEach((w: any) => {
      // Only count complete check-ins (all required fields)
      if (
        w.sleep_hours != null &&
        w.sleep_quality != null &&
        w.stress_level != null &&
        w.soreness_level != null
      ) {
        if (!allWellnessByClient.has(w.client_id)) {
          allWellnessByClient.set(w.client_id, new Set());
        }
        allWellnessByClient.get(w.client_id)!.add(w.log_date);
      }
    });

    const programsByClient = new Map<string, { end_date: string | null }>();
    (activePrograms || []).forEach((p: any) => {
      if (!programsByClient.has(p.client_id)) {
        const end_date = computeProgramEndDate(p.start_date, p.duration_weeks);
        programsByClient.set(p.client_id, { end_date });
      }
    });

    // Calculate metrics for each client
    for (const clientId of clientIds) {
      const clientWorkouts = workoutsByClient.get(clientId) || [];
      const clientWellness = wellnessByClient.get(clientId) || [];
      const clientAllWellness = allWellnessByClient.get(clientId) || new Set();
      const program = programsByClient.get(clientId);

      // Workouts this week
      const workoutsThisWeek = clientWorkouts.filter((w) => {
        const dateStr = w.completed_at.split('T')[0];
        return dateStr >= sevenDaysAgoStr;
      }).length;

      // Trained today
      const trainedToday = clientWorkouts.some((w) => {
        const dateStr = w.completed_at.split('T')[0];
        return dateStr === todayStr;
      });

      // Checked in today
      const checkedInToday = clientWellness.some((w) => w.log_date === todayStr);

      // Last active (most recent of workout or check-in)
      let lastActive: string | null = null;
      const lastWorkout = clientWorkouts[0];
      const lastCheckin = clientWellness[0];
      if (lastWorkout && lastCheckin) {
        const workoutDate = lastWorkout.completed_at.split('T')[0];
        const checkinDate = lastCheckin.log_date;
        lastActive = workoutDate >= checkinDate ? workoutDate : checkinDate;
      } else if (lastWorkout) {
        lastActive = lastWorkout.completed_at.split('T')[0];
      } else if (lastCheckin) {
        lastActive = lastCheckin.log_date;
      }

      // Check-in streak
      let checkinStreak = 0;
      if (clientAllWellness.has(todayStr)) {
        checkinStreak = 1;
        let checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - 1);
        for (let i = 0; i < 365; i++) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (clientAllWellness.has(dateStr)) {
            checkinStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      // Program status
      let programStatus: 'active' | 'noProgram' | 'endingSoon' = 'noProgram';
      let programEndDate: string | null = null;
      if (program) {
        programEndDate = program.end_date;
        if (program.end_date) {
          const endDate = new Date(program.end_date + 'T12:00:00Z');
          const daysUntil = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntil >= 0 && daysUntil <= 7) {
            programStatus = 'endingSoon';
          } else {
            programStatus = 'active';
          }
        } else {
          programStatus = 'active';
        }
      }

      // Latest wellness (stress/soreness from most recent check-in)
      const latestWellness = clientWellness[0];
      const latestStress = latestWellness?.stress_level != null ? dbToUiScale(latestWellness.stress_level) : null;
      const latestSoreness = latestWellness?.soreness_level != null ? dbToUiScale(latestWellness.soreness_level) : null;

      metricsMap.set(clientId, {
        clientId,
        lastActive,
        workoutsThisWeek,
        checkinStreak,
        programStatus,
        programEndDate,
        latestStress,
        latestSoreness,
        trainedToday,
        checkedInToday,
      });
    }

    return metricsMap;
  } catch (error) {
    console.error('Error getting client metrics:', error);
    return new Map();
  }
}

