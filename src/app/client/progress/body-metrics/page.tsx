"use client";

import React, { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import {
  ArrowLeft,
  Scale,
  TrendingUp,
  TrendingDown,
  Plus,
  Activity,
  Target,
  ListFilter,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { LogMeasurementModal } from "@/components/client/LogMeasurementModal";

interface BodyMetric {
  date: string;
  weight: number;
  waist?: number;
  bodyFat?: number;
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffHours = Math.round((now.getTime() - d.getTime()) / (60 * 60 * 1000));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function BodyMetricsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [chartRange, setChartRange] = useState<"12M" | "6M" | "1M">("12M");

  useEffect(() => {
    if (user && !authLoading) {
      loadMetricsData();
    }
  }, [user, authLoading]);

  const loadMetricsData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
      const { data, error } = await supabase
        .from("body_metrics")
        .select("measured_date, weight_kg, waist_circumference, body_fat_percentage")
        .eq("client_id", user.id)
        .gte("measured_date", twelveWeeksAgo.toISOString().split("T")[0])
        .order("measured_date", { ascending: true });

      if (error) {
        console.error("Error loading measurements:", error);
        setMetrics([]);
      } else {
        setMetrics(
          (data || []).map((m) => ({
            date: m.measured_date,
            weight: m.weight_kg,
            waist: m.waist_circumference ?? undefined,
            bodyFat: m.body_fat_percentage ?? undefined,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading body metrics:", error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const { current, previous } = useMemo(() => {
    if (metrics.length === 0) return { current: null, previous: null };
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const currentMonthMetrics = metrics.filter((m) => {
      const d = new Date(m.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const previousMonthMetrics = metrics.filter((m) => {
      const d = new Date(m.date);
      return d.getMonth() === previousMonth && d.getFullYear() === previousYear;
    });
    return {
      current:
        currentMonthMetrics.length > 0
          ? currentMonthMetrics[currentMonthMetrics.length - 1]
          : metrics[metrics.length - 1],
      previous:
        previousMonthMetrics.length > 0
          ? previousMonthMetrics[previousMonthMetrics.length - 1]
          : null,
    };
  }, [metrics]);

  const currentWeight = current?.weight ?? 0;
  const currentWaist = current?.waist ?? 0;
  const currentBodyFat = current?.bodyFat ?? 0;
  const weightChange = previous ? currentWeight - previous.weight : 0;
  const waistChange =
    previous && currentWaist != null && previous.waist != null
      ? currentWaist - previous.waist
      : null;
  const bodyFatChange =
    previous && currentBodyFat != null && previous.bodyFat != null
      ? currentBodyFat - previous.bodyFat
      : null;

  const historyNewestFirst = useMemo(
    () => [...metrics].reverse(),
    [metrics]
  );

  const latestDate = metrics.length > 0 ? metrics[metrics.length - 1].date : null;

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-32 pt-6 sm:px-6 lg:px-8 fc-page">
            <div className="fc-surface p-8 rounded-2xl">
              <div className="animate-pulse space-y-6">
                <div className="h-24 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 h-56 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                  <div className="h-56 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                </div>
                <div className="h-72 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-32 pt-6 sm:px-6 lg:px-8 fc-page">
        {/* Header */}
        <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-10 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Link href="/client/progress" className="fc-surface w-10 h-10 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-surface-card-border)]">
                <ArrowLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
              </Link>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <nav className="flex items-center gap-2 text-sm text-[color:var(--fc-text-dim)] mb-1">
                    <Link href="/client/progress" className="hover:text-[color:var(--fc-text-primary)]">Progress</Link>
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    <span className="text-[color:var(--fc-text-primary)]">Body Metrics</span>
                  </nav>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                    Body Metrics
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                    {latestDate ? (
                      <>Updated {formatTimeAgo(latestDate)}</>
                    ) : (
                      <>Weight and measurements over time</>
                    )}
                  </p>
                </div>
              </div>
            </div>
            {latestDate && (
              <div className="flex items-center gap-3 fc-glass-soft px-4 py-2 rounded-2xl border border-[color:var(--fc-glass-border)] shrink-0">
                <div className="w-2 h-2 rounded-full bg-[color:var(--fc-status-success)] animate-pulse" />
                <span className="text-sm fc-text-subtle">
                  <span className="font-mono fc-text-primary">{formatTimeAgo(latestDate)}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {metrics.length === 0 ? (
          <div className="fc-surface p-10 rounded-2xl border border-[color:var(--fc-surface-card-border)] text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
              <Scale className="h-10 w-10 fc-text-subtle" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold fc-text-primary">
              No measurements yet
            </h2>
            <p className="mt-2 text-sm fc-text-dim">
              Log weight, waist, and body fat to see trends over time.
            </p>
            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              className="fc-btn fc-btn-primary mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl"
            >
              <Plus className="h-5 w-5" />
              Log first measurement
            </button>
          </div>
        ) : (
          <main className="space-y-8">
            {/* Hero: Current weight + Goal */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                className="md:col-span-2 fc-surface p-6 sm:p-8 rounded-2xl border border-[color:var(--fc-surface-card-border)] min-h-[220px] flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold uppercase tracking-widest fc-text-subtle">
                    Current body weight
                  </span>
                  {weightChange !== 0 && (
                    <div
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                        weightChange < 0
                          ? "bg-[color:var(--fc-status-success)]/10 text-[color:var(--fc-status-success)]"
                          : "bg-[color:var(--fc-status-warning)]/10 fc-text-warning"
                      }`}
                    >
                      {weightChange < 0 ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : (
                        <TrendingUp className="w-4 h-4" />
                      )}
                      {weightChange > 0 ? "+" : ""}
                      {weightChange.toFixed(1)} kg
                      <span className="text-[10px] ml-1 opacity-70">month</span>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <AnimatedNumber
                    value={currentWeight}
                    decimals={1}
                    className="text-4xl sm:text-5xl font-bold font-mono tracking-tight fc-text-primary"
                  />
                  <span className="text-2xl font-medium fc-text-subtle">kg</span>
                </div>
                <div className="flex flex-wrap gap-6 sm:gap-8 mt-6">
                  {currentWaist > 0 && (
                    <div>
                      <p className="text-xs fc-text-subtle uppercase mb-1">Waist</p>
                      <p className="text-xl font-semibold font-mono fc-text-primary">
                        {currentWaist}
                        <span className="text-sm fc-text-subtle"> cm</span>
                      </p>
                      {waistChange !== null && waistChange !== 0 && (
                        <p
                          className={`text-[10px] font-bold ${
                            waistChange < 0 ? "fc-text-success" : "fc-text-warning"
                          }`}
                        >
                          {waistChange > 0 ? "+" : ""}
                          {waistChange} cm
                        </p>
                      )}
                    </div>
                  )}
                  {currentBodyFat > 0 && (
                    <div>
                      <p className="text-xs fc-text-subtle uppercase mb-1">Body fat</p>
                      <p className="text-xl font-semibold font-mono fc-text-primary">
                        {currentBodyFat}
                        <span className="text-sm fc-text-subtle">%</span>
                      </p>
                      {bodyFatChange !== null && bodyFatChange !== 0 && (
                        <p
                          className={`text-[10px] font-bold ${
                            bodyFatChange < 0 ? "fc-text-success" : "fc-text-warning"
                          }`}
                        >
                          {bodyFatChange > 0 ? "+" : ""}
                          {bodyFatChange.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div
                className="fc-surface p-6 rounded-2xl border border-[color:var(--fc-surface-card-border)] flex flex-col items-center justify-center text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-[color:var(--fc-status-error)]/10 flex items-center justify-center fc-text-error mb-4">
                  <Target className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold fc-text-primary mb-2">Goal target</h3>
                <p className="text-2xl font-bold font-mono fc-text-primary">
                  — <span className="text-lg fc-text-subtle">kg</span>
                </p>
                <p className="text-xs fc-text-subtle mt-3">Set a weight goal in Goals</p>
              </div>
            </section>

            {/* Weight timeline */}
            <div
              className="fc-surface p-6 sm:p-8 rounded-2xl border border-[color:var(--fc-surface-card-border)]"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-semibold fc-text-primary flex items-center gap-2">
                  <Activity className="w-5 h-5 fc-text-workouts" />
                  Weight timeline
                </h3>
                <div className="flex fc-glass-soft p-1 rounded-xl border border-[color:var(--fc-glass-border)]">
                  {(["12M", "6M", "1M"] as const).map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setChartRange(range)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        chartRange === range
                          ? "fc-glass fc-text-primary"
                          : "fc-text-subtle hover:fc-text-primary"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              {metrics.length > 0 ? (
                <div className="flex items-end justify-between gap-1 sm:gap-2 h-64">
                  {metrics.slice(-12).map((metric, index) => {
                    const maxW = Math.max(...metrics.map((m) => m.weight));
                    const minW = Math.min(...metrics.map((m) => m.weight));
                    const range = maxW - minW || 1;
                    const height = ((metric.weight - minW) / range) * 100;
                    return (
                      <div key={`${metric.date}-${index}`} className="flex-1 flex flex-col items-center min-w-0">
                        <div
                          className="w-full rounded-t-lg min-h-[20px] transition-opacity hover:opacity-90"
                          style={{
                            height: `${Math.max(height, 8)}%`,
                            background:
                              "linear-gradient(135deg, var(--fc-status-error) 0%, var(--fc-accent-blue) 100%)",
                          }}
                        />
                        <div className="mt-2 text-center truncate w-full">
                          <p className="text-xs font-semibold fc-text-primary truncate">
                            {metric.weight.toFixed(1)}
                          </p>
                          <p className="text-[10px] fc-text-subtle truncate">
                            {new Date(metric.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-12 text-sm fc-text-dim">
                  Not enough data to show chart
                </p>
              )}
            </div>

            {/* Log history */}
            <div
              className="fc-surface p-6 rounded-2xl border border-[color:var(--fc-surface-card-border)] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold fc-text-primary">Log history</h3>
                <ListFilter className="w-5 h-5 fc-text-subtle" />
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {historyNewestFirst.map((metric, index) => {
                  const prev = historyNewestFirst[index + 1];
                  const delta = prev ? metric.weight - prev.weight : null;
                  const d = new Date(metric.date);
                  return (
                    <div
                      key={metric.date}
                      className="flex items-center justify-between p-4 rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-glass-highlight)] transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl fc-glass flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold fc-text-subtle uppercase">
                            {d.toLocaleDateString("en-US", { month: "short" })}
                          </span>
                          <span className="text-lg font-bold leading-none fc-text-primary">
                            {d.getDate()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold font-mono fc-text-primary">
                            {metric.weight.toFixed(1)} kg
                          </p>
                          <p className="text-xs fc-text-subtle truncate">
                            {[metric.bodyFat != null && `${metric.bodyFat}% BF`, metric.waist != null && `${metric.waist} cm waist`]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {delta !== null && delta !== 0 && (
                          <>
                            <p
                              className={`text-sm font-bold ${
                                delta < 0 ? "fc-text-success" : "fc-text-warning"
                              }`}
                            >
                              {delta > 0 ? "+" : ""}
                              {delta.toFixed(1)} kg
                            </p>
                            <p className="text-[10px] fc-text-subtle uppercase">vs previous</p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-sm font-semibold fc-text-subtle mt-6 pt-4 border-t border-[color:var(--fc-glass-border)] text-center">
                {metrics.length} entr{metrics.length === 1 ? "y" : "ies"} total
              </p>
            </div>
          </main>
        )}

        {/* FAB */}
        <button
          type="button"
          onClick={() => setShowLogModal(true)}
          className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-2xl fc-btn fc-btn-primary flex items-center justify-center shadow-lg"
          aria-label="Log metrics"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {showLogModal && user && (
        <LogMeasurementModal
          clientId={user.id}
          onClose={() => setShowLogModal(false)}
          onSuccess={() => loadMetricsData()}
        />
      )}
    </AnimatedBackground>
  );
}

export default function BodyMetricsPage() {
  return (
    <ProtectedRoute>
      <BodyMetricsPageContent />
    </ProtectedRoute>
  );
}
