"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { ClientPageShell } from "@/components/client-ui";
import { CheckinHero, CheckinActionAddButton, CheckinLinkRow } from "@/components/client/check-ins/checkinSuite";
import checkinSuiteStyles from "@/components/client/check-ins/checkinSuite/checkinSuiteV1.module.css";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { DailyCheckInForm } from "@/components/client/check-ins/DailyCheckInForm";
import { AddCheckInSheet } from "@/components/client/check-ins/AddCheckInSheet";
import { WeeklyStrip } from "@/components/client/check-ins/WeeklyStrip";
import { WellnessTrends } from "@/components/client/check-ins/WellnessTrends";
import { WeeklyCheckInCard } from "@/components/client/WeeklyCheckInCard";
import { LogMeasurementModal } from "@/components/client/LogMeasurementModal";
import { AchievementUnlockModal } from "@/components/ui/AchievementUnlockModal";
import type { Achievement } from "@/components/ui/AchievementCard";
import { AlertTriangle } from "lucide-react";
import { getTodayLog, getLogRange, DailyWellnessLog } from "@/lib/wellnessService";
import {
  getClientMeasurements,
  type BodyMeasurement,
} from "@/lib/measurementService";
import { getClientCheckInConfig } from "@/lib/checkInConfigService";
import { toLocalDateString } from "@/lib/clientActivityService";
import { supabase } from "@/lib/supabase";

function getWeekStartMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return toLocalDateString(monday);
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
}

export default function ClientCheckInsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newAchievementsQueue, setNewAchievementsQueue] = useState<Achievement[]>([]);
  const [achievementModalIndex, setAchievementModalIndex] = useState(0);

  const todayLocalDate = toLocalDateString(new Date());

  const checkInsQuery = useQuery({
    queryKey: ["client-check-ins", user?.id, todayLocalDate],
    queryFn: async (): Promise<CheckInPageData> => {
      const clientId = user!.id;
      const todayStr = toLocalDateString(new Date());
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const rangeStartDateStr = toLocalDateString(ninetyDaysAgo);

      const [todayLogData, logs, measurements, config, goalsResult] =
        await Promise.all([
          getTodayLog(clientId),
          getLogRange(clientId, rangeStartDateStr, todayStr),
          getClientMeasurements(clientId, 2),
          getClientCheckInConfig(clientId),
          supabase
            .from("goals")
            .select("id, title, pillar, goal_type, target_value")
            .eq("client_id", clientId)
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
              r.soreness_level != null,
          )
          .map((r) => r.log_date),
      );

      let streak = 0;
      const d = new Date(todayStr + "T12:00:00");
      for (let i = 0; i < 365; i++) {
        const s = toLocalDateString(d);
        if (s > todayStr) break;
        if (!completeDatesSet.has(s)) break;
        streak++;
        d.setDate(d.getDate() - 1);
      }

      const sortedDates = Array.from(completeDatesSet).sort();
      let bestStreakCalc = 0;
      let currentStreakCalc = 0;
      let prevDate: Date | null = null;
      for (const dateStr of sortedDates) {
        const currentDate = new Date(dateStr + "T12:00:00");
        if (prevDate === null) {
          currentStreakCalc = 1;
        } else {
          const daysDiff = Math.floor(
            (currentDate.getTime() - prevDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );
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
      };
    },
    enabled: !!user?.id,
  });

  const data = checkInsQuery.data ?? null;
  const dataLoading = checkInsQuery.isLoading;
  const error = checkInsQuery.isError;

  const todayLog = data?.todayLog ?? null;
  const logRange = data?.logRange ?? [];
  const latestMeasurement = data?.latestMeasurement ?? null;
  const recentMeasurements = data?.recentMeasurements ?? [];
  const activeCheckInGoals = data?.activeCheckInGoals ?? [];
  const checkInConfig = data?.checkInConfig ?? null;
  const frequencyDays = checkInConfig?.frequency_days ?? 30;
  const currentStreak = data?.currentStreak ?? 0;
  const bestStreak = data?.bestStreak ?? 0;

  const todayStr = todayLocalDate;
  const weekStart = useMemo(() => getWeekStartMonday(), []);
  const weekDays = useMemo(() => {
    const start = new Date(weekStart + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return toLocalDateString(d);
    });
  }, [weekStart]);
  const lastWeekStart = useMemo(() => {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() - 7);
    return toLocalDateString(d);
  }, [weekStart]);
  const lastWeekDays = useMemo(() => {
    const start = new Date(lastWeekStart + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return toLocalDateString(d);
    });
  }, [lastWeekStart]);
  const thisWeekLogs = useMemo(
    () => logRange.filter((l) => weekDays.includes(l.log_date)),
    [logRange, weekDays],
  );
  const lastWeekLogs = useMemo(
    () => logRange.filter((l) => lastWeekDays.includes(l.log_date)),
    [logRange, lastWeekDays],
  );

  const daysSinceLast = useMemo(() => {
    if (!latestMeasurement?.measured_date) return null;
    const last = new Date(latestMeasurement.measured_date + "T12:00:00");
    const today = new Date(todayStr + "T12:00:00");
    return Math.floor(
      (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
    );
  }, [latestMeasurement?.measured_date, todayStr]);

  const addButtonOverdueDot = useMemo(() => {
    const dueThreshold = getDueThreshold(frequencyDays);
    if (daysSinceLast == null) return false;
    return daysSinceLast > dueThreshold;
  }, [daysSinceLast, frequencyDays]);

  const invalidateAfterCheckIn = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["client-check-ins", user?.id],
    });
    await queryClient.invalidateQueries({
      queryKey: ["client-dashboard", user?.id],
    });
    await queryClient.invalidateQueries({
      queryKey: ["client-progress", user?.id],
    });
  };

  const invalidateAfterMeasurement = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["client-check-ins", user?.id],
    });
    await queryClient.invalidateQueries({
      queryKey: ["client-progress", user?.id],
    });
  };

  if (error) {
    return (
      <ProtectedRoute requiredRole="client">
        <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load this page"
            description="Something went wrong. Please try again."
            actionLabel="Retry"
            onAction={() => void checkInsQuery.refetch()}
          />
        </ClientPageShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="client">
      <ClientPageShell
        className={cn("max-w-lg lg:max-w-3xl mx-auto px-3 sm:px-6 pb-40 pt-2 sm:pt-4", checkinSuiteStyles.root)}
      >
        <CheckinHero
          onBack={() => router.push("/client")}
          backAriaLabel="Back to home"
          eyebrow="Check-in"
          eyebrowColor="var(--fc-accent)"
          title="Daily check-in"
          subtitle="Sleep, stress, soreness & steps"
          rightSlot={
            <CheckinActionAddButton onClick={() => setShowAddSheet(true)} showDot={addButtonOverdueDot} />
          }
        />

        {!dataLoading && (
          <p className={checkinSuiteStyles.streakChip} aria-label={`Current streak ${currentStreak} days`}>
            Streak{" "}
            <span className={checkinSuiteStyles.streakChipValue}>
              {currentStreak}
              <span className="text-[11px] font-medium opacity-70">d</span>
            </span>
            {bestStreak > 0 ? (
              <span className={checkinSuiteStyles.streakChipBest}>· best {bestStreak}d</span>
            ) : null}
          </p>
        )}

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
              onSuccess={() => {
                void invalidateAfterCheckIn();
              }}
            />

            {!dataLoading && (
              <div className="mt-6 pt-4 border-t border-[color:var(--cs-line)] space-y-5">
                <WeeklyStrip weekStart={weekStart} todayStr={todayStr} logsThisWeek={thisWeekLogs} />
                <WellnessTrends thisWeekLogs={thisWeekLogs} lastWeekLogs={lastWeekLogs} />
                <CheckinLinkRow onClick={() => router.push("/client/check-ins/history")}>
                  View full history
                </CheckinLinkRow>
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
              void invalidateAfterMeasurement();
            }}
            onAchievementsUnlocked={(raw) => {
              const mapped: Achievement[] = raw.map((a) => ({
                id: a.templateId,
                name: a.templateName,
                description: a.description ?? "",
                icon: a.templateIcon ?? "🏆",
                tier: (a.tier ?? null) as Achievement["tier"],
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
    </ProtectedRoute>
  );
}
