"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Timer, Activity, TrendingUp, TrendingDown, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { getClientPerformanceTests, PerformanceTest } from "@/lib/performanceTestService";
import { LogPerformanceTestModal } from "@/components/client/LogPerformanceTestModal";

function PerformancePageContent() {
  const { user, loading: authLoading } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [runTests, setRunTests] = useState<PerformanceTest[]>([]);
  const [stepTests, setStepTests] = useState<PerformanceTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [modalTestType, setModalTestType] = useState<"1km_run" | "step_test">("1km_run");

  useEffect(() => {
    if (user && !authLoading) {
      loadPerformanceTests();
    }
  }, [user, authLoading]);

  const loadPerformanceTests = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [runs, steps] = await Promise.all([
        getClientPerformanceTests(user.id, "1km_run"),
        getClientPerformanceTests(user.id, "step_test"),
      ]);

      setRunTests(runs);
      setStepTests(steps);
    } catch (error) {
      console.error("Error loading performance tests:", error);
    } finally {
      setLoading(false);
    }
  };

  const isDueThisMonth = (tests: PerformanceTest[]) => {
    if (tests.length === 0) return true;

    const latestTest = tests[0]; // Tests are ordered by date desc
    const testDate = new Date(latestTest.tested_at);
    const now = new Date();

    // Check if latest test is from current month
    return testDate.getMonth() !== now.getMonth() || testDate.getFullYear() !== now.getFullYear();
  };

  const getTrend = (tests: PerformanceTest[]) => {
    if (tests.length < 2) return "same";

    const latest = tests[0];
    const previous = tests[1];

    if (latest.test_type === "1km_run") {
      // For run, lower time is better
      if (!latest.time_seconds || !previous.time_seconds) return "same";
      if (latest.time_seconds < previous.time_seconds) return "up";
      if (latest.time_seconds > previous.time_seconds) return "down";
    } else {
      // For step test, lower recovery score is better
      if (latest.recovery_score === null || latest.recovery_score === undefined || previous.recovery_score === null || previous.recovery_score === undefined) return "same";
      if (latest.recovery_score < previous.recovery_score) return "up";
      if (latest.recovery_score > previous.recovery_score) return "down";
    }

    return "same";
  };

  const formatRunTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const openLogModal = (testType: "1km_run" | "step_test") => {
    setModalTestType(testType);
    setShowLogModal(true);
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="w-5 h-5" style={{ color: getSemanticColor("success").primary }} />;
    if (trend === "down") return <TrendingDown className="w-5 h-5" style={{ color: getSemanticColor("critical").primary }} />;
    return <Minus className="w-5 h-5" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }} />;
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  const runDue = isDueThisMonth(runTests);
  const stepDue = isDueThisMonth(stepTests);
  const runTrend = getTrend(runTests);
  const stepTrend = getTrend(stepTests);

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <GlassCard elevation={1} className="p-6">
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
                  Performance Tests
                </h1>
                <p
                  className="text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  Track your fitness assessments monthly
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1km Run Tests */}
          <GlassCard elevation={2} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: getSemanticColor("energy").gradient,
                    boxShadow: `0 4px 12px ${getSemanticColor("energy").primary}30`,
                  }}
                >
                  <Timer className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2
                    className="text-xl font-bold"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    1km Run
                  </h2>
                  {runDue && (
                    <Badge
                      className="mt-1"
                      style={{
                        background: getSemanticColor("warning").gradient,
                        color: "#fff",
                      }}
                    >
                      Due this month
                    </Badge>
                  )}
                </div>
              </div>
              {runTests.length > 0 && getTrendIcon(runTrend)}
            </div>

            <Button
              onClick={() => openLogModal("1km_run")}
              className="w-full mb-6"
              style={{
                background: getSemanticColor("energy").gradient,
                boxShadow: `0 4px 12px ${getSemanticColor("energy").primary}30`,
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Log New Test
            </Button>

            {/* Test History */}
            <div className="space-y-3">
              {runTests.length === 0 ? (
                <p
                  className="text-center py-8"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                  }}
                >
                  No tests logged yet
                </p>
              ) : (
                runTests.map((test, index) => (
                  <div
                    key={test.id}
                    className="p-4 rounded-lg"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                      border: index === 0 ? `2px solid ${getSemanticColor("energy").primary}` : "none",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-2xl font-bold"
                          style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                        >
                          {test.time_seconds ? formatRunTime(test.time_seconds) : "N/A"}
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{
                            color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                          }}
                        >
                          {new Date(test.tested_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      {index === 0 && (
                        <Badge
                          style={{
                            background: getSemanticColor("success").gradient,
                            color: "#fff",
                          }}
                        >
                          Latest
                        </Badge>
                      )}
                    </div>
                    {test.notes && (
                      <p
                        className="text-sm mt-2"
                        style={{
                          color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                        }}
                      >
                        {test.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Step Tests */}
          <GlassCard elevation={2} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: getSemanticColor("trust").gradient,
                    boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
                  }}
                >
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2
                    className="text-xl font-bold"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Step Test
                  </h2>
                  {stepDue && (
                    <Badge
                      className="mt-1"
                      style={{
                        background: getSemanticColor("warning").gradient,
                        color: "#fff",
                      }}
                    >
                      Due this month
                    </Badge>
                  )}
                </div>
              </div>
              {stepTests.length > 0 && getTrendIcon(stepTrend)}
            </div>

            <Button
              onClick={() => openLogModal("step_test")}
              className="w-full mb-6"
              style={{
                background: getSemanticColor("trust").gradient,
                boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Log New Test
            </Button>

            {/* Test History */}
            <div className="space-y-3">
              {stepTests.length === 0 ? (
                <p
                  className="text-center py-8"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                  }}
                >
                  No tests logged yet
                </p>
              ) : (
                stepTests.map((test, index) => (
                  <div
                    key={test.id}
                    className="p-4 rounded-lg"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                      border: index === 0 ? `2px solid ${getSemanticColor("trust").primary}` : "none",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{
                            color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                          }}
                        >
                          Recovery Score
                        </p>
                        <p
                          className="text-2xl font-bold"
                          style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                        >
                          {test.recovery_score !== null ? test.recovery_score : "N/A"}
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{
                            color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                          }}
                        >
                          {new Date(test.tested_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      {index === 0 && (
                        <Badge
                          style={{
                            background: getSemanticColor("success").gradient,
                            color: "#fff",
                          }}
                        >
                          Latest
                        </Badge>
                      )}
                    </div>
                    {test.heart_rate_pre && (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        <div className="text-center">
                          <p
                            className="text-xs"
                            style={{
                              color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                            }}
                          >
                            Pre
                          </p>
                          <p
                            className="font-semibold"
                            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                          >
                            {test.heart_rate_pre}
                          </p>
                        </div>
                        <div className="text-center">
                          <p
                            className="text-xs"
                            style={{
                              color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                            }}
                          >
                            1min
                          </p>
                          <p
                            className="font-semibold"
                            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                          >
                            {test.heart_rate_1min}
                          </p>
                        </div>
                        <div className="text-center">
                          <p
                            className="text-xs"
                            style={{
                              color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                            }}
                          >
                            2min
                          </p>
                          <p
                            className="font-semibold"
                            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                          >
                            {test.heart_rate_2min}
                          </p>
                        </div>
                        <div className="text-center">
                          <p
                            className="text-xs"
                            style={{
                              color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                            }}
                          >
                            3min
                          </p>
                          <p
                            className="font-semibold"
                            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                          >
                            {test.heart_rate_3min}
                          </p>
                        </div>
                      </div>
                    )}
                    {test.notes && (
                      <p
                        className="text-sm mt-2"
                        style={{
                          color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                        }}
                      >
                        {test.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Log Performance Test Modal */}
      {showLogModal && user && (
        <LogPerformanceTestModal
          clientId={user.id}
          testType={modalTestType}
          onClose={() => setShowLogModal(false)}
          onSuccess={() => {
            loadPerformanceTests();
          }}
        />
      )}
    </AnimatedBackground>
  );
}

export default function PerformancePage() {
  return (
    <ProtectedRoute>
      <PerformancePageContent />
    </ProtectedRoute>
  );
}

