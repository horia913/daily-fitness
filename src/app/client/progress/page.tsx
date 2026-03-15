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
  Calendar,
  Layers,
  Download,
  Settings,
  Accessibility,
  FileText,
  Trophy,
  Camera,
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
  { href: "/client/progress/analytics", title: "Analytics", description: "Volume and intensity trends", icon: BarChart3, iconClass: "bg-blue-500/10 text-blue-400 border border-blue-500/20", getBadge: () => null },
  { href: "/client/progress/workout-logs", title: "Workout History", description: "View past workouts and training volume", icon: FileText, iconClass: "bg-blue-500/10 text-blue-400 border border-blue-500/20", getBadge: (s) => (s.totalWorkouts > 0 ? `${s.totalWorkouts} total` : null) },
  { href: "/client/progress/performance", title: "Performance tests", description: "Benchmarks and tests", icon: Timer, iconClass: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", getBadge: () => null },
  { href: "/client/progress/body-metrics", title: "Body metrics", description: "Weight and measurements", icon: Scale, iconClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", getBadge: (s) => (s.currentWeight != null ? "Logged" : null) },
  { href: "/client/progress/mobility", title: "Mobility", description: "Screening and flexibility", icon: Accessibility, iconClass: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", getBadge: () => null },
  { href: "/client/progress/personal-records", title: "Personal records", description: "PRs and lifts", icon: Dumbbell, iconClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20", getBadge: (s) => (s.personalRecords > 0 ? `${s.personalRecords} PRs` : null) },
  { href: "/client/progress/achievements", title: "Achievements", description: "Badges and milestones", icon: Award, iconClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20", getBadge: (s) => (s.achievementsUnlocked > 0 ? `${s.achievementsUnlocked} Earned` : null) },
  { href: "/client/progress/leaderboard", title: "Leaderboard", description: "Rankings and scores", icon: Trophy, iconClass: "bg-rose-500/10 text-rose-400 border border-rose-500/20", getBadge: (s) => (s.bestLeaderboardRank != null ? `#${s.bestLeaderboardRank}` : null) },
  { href: "/client/progress/photos", title: "Photos", description: "Progress photos", icon: Camera, iconClass: "bg-violet-500/10 text-violet-400 border border-violet-500/20", getBadge: () => null },
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
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-8 text-center">
            <p className="text-[color:var(--fc-text-dim)] mb-4">{loadError}</p>
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

      <div className="relative z-10 mx-auto w-full max-w-6xl fc-page pb-32">
        {/* This month summary — first thing */}
        {monthlySummary && (
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-5 mb-6">
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
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-5 mb-6">
            <h2 className="text-lg font-semibold fc-text-primary mb-2">In Review</h2>
            <p className="text-sm fc-text-primary leading-relaxed">{narrativeParagraph}</p>
          </div>
        )}

        <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-10 mb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                  Progress Hub
                </h1>
                <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                  Insights into your physical progress
                </p>
              </div>
            </div>
            <Link href="/client/profile" className="w-12 h-12 rounded-xl fc-surface border border-[color:var(--fc-surface-card-border)] flex items-center justify-center text-[color:var(--fc-text-subtle)] hover:text-[color:var(--fc-text-primary)] transition-colors shrink-0">
              <Settings className="w-6 h-6" />
            </Link>
          </div>
        </div>

        {/* Quick Stats Banner — vertical stack on mobile, no horizontal scroll */}
        <section className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-nowrap">
            <div className="flex-1 min-w-0 fc-surface p-5 flex flex-col justify-between min-h-[120px] rounded-2xl border border-[color:var(--fc-surface-card-border)]">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium fc-text-subtle uppercase tracking-widest">Workouts</span>
                <Calendar className="w-5 h-5 fc-text-workouts" />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono fc-text-primary">
                  {loading ? "—" : stats.weeklyWorkouts.completed}
                  <span className="text-base fc-text-subtle"> / {stats.weeklyWorkouts.goal || 0}</span>
                </div>
                <div className="text-xs fc-text-success font-medium mt-1">This week</div>
              </div>
            </div>
            <div className="flex-1 min-w-0 fc-surface p-5 flex flex-col justify-between min-h-[120px] rounded-2xl border border-[color:var(--fc-surface-card-border)]">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium fc-text-subtle uppercase tracking-widest">Volume</span>
                <Layers className="w-5 h-5 fc-text-error" />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono fc-text-primary">
                  {loading ? "—" : stats.volumeThisWeek >= 1000
                    ? `${(stats.volumeThisWeek / 1000).toFixed(1)}t`
                    : `${Math.round(stats.volumeThisWeek).toLocaleString()} kg`}
                </div>
                <div className="text-xs fc-text-subtle mt-1">
                  {loading ? "Total weight lifted" : stats.volumeLastWeek > 0
                    ? stats.volumeThisWeek > stats.volumeLastWeek
                      ? `↑ ${Math.round(stats.volumeThisWeek - stats.volumeLastWeek).toLocaleString()} kg vs last week`
                      : stats.volumeThisWeek < stats.volumeLastWeek
                        ? `↓ ${Math.round(stats.volumeLastWeek - stats.volumeThisWeek).toLocaleString()} kg vs last week`
                        : "→ Same as last week"
                    : "This week"}
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 fc-surface p-5 flex flex-col justify-between min-h-[120px] rounded-2xl border border-[color:var(--fc-surface-card-border)]">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium fc-text-subtle uppercase tracking-widest">Records</span>
                <Award className="w-5 h-5 fc-text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono fc-text-primary">{loading ? "—" : stats.personalRecords}</div>
                <div className="text-xs fc-text-subtle mt-1">Personal records</div>
              </div>
            </div>
            <div className="flex-1 min-w-0 fc-surface p-5 flex flex-col justify-between min-h-[120px] rounded-2xl border border-[color:var(--fc-surface-card-border)]">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium fc-text-subtle uppercase tracking-widest">Achievements</span>
                <Award className="w-5 h-5 fc-text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono fc-text-primary">{loading ? "—" : stats.achievementsUnlocked}</div>
                <div className="text-xs fc-text-subtle mt-1">Earned</div>
              </div>
            </div>
            {stats.bestLeaderboardRank != null && (
              <div className="flex-1 min-w-0 fc-surface p-5 flex flex-col justify-between min-h-[120px] rounded-2xl border border-[color:var(--fc-surface-card-border)]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-medium fc-text-subtle uppercase tracking-widest">Best rank</span>
                  <Trophy className="w-5 h-5 fc-text-yellow-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono fc-text-primary">#{loading ? "—" : stats.bestLeaderboardRank}</div>
                  <div className="text-xs fc-text-subtle mt-1">Leaderboard</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Navigation Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {HUB_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const badge = item.getBadge?.(stats) ?? null;
            return (
              <Link key={item.href} href={item.href}>
                <div className="fc-surface p-6 rounded-2xl cursor-pointer fc-hover-rise h-full group border border-[color:var(--fc-surface-card-border)] hover:border-[color:var(--fc-glass-border-strong)] transition-all">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${item.iconClass}`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold fc-text-primary mb-1">{item.title}</h3>
                      <p className="text-sm fc-text-dim mb-4">{item.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 fc-text-subtle group-hover:fc-text-primary transition-colors flex-shrink-0" />
                  </div>
                  {badge && (
                    <div className="fc-glass-soft px-2.5 py-1 rounded-lg border border-[color:var(--fc-glass-border)] inline-block">
                      <span className="text-xs font-mono fc-text-primary">{badge}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
          <div className="fc-surface p-6 rounded-2xl border border-dashed border-[color:var(--fc-surface-card-border)] h-full group opacity-80">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-[color:var(--fc-domain-neutral)]/10 fc-text-subtle border border-[color:var(--fc-glass-border)]">
              <Download className="w-8 h-8" />
            </div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold fc-text-dim mb-1">Export</h3>
                <p className="text-sm fc-text-subtle mb-4">Share your progress with your coach</p>
              </div>
              <ChevronRight className="w-5 h-5 fc-text-subtle flex-shrink-0" />
            </div>
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
