"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ArrowLeft, Timer, Plus, HeartPulse } from "lucide-react";
import {
  getClientPerformanceTests,
  PerformanceTest,
} from "@/lib/performanceTestService";
import { LogPerformanceTestModal } from "@/components/client/LogPerformanceTestModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClientPageShell } from "@/components/client-ui";

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
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(null);
    setLoadingStartedAt(Date.now());
    try {
      const [run, step] = await Promise.all([
        getClientPerformanceTests(user.id, "1km_run"),
        getClientPerformanceTests(user.id, "step_test"),
      ]);
      setRunTests(run);
      setStepTests(step);
    } catch (err) {
      console.error("Error loading performance tests:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load performance data");
      setRunTests([]);
      setStepTests([]);
    } finally {
      setLoading(false);
      setLoadingStartedAt(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user || authLoading) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
      setLoadError("Loading took too long. Tap Retry to try again.");
    }, 20_000);
    loadData().finally(() => {
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
  }, [loadData, user, authLoading]);

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
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6">
            <div className="fc-card-shell p-4 text-center">
              <p className="text-sm text-[color:var(--fc-text-dim)] mb-3">{loadError}</p>
              <button type="button" onClick={() => { setLoadError(null); loadData(); }} className="fc-btn fc-btn-secondary fc-press h-10 px-4 text-sm">Retry</button>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6">
            <div className="animate-pulse space-y-3">
              <div className="h-10 rounded-xl bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-36 rounded-xl bg-[color:var(--fc-glass-highlight)]" />
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <ClientPageShell className="max-w-lg mx-auto px-4 pb-40 pt-6 overflow-x-hidden">
        <div className="border-b border-white/5 mb-4 pb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => { window.location.href = "/client/progress"; }}
              className="fc-surface w-9 h-9 flex items-center justify-center rounded-lg shrink-0 border border-[color:var(--fc-glass-border)]"
            >
              <ArrowLeft className="w-4 h-4 text-[color:var(--fc-text-primary)]" />
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                <Timer className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                  Performance Tests
                </h1>
                <p className="text-xs text-[color:var(--fc-text-dim)] mt-0.5">
                  Benchmarks and aerobic tests
                </p>
              </div>
            </div>
          </div>
        </div>

        <main className="space-y-4">
          <section className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setSelectedType("1km_run")}
              className={`flex-1 min-w-0 rounded-xl border px-3 py-2.5 text-left transition-all ${
                selectedType === "1km_run"
                  ? "border-[color:var(--fc-glass-border-strong)] bg-[color:var(--fc-glass-highlight)]"
                  : "border-[color:var(--fc-glass-border)] fc-surface hover:bg-[color:var(--fc-glass-highlight)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="flex items-center gap-1.5 text-xs font-bold fc-text-primary">
                  <Timer className="w-3.5 h-3.5 text-blue-400" />
                  1km run
                </span>
                {runTrendPercent !== null && runTests.length >= 2 && (
                  <span className="fc-text-success font-mono text-[10px] font-bold">
                    {runTrendPercent > 0 ? "+" : ""}
                    {runTrendPercent}%
                  </span>
                )}
              </div>
              <p className="text-[10px] fc-text-subtle truncate">Aerobic · last {runTests.length > 0 && runTests[0].time_seconds != null ? formatRunTime(runTests[0].time_seconds) : "—"}</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType("step_test")}
              className={`flex-1 min-w-0 rounded-xl border px-3 py-2.5 text-left transition-all ${
                selectedType === "step_test"
                  ? "border-[color:var(--fc-glass-border-strong)] bg-[color:var(--fc-glass-highlight)]"
                  : "border-[color:var(--fc-glass-border)] fc-surface hover:bg-[color:var(--fc-glass-highlight)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="flex items-center gap-1.5 text-xs font-bold fc-text-primary">
                  <HeartPulse className="w-3.5 h-3.5 text-red-400" />
                  Step test
                </span>
                {stepTrendPercent !== null && stepTests.length >= 2 && (
                  <span className="fc-text-success font-mono text-[10px] font-bold">
                    {stepTrendPercent > 0 ? "+" : ""}
                    {stepTrendPercent}%
                  </span>
                )}
              </div>
              <p className="text-[10px] fc-text-subtle truncate">
                Recovery · last {stepTests.length > 0 && stepTests[0].recovery_score != null ? `${stepTests[0].recovery_score} BPM` : "—"}
              </p>
            </button>
          </section>

          {/* Main display */}
          <div
            className="fc-card-shell overflow-hidden p-4"
          >
            <div className="flex flex-col gap-4">
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
                <h2 className="text-lg font-bold fc-text-primary mb-3">
                  {selectedType === "1km_run" ? "1km Run" : "Step Test"}
                </h2>
                <div className="relative inline-block pr-10">
                  {latest ? (
                    selectedType === "1km_run" && latest.time_seconds != null ? (
                      <>
                        <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight fc-text-primary">
                          {formatRunTime(latest.time_seconds)}
                        </div>
                        <div className="absolute right-0 bottom-1 text-xs font-mono fc-text-subtle">
                          min
                        </div>
                      </>
                    ) : selectedType === "step_test" && latest.recovery_score != null ? (
                      <>
                        <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight fc-text-primary">
                          {latest.recovery_score}
                        </div>
                        <div className="absolute right-0 bottom-1 text-xs font-mono fc-text-subtle">
                          BPM
                        </div>
                      </>
                    ) : (
                      <div className="text-2xl font-bold font-mono fc-text-subtle">—</div>
                    )
                  ) : (
                    <div className="text-lg font-bold font-mono fc-text-subtle">No result yet</div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="fc-text-subtle">Improvement</span>
                  <span className="font-mono font-bold fc-text-success">
                    {improvement ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="fc-text-subtle">Percentile</span>
                  <span className="font-mono font-bold fc-text-subtle">—</span>
                </div>
              </div>
            </div>

            {/* Mini sparkline */}
            {currentTests.length > 0 && (
              <div className="mt-4 h-12 w-full flex items-end gap-1 min-w-0 overflow-x-auto">
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
          <section className="space-y-2">
            <h3 className="text-sm font-semibold fc-text-primary px-0.5">Historical logs</h3>
            <div className="fc-card-shell overflow-hidden">
              {currentTests.length === 0 ? (
                <div className="p-4">
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
                      <th className="p-2 font-bold">Date</th>
                      <th className="p-2 font-bold">Result</th>
                      <th className="p-2 font-bold">Trend</th>
                      <th className="p-2 font-bold text-right">Notes</th>
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
                            <td className="p-2 font-bold fc-text-primary text-xs">{result}</td>
                            <td className="p-2 text-xs">
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
          className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-xl fc-btn fc-btn-primary flex items-center justify-center shadow-lg"
          aria-label="Log new test result"
        >
          <Plus className="w-6 h-6" />
        </button>
      </ClientPageShell>

      {showLogModal && user && (
        <LogPerformanceTestModal
          clientId={user.id}
          testType={selectedType}
          onClose={() => setShowLogModal(false)}
          onSuccess={() => loadData()}
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
