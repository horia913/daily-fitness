"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell, ClientGlassCard, SectionHeader, PrimaryButton, SecondaryButton } from "@/components/client-ui";
import { Button } from "@/components/ui/button";
import { AddGoalModal } from "@/components/goals/AddGoalModal";
import { CompactGoalCard } from "@/components/goals/CompactGoalCard";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DailyWellnessForm } from "@/components/client/DailyWellnessForm";
import { CheckInHistory } from "@/components/client/CheckInHistory";
import { WeeklyCheckInCard } from "@/components/client/WeeklyCheckInCard";
import { ThisWeekStrip } from "@/components/client/ThisWeekStrip";
import { WeeklyComparison } from "@/components/client/WeeklyComparison";
import { WellnessTrendsCard } from "@/components/client/WellnessTrendsCard";
import { LogMeasurementModal } from "@/components/client/LogMeasurementModal";
import { AchievementUnlockModal } from "@/components/ui/AchievementUnlockModal";
import type { Achievement } from "@/components/ui/AchievementCard";
import type { NewlyUnlockedAchievement } from "@/lib/achievementService";
import Link from "next/link";
import { BarChart3, Camera, Activity, Scale } from "lucide-react";
import {
  getTodayLog,
  getLogRange,
  DailyWellnessLog,
  getCheckinStreak,
  getBestStreak,
  getMonthlyStats,
  MonthlyStats,
  dbToUiScale,
} from "@/lib/wellnessService";
import { getLatestMeasurement, getClientMeasurements } from "@/lib/measurementService";
import { getClientCheckInConfig } from "@/lib/checkInConfigService";
import { usePageData } from "@/hooks/usePageData";

function getWeekStartMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

interface CheckInPageData {
  todayLog: DailyWellnessLog | null;
  logRange: DailyWellnessLog[];
  latestMeasurement: Awaited<ReturnType<typeof getLatestMeasurement>>;
  measurementsForComparison: Awaited<ReturnType<typeof getClientMeasurements>>;
  checkInConfig: Awaited<ReturnType<typeof getClientCheckInConfig>>;
  currentStreak: number;
  bestStreak: number;
  monthlyStats: MonthlyStats | null;
}

export default function ClientCheckInsPage() {
  const { performanceSettings } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [pillarGoals, setPillarGoals] = useState<Array<{ id: string; title: string; target_value?: number; current_value?: number; target_unit?: string; progress_percentage?: number; target_date?: string; status: string }>>([]);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newAchievementsQueue, setNewAchievementsQueue] = useState<Achievement[]>([]);
  const [achievementModalIndex, setAchievementModalIndex] = useState(0);
  const [historyKey, setHistoryKey] = useState(0);

  const fetchCheckInData = useCallback(async (): Promise<CheckInPageData> => {
    if (!user?.id) {
      return {
        todayLog: null,
        logRange: [],
        latestMeasurement: null,
        measurementsForComparison: [],
        checkInConfig: null,
        currentStreak: 0,
        bestStreak: 0,
        monthlyStats: null,
      };
    }
      const todayStr = new Date().toISOString().split("T")[0];
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const rangeStartDateStr = ninetyDaysAgo.toISOString().split("T")[0];

      const [todayLogData, logs, latest, measurements, config] = await Promise.all([
        getTodayLog(user.id),
        getLogRange(user.id, rangeStartDateStr, todayStr),
        getLatestMeasurement(user.id),
        getClientMeasurements(user.id, 2),
        getClientCheckInConfig(user.id),
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
        todayLog: todayLogData,
        logRange: logs,
        latestMeasurement: latest,
        measurementsForComparison: measurements,
        checkInConfig: config,
        currentStreak: streak,
        bestStreak: bestStreakCalc,
        monthlyStats: {
          loggedDays: completeMonthLogs.length,
          totalDays: monthEndDate.getDate(),
          completionRate: monthEndDate.getDate() > 0 ? Math.round((completeMonthLogs.length / monthEndDate.getDate()) * 100) : 0,
        },
      };
  }, [user?.id, historyKey]);

  const { data, loading: dataLoading } = usePageData(
    fetchCheckInData,
    [user?.id, historyKey]
  );

  const todayLog = data?.todayLog ?? null;
  const logRange = data?.logRange ?? [];
  const latestMeasurement = data?.latestMeasurement ?? null;
  const measurementsForComparison = data?.measurementsForComparison ?? [];
  const checkInConfig = data?.checkInConfig ?? null;
  const currentStreak = data?.currentStreak ?? 0;
  const bestStreak = data?.bestStreak ?? 0;
  const monthlyStats = data?.monthlyStats ?? null;

  const fetchPillarGoals = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("id, title, target_value, current_value, target_unit, progress_percentage, target_date, status")
        .eq("client_id", user.id)
        .eq("pillar", "checkins")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      setPillarGoals((data || []).map((r) => ({ ...r, status: r.status ?? "active" })));
    } catch {
      setPillarGoals([]);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPillarGoals();
  }, [fetchPillarGoals]);

  const todayStr = new Date().toISOString().split("T")[0];
  const weekStart = useMemo(() => getWeekStartMonday(), []);
  const weekDays = useMemo(() => {
    const start = new Date(weekStart + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }, [weekStart]);
  const completeDates = useMemo(
    () =>
      new Set(
        logRange
          .filter(
            (r) =>
              r.sleep_hours != null &&
              r.sleep_quality != null &&
              r.stress_level != null &&
              r.soreness_level != null
          )
          .map((r) => r.log_date)
      ),
    [logRange]
  );
  const thisWeekLoggedDates = useMemo(() => new Set(weekDays.filter((d) => completeDates.has(d))), [weekDays, completeDates]);
  const thisWeekLogs = useMemo(() => logRange.filter((l) => weekDays.includes(l.log_date)), [logRange, weekDays]);
  const lastWeekStart = useMemo(() => {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  }, [weekStart]);
  const lastWeekDays = useMemo(() => {
    const start = new Date(lastWeekStart + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }, [lastWeekStart]);
  const lastWeekLogs = useMemo(() => logRange.filter((l) => lastWeekDays.includes(l.log_date)), [logRange, lastWeekDays]);
  const daysSinceLast = useMemo(() => {
    if (!latestMeasurement?.measured_date) return null;
    const last = new Date(latestMeasurement.measured_date + "T12:00:00");
    const today = new Date(todayStr + "T12:00:00");
    return Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  }, [latestMeasurement?.measured_date, todayStr]);
  const frequencyDays = checkInConfig?.frequency_days ?? 30;
  const avgSleepThisWeek = useMemo(() => {
    const withSleep = thisWeekLogs.filter((l) => l.sleep_hours != null);
    if (withSleep.length === 0) return null;
    return withSleep.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / withSleep.length;
  }, [thisWeekLogs]);
  const avgStressThisWeek = useMemo(() => {
    const withStress = thisWeekLogs.filter((l) => l.stress_level != null);
    if (withStress.length === 0) return null;
    const sum = withStress.reduce((s, l) => s + (dbToUiScale(l.stress_level) ?? 0), 0);
    return sum / withStress.length;
  }, [thisWeekLogs]);
  const currentBody = measurementsForComparison[0] ?? null;
  const previousBody = measurementsForComparison[1] ?? null;

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-4xl px-4 sm:px-6 pb-40">
          <header className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight fc-text-primary">Check-ins</h1>
            <p className="text-sm fc-text-dim mt-0.5">Body metrics, mobility, and reporting</p>
          </header>

          {user?.id && (
            <>
              <section className="mb-6">
                <WeeklyCheckInCard
                  daysSinceLast={daysSinceLast}
                  lastMeasuredDate={latestMeasurement?.measured_date ?? null}
                  lastWeightKg={latestMeasurement?.weight_kg ?? null}
                  lastBodyFatPct={latestMeasurement?.body_fat_percentage ?? null}
                  frequencyDays={frequencyDays}
                />
              </section>

              <section className="mb-8">
                <DailyWellnessForm
                  clientId={user.id}
                  initialTodayLog={todayLog}
                  onSuccess={() => setHistoryKey(Date.now())}
                />
              </section>

              {!dataLoading && (
                <section className="mb-8">
                  <ThisWeekStrip
                    loggedDates={thisWeekLoggedDates}
                    weekStart={weekStart}
                    loggedCount={thisWeekLoggedDates.size}
                    totalDays={7}
                    avgSleep={avgSleepThisWeek}
                    avgStress={avgStressThisWeek}
                  />
                </section>
              )}

              {!dataLoading && (
                <section className="mb-8">
                  <WeeklyComparison
                    current={currentBody}
                    previous={previousBody}
                    wellnessThisWeek={thisWeekLogs}
                    wellnessLastWeek={lastWeekLogs}
                  />
                </section>
              )}

              {!dataLoading && (
                <section className="mb-8">
                  <WellnessTrendsCard
                    logRange={logRange}
                    weekStart={weekStart}
                    weekDays={weekDays}
                    lastWeekStart={lastWeekStart}
                    lastWeekDays={lastWeekDays}
                  />
                </section>
              )}

              {!dataLoading && (
                <section className="mb-8">
                  <SectionHeader title="More" className="mb-3" />
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/client/progress/body-metrics">
                      <ClientGlassCard className="p-4 fc-hover-rise fc-press hover:border-[color:var(--fc-glass-border-strong)] transition-all cursor-pointer">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "color-mix(in srgb, var(--fc-domain-workouts) 12%, transparent)" }}>
                          <BarChart3 className="w-5 h-5" style={{ color: "var(--fc-domain-workouts)" }} />
                        </div>
                        <p className="font-semibold fc-text-primary text-sm">Body Metrics History</p>
                        <p className="text-xs fc-text-dim">Trends &amp; charts</p>
                      </ClientGlassCard>
                    </Link>
                    <Link href="/client/progress/photos">
                      <ClientGlassCard className="p-4 fc-hover-rise fc-press hover:border-[color:var(--fc-glass-border-strong)] transition-all cursor-pointer">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "color-mix(in srgb, var(--fc-domain-workouts) 12%, transparent)" }}>
                          <Camera className="w-5 h-5" style={{ color: "var(--fc-domain-workouts)" }} />
                        </div>
                        <p className="font-semibold fc-text-primary text-sm">Progress Photos</p>
                        <p className="text-xs fc-text-dim">Timeline &amp; compare</p>
                      </ClientGlassCard>
                    </Link>
                    <Link href="/client/progress/mobility">
                      <ClientGlassCard className="p-4 fc-hover-rise fc-press hover:border-[color:var(--fc-glass-border-strong)] transition-all cursor-pointer">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "color-mix(in srgb, var(--fc-domain-workouts) 12%, transparent)" }}>
                          <Activity className="w-5 h-5" style={{ color: "var(--fc-domain-workouts)" }} />
                        </div>
                        <p className="font-semibold fc-text-primary text-sm">Mobility Assessments</p>
                        <p className="text-xs fc-text-dim">Flexibility &amp; ROM</p>
                      </ClientGlassCard>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowLogModal(true)}
                      className="w-full text-left"
                    >
                      <ClientGlassCard className="p-4 fc-hover-rise fc-press hover:border-[color:var(--fc-glass-border-strong)] transition-all cursor-pointer">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "color-mix(in srgb, var(--fc-domain-workouts) 12%, transparent)" }}>
                          <Scale className="w-5 h-5" style={{ color: "var(--fc-domain-workouts)" }} />
                        </div>
                        <p className="font-semibold fc-text-primary text-sm">Quick Weight Log</p>
                        <p className="text-xs fc-text-dim">Log without check-in</p>
                      </ClientGlassCard>
                    </button>
                  </div>
                </section>
              )}

              {!dataLoading && (
                <section className="mb-8" key={historyKey}>
                  <CheckInHistory
                    clientId={user.id}
                    initialLogRange={logRange}
                    initialCurrentStreak={currentStreak}
                    initialBestStreak={bestStreak}
                    initialMonthlyStats={monthlyStats}
                  />
                </section>
              )}
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
            <ClientGlassCard className="p-5">
              {pillarGoals.length > 0 ? (
                <div className="space-y-3 mb-4">
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
                <p className="fc-text-dim text-sm mb-4">No active check-in goals yet. Add one below to start tracking your progress consistently!</p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <PrimaryButton className="w-full sm:w-auto" onClick={() => setShowAddGoalModal(true)}>
                  + Add Check-in Goal
                </PrimaryButton>
                <SecondaryButton className="w-full sm:w-auto" onClick={() => router.push("/client/goals")}>
                  Manage all goals
                </SecondaryButton>
              </div>
            </ClientGlassCard>
          </section>

          <AddGoalModal
            open={showAddGoalModal}
            onClose={() => setShowAddGoalModal(false)}
            pillar="checkins"
            onSuccess={fetchPillarGoals}
          />

          {user?.id && showLogModal && (
            <LogMeasurementModal
              clientId={user.id}
              lastMeasurement={latestMeasurement ?? undefined}
              onClose={() => setShowLogModal(false)}
              onSuccess={() => {
                setShowLogModal(false);
                setHistoryKey(Date.now());
              }}
              onAchievementsUnlocked={(raw) => {
                const tierToRarity = (tier: string | null): Achievement["rarity"] =>
                  !tier ? "uncommon" : tier === "platinum" ? "epic" : tier === "gold" ? "rare" : tier === "silver" ? "uncommon" : "common";
                const mapped: Achievement[] = raw.map((a) => ({
                  id: a.templateId,
                  name: a.templateName,
                  description: a.description ?? "",
                  icon: a.templateIcon ?? "🏆",
                  rarity: tierToRarity(a.tier),
                  unlocked: true,
                }));
                setNewAchievementsQueue(mapped);
                setAchievementModalIndex(0);
              }}
            />
          )}

          {newAchievementsQueue.length > 0 && (
            <AchievementUnlockModal
              achievement={newAchievementsQueue[achievementModalIndex] ?? null}
              visible={achievementModalIndex < newAchievementsQueue.length}
              onClose={() => {
                if (achievementModalIndex < newAchievementsQueue.length - 1) {
                  setAchievementModalIndex((i) => i + 1);
                } else {
                  setNewAchievementsQueue([]);
                  setAchievementModalIndex(0);
                }
              }}
            />
          )}
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
