"use client";

import { useState, useCallback, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell } from "@/components/client-ui";
import { DailyCheckInForm } from "@/components/client/check-ins/DailyCheckInForm";
import { AddCheckInSheet } from "@/components/client/check-ins/AddCheckInSheet";
import { WeeklyStrip } from "@/components/client/check-ins/WeeklyStrip";
import { WellnessTrends } from "@/components/client/check-ins/WellnessTrends";
import { WeeklyCheckInCard } from "@/components/client/WeeklyCheckInCard";
import { LogMeasurementModal } from "@/components/client/LogMeasurementModal";
import { AchievementUnlockModal } from "@/components/ui/AchievementUnlockModal";
import type { Achievement } from "@/components/ui/AchievementCard";
import { ArrowLeft, Plus } from "lucide-react";
import {
  getTodayLog,
  getLogRange,
  DailyWellnessLog,
  MonthlyStats,
} from "@/lib/wellnessService";
import {
  getClientMeasurements,
  type BodyMeasurement,
} from "@/lib/measurementService";
import { getClientCheckInConfig } from "@/lib/checkInConfigService";
import { usePageData } from "@/hooks/usePageData";
import { supabase } from "@/lib/supabase";

function getWeekStartMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

function getDueThreshold(frequencyDays: number): number {
  if (frequencyDays <= 7) return Math.max(1, frequencyDays - 1);
  if (frequencyDays <= 14) return frequencyDays - 2;
  return frequencyDays - 5;
}

interface CheckInPageData {
  todayLog: DailyWellnessLog | null;
  logRange: DailyWellnessLog[];
  latestMeasurement: BodyMeasurement | null;
  recentMeasurements: BodyMeasurement[];
  activeCheckInGoals: Array<{
    id: string;
    title: string | null;
    pillar: string | null;
    metric_type: string | null;
    target_value: number | null;
  }>;
  checkInConfig: Awaited<ReturnType<typeof getClientCheckInConfig>>;
  currentStreak: number;
  bestStreak: number;
  monthlyStats: MonthlyStats | null;
}

export default function ClientCheckInsPage() {
  const { performanceSettings } = useTheme();
  const { user } = useAuth();
  const [showAddSheet, setShowAddSheet] = useState(false);
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
        recentMeasurements: [],
        activeCheckInGoals: [],
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

    const [todayLogData, logs, measurements, config, goalsResult] = await Promise.all([
      getTodayLog(user.id),
      getLogRange(user.id, rangeStartDateStr, todayStr),
      getClientMeasurements(user.id, 2),
      getClientCheckInConfig(user.id),
      supabase
        .from("goals")
        .select("id, title, pillar, goal_type, target_value")
        .eq("client_id", user.id)
        .eq("pillar", "checkins")
        .eq("status", "active")
        .not("target_value", "is", null),
    ]);
    const recentMeasurements = measurements ?? [];
    const latest = recentMeasurements[0] ?? null;

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
      recentMeasurements,
      activeCheckInGoals: (goalsResult.data ?? []).map((g) => ({
        id: g.id,
        title: g.title ?? null,
        pillar: g.pillar ?? null,
        metric_type: g.goal_type ?? null,
        target_value:
          g.target_value == null || Number.isNaN(Number(g.target_value))
            ? null
            : Number(g.target_value),
      })),
      checkInConfig: config,
      currentStreak: streak,
      bestStreak: bestStreakCalc,
      monthlyStats: {
        loggedDays: completeMonthLogs.length,
        totalDays: monthEndDate.getDate(),
        completionRate:
          monthEndDate.getDate() > 0 ? Math.round((completeMonthLogs.length / monthEndDate.getDate()) * 100) : 0,
      },
    };
  }, [user?.id, historyKey]);

  const { data, loading: dataLoading, error } = usePageData(fetchCheckInData, [user?.id, historyKey]);

  const todayLog = data?.todayLog ?? null;
  const logRange = data?.logRange ?? [];
  const latestMeasurement = data?.latestMeasurement ?? null;
  const recentMeasurements = data?.recentMeasurements ?? [];
  const activeCheckInGoals = data?.activeCheckInGoals ?? [];
  const checkInConfig = data?.checkInConfig ?? null;
  const frequencyDays = checkInConfig?.frequency_days ?? 30;

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
  const thisWeekLogs = useMemo(() => logRange.filter((l) => weekDays.includes(l.log_date)), [logRange, weekDays]);
  const lastWeekLogs = useMemo(() => logRange.filter((l) => lastWeekDays.includes(l.log_date)), [logRange, lastWeekDays]);

  const daysSinceLast = useMemo(() => {
    if (!latestMeasurement?.measured_date) return null;
    const last = new Date(latestMeasurement.measured_date + "T12:00:00");
    const today = new Date(todayStr + "T12:00:00");
    return Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  }, [latestMeasurement?.measured_date, todayStr]);

  const addButtonOverdueDot = useMemo(() => {
    const dueThreshold = getDueThreshold(frequencyDays);
    if (daysSinceLast == null) return false;
    const isOverdue = daysSinceLast > dueThreshold;
    const overdueDays = isOverdue ? daysSinceLast - dueThreshold : 0;
    return overdueDays > 0;
  }, [daysSinceLast, frequencyDays]);

  if (error) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          <ClientPageShell>
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-lg font-semibold text-white mb-2">
                Couldn't load this page
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Something went wrong. Please try again.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors"
              >
                Retry
              </button>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-3 sm:px-6 pb-40 pt-2 sm:pt-4">
          <header className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => { window.location.href = "/client"; }}
                className="shrink-0 p-2 -ml-2 rounded-xl fc-text-subtle hover:fc-text-primary hover:bg-white/[0.06] transition-colors"
                aria-label="Back to home"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold tracking-tight fc-text-primary truncate">Check-ins</h1>
            </div>
            <button
              type="button"
              onClick={() => setShowAddSheet(true)}
              className="relative shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-primary text-sm font-semibold hover:bg-white/[0.06] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add
              {addButtonOverdueDot && (
                <span
                  className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[color:var(--fc-accent)] ring-2 ring-[color:var(--fc-bg-deep)]"
                  aria-label="Scheduled check-in overdue"
                />
              )}
            </button>
          </header>

          {user?.id && (
            <>
              <WeeklyCheckInCard
                daysSinceLast={daysSinceLast}
                lastMeasuredDate={latestMeasurement?.measured_date ?? null}
                frequencyDays={frequencyDays}
                recentMeasurements={recentMeasurements}
                activeCheckInGoals={activeCheckInGoals}
              />

              <DailyCheckInForm
                clientId={user.id}
                initialTodayLog={todayLog}
                onSuccess={() => setHistoryKey(Date.now())}
              />

              {!dataLoading && (
                <div className="mt-6 pt-4 border-t border-[color:var(--fc-glass-border)]/60 space-y-5">
                  <WeeklyStrip weekStart={weekStart} todayStr={todayStr} logsThisWeek={thisWeekLogs} />
                  <WellnessTrends thisWeekLogs={thisWeekLogs} lastWeekLogs={lastWeekLogs} />
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/client/check-ins/history";
                    }}
                    className="w-full text-left text-sm font-medium fc-text-primary py-2 rounded-lg hover:bg-white/[0.04] px-1 transition-colors"
                  >
                    View Full History →
                  </button>
                </div>
              )}
            </>
          )}

          <AddCheckInSheet
            open={showAddSheet}
            onOpenChange={setShowAddSheet}
            onQuickWeight={() => setShowLogModal(true)}
            frequencyDays={frequencyDays}
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
