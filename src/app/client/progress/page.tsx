"use client";

import React, { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import {
  Award,
  Dumbbell,
  ChevronRight,
  Scale,
  Timer,
  BarChart3,
  Download,
  Settings,
  Accessibility,
  FileText,
  Trophy,
  Camera,
  AlertTriangle,
  Apple,
  Clock,
  TrendingUp,
  Flame,
} from "lucide-react";
import { ClientPageShell } from "@/components/client-ui";
import {
  getProgressStats,
  ProgressStats,
  getProgressMonthHubSnapshot,
  type ProgressMonthHubSnapshot,
} from "@/lib/progressStatsService";
import { withTimeout } from "@/lib/withTimeout";
import { cn } from "@/lib/utils";

function formatMonthHubHours(totalMinutes: number): string {
  if (totalMinutes <= 0) return "—";
  const h = Math.floor(totalMinutes / 60);
  const min = Math.round(totalMinutes % 60);
  if (h > 0 && min > 0) return `${h}h ${min}m`;
  if (h > 0) return `${h}h`;
  return `${min}m`;
}

function formatMonthHubVolume(kg: number): string {
  if (kg <= 0) return "—";
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg).toLocaleString()}kg`;
}
const HUB_NAV_ITEMS: {
  href: string;
  title: string;
  description: string;
  icon: typeof BarChart3;
  iconClass: string;
  getBadge?: (stats: ProgressStats) => string | null;
}[] = [
  { href: "/client/progress/analytics", title: "Analytics", description: "Volume and intensity trends", icon: BarChart3, iconClass: "bg-[color-mix(in_srgb,var(--fc-accent-primary)_10%,transparent)] text-[color:var(--fc-accent-primary)] border border-[color-mix(in_srgb,var(--fc-accent-primary)_20%,transparent)]", getBadge: () => null },
  { href: "/client/progress/workout-logs", title: "Workout History", description: "View past workouts and training volume", icon: FileText, iconClass: "bg-[color-mix(in_srgb,var(--fc-accent-primary)_10%,transparent)] text-[color:var(--fc-accent-primary)] border border-[color-mix(in_srgb,var(--fc-accent-primary)_20%,transparent)]", getBadge: (s) => (s.totalWorkouts > 0 ? `${s.totalWorkouts} total` : null) },
  { href: "/client/progress/performance", title: "Performance tests", description: "Benchmarks and tests", icon: Timer, iconClass: "bg-[color-mix(in_srgb,var(--fc-domain-workouts)_10%,transparent)] text-[color:var(--fc-domain-workouts)] border border-[color-mix(in_srgb,var(--fc-domain-workouts)_20%,transparent)]", getBadge: () => null },
  { href: "/client/progress/body-metrics", title: "Body metrics", description: "Weight and measurements", icon: Scale, iconClass: "bg-[color-mix(in_srgb,var(--fc-status-success)_10%,transparent)] text-[color:var(--fc-status-success)] border border-[color-mix(in_srgb,var(--fc-status-success)_20%,transparent)]", getBadge: (s) => (s.currentWeight != null ? "Logged" : null) },
  { href: "/client/progress/mobility", title: "Mobility", description: "Screening and flexibility", icon: Accessibility, iconClass: "bg-[color-mix(in_srgb,var(--fc-accent-cyan)_10%,transparent)] text-[color:var(--fc-accent-cyan)] border border-[color-mix(in_srgb,var(--fc-accent-cyan)_20%,transparent)]", getBadge: () => null },
  { href: "/client/progress/personal-records", title: "Personal records", description: "PRs and lifts", icon: Dumbbell, iconClass: "bg-[color-mix(in_srgb,var(--fc-status-warning)_10%,transparent)] text-[color:var(--fc-status-warning)] border border-[color-mix(in_srgb,var(--fc-status-warning)_20%,transparent)]", getBadge: (s) => (s.personalRecords > 0 ? `${s.personalRecords} PRs` : null) },
  { href: "/client/progress/achievements", title: "Achievements", description: "Badges and milestones", icon: Award, iconClass: "bg-[color-mix(in_srgb,var(--fc-status-warning)_10%,transparent)] text-[color:var(--fc-status-warning)] border border-[color-mix(in_srgb,var(--fc-status-warning)_20%,transparent)]", getBadge: (s) => (s.achievementsUnlocked > 0 ? `${s.achievementsUnlocked} Earned` : null) },
  { href: "/client/progress/leaderboard", title: "Leaderboard", description: "Rankings and scores", icon: Trophy, iconClass: "bg-[color-mix(in_srgb,var(--fc-status-error)_10%,transparent)] text-[color:var(--fc-status-error)] border border-[color-mix(in_srgb,var(--fc-status-error)_20%,transparent)]", getBadge: (s) => (s.bestLeaderboardRank != null ? `#${s.bestLeaderboardRank}` : null) },
  { href: "/client/progress/body-metrics?tab=photos", title: "Photos", description: "Progress photos", icon: Camera, iconClass: "bg-[color-mix(in_srgb,var(--fc-domain-habits)_10%,transparent)] text-[color:var(--fc-domain-habits)] border border-[color-mix(in_srgb,var(--fc-domain-habits)_20%,transparent)]", getBadge: () => null },
  { href: "/client/progress/nutrition", title: "Nutrition", description: "Fuel and macro trends", icon: Apple, iconClass: "bg-[color-mix(in_srgb,var(--fc-domain-meals)_10%,transparent)] text-[color:var(--fc-domain-meals)] border border-[color-mix(in_srgb,var(--fc-domain-meals)_20%,transparent)]", getBadge: () => null },
];

function ProgressHubContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

  const [stats, setStats] = useState<ProgressStats>({
    weeklyWorkouts: { completed: 0, goal: 0 },
    streak: 0,
    totalWorkouts: 0,
    personalRecords: 0,
    leaderboardRank: 0,
    totalAthletes: 0,
    achievementsUnlocked: 0,
    achievementsInProgress: 0,
    currentWeight: null,
    weightChange: 0,
    volumeThisWeek: 0,
    volumeLastWeek: 0,
    bestLeaderboardRank: null,
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [monthHub, setMonthHub] = useState<ProgressMonthHubSnapshot | null>(null);

  const loadProgressData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setLoadError(null);
      const [progressStats, hub] = await Promise.all([
        withTimeout(getProgressStats(user.id), 25000, "timeout"),
        getProgressMonthHubSnapshot(user.id),
      ]);
      setStats(progressStats);
      setMonthHub(hub);
    } catch (error: any) {
      console.error("Error loading progress data:", error);
      setLoadError(error?.message === "timeout" ? "Loading took too long. Please try again." : (error?.message || "Failed to load progress"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProgressData();
  }, [loadProgressData]);

  const now = new Date();
  const daysInMonthForHub = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const numWeeksForHub = Math.ceil(daysInMonthForHub / 7);
  const currentWeekIdxForHub = Math.min(
    Math.max(numWeeksForHub - 1, 0),
    Math.floor((now.getDate() - 1) / 7)
  );
  const fallbackMonthHub: ProgressMonthHubSnapshot = {
    monthYearLabel: now.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    workouts: 0,
    totalDurationMinutes: 0,
    volumeKg: 0,
    newPRs: 0,
    streakDays: 0,
    weeklyWorkoutCounts: Array.from({ length: numWeeksForHub }, () => 0),
    currentWeekIndex: currentWeekIdxForHub,
  };
  const hub = monthHub ?? fallbackMonthHub;

  if (loadError) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
          <div className="py-6 px-4 text-center">
            <AlertTriangle
              className="w-7 h-7 mx-auto mb-3 text-gray-500"
              strokeWidth={1.5}
              aria-hidden
            />
            <p className="text-sm text-gray-400 mb-4">{loadError}</p>
            <button
              type="button"
              onClick={() => loadProgressData()}
              className="fc-btn fc-btn-primary fc-press h-11 px-5 text-sm"
            >
              Retry
            </button>
          </div>
        </ClientPageShell>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
        <header className="mb-4 flex items-start justify-between gap-3 border-b border-white/5 pb-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Progress Hub
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Insights into your physical progress
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/client/profile";
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-colors hover:text-white"
          >
            <Settings className="h-5 w-5" />
          </button>
        </header>

        {/* This month — scannable snapshot + weekly bars */}
        <section className="mb-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/70">
                This month
              </span>
              <span className="text-xs text-gray-500">{hub.monthYearLabel}</span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold text-white tabular-nums">
                {loading ? "—" : hub.workouts}
              </span>
              <span className="text-sm text-gray-400">workouts</span>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
              <div className="flex flex-col items-center gap-1 min-w-0">
                <Dumbbell className="w-4 h-4 text-cyan-400/80 shrink-0" aria-hidden />
                <span className="text-sm font-semibold text-white tabular-nums text-center leading-tight">
                  {loading ? "—" : hub.workouts}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 text-center leading-tight">
                  Workouts
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 min-w-0">
                <Clock className="w-4 h-4 text-cyan-400/80 shrink-0" aria-hidden />
                <span className="text-sm font-semibold text-white tabular-nums text-center leading-tight">
                  {loading ? "—" : formatMonthHubHours(hub.totalDurationMinutes)}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 text-center leading-tight">
                  Hours
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 min-w-0">
                <TrendingUp className="w-4 h-4 text-cyan-400/80 shrink-0" aria-hidden />
                <span className="text-sm font-semibold text-white tabular-nums text-center leading-tight">
                  {loading ? "—" : formatMonthHubVolume(hub.volumeKg)}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 text-center leading-tight">
                  Volume
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 min-w-0">
                <Trophy className="w-4 h-4 text-cyan-400/80 shrink-0" aria-hidden />
                <span className="text-sm font-semibold text-white tabular-nums text-center leading-tight">
                  {loading ? "—" : hub.newPRs > 0 ? hub.newPRs : "—"}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 text-center leading-tight">
                  New PRs
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 min-w-0">
                <Flame className="w-4 h-4 text-cyan-400/80 shrink-0" aria-hidden />
                <span className="text-sm font-semibold text-white tabular-nums text-center leading-tight">
                  {loading ? "—" : hub.streakDays}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 text-center leading-tight">
                  Streak
                </span>
              </div>
            </div>

            {!loading && hub.workouts === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No workouts logged this month yet
              </p>
            ) : (
              <div className="mt-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-1">
                  Workouts per week
                </p>
                <div className="flex justify-between gap-1">
                  {(() => {
                    const counts = hub.weeklyWorkoutCounts;
                    const maxC = Math.max(...counts, 1);
                    const barMaxPx = 64;
                    return counts.map((count, i) => {
                      const isCurrent = i === hub.currentWeekIndex;
                      const isPast = i < hub.currentWeekIndex;
                      const barBg = isCurrent
                        ? "bg-cyan-400"
                        : isPast
                          ? "bg-cyan-500/60"
                          : "bg-cyan-500/25";
                      const hPx = loading
                        ? 12
                        : Math.max(4, (count / maxC) * barMaxPx);
                      const countDisplay = loading ? "—" : String(count);
                      const title = `Week ${i + 1}: ${count} workout${count !== 1 ? "s" : ""}`;
                      return (
                        <div
                          key={i}
                          className="flex flex-col items-center flex-1 min-w-0"
                          title={title}
                        >
                          <span className="text-[10px] font-bold tabular-nums text-white mb-1">
                            {countDisplay}
                          </span>
                          <div className="w-full min-h-16 flex flex-col justify-end">
                            <div
                              className={cn(
                                "w-full rounded-t-sm transition-colors",
                                loading
                                  ? "bg-white/10 animate-pulse"
                                  : barBg
                              )}
                              style={{ height: `${hPx}px` }}
                            />
                          </div>
                          <span className="text-[9px] uppercase text-white mt-0.5">
                            W{i + 1}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Quick stats — single horizontal strip (activity hub pattern) */}
        <section className="mb-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between gap-1">
              <div className="flex-1 min-w-0 text-center">
                <p className="text-base font-semibold text-white tabular-nums">
                  {loading
                    ? "—"
                    : `${stats.weeklyWorkouts.completed}/${stats.weeklyWorkouts.goal || 0}`}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
                  This week
                </p>
              </div>
              <div className="w-px h-8 bg-white/10 shrink-0" aria-hidden />
              <div className="flex-1 min-w-0 text-center px-0.5">
                <p className="text-base font-semibold text-white">
                  {loading ? (
                    "—"
                  ) : stats.volumeThisWeek >= 1000 ? (
                    <span className="tabular-nums">
                      {(stats.volumeThisWeek / 1000).toFixed(1)}t
                    </span>
                  ) : (
                    <>
                      <span className="tabular-nums">
                        {Math.round(stats.volumeThisWeek).toLocaleString()}
                      </span>
                      <span className="text-white/90"> kg</span>
                    </>
                  )}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5 leading-tight">
                  Volume
                  {!loading && stats.volumeLastWeek > 0
                    ? stats.volumeThisWeek > stats.volumeLastWeek
                      ? ` · ↑${Math.round(stats.volumeThisWeek - stats.volumeLastWeek)}`
                      : stats.volumeThisWeek < stats.volumeLastWeek
                        ? ` · ↓${Math.round(stats.volumeLastWeek - stats.volumeThisWeek)}`
                        : " · →"
                    : ""}
                </p>
              </div>
              <div className="w-px h-8 bg-white/10 shrink-0" aria-hidden />
              <div className="flex-1 min-w-0 text-center">
                <p className="text-base font-semibold text-white tabular-nums">
                  {loading ? "—" : stats.personalRecords}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
                  PRs
                </p>
              </div>
              {stats.bestLeaderboardRank != null && (
                <>
                  <div className="w-px h-8 bg-white/10 shrink-0" aria-hidden />
                  <div className="flex-1 min-w-0 text-center">
                    <p className="text-base font-semibold text-white tabular-nums">
                      {loading ? "—" : `#${stats.bestLeaderboardRank}`}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
                      Best rank
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Hub links — flat rows */}
        <section className="mb-6 flex flex-col divide-y divide-white/5">
          {HUB_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const badge = item.getBadge?.(stats) ?? null;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => { window.location.href = item.href; }}
                className="block w-full text-left"
              >
                <div className="flex min-h-[52px] cursor-pointer items-center gap-3 py-2.5 transition-colors hover:bg-white/[0.02] active:bg-white/[0.04]">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.iconClass}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold fc-text-primary">{item.title}</h3>
                      {badge && (
                        <span className="rounded border border-[color:var(--fc-glass-border)] px-2 py-0.5 font-mono text-[10px] fc-text-primary">
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-1 text-xs fc-text-dim">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />
                </div>
              </button>
            );
          })}
          <div className="flex min-h-[52px] items-center gap-3 py-2.5 opacity-80">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-gray-400">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold fc-text-dim">Export</h3>
              <p className="line-clamp-1 text-xs fc-text-subtle">
                Share your progress with your coach
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />
          </div>
        </section>

      </ClientPageShell>
    </AnimatedBackground>
  );
}

export default function ProgressHub() {
  return (
    <ProtectedRoute>
      <ProgressHubContent />
    </ProtectedRoute>
  );
}
