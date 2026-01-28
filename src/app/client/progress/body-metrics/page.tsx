"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scale, TrendingUp, TrendingDown, Plus } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { LogMeasurementModal } from "@/components/client/LogMeasurementModal";

interface BodyMetric {
  date: string;
  weight: number;
  waist?: number;
  bodyFat?: number;
}

function BodyMetricsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      loadMetricsData();
    }
  }, [user, authLoading]);

  const loadMetricsData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Get last 12 weeks of measurements
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
        const mappedMetrics: BodyMetric[] = (data || []).map((m) => ({
          date: m.measured_date,
          weight: m.weight_kg,
          waist: m.waist_circumference || undefined,
          bodyFat: m.body_fat_percentage || undefined,
        }));
        setMetrics(mappedMetrics);
      }
    } catch (error) {
      console.error("Error loading body metrics:", error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate current month and previous month values
  const getCurrentAndPreviousMonth = () => {
    if (metrics.length === 0) return { current: null, previous: null };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Get most recent measurement from current month
    const currentMonthMetrics = metrics.filter((m) => {
      const d = new Date(m.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // Get most recent measurement from previous month
    const previousMonthMetrics = metrics.filter((m) => {
      const d = new Date(m.date);
      return d.getMonth() === previousMonth && d.getFullYear() === previousYear;
    });

    return {
      current: currentMonthMetrics.length > 0 
        ? currentMonthMetrics[currentMonthMetrics.length - 1] 
        : metrics[metrics.length - 1], // Fall back to most recent
      previous: previousMonthMetrics.length > 0 
        ? previousMonthMetrics[previousMonthMetrics.length - 1] 
        : null,
    };
  };

  const { current, previous } = getCurrentAndPreviousMonth();
  
  const currentWeight = current?.weight || 0;
  const currentWaist = current?.waist || 0;
  const currentBodyFat = current?.bodyFat || 0;

  const weightChange = previous ? currentWeight - previous.weight : 0;
  const waistChange = previous && currentWaist && previous.waist 
    ? currentWaist - previous.waist 
    : 0;
  const bodyFatChange = previous && currentBodyFat && previous.bodyFat
    ? currentBodyFat - previous.bodyFat 
    : 0;

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
            <div className="fc-glass fc-card p-8">
              <div className="animate-pulse space-y-6">
                <div className="h-20 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`metrics-skeleton-${index}`}
                      className="h-32 rounded-2xl bg-[color:var(--fc-glass-highlight)]"
                    ></div>
                  ))}
                </div>
                <div className="h-72 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
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
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
        <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <Link href="/client/progress">
                <Button variant="ghost" size="icon" className="fc-btn fc-btn-ghost h-10 w-10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  Progress Hub
                </span>
                <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                  Body Metrics
                </h1>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  Track weight, waist, and body fat changes over time.
                </p>
              </div>
            </div>

            <Button
              variant="default"
              onClick={() => setShowLogModal(true)}
              className="fc-btn fc-btn-primary"
            >
              <Plus className="mr-2 h-5 w-5" />
              Log Measurement
            </Button>
          </div>
        </GlassCard>

        {metrics.length === 0 ? (
          <div className="mt-6 fc-glass fc-card p-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[color:var(--fc-glass-highlight)]">
              <Scale className="h-10 w-10 text-[color:var(--fc-text-subtle)]" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
              No Measurements Yet
            </h2>
            <p className="mt-2 text-sm text-[color:var(--fc-text-dim)]">
              Start tracking body metrics to see progress trends over time.
            </p>
            <Button
              variant="default"
              size="lg"
              onClick={() => setShowLogModal(true)}
              className="fc-btn fc-btn-primary mt-6"
            >
              <Plus className="mr-2 h-5 w-5" />
              Log First Measurement
            </Button>
          </div>
        ) : (
          <>
            {/* Current Stats */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Current Weight */}
              <GlassCard elevation={2} className="fc-glass fc-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-[0_8px_18px_rgba(16,185,129,0.35)]">
                    <Scale className="h-6 w-6" />
                  </div>
                  {weightChange !== 0 && (
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      {weightChange < 0 ? (
                        <TrendingDown className="h-5 w-5 text-[color:var(--fc-status-success)]" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-[color:var(--fc-status-warning)]" />
                      )}
                      <span
                        className={
                          weightChange < 0
                            ? "text-[color:var(--fc-status-success)]"
                            : "text-[color:var(--fc-status-warning)]"
                        }
                      >
                        {weightChange > 0 ? "+" : ""}
                        {weightChange.toFixed(1)} kg
                      </span>
                    </div>
                  )}
                </div>

                <h3 className="text-sm font-medium mb-2 text-[color:var(--fc-text-dim)]">
                  Current Weight
                </h3>
                <div className="flex items-baseline gap-2">
                  <AnimatedNumber
                    value={currentWeight}
                    decimals={1}
                    className="text-4xl font-bold"
                    color="var(--fc-text-primary)"
                  />
                  <span className="text-xl font-medium text-[color:var(--fc-text-subtle)]">
                    kg
                  </span>
                </div>
                {previous && (
                  <p className="text-xs mt-2 text-[color:var(--fc-text-subtle)]">
                    vs last month: {previous.weight.toFixed(1)} kg
                  </p>
                )}
              </GlassCard>

              {/* Waist */}
              {currentWaist > 0 && (
                <GlassCard elevation={2} className="fc-glass fc-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-[0_8px_18px_rgba(59,130,246,0.35)]">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    {waistChange !== 0 && (
                      <div className="flex items-center gap-1 text-sm font-semibold">
                        {waistChange < 0 ? (
                          <TrendingDown className="h-5 w-5 text-[color:var(--fc-status-success)]" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-[color:var(--fc-status-warning)]" />
                        )}
                        <span
                          className={
                            waistChange < 0
                              ? "text-[color:var(--fc-status-success)]"
                              : "text-[color:var(--fc-status-warning)]"
                          }
                        >
                          {waistChange > 0 ? "+" : ""}
                          {waistChange.toFixed(1)} cm
                        </span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-medium mb-2 text-[color:var(--fc-text-dim)]">
                    Waist (Iliac Crest)
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <AnimatedNumber
                      value={currentWaist}
                      decimals={1}
                      className="text-4xl font-bold"
                      color="var(--fc-text-primary)"
                    />
                    <span className="text-xl font-medium text-[color:var(--fc-text-subtle)]">
                      cm
                    </span>
                  </div>
                  {previous && previous.waist && (
                    <p className="text-xs mt-2 text-[color:var(--fc-text-subtle)]">
                      vs last month: {previous.waist.toFixed(1)} cm
                    </p>
                  )}
                </GlassCard>
              )}

              {/* Body Fat */}
              {currentBodyFat > 0 && (
                <GlassCard elevation={2} className="fc-glass fc-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)]">
                      <TrendingDown className="h-6 w-6" />
                    </div>
                    {bodyFatChange !== 0 && (
                      <div className="flex items-center gap-1 text-sm font-semibold">
                        {bodyFatChange < 0 ? (
                          <TrendingDown className="h-5 w-5 text-[color:var(--fc-status-success)]" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-[color:var(--fc-status-warning)]" />
                        )}
                        <span
                          className={
                            bodyFatChange < 0
                              ? "text-[color:var(--fc-status-success)]"
                              : "text-[color:var(--fc-status-warning)]"
                          }
                        >
                          {bodyFatChange > 0 ? "+" : ""}
                          {bodyFatChange.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-medium mb-2 text-[color:var(--fc-text-dim)]">
                    Body Fat
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <AnimatedNumber
                      value={currentBodyFat}
                      decimals={1}
                      className="text-4xl font-bold"
                      color="var(--fc-text-primary)"
                    />
                    <span className="text-xl font-medium text-[color:var(--fc-text-subtle)]">
                      %
                    </span>
                  </div>
                  {previous && previous.bodyFat && (
                    <p className="text-xs mt-2 text-[color:var(--fc-text-subtle)]">
                      vs last month: {previous.bodyFat.toFixed(1)}%
                    </p>
                  )}
                </GlassCard>
              )}
            </div>

            {/* Weight Chart */}
            <GlassCard elevation={2} className="fc-glass fc-card p-6 mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                    Weight Trend
                  </h3>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Last 12 weeks snapshot
                  </p>
                </div>
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  {metrics.length} entries
                </span>
              </div>

              {metrics.length > 0 ? (
                <div className="flex items-end justify-between gap-2 h-64">
                  {metrics.slice(-12).map((metric, index) => {
                    const maxWeight = Math.max(...metrics.map((m) => m.weight));
                    const minWeight = Math.min(...metrics.map((m) => m.weight));
                    const range = maxWeight - minWeight || 1;
                    const height = ((metric.weight - minWeight) / range) * 100;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full rounded-t-lg transition-all hover:opacity-80"
                          style={{
                            height: `${Math.max(height, 10)}%`,
                            background:
                              "linear-gradient(135deg, var(--fc-domain-meals) 0%, var(--fc-accent-cyan) 100%)",
                            minHeight: "20px",
                          }}
                        />
                        <div className="mt-3 text-center">
                          <p className="text-xs font-semibold text-[color:var(--fc-text-primary)]">
                            {metric.weight.toFixed(1)}
                          </p>
                          <p className="text-xs text-[color:var(--fc-text-subtle)]">
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
                <p className="text-center py-12 text-sm text-[color:var(--fc-text-dim)]">
                  Not enough data to show chart
                </p>
              )}
            </GlassCard>
          </>
        )}
      </div>

      {/* Log Measurement Modal */}
      {showLogModal && user && (
        <LogMeasurementModal
          clientId={user.id}
          onClose={() => setShowLogModal(false)}
          onSuccess={() => {
            loadMetricsData();
          }}
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
