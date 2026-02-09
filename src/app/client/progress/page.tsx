"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { getProgressStats, ProgressStats } from "@/lib/progressStatsService";
import { withTimeout } from "@/lib/withTimeout";

const HUB_NAV_ITEMS: {
  href: string;
  title: string;
  description: string;
  icon: typeof BarChart3;
  iconClass: string;
  getBadge?: (stats: ProgressStats) => string | null;
}[] = [
  { href: "/client/progress/analytics", title: "Analytics", description: "Volume and intensity trends", icon: BarChart3, iconClass: "bg-purple-500/10 text-purple-400 border border-purple-500/20", getBadge: () => null },
  { href: "/client/progress/performance", title: "Performance tests", description: "Benchmarks and tests", icon: Timer, iconClass: "bg-orange-500/10 text-orange-400 border border-orange-500/20", getBadge: () => null },
  { href: "/client/progress/body-metrics", title: "Body metrics", description: "Weight and measurements", icon: Scale, iconClass: "bg-blue-500/10 text-blue-400 border border-blue-500/20", getBadge: (s) => (s.currentWeight != null ? "Logged" : null) },
  { href: "/client/progress/mobility", title: "Mobility", description: "Screening and flexibility", icon: Accessibility, iconClass: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", getBadge: () => null },
  { href: "/client/progress/personal-records", title: "Personal records", description: "PRs and lifts", icon: Dumbbell, iconClass: "bg-red-500/10 text-red-400 border border-red-500/20", getBadge: (s) => (s.personalRecords > 0 ? `${s.personalRecords} PRs` : null) },
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
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadProgressData();
  }, [user]);

  const loadProgressData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setLoadError(null);
      const progressStats = await withTimeout(
        getProgressStats(user.id),
        25000,
        "timeout"
      );
      setStats(progressStats);
    } catch (error: any) {
      console.error("Error loading progress data:", error);
      setLoadError(error?.message === "timeout" ? "Loading took too long. Please try again." : (error?.message || "Failed to load progress"));
    } finally {
      setLoading(false);
    }
  };

  if (loadError) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-6xl fc-page pb-24 px-4">
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

      <div className="relative z-10 mx-auto w-full max-w-6xl fc-page pb-24">
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
                <div className="text-2xl font-bold font-mono fc-text-primary">—</div>
                <div className="text-xs fc-text-subtle mt-1">Total weight lifted</div>
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
