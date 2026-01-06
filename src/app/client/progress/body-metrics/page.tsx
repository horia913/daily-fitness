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
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

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
          <div className="relative z-10 container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              </div>
              <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <GlassCard elevation={1} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/client/progress">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <div>
                  <h1
                    className="text-3xl font-bold mb-1"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Body Metrics
                  </h1>
                  <p
                    className="text-sm"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Track your physical progress over time
                  </p>
                </div>
              </div>

              <Button
                variant="default"
                onClick={() => setShowLogModal(true)}
                style={{
                  background: getSemanticColor("success").gradient,
                  boxShadow: `0 4px 12px ${
                    getSemanticColor("success").primary
                  }30`,
                }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Log Measurement
              </Button>
            </div>
          </GlassCard>
        </div>

        {metrics.length === 0 ? (
          <GlassCard elevation={2} className="p-12">
            <div className="text-center">
              <Scale
                className="w-24 h-24 mx-auto mb-6"
                style={{
                  color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                }}
              />
              <h2
                className="text-2xl font-bold mb-2"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                No Measurements Yet
              </h2>
              <p
                className="text-sm mb-6"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                Start tracking your body metrics to see your progress over time
              </p>
              <Button
                variant="default"
                size="lg"
                onClick={() => setShowLogModal(true)}
                style={{
                  background: getSemanticColor("success").gradient,
                  boxShadow: `0 4px 12px ${
                    getSemanticColor("success").primary
                  }30`,
                }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Log First Measurement
              </Button>
            </div>
          </GlassCard>
        ) : (
          <>
            {/* Current Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Current Weight */}
              <GlassCard elevation={2} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <Scale className="w-6 h-6 text-white" />
                  </div>
                  {weightChange !== 0 && (
                    <div className="flex items-center gap-1">
                      {weightChange < 0 ? (
                        <TrendingDown
                          className="w-5 h-5"
                          style={{ color: getSemanticColor("success").primary }}
                        />
                      ) : (
                        <TrendingUp
                          className="w-5 h-5"
                          style={{ color: getSemanticColor("warning").primary }}
                        />
                      )}
                      <span
                        className="text-sm font-medium"
                        style={{
                          color:
                            weightChange < 0
                              ? getSemanticColor("success").primary
                              : getSemanticColor("warning").primary,
                        }}
                      >
                        {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg
                      </span>
                    </div>
                  )}
                </div>

                <h3
                  className="text-sm font-medium mb-2"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  Current Weight
                </h3>
                <div className="flex items-baseline gap-2">
                  <AnimatedNumber
                    value={currentWeight}
                    decimals={1}
                    className="text-4xl font-bold"
                    color={isDark ? "#fff" : "#1A1A1A"}
                  />
                  <span
                    className="text-xl font-medium"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                    }}
                  >
                    kg
                  </span>
                </div>
                {previous && (
                  <p
                    className="text-xs mt-2"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                    }}
                  >
                    vs last month: {previous.weight.toFixed(1)} kg
                  </p>
                )}
              </GlassCard>

              {/* Waist */}
              {currentWaist > 0 && (
                <GlassCard elevation={2} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)",
                        boxShadow: "0 4px 12px rgba(74, 144, 226, 0.3)",
                      }}
                    >
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    {waistChange !== 0 && (
                      <div className="flex items-center gap-1">
                        {waistChange < 0 ? (
                          <TrendingDown
                            className="w-5 h-5"
                            style={{ color: getSemanticColor("success").primary }}
                          />
                        ) : (
                          <TrendingUp
                            className="w-5 h-5"
                            style={{ color: getSemanticColor("warning").primary }}
                          />
                        )}
                        <span
                          className="text-sm font-medium"
                          style={{
                            color:
                              waistChange < 0
                                ? getSemanticColor("success").primary
                                : getSemanticColor("warning").primary,
                          }}
                        >
                          {waistChange > 0 ? "+" : ""}{waistChange.toFixed(1)} cm
                        </span>
                      </div>
                    )}
                  </div>

                  <h3
                    className="text-sm font-medium mb-2"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Waist (Iliac Crest)
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <AnimatedNumber
                      value={currentWaist}
                      decimals={1}
                      className="text-4xl font-bold"
                      color={isDark ? "#fff" : "#1A1A1A"}
                    />
                    <span
                      className="text-xl font-medium"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      }}
                    >
                      cm
                    </span>
                  </div>
                  {previous && previous.waist && (
                    <p
                      className="text-xs mt-2"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                      }}
                    >
                      vs last month: {previous.waist.toFixed(1)} cm
                    </p>
                  )}
                </GlassCard>
              )}

              {/* Body Fat */}
              {currentBodyFat > 0 && (
                <GlassCard elevation={2} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, #FF6B35 0%, #FF4E50 100%)",
                        boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)",
                      }}
                    >
                      <TrendingDown className="w-6 h-6 text-white" />
                    </div>
                    {bodyFatChange !== 0 && (
                      <div className="flex items-center gap-1">
                        {bodyFatChange < 0 ? (
                          <TrendingDown
                            className="w-5 h-5"
                            style={{ color: getSemanticColor("success").primary }}
                          />
                        ) : (
                          <TrendingUp
                            className="w-5 h-5"
                            style={{ color: getSemanticColor("warning").primary }}
                          />
                        )}
                        <span
                          className="text-sm font-medium"
                          style={{
                            color:
                              bodyFatChange < 0
                                ? getSemanticColor("success").primary
                                : getSemanticColor("warning").primary,
                          }}
                        >
                          {bodyFatChange > 0 ? "+" : ""}{bodyFatChange.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <h3
                    className="text-sm font-medium mb-2"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Body Fat
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <AnimatedNumber
                      value={currentBodyFat}
                      decimals={1}
                      className="text-4xl font-bold"
                      color={isDark ? "#fff" : "#1A1A1A"}
                    />
                    <span
                      className="text-xl font-medium"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                      }}
                    >
                      %
                    </span>
                  </div>
                  {previous && previous.bodyFat && (
                    <p
                      className="text-xs mt-2"
                      style={{
                        color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                      }}
                    >
                      vs last month: {previous.bodyFat.toFixed(1)}%
                    </p>
                  )}
                </GlassCard>
              )}
            </div>

            {/* Weight Chart */}
            <GlassCard elevation={2} className="p-6">
              <h3
                className="text-lg font-bold mb-6"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Weight Trend (Last 12 Weeks)
              </h3>

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
                            background: getSemanticColor("success").gradient,
                            minHeight: "20px",
                          }}
                        />
                        <div className="mt-3 text-center">
                          <p
                            className="text-xs font-semibold"
                            style={{
                              color: isDark
                                ? "rgba(255,255,255,0.9)"
                                : "rgba(0,0,0,0.9)",
                            }}
                          >
                            {metric.weight.toFixed(1)}
                          </p>
                          <p
                            className="text-xs"
                            style={{
                              color: isDark
                                ? "rgba(255,255,255,0.5)"
                                : "rgba(0,0,0,0.5)",
                            }}
                          >
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
                <p
                  className="text-center py-12"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                  }}
                >
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
