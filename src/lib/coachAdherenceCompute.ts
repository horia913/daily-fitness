import {
  addCalendarDaysYmd,
  mondayYmdOfZonedWeekContaining,
  normalizeClientTimezone,
  weekdayMon0Sun6InTimezone,
  zonedCalendarDateString,
} from "@/lib/clientZonedCalendar";

export type NutritionDayCell = {
  day_of_week: number;
  has_slot: boolean;
  done: boolean;
  completed: number;
  expected: number;
};

export interface CoachAdherenceClientRow {
  clientId: string;
  clientName: string;
  avatar: string;
  overallAdherence: number;
  workoutAdherence: number;
  nutritionAdherence: number;
  habitAdherence: number;
  sessionAttendance: number;
  nutritionTracked: boolean;
  nutritionHasWeeklyPlan: boolean;
  habitTracked: boolean;
  habitHasWeeklyPlan: boolean;
  calendarTodayYmd: string;
  trend: "up" | "down" | "stable";
  lastActive: string;
  alerts: number;
  streak: number;
  weeklyData: {
    date: string;
    workout: boolean;
    nutritionDay: NutritionDayCell | null;
    habitDay: NutritionDayCell | null;
    session: boolean;
  }[];
  historicalAdherence: {
    week_start: string;
    workout: number;
    checkins: number;
    nutrition: number | null;
    habits: number | null;
  }[];
  status: "on_track" | "at_risk" | "needs_attention";
}

/** @deprecated use CoachAdherenceClientRow */
export type AdherenceData = CoachAdherenceClientRow;

export function computeCoachAdherenceFromPayload(
  clients: { client_id: string }[],
  profiles: { id: string; first_name?: string; last_name?: string; avatar_url?: string; timezone?: string | null }[],
  assignments: { id: string; client_id: string; scheduled_date?: string; status?: string }[],
  logs: { client_id: string; workout_assignment_id?: string; completed_at?: string }[],
  wellness: { client_id: string; log_date: string }[],
  nutritionTrackedIds: string[],
  habitTrackedIds: string[],
  historicalAdherence: Record<
    string,
    {
      week_start: string;
      workout: number;
      checkins: number;
      nutrition: number | null;
      habits: number | null;
    }[]
  >,
  weekAdherence: {
    client_id: string;
    workout_adherence: number;
    assigned_required: number;
    completed_required: number;
    day_strip: { day_of_week: number; has_slot: boolean; done: boolean }[];
    nutrition_adherence?: number;
    nutrition_assigned_required?: number;
    nutrition_completed_required?: number;
    nutrition_day_strip?: NutritionDayCell[];
    habit_adherence?: number;
    habit_assigned_required?: number;
    habit_completed_required?: number;
    habit_day_strip?: NutritionDayCell[];
  }[],
  todayStr: string,
  _sevenDaysAgoStr: string
): CoachAdherenceClientRow[] {
  const clientIds = clients.map((c) => c.client_id);
  const profilesMap = new Map(profiles.map((p) => [p.id, p]));
  const nutritionTrackedSet = new Set(nutritionTrackedIds);
  const habitTrackedSet = new Set(habitTrackedIds);
  const now = new Date();

  const adherenceResults: CoachAdherenceClientRow[] = clientIds.map((clientId) => {
    const weekRow = weekAdherence.find((w) => w.client_id === clientId);
    const nutritionTracked = nutritionTrackedSet.has(clientId);
    const habitTracked = habitTrackedSet.has(clientId);
    const profile = profilesMap.get(clientId);
    const firstName = profile?.first_name || "";
    const lastName = profile?.last_name || "";
    const clientName = `${firstName} ${lastName}`.trim() || "Client";
    const avatar = profile?.avatar_url || `${(firstName || "")[0]}${(lastName || "")[0]}`.toUpperCase() || "C";

    const clientAssignments = assignments.filter((a) => a.client_id === clientId);
    const workoutsScheduled = weekRow?.assigned_required ?? clientAssignments.length;
    const completedWorkoutIds = new Set(
      logs.filter((l) => l.client_id === clientId && l.workout_assignment_id).map((l) => l.workout_assignment_id!)
    );
    const workoutsCompleted =
      weekRow?.completed_required ??
      clientAssignments.filter((a) => completedWorkoutIds.has(a.id)).length;
    const workoutAdherence =
      weekRow?.workout_adherence ??
      (workoutsScheduled > 0 ? Math.round((workoutsCompleted / workoutsScheduled) * 100) : 0);

    const checkinDates = new Set(wellness.filter((w) => w.client_id === clientId).map((w) => w.log_date));
    const checkinsCompleted = checkinDates.size;
    const checkinAdherence = Math.round((checkinsCompleted / 7) * 100);

    const nutritionHasWeeklyPlan = (weekRow?.nutrition_assigned_required ?? 0) > 0;
    const nutritionAdherencePct = nutritionHasWeeklyPlan
      ? Math.round(Number(weekRow?.nutrition_adherence ?? 0))
      : 0;

    const habitHasWeeklyPlan = (weekRow?.habit_assigned_required ?? 0) > 0;
    const habitAdherencePct =
      habitTracked && habitHasWeeklyPlan ? Math.round(Number(weekRow?.habit_adherence ?? 0)) : 0;

    const overallAdherence = Math.round((workoutAdherence + checkinAdherence) / 2);
    const status: "on_track" | "at_risk" | "needs_attention" =
      overallAdherence >= 75 ? "on_track" : overallAdherence >= 50 ? "at_risk" : "needs_attention";

    const lastWorkout = logs
      .filter((l) => l.client_id === clientId && l.completed_at)
      .map((l) =>
        typeof l.completed_at === "string" && l.completed_at.startsWith("2")
          ? l.completed_at.split("T")[0]
          : new Date(l.completed_at!).toISOString().split("T")[0]
      )
      .sort()
      .pop();
    const lastCheckin = Array.from(checkinDates).sort().pop();
    const lastActive =
      lastWorkout && lastCheckin
        ? lastWorkout > lastCheckin
          ? lastWorkout
          : lastCheckin
        : lastWorkout || lastCheckin || todayStr;

    const allActivityDates = new Set([
      ...logs
        .filter((l) => l.client_id === clientId && l.completed_at)
        .map((l) =>
          typeof l.completed_at === "string" && l.completed_at.startsWith("2")
            ? l.completed_at.split("T")[0]
            : new Date(l.completed_at!).toISOString().split("T")[0]
        ),
      ...checkinDates,
    ]);
    const sortedDates = Array.from(allActivityDates).sort().reverse();
    let streak = 0;
    const currentDate = new Date(now);
    currentDate.setHours(0, 0, 0, 0);
    for (let i = 0; i < sortedDates.length; i++) {
      const checkDate = new Date(sortedDates[i] + "T12:00:00");
      const diffDays = Math.floor((currentDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === i) streak++;
      else break;
    }

    const clientTz = normalizeClientTimezone(profile?.timezone);
    const mondayYmd = mondayYmdOfZonedWeekContaining(now, clientTz);
    const todayClientYmd = zonedCalendarDateString(now, clientTz);

    const weeklyData: {
      date: string;
      workout: boolean;
      nutritionDay: NutritionDayCell | null;
      habitDay: NutritionDayCell | null;
      session: boolean;
    }[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const dateStr = addCalendarDaysYmd(mondayYmd, dow);
      const stripCell = weekRow?.day_strip?.find(
        (d) => d.day_of_week === weekdayMon0Sun6InTimezone(new Date(`${dateStr}T12:00:00`), clientTz)
      );
      const hasWorkout = stripCell?.has_slot
        ? Boolean(stripCell.done)
        : logs.some(
            (l) =>
              l.client_id === clientId &&
              l.completed_at &&
              (typeof l.completed_at === "string"
                ? l.completed_at.startsWith(dateStr)
                : new Date(l.completed_at).toISOString().split("T")[0] === dateStr)
          );
      const hasCheckin = checkinDates.has(dateStr);
      const nutStrip = weekRow?.nutrition_day_strip ?? [];
      const nutCell = nutStrip.find((c) => c.day_of_week === dow) ?? null;
      const nutritionDay: NutritionDayCell | null = nutritionTracked
        ? nutCell ?? { day_of_week: dow, has_slot: false, done: false, completed: 0, expected: 0 }
        : null;
      const habitStrip = weekRow?.habit_day_strip ?? [];
      const habitCell = habitStrip.find((c) => c.day_of_week === dow) ?? null;
      const habitDay: NutritionDayCell | null = habitTracked
        ? habitCell ?? { day_of_week: dow, has_slot: false, done: false, completed: 0, expected: 0 }
        : null;
      weeklyData.push({
        date: dateStr,
        workout: hasWorkout,
        nutritionDay,
        habitDay,
        session: hasCheckin,
      });
    }

    const firstHalf = weeklyData.slice(0, 3);
    const secondHalf = weeklyData.slice(4, 7);
    const firstHalfActivity = firstHalf.filter((d) => d.workout || d.session).length;
    const secondHalfActivity = secondHalf.filter((d) => d.workout || d.session).length;
    const trend: "up" | "down" | "stable" =
      secondHalfActivity > firstHalfActivity
        ? "up"
        : secondHalfActivity < firstHalfActivity
          ? "down"
          : "stable";
    const alerts = weeklyData.filter((d) => !d.workout && !d.session).length;

    return {
      clientId,
      clientName,
      avatar,
      overallAdherence,
      workoutAdherence,
      nutritionAdherence: nutritionAdherencePct,
      habitAdherence: habitAdherencePct,
      sessionAttendance: checkinAdherence,
      nutritionTracked,
      nutritionHasWeeklyPlan,
      habitTracked,
      habitHasWeeklyPlan,
      calendarTodayYmd: todayClientYmd,
      trend,
      lastActive,
      alerts,
      streak,
      weeklyData,
      historicalAdherence: historicalAdherence[clientId] ?? [],
      status,
    };
  });

  adherenceResults.sort((a, b) => a.overallAdherence - b.overallAdherence);
  return adherenceResults;
}
