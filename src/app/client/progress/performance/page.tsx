"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  fetchActivePerformanceCatalog,
  fetchClientPerformanceResults,
  getRosterPerformanceRank,
  deletePerformanceResult,
  formatResultValue,
  formatCategoryLabel,
  groupCatalogByCategory,
  improvementPercent,
  isCoachTested,
  isImprovement,
  isSelfLogged,
  sparkBarFraction,
  type PerformanceTestCatalogItem,
  type PerformanceTestResult,
  type RosterPerformanceRank,
} from "@/lib/performanceTestService";
import { LogPerformanceTestModal } from "@/components/client/LogPerformanceTestModal";
import { ClientPageShell, ConfirmActionDialog } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PsHero, PsSectionEyebrow } from "@/components/client/progress-suite";
import ps from "@/components/client/progress-suite/progressSuiteV1.module.css";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CoachTestedTag({ testedAt }: { testedAt: string }) {
  return (
    <span
      className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        borderColor: "color-mix(in srgb, var(--fc-accent) 45%, transparent)",
        color: "var(--fc-accent)",
      }}
    >
      Coach tested · {formatShortDate(testedAt)}
    </span>
  );
}

function PerformancePageContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  const [catalog, setCatalog] = useState<PerformanceTestCatalogItem[]>([]);
  const [results, setResults] = useState<PerformanceTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editResult, setEditResult] = useState<PerformanceTestResult | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] =
    useState<PerformanceTestResult | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rosterRank, setRosterRank] = useState<RosterPerformanceRank>({
    kind: "unavailable",
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [cat, rows] = await Promise.all([
        fetchActivePerformanceCatalog(),
        fetchClientPerformanceResults(user.id),
      ]);
      setCatalog(cat);
      setResults(rows);
      setSelectedTestId((prev) => {
        if (prev && cat.some((c) => c.id === prev)) return prev;
        return cat[0]?.id ?? null;
      });
    } catch (err) {
      console.error("Error loading performance tests:", err);
      setLoadError(
        err instanceof Error ? err.message : "Failed to load performance data",
      );
      setResults([]);
    } finally {
      setLoading(false);
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

  const selectedTest = useMemo(
    () => catalog.find((c) => c.id === selectedTestId) ?? null,
    [catalog, selectedTestId],
  );

  const currentTests = useMemo(() => {
    if (!selectedTestId) return [];
    return results.filter((r) => r.test_id === selectedTestId);
  }, [results, selectedTestId]);

  const groups = useMemo(() => groupCatalogByCategory(catalog), [catalog]);

  const latest = currentTests[0];
  const previous = currentTests[1];
  const direction = selectedTest?.direction ?? "higher_better";

  const trendPct =
    latest && previous
      ? improvementPercent(
          Number(latest.result_value),
          Number(previous.result_value),
          direction,
        )
      : null;

  useEffect(() => {
    if (!user?.id || !selectedTestId) return;
    let cancelled = false;
    (async () => {
      const rank = await getRosterPerformanceRank(user.id, selectedTestId);
      if (!cancelled) setRosterRank(rank);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, selectedTestId, currentTests]);

  const sparkValues = useMemo(() => {
    return [...currentTests]
      .reverse()
      .map((t) => Number(t.result_value))
      .filter((v) => Number.isFinite(v));
  }, [currentTests]);

  const confirmDelete = async () => {
    if (!pendingDelete || !user?.id) return;
    if (!isSelfLogged(pendingDelete)) {
      addToast({
        title: "Can't delete coach-tested results",
        variant: "destructive",
      });
      setPendingDelete(null);
      return;
    }
    setDeleting(true);
    try {
      await deletePerformanceResult(pendingDelete.id);
      addToast({ title: "Test deleted", variant: "success" });
      setPendingDelete(null);
      void loadData();
    } catch {
      addToast({ title: "Failed to delete test", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const rosterRankLabel = (() => {
    if (rosterRank.kind === "solo") return "Only result so far";
    if (rosterRank.kind === "ranked") {
      return `#${rosterRank.rank} of ${rosterRank.total}`;
    }
    return "—";
  })();

  if (loadError) {
    return (
      <ClientPageShell
        className={cn(ps.psV1, "mx-auto max-w-lg lg:max-w-3xl px-4 pb-[var(--fc-bottom-safe-area)] pt-4")}
      >
        <div className="py-8 text-center">
          <p className="mb-3 text-sm" style={{ color: "var(--ps-t2)" }}>
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoadError(null);
              void loadData();
            }}
            className="text-sm font-medium"
            style={{ color: "var(--fc-accent)" }}
          >
            Retry
          </button>
        </div>
      </ClientPageShell>
    );
  }

  if (authLoading || loading) {
    return (
      <ClientPageShell
        className={cn(ps.psV1, "mx-auto max-w-lg lg:max-w-3xl px-4 pb-[var(--fc-bottom-safe-area)] pt-4")}
      >
        <PageSkeleton variant="dashboard" />
      </ClientPageShell>
    );
  }

  return (
    <>
      <ClientPageShell
        className={cn(
          ps.psV1,
          "relative mx-auto max-w-lg lg:max-w-3xl px-4 pb-40 pt-4 overflow-x-hidden",
        )}
      >
        <PsHero
          glow="cyan"
          onBack={() => router.push("/client/progress")}
          eyebrow="Progress"
          eyebrowColor="var(--fc-accent)"
          title="Performance"
          subtitle="Jumps, sprints, carries & cardio"
        />

        {catalog.length === 0 ? (
          <div
            className="mt-8 border-y py-8"
            style={{ borderColor: "var(--ps-line)" }}
          >
            <p
              className={cn(ps.psFontDisplay, "text-[18px] font-semibold")}
              style={{ color: "var(--ps-t1)" }}
            >
              No tests available
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <section>
              <PsSectionEyebrow accent="cyan" className="mb-3">
                Tests
              </PsSectionEyebrow>
              <div className="space-y-4">
                {groups.map((g) => (
                  <div key={g.category}>
                    <p
                      className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                      style={{ color: "var(--ps-t3)" }}
                    >
                      {formatCategoryLabel(g.category)}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {g.items.map((t) => {
                        const latestFor = results.find((r) => r.test_id === t.id);
                        const selected = t.id === selectedTestId;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTestId(t.id)}
                            className="rounded-none border px-3 py-2.5 text-left transition-colors"
                            style={{
                              borderColor: selected
                                ? "var(--fc-accent)"
                                : "var(--ps-line)",
                              background: "transparent",
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(ps.psFontHeadline, "text-[13px]")}
                                style={{ color: "var(--ps-t1)" }}
                              >
                                {t.display_name}
                              </span>
                              <span
                                className={cn(ps.psFontMono, "text-[12px]")}
                                style={{ color: "var(--ps-t2)" }}
                              >
                                {latestFor
                                  ? formatResultValue(
                                      latestFor.result_value,
                                      t.result_unit,
                                    )
                                  : "—"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {selectedTest && (
              <section>
                <PsSectionEyebrow accent="action" className="mb-3">
                  Latest
                </PsSectionEyebrow>
                <div
                  className="border-y py-4"
                  style={{ borderColor: "var(--ps-line)" }}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2
                      className={cn(ps.psFontDisplay, "text-[16px] font-semibold")}
                      style={{ color: "var(--ps-t1)" }}
                    >
                      {selectedTest.display_name}
                    </h2>
                    {latest && isCoachTested(latest) ? (
                      <CoachTestedTag testedAt={latest.tested_at} />
                    ) : null}
                  </div>

                  {latest ? (
                    <p
                      className={cn(ps.psFontMono, "text-3xl font-semibold")}
                      style={{ color: "var(--ps-t1)" }}
                    >
                      {formatResultValue(
                        latest.result_value,
                        selectedTest.result_unit,
                      )}
                      {latest.secondary_value != null &&
                      selectedTest.secondary_unit
                        ? ` · ${selectedTest.secondary_label ?? "Sec"} ${formatResultValue(latest.secondary_value, selectedTest.secondary_unit)}`
                        : ""}
                    </p>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--ps-t2)" }}>
                      No result yet for this test.
                    </p>
                  )}

                  <div className="mt-4 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-2">
                      <span style={{ color: "var(--ps-t3)" }}>Change</span>
                      <span
                        className={cn(ps.psFontMono, "font-semibold")}
                        style={{
                          color:
                            trendPct == null
                              ? "var(--ps-t3)"
                              : trendPct >= 0
                                ? "var(--ps-good)"
                                : "var(--ps-warning)",
                        }}
                      >
                        {trendPct == null
                          ? "—"
                          : `${trendPct > 0 ? "+" : ""}${trendPct}%`}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: "var(--ps-t3)" }}>Roster rank</span>
                      <span
                        className={cn(ps.psFontMono, "font-semibold")}
                        style={{ color: "var(--ps-t1)" }}
                      >
                        {rosterRankLabel}
                      </span>
                    </div>
                  </div>

                  {sparkValues.length >= 2 ? (
                    <div className="mt-4 flex h-12 w-full items-end gap-1 overflow-x-auto">
                      {(() => {
                        const min = Math.min(...sparkValues);
                        const max = Math.max(...sparkValues);
                        return sparkValues.map((value, index) => {
                          const isLast = index === sparkValues.length - 1;
                          const h = sparkBarFraction(
                            value,
                            min,
                            max,
                            direction,
                          );
                          return (
                            <div
                              key={`${value}-${index}`}
                              className="min-w-0 flex-1 rounded-t-sm"
                              style={{
                                height: `${h * 100}%`,
                                background: isLast
                                  ? "var(--fc-accent)"
                                  : "color-mix(in srgb, var(--ps-line) 80%, transparent)",
                              }}
                              title={String(value)}
                            />
                          );
                        });
                      })()}
                    </div>
                  ) : currentTests.length > 0 ? (
                    <p className="mt-3 text-[11px]" style={{ color: "var(--ps-t3)" }}>
                      Need at least 2 sessions to show chart.
                    </p>
                  ) : null}
                </div>
              </section>
            )}

            <section>
              <PsSectionEyebrow accent="purple" className="mb-3">
                History
              </PsSectionEyebrow>
              {currentTests.length === 0 ? (
                <div
                  className="border-y py-8"
                  style={{ borderColor: "var(--ps-line)" }}
                >
                  <p
                    className={cn(ps.psFontDisplay, "text-[16px] font-semibold")}
                    style={{ color: "var(--ps-t1)" }}
                  >
                    No results yet
                  </p>
                  <p
                    className="mt-2 max-w-sm text-[13px] leading-relaxed"
                    style={{ color: "var(--ps-t2)" }}
                  >
                    Log a test yourself, or your coach may administer one
                    in-person. Both show up here — coach-tested rows are tagged.
                  </p>
                  <button
                    type="button"
                    className="mt-4 text-sm font-medium"
                    style={{ color: "var(--fc-accent)" }}
                    onClick={() => {
                      setEditResult(null);
                      setShowLogModal(true);
                    }}
                  >
                    Log a test →
                  </button>
                </div>
              ) : (
                <ul
                  className="divide-y border-y"
                  style={{ borderColor: "var(--ps-line)" }}
                >
                  {currentTests.map((test, index) => {
                    const prev = currentTests[index + 1];
                    const unit = selectedTest?.result_unit ?? "";
                    const improved =
                      prev &&
                      isImprovement(
                        Number(test.result_value),
                        Number(prev.result_value),
                        direction,
                      );
                    const canEdit = isSelfLogged(test);
                    return (
                      <li key={test.id} className="py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p
                                className={cn(ps.psFontMono, "text-[14px] font-semibold")}
                                style={{ color: "var(--ps-t1)" }}
                              >
                                {formatResultValue(test.result_value, unit)}
                              </p>
                              {isCoachTested(test) ? (
                                <CoachTestedTag testedAt={test.tested_at} />
                              ) : null}
                            </div>
                            <p
                              className="mt-0.5 text-[12px]"
                              style={{ color: "var(--ps-t3)" }}
                            >
                              {formatShortDate(test.tested_at)}
                              {prev ? (
                                <span
                                  style={{
                                    color: improved
                                      ? "var(--ps-good)"
                                      : "var(--ps-warning)",
                                  }}
                                >
                                  {" · "}
                                  {improved ? "Improved" : "Declined"} vs prior
                                </span>
                              ) : null}
                            </p>
                            {test.notes ? (
                              <p
                                className="mt-1 text-[12px] truncate max-w-[220px]"
                                style={{ color: "var(--ps-t2)" }}
                              >
                                {test.notes}
                              </p>
                            ) : null}
                          </div>
                          {canEdit ? (
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                className="p-1.5"
                                aria-label="Edit test"
                                onClick={() => {
                                  setEditResult(test);
                                  setShowLogModal(true);
                                }}
                              >
                                <Pencil
                                  className="h-3.5 w-3.5"
                                  style={{ color: "var(--ps-t3)" }}
                                />
                              </button>
                              <button
                                type="button"
                                className="p-1.5"
                                aria-label="Delete test"
                                onClick={() => setPendingDelete(test)}
                              >
                                <Trash2
                                  className="h-3.5 w-3.5"
                                  style={{ color: "var(--ps-critical)" }}
                                />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setEditResult(null);
            setShowLogModal(true);
          }}
          className="fab-action"
          aria-label="Log new test result"
          disabled={!selectedTest}
        >
          <Plus />
        </button>
      </ClientPageShell>

      {user && selectedTest && (
        <LogPerformanceTestModal
          open={showLogModal}
          clientId={user.id}
          catalogTest={editResult?.test ?? selectedTest}
          editResult={editResult}
          onClose={() => {
            setShowLogModal(false);
            setEditResult(null);
          }}
          onSuccess={() => void loadData()}
        />
      )}

      <ConfirmActionDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this test?"
        description="This removes your self-logged result permanently."
        confirmLabel="Delete"
        variant="destructive"
        confirming={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

export default function PerformancePage() {
  return (
    <ProtectedRoute requiredRole="client">
      <PerformancePageContent />
    </ProtectedRoute>
  );
}
