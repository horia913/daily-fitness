"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
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
  Calendar,
  Layers,
  Download,
  Settings,
  Accessibility,
  FileText,
  Trophy,
  Camera,
  AlertTriangle,
  Apple,
} from "lucide-react";
import Link from "next/link";
import { getProgressStats, ProgressStats, getMonthlyProgressSummary, getMonthlyNarrativeData, type MonthlyProgressSummary, type MonthlyNarrativeData } from "@/lib/progressStatsService";
import { withTimeout } from "@/lib/withTimeout";
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
  { href: "/client/progress/photos", title: "Photos", description: "Progress photos", icon: Camera, iconClass: "bg-[color-mix(in_srgb,var(--fc-domain-habits)_10%,transparent)] text-[color:var(--fc-domain-habits)] border border-[color-mix(in_srgb,var(--fc-domain-habits)_20%,transparent)]", getBadge: () => null },
  { href: "/client/progress/nutrition", title: "Nutrition", description: "Fuel and macro trends", icon: Apple, iconClass: "bg-[color-mix(in_srgb,var(--fc-domain-meals)_10%,transparent)] text-[color:var(--fc-domain-meals)] border border-[color-mix(in_srgb,var(--fc-domain-meals)_20%,transparent)]", getBadge: () => null },
];

/** Main hub pills — everything except the “More” group */
const HUB_PILL_SLUGS_PRIMARY = new Set([
  "/client/progress/analytics",
  "/client/progress/workout-logs",
  "/client/progress/body-metrics",
  "/client/progress/personal-records",
  "/client/progress/achievements",
  "/client/progress/photos",
]);

const HUB_PILL_ITEMS_PRIMARY = HUB_NAV_ITEMS.filter((i) => HUB_PILL_SLUGS_PRIMARY.has(i.href));
const HUB_PILL_ITEMS_MORE = HUB_NAV_ITEMS.filter((i) => !HUB_PILL_SLUGS_PRIMARY.has(i.href));

function ProgressHubContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const pathname = usePathname() ?? "";

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
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlyProgressSummary | null>(null);
  const [narrativeData, setNarrativeData] = useState<MonthlyNarrativeData | null>(null);

  const loadProgressData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setLoadError(null);
      setLoadingStartedAt(Date.now());
      const [progressStats, summary, narrative] = await Promise.all([
        withTimeout(getProgressStats(user.id), 25000, "timeout"),
        getMonthlyProgressSummary(user.id),
        getMonthlyNarrativeData(user.id),
      ]);
      setStats(progressStats);
      setMonthlySummary(summary);
      setNarrativeData(narrative);
    } catch (error: any) {
      console.error("Error loading progress data:", error);
      setLoadError(error?.message === "timeout" ? "Loading took too long. Please try again." : (error?.message || "Failed to load progress"));
    } finally {
      setLoading(false);
      setLoadingStartedAt(null);
    }
  }, [user]);

  useEffect(() => {
    loadProgressData();
  }, [loadProgressData]);


  const monthName = new Date().toLocaleDateString("en-US", { month: "long" });
  const narrativeParagraph = (() => {
    if (!monthlySummary || !narrativeData) return null;
    const m = monthlySummary.thisMonth;
    const n = narrativeData;
    const parts: string[] = [];
    if (m.workouts > 0) {
      const volStr = Math.round(m.volume).toLocaleString();
      const durStr = m.avgDurationMinutes != null ? `, averaging ${m.avgDurationMinutes} min per session` : "";
      parts.push(`You completed ${m.workouts} workout${m.workouts !== 1 ? "s" : ""} totaling ${volStr} kg of volume${durStr}.`);
    }
    if (m.checkIns > 0) {
      const sleepStr = n.avgSleep != null ? ` average sleep ${n.avgSleep}/5` : "";
      const stressStr = n.avgStress != null ? `, stress ${n.avgStress}/5` : "";
      parts.push(`Your check-in streak reached ${m.checkIns} day${m.checkIns !== 1 ? "s" : ""}${sleepStr}${stressStr}.`);
    }
    if (m.weightChange != null && m.weightChange !== 0) {
      const dir = m.weightChange < 0 ? "down" : "up";
      parts.push(`Weight is ${dir} ${Math.abs(m.weightChange).toFixed(1)} kg this month.`);
    }
    if (m.newPRs > 0) {
      const prList = n.prNames.length > 0 ? ` including ${n.prNames.slice(0, 3).join(", ")}${n.prNames.length > 3 ? " and more" : ""}` : "";
      parts.push(`You set ${m.newPRs} new PR${m.newPRs !== 1 ? "s" : ""}${prList}.`);
    }
    if (m.achievements > 0) {
      const achList = n.achievementNames.length > 0 ? ` (${n.achievementNames.slice(0, 2).join(", ")}${n.achievementNames.length > 2 ? "…" : ""})` : "";
      parts.push(`${m.achievements} achievement${m.achievements !== 1 ? "s" : ""} earned${achList}.`);
    }
    if (n.nutritionAdherencePct != null && n.nutritionAdherencePct > 0) {
      parts.push(`Nutrition adherence: ${n.nutritionAdherencePct}% this month.`);
    }
    if (parts.length === 0) return null;
    const intro = parts.length > 0 ? `${monthName} in review: ` : "";
    return intro + parts.join(" ") + " Keep it up!";
  })();

  if (loadError) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-6xl fc-page pb-32 px-4">
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-8 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--fc-status-warning)" }} />
            <p className="text-base font-semibold fc-text-primary mb-1">Something went wrong</p>
            <p className="text-sm fc-text-dim mb-4">{loadError}</p>
            <button
              type="button"
              onClick={() => loadProgressData()}
              className="fc-btn fc-btn-primary fc-press h-12 px-6"
            >
              Retry
            </button>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 mx-auto w-full max-w-6xl fc-page px-4 pb-32 sm:px-6">
        {/* This month summary — first thing */}
        {monthlySummary && (
          <div className="mb-6 border-b border-white/5 pb-5">
            <h2 className="text-lg font-semibold fc-text-primary mb-2">
              {monthlySummary.isFirstMonth ? "This month so far" : "This month"}
            </h2>
            {monthlySummary.isFirstMonth ? (
              <p className="text-sm fc-text-primary">
                Your first month! Here&apos;s what you&apos;ve done so far: {monthlySummary.thisMonth.workouts} workout{monthlySummary.thisMonth.workouts !== 1 ? "s" : ""}, {Math.round(monthlySummary.thisMonth.volume).toLocaleString()} kg lifted, {monthlySummary.thisMonth.checkIns} check-in{monthlySummary.thisMonth.checkIns !== 1 ? "s" : ""}, {monthlySummary.thisMonth.newPRs} new PR{monthlySummary.thisMonth.newPRs !== 1 ? "s" : ""}
                {monthlySummary.thisMonth.weightChange != null && `, ${monthlySummary.thisMonth.weightChange > 0 ? "+" : ""}${monthlySummary.thisMonth.weightChange} kg`}
                {monthlySummary.thisMonth.achievements > 0 && `, ${monthlySummary.thisMonth.achievements} achievement${monthlySummary.thisMonth.achievements !== 1 ? "s" : ""}`}.
              </p>
            ) : (
              <>
                <p className="text-sm fc-text-primary mb-2">
                  {monthlySummary.thisMonth.workouts} workout{monthlySummary.thisMonth.workouts !== 1 ? "s" : ""}, {Math.round(monthlySummary.thisMonth.volume).toLocaleString()} kg lifted, {monthlySummary.thisMonth.checkIns} check-in{monthlySummary.thisMonth.checkIns !== 1 ? "s" : ""}, {monthlySummary.thisMonth.newPRs} new PR{monthlySummary.thisMonth.newPRs !== 1 ? "s" : ""}
                  {monthlySummary.thisMonth.weightChange != null && `, ${monthlySummary.thisMonth.weightChange > 0 ? "+" : ""}${monthlySummary.thisMonth.weightChange} kg`}
                  {monthlySummary.thisMonth.achievements > 0 && `, ${monthlySummary.thisMonth.achievements} achievement${monthlySummary.thisMonth.achievements !== 1 ? "s" : ""}`}.
                </p>
                <p className="text-xs fc-text-dim">
                  Vs last month: {(() => {
                    const lm = monthlySummary.lastMonth!;
                    const tm = monthlySummary.thisMonth;
                    const parts: string[] = [];
                    const dw = tm.workouts - lm.workouts;
                    if (dw !== 0) parts.push(`${dw > 0 ? "↑" : "↓"} ${Math.abs(dw)} more workout${Math.abs(dw) !== 1 ? "s" : ""}`);
                    const dvol = Math.round(tm.volume - lm.volume);
                    if (dvol !== 0) parts.push(`${dvol > 0 ? "↑" : "↓"} ${Math.abs(dvol).toLocaleString()} kg volume`);
                    if (tm.weightChange != null && lm.weightChange != null) {
                      const dkg = Math.round(((tm.weightChange - lm.weightChange) * 10) / 10);
                      if (dkg !== 0) parts.push(`${dkg > 0 ? "↑" : "↓"} ${Math.abs(dkg).toFixed(1)} kg`);
                    }
                    return parts.length ? parts.join(", ") : "Similar to last month";
                  })()}
                </p>
              </>
            )}
          </div>
        )}

        {/* Monthly "In Review" narrative card */}
        {narrativeParagraph && (
          <div className="mb-6 border-b border-white/5 pb-5">
            <h2 className="text-lg font-semibold fc-text-primary mb-2">In Review</h2>
            <p className="text-sm fc-text-primary leading-relaxed">{narrativeParagraph}</p>
          </div>
        )}

        <header className="mb-6 flex items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)]">
              <Layers className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                Progress Hub
              </h1>
              <p className="mt-1 text-sm text-[color:var(--fc-text-dim)]">
                Insights into your physical progress
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/client/profile";
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-subtle)] transition-colors hover:text-[color:var(--fc-text-primary)]"
          >
            <Settings className="h-6 w-6" />
          </button>
        </header>

        <section className="mb-3 mt-3">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {HUB_PILL_ITEMS_PRIMARY.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    window.location.href = item.href;
                  }}
                  className={`min-h-[40px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-[color:var(--fc-accent-cyan)]/50 bg-[color:var(--fc-accent-cyan)]/20 fc-text-primary"
                      : "border-[color:var(--fc-glass-border)] fc-text-dim hover:fc-text-primary"
                  }`}
                >
                  {item.title}
                </button>
              );
            })}
            <span className="pl-1 text-[11px] font-medium uppercase tracking-wider fc-text-dim">
              More
            </span>
            {HUB_PILL_ITEMS_MORE.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    window.location.href = item.href;
                  }}
                  className={`min-h-[36px] shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                    active
                      ? "bg-[color:var(--fc-accent-cyan)]/25 fc-text-primary"
                      : "fc-text-dim hover:fc-text-primary"
                  }`}
                >
                  {item.title}
                </button>
              );
            })}
          </div>
        </section>

        {/* Quick stats — single compact strip, no per-metric cards */}
        <section className="mb-8 border-y border-white/5 py-3">
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1">
            <span className="fc-text-subtle">
              <span className="uppercase tracking-wider text-[10px]">This week</span>{" "}
              <span className="font-mono font-semibold fc-text-primary">
                {loading ? "—" : stats.weeklyWorkouts.completed}/{stats.weeklyWorkouts.goal || 0}
              </span>{" "}
              workouts
            </span>
            <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
            <span className="fc-text-subtle">
              <span className="uppercase tracking-wider text-[10px]">Volume</span>{" "}
              <span className="font-mono font-semibold fc-text-primary">
                {loading
                  ? "—"
                  : stats.volumeThisWeek >= 1000
                    ? `${(stats.volumeThisWeek / 1000).toFixed(1)}t`
                    : `${Math.round(stats.volumeThisWeek).toLocaleString()} kg`}
              </span>
              {!loading && stats.volumeLastWeek > 0 && (
                <span className="ml-1 text-xs fc-text-dim">
                  {stats.volumeThisWeek > stats.volumeLastWeek
                    ? `↑${Math.round(stats.volumeThisWeek - stats.volumeLastWeek)}`
                    : stats.volumeThisWeek < stats.volumeLastWeek
                      ? `↓${Math.round(stats.volumeLastWeek - stats.volumeThisWeek)}`
                      : "→"}
                </span>
              )}
            </span>
            <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
            <span className="fc-text-subtle">
              <span className="uppercase tracking-wider text-[10px]">PRs</span>{" "}
              <span className="font-mono font-semibold fc-text-primary">
                {loading ? "—" : stats.personalRecords}
              </span>
            </span>
            <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
            <span className="fc-text-subtle">
              <span className="uppercase tracking-wider text-[10px]">Achievements</span>{" "}
              <span className="font-mono font-semibold fc-text-primary">
                {loading ? "—" : stats.achievementsUnlocked}
              </span>
            </span>
            {stats.bestLeaderboardRank != null && (
              <>
                <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
                <span className="fc-text-subtle">
                  <span className="uppercase tracking-wider text-[10px]">Best rank</span>{" "}
                  <span className="font-mono font-semibold fc-text-primary">
                    #{loading ? "—" : stats.bestLeaderboardRank}
                  </span>
                </span>
              </>
            )}
          </div>
        </section>

        {/* Hub links — flat rows */}
        <section className="mb-10 flex flex-col border-b border-white/5">
          {HUB_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const badge = item.getBadge?.(stats) ?? null;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div className="flex min-h-[52px] cursor-pointer items-center gap-3 border-b border-white/5 py-3 transition-colors hover:bg-white/[0.02]">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.iconClass}`}
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
                  <ChevronRight className="h-5 w-5 shrink-0 fc-text-subtle" />
                </div>
              </Link>
            );
          })}
          <div className="flex min-h-[52px] items-center gap-3 py-3 opacity-80">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-domain-neutral)]/10 fc-text-subtle">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold fc-text-dim">Export</h3>
              <p className="line-clamp-1 text-xs fc-text-subtle">
                Share your progress with your coach
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 fc-text-subtle" />
          </div>
        </section>

      </div>
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
