"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Timer, Activity, TrendingUp, TrendingDown, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { getClientPerformanceTests, PerformanceTest } from "@/lib/performanceTestService";
import { LogPerformanceTestModal } from "@/components/client/LogPerformanceTestModal";

function PerformancePageContent() {
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

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
    if (trend === "up") {
      return <TrendingUp className="h-5 w-5 text-[color:var(--fc-status-success)]" />;
    }
    if (trend === "down") {
      return <TrendingDown className="h-5 w-5 text-[color:var(--fc-status-error)]" />;
    }
    return <Minus className="h-5 w-5 text-[color:var(--fc-text-subtle)]" />;
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-24 pt-10 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-6xl">
              <div className="fc-glass fc-card p-8">
                <div className="animate-pulse space-y-6">
                  <div className="h-24 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="h-96 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                    <div className="h-96 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                  </div>
                </div>
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

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
        <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Link href="/client/progress">
                <Button
                  variant="ghost"
                  size="icon"
                  className="fc-btn fc-btn-ghost h-10 w-10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  Performance
                </span>
                <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                  Performance Tests
                </h1>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  Track your fitness assessments monthly.
                </p>
              </div>
            </div>
            <div className="fc-glass-soft fc-card px-4 py-2 text-sm font-semibold text-[color:var(--fc-text-primary)]">
              {runTests.length + stepTests.length} total tests
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1km Run Tests */}
          <GlassCard elevation={2} className="fc-glass fc-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 shadow-[0_8px_18px_rgba(249,115,22,0.3)]">
                  <Timer className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                    1km Run
                  </h2>
                  {runDue && (
                    <span className="fc-badge mt-2 inline-flex bg-[color:var(--fc-status-warning)] text-white">
                      Due this month
                    </span>
                  )}
                </div>
              </div>
              {runTests.length > 0 && getTrendIcon(runTrend)}
            </div>

            <Button
              onClick={() => openLogModal("1km_run")}
              className="fc-btn fc-btn-primary mb-6 w-full"
            >
              <Plus className="mr-2 h-5 w-5" />
              Log New Test
            </Button>

            {/* Test History */}
            <div className="space-y-3">
              {runTests.length === 0 ? (
                <p className="py-8 text-center text-sm text-[color:var(--fc-text-dim)]">
                  No tests logged yet
                </p>
              ) : (
                runTests.map((test, index) => (
                  <div
                    key={test.id}
                    className={`rounded-lg p-4 ${
                      index === 0
                        ? "fc-glass-soft border border-[color:var(--fc-domain-workouts)]"
                        : "fc-glass-soft border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                          {test.time_seconds ? formatRunTime(test.time_seconds) : "N/A"}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--fc-text-subtle)]">
                          {new Date(test.tested_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      {index === 0 && (
                        <span className="fc-badge bg-[color:var(--fc-status-success)] text-white">
                          Latest
                        </span>
                      )}
                    </div>
                    {test.notes && (
                      <p className="mt-2 text-sm text-[color:var(--fc-text-dim)]">
                        {test.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Step Tests */}
          <GlassCard elevation={2} className="fc-glass fc-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 shadow-[0_8px_18px_rgba(59,130,246,0.3)]">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[color:var(--fc-text-primary)]">
                    Step Test
                  </h2>
                  {stepDue && (
                    <span className="fc-badge mt-2 inline-flex bg-[color:var(--fc-status-warning)] text-white">
                      Due this month
                    </span>
                  )}
                </div>
              </div>
              {stepTests.length > 0 && getTrendIcon(stepTrend)}
            </div>

            <Button
              onClick={() => openLogModal("step_test")}
              className="fc-btn fc-btn-primary mb-6 w-full"
            >
              <Plus className="mr-2 h-5 w-5" />
              Log New Test
            </Button>

            {/* Test History */}
            <div className="space-y-3">
              {stepTests.length === 0 ? (
                <p className="py-8 text-center text-sm text-[color:var(--fc-text-dim)]">
                  No tests logged yet
                </p>
              ) : (
                stepTests.map((test, index) => (
                  <div
                    key={test.id}
                    className={`rounded-lg p-4 ${
                      index === 0
                        ? "fc-glass-soft border border-[color:var(--fc-accent-cyan)]"
                        : "fc-glass-soft border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-[color:var(--fc-text-dim)]">
                          Recovery Score
                        </p>
                        <p className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                          {test.recovery_score !== null ? test.recovery_score : "N/A"}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--fc-text-subtle)]">
                          {new Date(test.tested_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      {index === 0 && (
                        <span className="fc-badge bg-[color:var(--fc-status-success)] text-white">
                          Latest
                        </span>
                      )}
                    </div>
                    {test.heart_rate_pre && (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        <div className="text-center">
                          <p className="text-xs text-[color:var(--fc-text-subtle)]">
                            Pre
                          </p>
                          <p className="font-semibold text-[color:var(--fc-text-primary)]">
                            {test.heart_rate_pre}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-[color:var(--fc-text-subtle)]">
                            1min
                          </p>
                          <p className="font-semibold text-[color:var(--fc-text-primary)]">
                            {test.heart_rate_1min}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-[color:var(--fc-text-subtle)]">
                            2min
                          </p>
                          <p className="font-semibold text-[color:var(--fc-text-primary)]">
                            {test.heart_rate_2min}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-[color:var(--fc-text-subtle)]">
                            3min
                          </p>
                          <p className="font-semibold text-[color:var(--fc-text-primary)]">
                            {test.heart_rate_3min}
                          </p>
                        </div>
                      </div>
                    )}
                    {test.notes && (
                      <p className="mt-2 text-sm text-[color:var(--fc-text-dim)]">
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

