"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import {
  ArrowLeft,
  Timer,
  TrendingUp,
  Plus,
  HeartPulse,
} from "lucide-react";
import Link from "next/link";
import {
  getClientPerformanceTests,
  PerformanceTest,
} from "@/lib/performanceTestService";
import { LogPerformanceTestModal } from "@/components/client/LogPerformanceTestModal";
import { EmptyState } from "@/components/ui/EmptyState";

type TestType = "1km_run" | "step_test";

function formatRunTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatRunTimeForTrend(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}s`;
}

function getTrendPercent(
  tests: PerformanceTest[],
  type: TestType
): number | null {
  if (tests.length < 2) return null;
  const latest = tests[0];
  const previous = tests[1];
  if (type === "1km_run") {
    const a = latest.time_seconds;
    const b = previous.time_seconds;
    if (a == null || b == null || b === 0) return null;
    return Math.round(((b - a) / b) * 1000) / 10;
  }
  const a = latest.recovery_score;
  const b = previous.recovery_score;
  if (a == null || b == null || b === 0) return null;
  return Math.round(((b - a) / b) * 1000) / 10;
}

function getImprovement(
  tests: PerformanceTest[],
  type: TestType
): string | null {
  if (tests.length < 2) return null;
  const latest = tests[0];
  const previous = tests[1];
  if (type === "1km_run") {
    const a = latest.time_seconds;
    const b = previous.time_seconds;
    if (a == null || b == null) return null;
    const diff = a - b;
    if (diff === 0) return "—";
    const sign = diff < 0 ? "-" : "+";
    return `${sign}${formatRunTimeForTrend(Math.abs(diff))} ${diff < 0 ? "↓" : "↑"}`;
  }
  const a = latest.recovery_score;
  const b = previous.recovery_score;
  if (a == null || b == null) return null;
  const diff = a - b;
  if (diff === 0) return "—";
  const sign = diff < 0 ? "-" : "+";
  return `${sign}${Math.abs(diff)} BPM ${diff < 0 ? "↓" : "↑"}`;
}

function getHistoryTrend(
  current: PerformanceTest,
  previous: PerformanceTest | undefined,
  type: TestType
): string {
  if (!previous) return "—";
  if (type === "1km_run") {
    const a = current.time_seconds;
    const b = previous.time_seconds;
    if (a == null || b == null) return "—";
    const diff = a - b;
    if (diff === 0) return "—";
    const sign = diff < 0 ? "" : "+";
    return `${sign}${formatRunTimeForTrend(Math.abs(diff))}`;
  }
  const a = current.recovery_score;
  const b = previous.recovery_score;
  if (a == null || b == null) return "—";
  const diff = a - b;
  if (diff === 0) return "—";
  const sign = diff < 0 ? "" : "+";
  return `${sign}${diff} BPM`;
}

function PerformancePageContent() {
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

  const [runTests, setRunTests] = useState<PerformanceTest[]>([]);
  const [stepTests, setStepTests] = useState<PerformanceTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedType, setSelectedType] = useState<TestType>("1km_run");
  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || authLoading) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
      setLoadError("Loading took too long. Tap Retry to try again.");
    }, 20_000);
    loadTests().finally(() => {
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
  }, [user, authLoading]);

  const loadTests = async () => {
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

  const currentTests = selectedType === "1km_run" ? runTests : stepTests;
  const runTrendPercent = getTrendPercent(runTests, "1km_run");
  const stepTrendPercent = getTrendPercent(stepTests, "step_test");
  const improvement = getImprovement(currentTests, selectedType);
  const latest = currentTests[0];

  if (loadError) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-32 pt-6 sm:px-6 lg:px-12 fc-page max-w-4xl mx-auto">
            <div className="fc-surface p-8 rounded-2xl border border-[color:var(--fc-surface-card-border)] text-center">
              <p className="text-[color:var(--fc-text-dim)] mb-4">{loadError}</p>
              <button type="button" onClick={() => window.location.reload()} className="fc-btn fc-btn-secondary fc-press h-10 px-6 text-sm">Retry</button>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-32 pt-6 sm:px-6 lg:px-12 fc-page max-w-4xl mx-auto">
            <div className="animate-pulse space-y-8">
              <div className="h-28 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-40 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                <div className="h-40 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
              </div>
              <div className="h-64 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-40 pt-6 sm:px-6 lg:px-12 fc-page">
        {/* Header */}
        <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-10 mb-10">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Link href="/client/progress" className="fc-surface w-10 h-10 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-surface-card-border)]">
              <ArrowLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
            </Link>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                <Timer className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                  Performance Tests
                </h1>
                <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                  Benchmarks and aerobic tests
                </p>
              </div>
            </div>
          </div>
        </div>

        <main className="space-y-8">
          {/* Test type switcher */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSelectedType("1km_run")}
              className={`fc-surface p-6 rounded-2xl border text-left transition-all ${
                selectedType === "1km_run"
                  ? "border-[color:var(--fc-glass-border-strong)] bg-[color:var(--fc-glass-highlight)]"
                  : "border-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-glass-highlight)]"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                  <Timer className="w-6 h-6" />
                </div>
                {runTrendPercent !== null && runTests.length >= 2 && (
                  <div className="flex items-center gap-1 fc-text-success font-mono text-sm font-bold">
                    <TrendingUp className="w-4 h-4" />
                    {runTrendPercent > 0 ? "+" : ""}
                    {runTrendPercent}%
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold fc-text-primary mb-1">1km Run</h3>
              <p className="text-sm fc-text-subtle">Aerobic capacity & speed</p>
              <div className="mt-4 text-xs font-mono fc-text-subtle font-medium tracking-wider">
                LAST: {runTests.length > 0 && runTests[0].time_seconds != null
                  ? formatRunTime(runTests[0].time_seconds)
                  : "—"}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType("step_test")}
              className={`fc-surface p-6 rounded-2xl border text-left transition-all ${
                selectedType === "step_test"
                  ? "border-[color:var(--fc-glass-border-strong)] bg-[color:var(--fc-glass-highlight)]"
                  : "border-[color:var(--fc-glass-border)] hover:bg-[color:var(--fc-glass-highlight)]"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-red-500/10 rounded-2xl text-red-400">
                  <HeartPulse className="w-6 h-6" />
                </div>
                {stepTrendPercent !== null && stepTests.length >= 2 && (
                  <div className="flex items-center gap-1 fc-text-success font-mono text-sm font-bold">
                    <TrendingUp className="w-4 h-4" />
                    {stepTrendPercent > 0 ? "+" : ""}
                    {stepTrendPercent}%
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold fc-text-primary mb-1">Step Test</h3>
              <p className="text-sm fc-text-subtle">Recovery heart rate efficiency</p>
              <div className="mt-4 text-xs font-mono fc-text-subtle font-medium tracking-wider">
                LAST: {stepTests.length > 0 && stepTests[0].recovery_score != null
                  ? `${stepTests[0].recovery_score} BPM`
                  : "—"}
              </div>
            </button>
          </section>

          {/* Main display */}
          <div
            className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] overflow-hidden p-6 md:p-8"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                    Selected test
                  </span>
                  {latest && (
                    <span className="text-sm font-mono fc-text-subtle">
                      {new Date(latest.tested_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold fc-text-primary mb-6">
                  {selectedType === "1km_run" ? "1km Run" : "Step Test"}
                </h2>
                <div className="relative inline-block">
                  {latest ? (
                    selectedType === "1km_run" && latest.time_seconds != null ? (
                      <>
                        <div className="text-5xl md:text-6xl font-bold font-mono tracking-tight fc-text-primary">
                          {formatRunTime(latest.time_seconds)}
                        </div>
                        <div className="absolute -right-14 bottom-2 text-lg font-mono fc-text-subtle">
                          MIN
                        </div>
                      </>
                    ) : selectedType === "step_test" && latest.recovery_score != null ? (
                      <>
                        <div className="text-5xl md:text-6xl font-bold font-mono tracking-tight fc-text-primary">
                          {latest.recovery_score}
                        </div>
                        <div className="absolute -right-14 bottom-2 text-lg font-mono fc-text-subtle">
                          BPM
                        </div>
                      </>
                    ) : (
                      <div className="text-4xl font-bold font-mono fc-text-subtle">—</div>
                    )
                  ) : (
                    <div className="text-4xl font-bold font-mono fc-text-subtle">No result yet</div>
                  )}
                </div>
              </div>
              <div className="w-full md:w-64 space-y-4 flex-shrink-0">
                <div className="flex items-center justify-between p-4 rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <span className="text-sm fc-text-subtle">Improvement</span>
                  <span className="font-bold font-mono fc-text-success">
                    {improvement ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                  <span className="text-sm fc-text-subtle">Percentile</span>
                  <span className="font-bold font-mono fc-text-subtle">—</span>
                </div>
              </div>
            </div>

            {/* Mini sparkline */}
            {currentTests.length > 0 && (
              <div className="mt-8 h-16 w-full flex items-end gap-1">
                {currentTests.slice(0, 6).reverse().map((_, index, arr) => {
                  const i = arr.length - 1 - index;
                  const isLast = index === arr.length - 1;
                  const heights = [0.5, 0.65, 0.75, 0.5, 0.65, 1];
                  const h = heights[Math.min(index, heights.length - 1)];
                  return (
                    <div
                      key={currentTests[i]?.id ?? index}
                      className="flex-1 rounded-t-lg min-w-0 transition-opacity"
                      style={{
                        height: `${(isLast ? 1 : h) * 100}%`,
                        background: isLast
                          ? "linear-gradient(to top, var(--fc-accent-blue), var(--fc-accent-cyan))"
                          : "rgba(255,255,255,0.08)",
                        borderTop: isLast ? "2px solid var(--fc-accent-cyan)" : undefined,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* History table */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold fc-text-primary px-1">Historical logs</h3>
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] overflow-hidden">
              {currentTests.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Timer}
                    title="No performance tests"
                    description="Log a test to track improvement"
                    action={{ label: "Log test", onClick: () => setShowLogModal(true) }}
                  />
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest fc-text-subtle border-b border-[color:var(--fc-glass-border)]">
                      <th className="p-4 md:p-6 font-bold">Date</th>
                      <th className="p-4 md:p-6 font-bold">Result</th>
                      <th className="p-4 md:p-6 font-bold">Trend</th>
                      <th className="p-4 md:p-6 font-bold text-right">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-mono">
                    {
                      currentTests.map((test, index) => {
                        const prev = currentTests[index + 1];
                        const trend = getHistoryTrend(test, prev, selectedType);
                        const result =
                          selectedType === "1km_run"
                            ? test.time_seconds != null
                              ? formatRunTime(test.time_seconds)
                              : "—"
                            : test.recovery_score != null
                              ? `${test.recovery_score} BPM`
                              : "—";
                        const isImprove =
                          selectedType === "1km_run"
                            ? prev && test.time_seconds != null && prev.time_seconds != null && test.time_seconds < prev.time_seconds
                            : prev && test.recovery_score != null && prev.recovery_score != null && test.recovery_score < prev.recovery_score;
                        return (
                          <tr
                            key={test.id}
                            className="border-b border-[color:var(--fc-glass-border)] last:border-0 hover:bg-[color:var(--fc-glass-highlight)] transition-colors"
                          >
                            <td className="p-4 md:p-6 fc-text-dim">
                              {new Date(test.tested_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                            <td className="p-4 md:p-6 font-bold fc-text-primary">{result}</td>
                            <td className="p-4 md:p-6">
                              {trend === "—" ? (
                                <span className="fc-text-subtle">—</span>
                              ) : (
                                <span
                                  className={
                                    isImprove ? "font-bold fc-text-success" : "font-bold fc-text-warning"
                                  }
                                >
                                  {trend}
                                </span>
                              )}
                            </td>
                            <td className="p-4 md:p-6 text-right fc-text-subtle max-w-[120px] truncate">
                              {test.notes || "—"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </section>
        </main>

        {/* FAB */}
        <button
          type="button"
          onClick={() => setShowLogModal(true)}
          className="fixed bottom-24 right-6 z-40 w-16 h-16 rounded-2xl fc-btn fc-btn-primary flex items-center justify-center shadow-lg"
          aria-label="Log new test result"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {showLogModal && user && (
        <LogPerformanceTestModal
          clientId={user.id}
          testType={selectedType}
          onClose={() => setShowLogModal(false)}
          onSuccess={() => loadTests()}
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
