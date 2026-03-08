/**
 * Daily wellness check-in service.
 * Manages daily_wellness_logs (sleep, stress, soreness, steps, notes).
 * Legacy fields (energy_level, mood_rating, motivation_level) remain in DB but are not used in UI.
 */

import { supabase } from "./supabase";

export interface DailyWellnessLog {
  id: string;
  client_id: string;
  log_date: string;
  // Legacy fields (kept for backward compatibility, not used in UI)
  energy_level: number | null;
  mood_rating: number | null;
  motivation_level: number | null;
  // Active fields
  sleep_hours: number | null;
  sleep_quality: number | null; // 1-5 scale
  stress_level: number | null; // 1-10 in DB, 1-5 in UI
  soreness_level: number | null; // 1-10 in DB, 1-5 in UI
  steps: number | null;
  notes: string | null;
  created_at: string;
}

/** Map 1–5 UI scale to 2,4,6,8,10 for storage */
export function uiScaleToDb(uiValue: number): number {
  if (uiValue < 1 || uiValue > 5) return 5;
  return (uiValue as 1 | 2 | 3 | 4 | 5) * 2;
}

/** Map DB value 2,4,6,8,10 back to 1–5 for UI */
export function dbToUiScale(dbValue: number | null | undefined): number | null {
  if (dbValue == null) return null;
  const v = dbValue as number;
  if (v <= 2) return 1;
  if (v <= 4) return 2;
  if (v <= 6) return 3;
  if (v <= 8) return 4;
  return 5;
}

/**
 * Create or update today's wellness log.
 * Uses upsert on (client_id, log_date) = (clientId, today).
 * Merges with existing data to preserve fields that aren't being updated.
 */
export async function upsertDailyLog(
  clientId: string,
  data: {
    sleep_hours?: number | null;
    sleep_quality?: number | null;
    stress_level?: number | null;
    soreness_level?: number | null;
    steps?: number | null;
    notes?: string;
  }
): Promise<DailyWellnessLog | null> {
  const today = new Date().toISOString().split("T")[0];
  try {
    // Fetch existing row first to merge data
    const { data: existing } = await supabase
      .from("daily_wellness_logs")
      .select("*")
      .eq("client_id", clientId)
      .eq("log_date", today)
      .maybeSingle();

    // Merge: spread existing data, overlay new data
    // Note: daily_wellness_logs has no updated_at column; do not send it.
    const row = {
      client_id: clientId,
      log_date: today,
      ...(existing || {}),
      ...(data.sleep_hours !== undefined ? { sleep_hours: data.sleep_hours } : {}),
      ...(data.sleep_quality !== undefined ? { sleep_quality: data.sleep_quality } : {}),
      ...(data.stress_level !== undefined ? { stress_level: data.stress_level ? uiScaleToDb(data.stress_level) : null } : {}),
      ...(data.soreness_level !== undefined ? { soreness_level: data.soreness_level ? uiScaleToDb(data.soreness_level) : null } : {}),
      ...(data.steps !== undefined ? { steps: data.steps } : {}),
      ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
    };

    const { data: result, error } = await supabase
      .from("daily_wellness_logs")
      .upsert(row, {
        onConflict: "client_id,log_date",
      })
      .select()
      .single();
    if (error) {
      console.error("wellnessService.upsertDailyLog error:", error);
      return null;
    }
    return result as DailyWellnessLog;
  } catch (e) {
    console.error("wellnessService.upsertDailyLog exception:", e);
    return null;
  }
}

/**
 * Get today's log for the client (to check if already filled).
 */
export async function getTodayLog(
  clientId: string
): Promise<DailyWellnessLog | null> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("daily_wellness_logs")
    .select("*")
    .eq("client_id", clientId)
    .eq("log_date", today)
    .maybeSingle();
  if (error) {
    console.error("wellnessService.getTodayLog error:", error);
    return null;
  }
  return data as DailyWellnessLog | null;
}

/**
 * Get logs for date range (for history).
 */
export async function getLogRange(
  clientId: string,
  startDate: string,
  endDate: string
): Promise<DailyWellnessLog[]> {
  const { data, error } = await supabase
    .from("daily_wellness_logs")
    .select("*")
    .eq("client_id", clientId)
    .gte("log_date", startDate)
    .lte("log_date", endDate)
    .order("log_date", { ascending: false });
  if (error) {
    console.error("wellnessService.getLogRange error:", error);
    return [];
  }
  return (data || []) as DailyWellnessLog[];
}

/**
 * Get check-in streak: consecutive days with a complete wellness log, counting back from today.
 * A day counts toward the streak if sleep_hours, sleep_quality, stress_level, and soreness_level are all non-null.
 */
export async function getCheckinStreak(clientId: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("daily_wellness_logs")
    .select("*") // Use select("*") to handle missing columns gracefully
    .eq("client_id", clientId)
    .lte("log_date", today)
    .order("log_date", { ascending: false })
    .limit(365);
  if (error || !data?.length) return 0;
  
  // Filter to only dates with all required fields
  // Handle case where columns might not exist yet (return 0 for those rows)
  const completeDates = new Set(
    data
      .filter((r: any) => 
        r.sleep_hours != null &&
        r.sleep_quality != null &&
        r.stress_level != null &&
        r.soreness_level != null
      )
      .map((r: any) => r.log_date)
  );
  
  let streak = 0;
  const d = new Date(today + "T12:00:00Z");
  for (let i = 0; i < 365; i++) {
    const s = d.toISOString().split("T")[0];
    if (s > today) break;
    if (!completeDates.has(s)) break;
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

/**
 * Get best streak: longest consecutive streak from all historical data.
 * Only counts days with complete check-ins (all required fields).
 */
export async function getBestStreak(clientId: string): Promise<number> {
  const { data, error } = await supabase
    .from("daily_wellness_logs")
    .select("*") // Use select("*") to handle missing columns gracefully
    .eq("client_id", clientId)
    .order("log_date", { ascending: true });
  
  if (error || !data?.length) return 0;
  
  // Filter to only complete check-ins
  // Handle case where columns might not exist yet (return 0 for those rows)
  const completeDates = (data as any[])
    .filter((r) => 
      r.sleep_hours != null &&
      r.sleep_quality != null &&
      r.stress_level != null &&
      r.soreness_level != null
    )
    .map((r) => r.log_date);
  
  if (completeDates.length === 0) return 0;
  
  // Sort dates chronologically
  const sortedDates = Array.from(new Set(completeDates)).sort();
  
  let bestStreak = 0;
  let currentStreak = 0;
  let prevDate: Date | null = null;
  
  for (const dateStr of sortedDates) {
    const currentDate = new Date(dateStr + "T12:00:00Z");
    
    if (prevDate === null) {
      currentStreak = 1;
    } else {
      const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        // Consecutive day
        currentStreak++;
      } else {
        // Streak broken
        bestStreak = Math.max(bestStreak, currentStreak);
        currentStreak = 1;
      }
    }
    
    prevDate = currentDate;
  }
  
  // Check final streak
  bestStreak = Math.max(bestStreak, currentStreak);
  
  return bestStreak;
}

export interface MonthlyStats {
  loggedDays: number;
  totalDays: number;
  completionRate: number;
}

/**
 * Get monthly stats for a specific month/year.
 */
export async function getMonthlyStats(
  clientId: string,
  month: number, // 1-12
  year: number
): Promise<MonthlyStats> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month
  
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];
  
  const logs = await getLogRange(clientId, startDateStr, endDateStr);
  
  // Count only complete check-ins (all required fields)
  const completeLogs = logs.filter(
    (l) =>
      l.sleep_hours != null &&
      l.sleep_quality != null &&
      l.stress_level != null &&
      l.soreness_level != null
  );
  
  const loggedDays = completeLogs.length;
  const totalDays = endDate.getDate();
  const completionRate = totalDays > 0 ? Math.round((loggedDays / totalDays) * 100) : 0;
  
  return {
    loggedDays,
    totalDays,
    completionRate,
  };
}

export interface CompletionStats {
  totalDays: number;
  loggedDays: number;
  completionRate: number;
  averages: {
    sleep_hours: number;
    sleep_quality: number;
    stress: number;
    soreness: number;
    steps: number;
  };
}

/**
 * Get completion stats for the last N days (for coach or client summary).
 */
export async function getCompletionStats(
  clientId: string,
  days: number
): Promise<CompletionStats> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - Math.max(0, days - 1));
  const startDate = start.toISOString().split("T")[0];
  const endDate = end.toISOString().split("T")[0];
  const logs = await getLogRange(clientId, startDate, endDate);
  
  // Count days with all required fields (complete check-ins)
  const completeLogs = logs.filter(
    (l) =>
      l.sleep_hours != null &&
      l.sleep_quality != null &&
      l.stress_level != null &&
      l.soreness_level != null
  );
  
  const loggedDays = completeLogs.length;
  const totalDays = days;
  const completionRate =
    totalDays > 0 ? Math.round((loggedDays / totalDays) * 100) : 0;
  
  const sum = (key: keyof Pick<DailyWellnessLog, "sleep_hours" | "sleep_quality" | "stress_level" | "soreness_level" | "steps">) =>
    completeLogs.reduce(
      (acc, l) => acc + ((l[key] ?? 0) as number),
      0
    );
  
  const n = loggedDays || 1;
  
  // For stress/soreness, convert from DB scale (2,4,6,8,10) to 1-5 for averaging
  const sumStress = completeLogs.reduce((acc, l) => acc + (l.stress_level ? dbToUiScale(l.stress_level) ?? 0 : 0), 0);
  const sumSoreness = completeLogs.reduce((acc, l) => acc + (l.soreness_level ? dbToUiScale(l.soreness_level) ?? 0 : 0), 0);
  
  return {
    totalDays,
    loggedDays,
    completionRate,
    averages: {
      sleep_hours: Math.round((sum("sleep_hours") / n) * 10) / 10,
      sleep_quality: Math.round((sum("sleep_quality") / n) * 10) / 10,
      stress: Math.round((sumStress / n) * 10) / 10,
      soreness: Math.round((sumSoreness / n) * 10) / 10,
      steps: Math.round((sum("steps") / n)),
    },
  };
}
