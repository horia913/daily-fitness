"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Activity } from "lucide-react";
import { PsHero } from "@/components/client/progress-suite";
import ps from "@/components/client/progress-suite/progressSuiteV1.module.css";
import { cn } from "@/lib/utils";
import {
  getActivitiesByDateRange,
  ACTIVITY_META,
  type ClientActivity,
} from "@/lib/clientActivityService";
import { EmptyState } from "@/components/ui/EmptyState";

function ActivitiesCharts({ recentActivities }: { recentActivities: ClientActivity[] }) {
  const byWeek: Record<string, { count: number; minutes: number }> = {};
  const byType: Record<string, number> = {};

  for (const a of recentActivities) {
    const d = new Date(a.activity_date + "T00:00:00");
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    const weekKey = monday.toISOString().split("T")[0];

    if (!byWeek[weekKey]) byWeek[weekKey] = { count: 0, minutes: 0 };
    byWeek[weekKey].count++;
    byWeek[weekKey].minutes += a.duration_minutes;

    const label =
      a.activity_type === "custom"
        ? (a.custom_activity_name ?? "Custom")
        : (ACTIVITY_META[a.activity_type]?.label ?? a.activity_type);
    byType[label] = (byType[label] || 0) + 1;
  }

  const weekKeys = Object.keys(byWeek).sort();
  const last8Weeks = weekKeys.slice(-8);
  const maxMinutes = Math.max(...last8Weeks.map((w) => byWeek[w].minutes), 1);

  const sortedTypes = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const totalByType = sortedTypes.reduce((s, [, c]) => s + c, 0);

  const totalMinutes = recentActivities.reduce((s, a) => s + a.duration_minutes, 0);

  return (
    <div className="fc-card-shell backdrop-blur-[8px] p-4 mt-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--fc-accent-cyan)] shadow-[0_10px_20px_color-mix(in_srgb,var(--fc-accent-cyan)_25%,transparent)]">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Extra Activities
          </h2>
          <p className="text-xs fc-text-dim">
            Your logged activities beyond workouts
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-[color:var(--fc-text-primary)] mb-3">
            Weekly Duration (minutes)
          </p>
          <div className="flex items-end gap-1.5 h-24">
            {last8Weeks.map((w) => {
              const pct = (byWeek[w].minutes / maxMinutes) * 100;
              const weekDate = new Date(w + "T00:00:00");
              const label = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`;
              return (
                <div key={w} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] fc-text-dim">{byWeek[w].minutes}</span>
                  <div
                    className="w-full rounded-t-md bg-[color:var(--fc-accent-cyan)] transition-all duration-500"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                  <span className="text-[9px] fc-text-dim">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-[color:var(--fc-text-primary)] mb-3">
            Activity Types
          </p>
          <div className="space-y-2">
            {sortedTypes.map(([label, count]) => {
              const pct = Math.round((count / totalByType) * 100);
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-sm fc-text-primary w-24 truncate">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-[color:var(--fc-glass-soft)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[color:var(--fc-accent-cyan)] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs fc-text-dim w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[color:var(--fc-glass-border)]">
          <div className={ps.psQuickTile}>
            <span
              className={cn(ps.psFontDisplay, "text-lg font-bold tabular-nums")}
              style={{ color: "var(--ps-t1)" }}
            >
              {recentActivities.length}
            </span>
            <span
              className={cn(ps.psFontMono, "text-[8.5px] uppercase")}
              style={{ color: "var(--ps-t3)", letterSpacing: "0.08em" }}
            >
              Total activities
            </span>
          </div>
          <div className={ps.psQuickTile}>
            <span
              className={cn(ps.psFontDisplay, "text-lg font-bold tabular-nums")}
              style={{ color: "var(--ps-cyan)" }}
            >
              {totalMinutes}
            </span>
            <span
              className={cn(ps.psFontMono, "text-[8.5px] uppercase")}
              style={{ color: "var(--ps-t3)", letterSpacing: "0.08em" }}
            >
              Total minutes
            </span>
          </div>
          <div className={ps.psQuickTile}>
            <span
              className={cn(ps.psFontDisplay, "text-lg font-bold tabular-nums")}
              style={{ color: "var(--ps-lime)" }}
            >
              {Object.keys(byType).length}
            </span>
            <span
              className={cn(ps.psFontMono, "text-[8.5px] uppercase")}
              style={{ color: "var(--ps-t3)", letterSpacing: "0.08em" }}
            >
              Activity types
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActivitiesProgressPage() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<ClientActivity[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
      const data = await getActivitiesByDateRange(
        user.id,
        threeMonthsAgo.toISOString().split("T")[0],
        new Date().toISOString().split("T")[0],
      );
      setRecentActivities(data);
    } catch {
      setRecentActivities([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
    }, 20_000);
    void loadData().finally(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [user?.id, loadData]);

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
            <PageSkeleton variant="dashboard" />
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
          <div className={ps.psV1}>
            <PsHero
              glow="cyan"
              onBack={() => router.push("/client/progress")}
              backAriaLabel="Back to progress hub"
              eyebrow="Progress · activities"
              eyebrowColor="#4FE3E8"
              title="Extra Activities"
              subtitle="Cardio, walks, and other sessions beyond your program"
            />

            {recentActivities.length > 0 ? (
              <ActivitiesCharts recentActivities={recentActivities} />
            ) : (
              <div className="fc-card-shell backdrop-blur-[8px] p-6 mt-4 flex justify-center">
                <EmptyState
                  title="No activities logged"
                  description="Log cardio, walks, or other activities to see charts here."
                />
              </div>
            )}
          </div>
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
