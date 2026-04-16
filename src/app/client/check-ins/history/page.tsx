"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell, ClientGlassCard, SectionHeader, PrimaryButton, SecondaryButton } from "@/components/client-ui";
import { AddGoalModal } from "@/components/goals/AddGoalModal";
import { CompactGoalCard } from "@/components/goals/CompactGoalCard";
import { supabase } from "@/lib/supabase";
import { CheckInHistory } from "@/components/client/CheckInHistory";
import { WeeklyComparison } from "@/components/client/WeeklyComparison";
import { WellnessTrendsCard } from "@/components/client/WellnessTrendsCard";
import { ArrowLeft } from "lucide-react";
import { getLogRange, DailyWellnessLog, MonthlyStats } from "@/lib/wellnessService";
import { getClientMeasurements } from "@/lib/measurementService";
import { usePageData } from "@/hooks/usePageData";

function getWeekStartMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

interface HistoryPageData {
  logRange: DailyWellnessLog[];
  measurementsForComparison: Awaited<ReturnType<typeof getClientMeasurements>>;
  currentStreak: number;
  bestStreak: number;
  monthlyStats: MonthlyStats | null;
}

export default function CheckInsHistoryPage() {
  const { performanceSettings } = useTheme();
  const { user } = useAuth();
  const [pillarGoals, setPillarGoals] = useState<
    Array<{
      id: string;
      title: string;
      target_value?: number;
      current_value?: number;
      target_unit?: string;
      progress_percentage?: number;
      target_date?: string;
      status: string;
    }>
  >([]);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);

  const weekStart = useMemo(() => getWeekStartMonday(), []);
  const weekDays = useMemo(() => {
    const start = new Date(weekStart + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }, [weekStart]);
  const lastWeekStart = useMemo(() => {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  }, [weekStart]);
  const lastWeekDays = useMemo(() => {
    const start = new Date(lastWeekStart + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }, [lastWeekStart]);

  const fetchHistoryData = useCallback(async (): Promise<HistoryPageData> => {
    if (!user?.id) {
      return {
        logRange: [],
        measurementsForComparison: [],
        currentStreak: 0,
        bestStreak: 0,
        monthlyStats: null,
      };
    }
    const todayStr = new Date().toISOString().split("T")[0];
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const rangeStartDateStr = ninetyDaysAgo.toISOString().split("T")[0];

    const [logs, measurements] = await Promise.all([
      getLogRange(user.id, rangeStartDateStr, todayStr),
      getClientMeasurements(user.id, 2),
    ]);

    const completeDatesSet = new Set(
      logs
        .filter(
          (r: DailyWellnessLog) =>
            r.sleep_hours != null &&
            r.sleep_quality != null &&
            r.stress_level != null &&
            r.soreness_level != null
        )
        .map((r) => r.log_date)
    );

    let streak = 0;
    const d = new Date(todayStr + "T12:00:00Z");
    for (let i = 0; i < 365; i++) {
      const s = d.toISOString().split("T")[0];
      if (s > todayStr) break;
      if (!completeDatesSet.has(s)) break;
      streak++;
      d.setUTCDate(d.getUTCDate() - 1);
    }

    const sortedDates = Array.from(completeDatesSet).sort();
    let bestStreakCalc = 0;
    let currentStreakCalc = 0;
    let prevDate: Date | null = null;
    for (const dateStr of sortedDates) {
      const currentDate = new Date(dateStr + "T12:00:00Z");
      if (prevDate === null) {
        currentStreakCalc = 1;
      } else {
        const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          currentStreakCalc++;
        } else {
          bestStreakCalc = Math.max(bestStreakCalc, currentStreakCalc);
          currentStreakCalc = 1;
        }
      }
      prevDate = currentDate;
    }
    bestStreakCalc = Math.max(bestStreakCalc, currentStreakCalc);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthEndDate = new Date(currentYear, currentMonth, 0);
    const monthStartDateStr = new Date(currentYear, currentMonth - 1, 1).toISOString().split("T")[0];
    const monthEndDateStr = monthEndDate.toISOString().split("T")[0];
    const monthLogs = logs.filter((l) => l.log_date >= monthStartDateStr && l.log_date <= monthEndDateStr);
    const completeMonthLogs = monthLogs.filter(
      (l) =>
        l.sleep_hours != null &&
        l.sleep_quality != null &&
        l.stress_level != null &&
        l.soreness_level != null
    );

    return {
      logRange: logs,
      measurementsForComparison: measurements,
      currentStreak: streak,
      bestStreak: bestStreakCalc,
      monthlyStats: {
        loggedDays: completeMonthLogs.length,
        totalDays: monthEndDate.getDate(),
        completionRate:
          monthEndDate.getDate() > 0 ? Math.round((completeMonthLogs.length / monthEndDate.getDate()) * 100) : 0,
      },
    };
  }, [user?.id]);

  const { data, loading: dataLoading } = usePageData(fetchHistoryData, [user?.id]);

  const logRange = data?.logRange ?? [];
  const measurementsForComparison = data?.measurementsForComparison ?? [];
  const currentStreak = data?.currentStreak ?? 0;
  const bestStreak = data?.bestStreak ?? 0;
  const monthlyStats = data?.monthlyStats ?? null;
  const currentBody = measurementsForComparison[0] ?? null;
  const previousBody = measurementsForComparison[1] ?? null;
  const thisWeekLogs = useMemo(() => logRange.filter((l) => weekDays.includes(l.log_date)), [logRange, weekDays]);
  const lastWeekLogs = useMemo(() => logRange.filter((l) => lastWeekDays.includes(l.log_date)), [logRange, lastWeekDays]);

  const fetchPillarGoals = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: rows, error } = await supabase
        .from("goals")
        .select("id, title, target_value, current_value, target_unit, progress_percentage, target_date, status")
        .eq("client_id", user.id)
        .eq("pillar", "checkins")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      setPillarGoals((rows || []).map((r) => ({ ...r, status: r.status ?? "active" })));
    } catch {
      setPillarGoals([]);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPillarGoals();
  }, [fetchPillarGoals]);

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-3 sm:px-6 pb-40 pt-2 sm:pt-4 overflow-x-hidden">
          <header className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/client/check-ins";
              }}
              className="shrink-0 p-2 -ml-2 rounded-xl fc-text-subtle hover:fc-text-primary hover:bg-white/[0.06] transition-colors"
              aria-label="Back to check-ins"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight fc-text-primary truncate">Check-in History</h1>
              <p className="text-xs fc-text-dim mt-0.5">Calendar, goals, and body trends</p>
            </div>
          </header>

          {user?.id && !dataLoading && (
            <>
              <section className="mb-4 min-w-0 overflow-x-auto">
                <CheckInHistory
                  clientId={user.id}
                  initialLogRange={logRange}
                  initialCurrentStreak={currentStreak}
                  initialBestStreak={bestStreak}
                  initialMonthlyStats={monthlyStats}
                />
              </section>

              <section className="mb-4 min-w-0 overflow-x-auto">
                <WellnessTrendsCard
                  logRange={logRange}
                  weekStart={weekStart}
                  weekDays={weekDays}
                  lastWeekStart={lastWeekStart}
                  lastWeekDays={lastWeekDays}
                />
              </section>

              <section className="mb-4 min-w-0 overflow-x-auto">
                <WeeklyComparison
                  current={currentBody}
                  previous={previousBody}
                  wellnessThisWeek={thisWeekLogs}
                  wellnessLastWeek={lastWeekLogs}
                />
              </section>

              <section className="mb-4 border-b border-white/5 pb-4">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/client/progress/body-metrics";
                  }}
                  className="text-left text-sm font-medium fc-text-primary py-2 rounded-lg hover:bg-white/[0.04] px-1 -ml-1 w-full transition-colors bg-transparent border-0 cursor-pointer"
                >
                  Full body metrics history →
                </button>
              </section>
            </>
          )}

          <section>
            <SectionHeader
              title={
                pillarGoals.length > 0
                  ? `Check-in Goals · ${Math.round(pillarGoals.reduce((s, g) => s + (g.progress_percentage ?? 0), 0) / pillarGoals.length)}% adherence`
                  : "Check-in Goals"
              }
            />
            <ClientGlassCard className="p-3 sm:p-4">
              {pillarGoals.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {pillarGoals.map((g) => (
                    <CompactGoalCard
                      key={g.id}
                      goal={{
                        id: g.id,
                        title: g.title,
                        target_value: g.target_value,
                        current_value: g.current_value,
                        target_unit: g.target_unit,
                        progress_percentage: g.progress_percentage,
                        status: g.status,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="fc-text-dim text-sm mb-4">
                  No active check-in goals yet. Add one below to start tracking your progress consistently!
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <PrimaryButton className="w-full sm:w-auto" onClick={() => setShowAddGoalModal(true)}>
                  + Add Check-in Goal
                </PrimaryButton>
                <SecondaryButton className="w-full sm:w-auto" onClick={() => { window.location.href = "/client/goals"; }}>
                  Manage all goals
                </SecondaryButton>
              </div>
            </ClientGlassCard>
          </section>

          <AddGoalModal
            open={showAddGoalModal}
            onClose={() => setShowAddGoalModal(false)}
            defaultPillar="checkins"
            onSuccess={fetchPillarGoals}
          />
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
