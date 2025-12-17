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

interface BodyMetric {
  date: string;
  weight: number;
  bodyFat?: number;
}

function BodyMetricsPageContent() {
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [metrics, setMetrics] = useState<BodyMetric[]>([
    { date: "2024-10-15", weight: 82, bodyFat: 18 },
    { date: "2024-10-22", weight: 81, bodyFat: 17.5 },
    { date: "2024-10-29", weight: 80.5, bodyFat: 17 },
    { date: "2024-11-01", weight: 79.5, bodyFat: 16.8 },
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetricsData();
  }, [user]);

  const loadMetricsData = async () => {
    if (!user) return;

    try {
      // TODO: Replace with actual Supabase queries
      // Simulating data fetch
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLoading(false);
    } catch (error) {
      console.error("Error loading body metrics data:", error);
      setLoading(false);
    }
  };

  const currentWeight = metrics[metrics.length - 1]?.weight || 0;
  const currentBodyFat = metrics[metrics.length - 1]?.bodyFat || 0;
  const weightChange =
    metrics.length >= 2 ? currentWeight - metrics[0].weight : 0;
  const bodyFatChange =
    metrics.length >= 2 ? currentBodyFat - (metrics[0].bodyFat || 0) : 0;

  const goalWeight = 77;
  const weightToGoal = currentWeight - goalWeight;

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
                style={{
                  background: getSemanticColor("success").gradient,
                  boxShadow: `0 4px 12px ${
                    getSemanticColor("success").primary
                  }30`,
                }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Log Weight
              </Button>
            </div>
          </GlassCard>
        </div>

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
                    {Math.abs(weightChange).toFixed(1)} kg
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
          </GlassCard>

          {/* Body Fat */}
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
                    {Math.abs(bodyFatChange).toFixed(1)}%
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
          </GlassCard>

          {/* Goal Progress */}
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
            </div>

            <h3
              className="text-sm font-medium mb-2"
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              To Goal Weight
            </h3>
            <div className="flex items-baseline gap-2">
              <AnimatedNumber
                value={Math.max(0, weightToGoal)}
                decimals={1}
                className="text-4xl font-bold"
                color={getSemanticColor("energy").primary}
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
            <p
              className="text-xs mt-2"
              style={{
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
              }}
            >
              Target: {goalWeight} kg
            </p>
          </GlassCard>
        </div>

        {/* Weight Chart */}
        <GlassCard elevation={2} className="p-6 mb-8">
          <h3
            className="text-lg font-bold mb-6"
            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
          >
            Weight Trend
          </h3>

          <div className="flex items-end justify-between gap-4 h-64">
            {metrics.map((metric, index) => {
              const height = ((85 - metric.weight) / 8) * 100; // Scale from 77-85 kg
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full rounded-t-lg transition-all hover:opacity-80"
                    style={{
                      height: `${height}%`,
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
                      {metric.weight}
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
        </GlassCard>

        {/* Motivational Message */}
        <div
          style={{
            background: isDark
              ? "rgba(124,179,66,0.1)"
              : "rgba(124,179,66,0.05)",
            borderRadius: "12px",
          }}
        >
          <GlassCard elevation={2} className="p-6">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: getSemanticColor("success").gradient,
                  boxShadow: `0 4px 12px ${
                    getSemanticColor("success").primary
                  }30`,
                }}
              >
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3
                  className="text-lg font-bold mb-1"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Great Progress!
                </h3>
                <p
                  className="text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  You've lost {Math.abs(weightChange).toFixed(1)} kg since you
                  started. Keep up the momentum to reach your goal weight! 💪
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
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
