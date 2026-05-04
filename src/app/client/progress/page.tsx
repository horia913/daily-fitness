"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import {
  ChevronRight,
  Scale,
  Timer,
  Download,
  Settings,
  FileText,
  Trophy,
  Camera,
  AlertTriangle,
  Clock,
  TrendingUp,
  Flame,
  Star,
  Zap,
  LineChart,
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
import { PsHero, PsSectionEyebrow } from "@/components/client/progress-suite";
import ps from "@/components/client/progress-suite/progressSuiteV1.module.css";

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
type HubTile = "cyan" | "lime" | "warning" | "good" | "purple" | "pink" | "orange";
type HubBadge = "cyan" | "lime" | "warning" | "good" | "pink";

const HUB_TILE: Record<HubTile, string> = {
  cyan: ps.psIconTileCyan,
  lime: ps.psIconTileLime,
  warning: ps.psIconTileWarning,
  good: ps.psIconTileGood,
  purple: ps.psIconTilePurple,
  pink: ps.psIconTilePink,
  orange: ps.psIconTileOrange,
};

const HUB_BADGE: Record<HubBadge, string> = {
  cyan: ps.psBadgeCyan,
  lime: ps.psBadgeLime,
  warning: ps.psBadgeWarning,
  good: ps.psBadgeGood,
  pink: ps.psBadgePink,
};

const HUB_NAV_ITEMS: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tile: HubTile;
  getBadge?: (stats: ProgressStats) => { text: string; variant: HubBadge } | null;
}[] = [
  {
    href: "/client/progress/workout-logs",
    title: "Workout history",
    description: "View past workouts and training volume",
    icon: FileText,
    tile: "cyan",
    getBadge: (s) =>
      s.totalWorkouts > 0 ? { text: `${s.totalWorkouts} total`, variant: "cyan" } : null,
  },
  {
    href: "/client/progress/performance",
    title: "Performance tests",
    description: "Benchmarks and tests",
    icon: Timer,
    tile: "warning",
  },
  {
    href: "/client/progress/body-metrics",
    title: "Body metrics",
    description: "Weight and measurements",
    icon: Scale,
    tile: "good",
    getBadge: (s) =>
      s.currentWeight != null ? { text: "Logged", variant: "good" } : null,
  },
  {
    href: "/client/progress/mobility",
    title: "Mobility",
    description: "Screening and flexibility",
    icon: Zap,
    tile: "purple",
  },
  {
    href: "/client/progress/personal-records",
    title: "Personal records",
    description: "PRs and lifts",
    icon: Star,
    tile: "lime",
    getBadge: (s) =>
      s.personalRecords > 0 ? { text: `${s.personalRecords} PRs`, variant: "lime" } : null,
  },
  {
    href: "/client/progress/achievements",
    title: "Achievements",
    description: "Badges and milestones",
    icon: Trophy,
    tile: "warning",
    getBadge: (s) =>
      s.achievementsUnlocked > 0
        ? { text: `${s.achievementsUnlocked} earned`, variant: "warning" }
        : null,
  },
  {
    href: "/client/progress/leaderboard",
    title: "Leaderboard",
    description: "Rankings and scores",
    icon: Star,
    tile: "pink",
    getBadge: (s) =>
      s.bestLeaderboardRank != null ? { text: `#${s.bestLeaderboardRank}`, variant: "pink" } : null,
  },
  {
    href: "/client/progress/body-metrics?tab=photos",
    title: "Photos",
    description: "Progress photos",
    icon: Camera,
    tile: "orange",
  },
  {
    href: "/client/progress/nutrition",
    title: "Nutrition",
    description: "Fuel and macro trends",
    icon: Flame,
    tile: "good",
  },
];

function ProgressHubContent() {
  const router = useRouter();
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
              className="w-7 h-7 mx-auto mb-3 fc-text-dim"
              strokeWidth={1.5}
              aria-hidden
            />
            <p className="text-sm fc-text-dim mb-4">{loadError}</p>
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

  const CYAN = "#4FE3E8";

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
        <div className={ps.psV1}>
          <PsHero
            glow="cyan"
            eyebrow="Progress hub"
            eyebrowColor={CYAN}
            title="Your progress"
            subtitle="Insights into your physical progress"
            rightSlot={
              <button
                type="button"
                onClick={() => router.push("/client/profile")}
                className={ps.psHeroIconBtn}
                aria-label="Open profile"
              >
                <Settings className="h-4 w-4" strokeWidth={2} />
              </button>
            }
          />

          {/* UI-6 This month hero */}
          <section className="mb-4 mt-4">
            <div className={ps.psMonthHero}>
              <div className="relative z-[1] flex flex-row items-start justify-between gap-2">
                <div>
                  <div className={ps.psEyebrowRow}>
                    <span
                      className={ps.psEyebrowDot}
                      style={{ color: CYAN, backgroundColor: CYAN }}
                      aria-hidden
                    />
                    <span
                      className={ps.psEyebrowText}
                      style={{ color: CYAN }}
                    >
                      This month
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span
                      className={cn(
                        ps.psFontDisplay,
                        "text-[48px] font-bold leading-none tabular-nums",
                      )}
                      style={{ color: "var(--ps-t1)" }}
                    >
                      {loading ? "—" : hub.workouts}
                    </span>
                    <span
                      className={cn(ps.psFontBody, "text-[13px]")}
                      style={{ color: "var(--ps-t2)" }}
                    >
                      workouts
                    </span>
                  </div>
                </div>
                <span
                  className={cn(ps.psFontMono, "text-[10px] uppercase shrink-0")}
                  style={{ color: "var(--ps-t3)", letterSpacing: "0.16em" }}
                >
                  {hub.monthYearLabel.replace(" ", "\u00A0")}
                </span>
              </div>

              <div className="relative z-[1] grid grid-cols-4 gap-2">
                <div className={ps.psStatTile}>
                  <FileText className="h-3.5 w-3.5" style={{ color: CYAN }} aria-hidden />
                  <span
                    className={cn(ps.psFontDisplay, "text-base font-bold tabular-nums")}
                    style={{ color: "var(--ps-t1)" }}
                  >
                    {loading ? "—" : hub.workouts > 0 ? hub.workouts : "—"}
                  </span>
                  <span className={cn(ps.psFontMono, "text-[8.5px] uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.1em" }}>
                    Workouts
                  </span>
                </div>
                <div className={ps.psStatTile}>
                  <Clock className="h-3.5 w-3.5" style={{ color: CYAN }} aria-hidden />
                  <span
                    className={cn(ps.psFontDisplay, "text-base font-bold tabular-nums")}
                    style={{ color: "var(--ps-t1)" }}
                  >
                    {loading ? "—" : formatMonthHubHours(hub.totalDurationMinutes)}
                  </span>
                  <span className={cn(ps.psFontMono, "text-[8.5px] uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.1em" }}>
                    Hours
                  </span>
                </div>
                <div className={ps.psStatTile}>
                  <TrendingUp className="h-3.5 w-3.5" style={{ color: "var(--ps-lime)" }} aria-hidden />
                  <span
                    className={cn(ps.psFontDisplay, "text-base font-bold tabular-nums")}
                    style={{ color: "var(--ps-t1)" }}
                  >
                    {loading ? "—" : formatMonthHubVolume(hub.volumeKg)}
                  </span>
                  <span className={cn(ps.psFontMono, "text-[8.5px] uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.1em" }}>
                    Vol kg
                  </span>
                </div>
                <div className={ps.psStatTile}>
                  <Trophy className="h-3.5 w-3.5" style={{ color: "var(--ps-warning)" }} aria-hidden />
                  <span
                    className={cn(ps.psFontDisplay, "text-base font-bold tabular-nums")}
                    style={{ color: "var(--ps-t1)" }}
                  >
                    {loading ? "—" : hub.newPRs > 0 ? hub.newPRs : "—"}
                  </span>
                  <span className={cn(ps.psFontMono, "text-[8.5px] uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.1em" }}>
                    New PRs
                  </span>
                </div>
              </div>

              {!loading && hub.workouts === 0 ? (
                <p className="relative z-[1] text-center text-sm" style={{ color: "var(--ps-t3)" }}>
                  No workouts logged this month yet
                </p>
              ) : (
                <div className="relative z-[1] border-t pt-2" style={{ borderColor: "var(--ps-line-2)", paddingTop: 8 }}>
                  <p
                    className={cn(ps.psFontMono, "mb-2 text-[9px] uppercase")}
                    style={{ color: "var(--ps-t3)", letterSpacing: "0.16em" }}
                  >
                    Workouts per week
                  </p>
                  <div className="flex justify-between gap-1.5">
                    {(() => {
                      const counts = hub.weeklyWorkoutCounts;
                      const maxC = Math.max(...counts, 1);
                      const barMaxPx = 56;
                      return counts.map((count, i) => {
                        const isCurrent = i === hub.currentWeekIndex;
                        const hPx = loading ? 4 : Math.max(4, (count / maxC) * barMaxPx);
                        const countDisplay = loading ? "—" : String(count);
                        const labelNum = count === 0 ? "var(--ps-t4)" : "var(--ps-t1)";
                        return (
                          <div key={i} className="flex min-w-0 flex-1 flex-col items-center">
                            <span
                              className={cn(ps.psFontDisplay, "mb-1 text-sm font-bold tabular-nums")}
                              style={{ color: labelNum }}
                            >
                              {countDisplay}
                            </span>
                            <div className="flex h-[72px] w-full flex-col justify-end">
                              <div
                                className="w-full rounded-t-[6px] transition-opacity"
                                style={{
                                  height: `${hPx}px`,
                                  minHeight: 4,
                                  opacity: isCurrent ? 1 : count > 0 ? 0.75 : 0.35,
                                  background: `linear-gradient(180deg, ${CYAN} 0%, #34A8AD 100%)`,
                                  boxShadow: isCurrent ? `0 0 0 1px ${CYAN}` : undefined,
                                }}
                              />
                            </div>
                            <span
                              className={cn(ps.psFontMono, "mt-1 text-[9px]")}
                              style={{ color: "var(--ps-t3)" }}
                            >
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

          {/* UI-7 Quick stats */}
          <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className={ps.psQuickTile}>
              <p className={cn(ps.psFontDisplay, "text-lg font-bold tabular-nums")} style={{ color: CYAN }}>
                {loading ? (
                  "—"
                ) : (
                  <>
                    {stats.weeklyWorkouts.completed}
                    <span className="text-[13px] font-normal" style={{ color: "var(--ps-t4)" }}>
                      /{stats.weeklyWorkouts.goal || 0}
                    </span>
                  </>
                )}
              </p>
              <span className={cn(ps.psFontMono, "text-[8.5px] uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.08em" }}>
                This week
              </span>
            </div>
            <div className={ps.psQuickTile}>
              <p className={cn(ps.psFontDisplay, "text-lg font-bold tabular-nums")} style={{ color: "var(--ps-lime)" }}>
                {loading ? "—" : Math.round(stats.volumeThisWeek).toLocaleString()}
              </p>
              <span className={cn(ps.psFontMono, "text-[8.5px] uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.08em" }}>
                Vol kg
              </span>
            </div>
            <div className={ps.psQuickTile}>
              <p className={cn(ps.psFontDisplay, "text-lg font-bold tabular-nums")} style={{ color: "var(--ps-t1)" }}>
                {loading ? "—" : stats.personalRecords}
              </p>
              <span className={cn(ps.psFontMono, "text-[8.5px] uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.08em" }}>
                PRs
              </span>
            </div>
            <div className={ps.psQuickTile}>
              <p className={cn(ps.psFontDisplay, "text-lg font-bold tabular-nums")} style={{ color: "var(--ps-warning)" }}>
                {loading ? "—" : stats.bestLeaderboardRank != null ? `#${stats.bestLeaderboardRank}` : "—"}
              </p>
              <span className={cn(ps.psFontMono, "text-[8.5px] uppercase")} style={{ color: "var(--ps-t3)", letterSpacing: "0.08em" }}>
                Best rank
              </span>
            </div>
          </section>

          {/* UI-8 Full analytics CTA */}
          <section className="mb-4">
            <button
              type="button"
              onClick={() => router.push("/client/progress/analytics")}
              className={ps.psAnalyticsCta}
            >
              <div className={ps.psAnalyticsIconSolid}>
                <LineChart className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </div>
              <div className="relative z-[1] min-w-0 flex-1">
                <p className={cn(ps.psFontHeadline, "text-[15px] font-bold leading-tight")} style={{ color: "var(--ps-t1)" }}>
                  Full analytics
                </p>
                <p className={cn(ps.psFontBody, "mt-0.5 text-[11px] leading-snug")} style={{ color: "var(--ps-t3)" }}>
                  Charts, strength, volume &amp; wellness trends
                </p>
              </div>
              <ChevronRight className="relative z-[1] h-5 w-5 shrink-0" style={{ color: "var(--ps-purple)" }} aria-hidden />
            </button>
          </section>

          {/* UI-9 Detail nav */}
          <section className="mb-6">
            <PsSectionEyebrow className="mb-2 px-1">Detail views</PsSectionEyebrow>
            <div className="flex flex-col gap-2">
              {HUB_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const badge = item.getBadge?.(stats) ?? null;
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className={ps.psNavRow}
                  >
                    <div className={cn(ps.psIconTile, HUB_TILE[item.tile])}>
                      <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn(ps.psFontBody, "text-[13.5px] font-semibold leading-tight")} style={{ color: "var(--ps-t1)" }}>
                          {item.title}
                        </span>
                        {badge ? (
                          <span className={cn(ps.psBadge, HUB_BADGE[badge.variant])}>{badge.text}</span>
                        ) : null}
                      </div>
                      <p className={cn(ps.psFontBody, "line-clamp-1 text-[11px] leading-snug")} style={{ color: "var(--ps-t3)" }}>
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className={cn(ps.psNavChevron, "h-4 w-4")} aria-hidden />
                  </button>
                );
              })}
              <div className={cn(ps.psNavRowStatic, "opacity-70")} aria-disabled>
                <div className={cn(ps.psIconTile, ps.psIconTileCyan)} style={{ opacity: 0.55 }}>
                  <Download className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={cn(ps.psFontBody, "text-[13.5px] font-semibold")} style={{ color: "var(--ps-t3)" }}>
                    Export
                  </span>
                  <p className={cn(ps.psFontBody, "line-clamp-1 text-[11px]")} style={{ color: "var(--ps-t4)" }}>
                    Share your progress with your coach
                  </p>
                </div>
                <ChevronRight className={cn(ps.psNavChevron, "h-4 w-4")} aria-hidden />
              </div>
            </div>
          </section>
        </div>
      </ClientPageShell>
    </AnimatedBackground>
  );
}

export default function ProgressHub() {
  return (
    <ProtectedRoute requiredRole="client">
      <ProgressHubContent />
    </ProtectedRoute>
  );
}
