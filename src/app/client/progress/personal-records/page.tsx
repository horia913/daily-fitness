"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Trophy, Dumbbell, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchPersonalRecords,
  PersonalRecord,
} from "@/lib/personalRecords";
import {
  getPRTimeline,
  getPRStats,
  backfillPRs,
  type PersonalRecord as StoredPR,
} from "@/lib/prService";
import { PRTimelineChart, type PRMilestone } from "@/components/progress/PRTimelineChart";
import { PsHero } from "@/components/client/progress-suite";
import ps from "@/components/client/progress-suite/progressSuiteV1.module.css";
import { cn } from "@/lib/utils";

function trimWeight(w: number): string {
  if (!Number.isFinite(w)) return "—";
  if (Math.abs(w - Math.round(w)) < 0.01) return String(Math.round(w));
  return String(Math.round(w * 100) / 100);
}

/** Client v6: `reps × weight` (not weight-first). */
function formatRepsTimesWeight(weight: number, reps: number): string {
  return `${reps} × ${trimWeight(weight)} kg`;
}

function formatClientPrLine(args: {
  record_type: string;
  record_value?: number | string | null;
  weight_at_record?: number | null;
  reps_at_record?: number | null;
  weight?: number;
  reps?: number;
  volume?: number | null;
}): string {
  const t = (args.record_type || "").toLowerCase().trim();
  const w = Number(args.weight_at_record ?? args.weight ?? args.record_value ?? 0);
  const r = Number(args.reps_at_record ?? args.reps ?? 0);
  if (t === "max_strength" || t === "weight") {
    return formatRepsTimesWeight(w, r);
  }
  if (t === "strength_endurance") {
    const vol = Number(args.record_value ?? args.volume ?? 0);
    return `${trimWeight(vol)} vol · ${formatRepsTimesWeight(w, r)}`;
  }
  return args.record_value != null ? String(args.record_value) : "—";
}

/** Mono technique/kind note — never a chip. */
function prKindNote(recordType: string | null | undefined): string | null {
  const t = (recordType || "").toLowerCase().trim();
  if (t === "max_strength" || t === "weight") return "↳ max strength";
  if (t === "strength_endurance") return "↳ volume";
  return null;
}

export default function PersonalRecordsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [prTimeline, setPRTimeline] = useState<StoredPR[]>([]);
  const [prStats, setPRStats] = useState<{
    totalPRs: number;
    prsThisMonth: number;
    prsThisWeek: number;
    prRecordRowsThisMonth: number;
    prRecordRowsThisWeek: number;
    latestPR: StoredPR | null;
    mostImproved: StoredPR | null;
  } | null>(null);
  const [filterExercise, setFilterExercise] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPersonalRecords = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [stats, timeline] = await Promise.all([
        getPRStats(user.id),
        getPRTimeline(user.id, 100),
      ]);
      
      setPRStats(stats);
      setPRTimeline(timeline);

      if (stats.totalPRs === 0) {
        const { data: workoutLogs } = await supabase
          .from("workout_logs")
          .select("id")
          .eq("client_id", user.id)
          .limit(1);
        
        if (workoutLogs && workoutLogs.length > 0) {
          setBackfilling(true);
          try {
            const count = await backfillPRs(user.id);
            if (count > 0) {
              const [newStats, newTimeline] = await Promise.all([
                getPRStats(user.id),
                getPRTimeline(user.id, 100),
              ]);
              setPRStats(newStats);
              setPRTimeline(newTimeline);
            }
          } catch (err) {
            console.error("Error backfilling PRs:", err);
          } finally {
            setBackfilling(false);
          }
        }
      }

      const records = await fetchPersonalRecords(user.id);
      setPersonalRecords(records);
    } catch (err) {
      console.error("Error loading personal records:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load personal records");
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
    loadPersonalRecords().finally(() => {
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
  }, [loadPersonalRecords, user, authLoading]);

  const totalRecords = personalRecords.length;
  const exerciseNames = useMemo(() => {
    const set = new Set(personalRecords.map((r) => r.exerciseName));
    return Array.from(set).sort();
  }, [personalRecords]);

  /** Weight PR milestones by exercise (from stored personal_records). Used for PR timeline chart. */
  const weightPRMilestonesByExercise = useMemo(() => {
    const byExercise = new Map<
      string,
      { name: string; milestones: PRMilestone[] }
    >();
    const weightPRs = prTimeline.filter((pr) => pr.record_type === "max_strength");
    for (const pr of weightPRs) {
      const id = pr.exercise_id;
      const name = pr.exercises?.name ?? "Unknown Exercise";
      if (!byExercise.has(id)) {
        byExercise.set(id, { name, milestones: [] });
      }
      byExercise.get(id)!.milestones.push({
        date: pr.achieved_date,
        value: pr.record_value ?? 0,
      });
    }
    byExercise.forEach((data) => {
      data.milestones.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    });
    return byExercise;
  }, [prTimeline]);

  /** Exercise to show in the PR timeline chart: filter selection or the one with most weight PRs. */
  const chartExercise = useMemo(() => {
    const entries = Array.from(weightPRMilestonesByExercise.entries());
    if (entries.length === 0) return null;
    if (filterExercise) {
      const match = entries.find(([, data]) => data.name === filterExercise);
      if (match) return { id: match[0], name: match[1].name, milestones: match[1].milestones };
    }
    const withMost = entries.reduce<
      [string, { name: string; milestones: PRMilestone[] }] | null
    >(
      (best, [id, data]) =>
        data.milestones.length > (best?.[1].milestones.length ?? 0)
          ? [id, data]
          : best,
      null
    );
    if (!withMost) return null;
    return {
      id: withMost[0],
      name: withMost[1].name,
      milestones: withMost[1].milestones,
    };
  }, [weightPRMilestonesByExercise, filterExercise]);

  const dualPrSubtitle = useMemo(() => {
    if (!prStats) return null;
    const parts: string[] = [];
    if (
      prStats.prRecordRowsThisWeek > prStats.prsThisWeek &&
      prStats.prsThisWeek > 0
    ) {
      const sets = prStats.prsThisWeek === 1 ? "set" : "sets";
      const records = prStats.prRecordRowsThisWeek === 1 ? "record" : "records";
      parts.push(
        `This week: across ${prStats.prsThisWeek} unique ${sets} (${prStats.prRecordRowsThisWeek} ${records})`,
      );
    }
    if (
      prStats.prRecordRowsThisMonth > prStats.prsThisMonth &&
      prStats.prsThisMonth > 0
    ) {
      const sets = prStats.prsThisMonth === 1 ? "set" : "sets";
      const records =
        prStats.prRecordRowsThisMonth === 1 ? "record" : "records";
      parts.push(
        `This month: across ${prStats.prsThisMonth} unique ${sets} (${prStats.prRecordRowsThisMonth} ${records})`,
      );
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [prStats]);

  if (loadError && !loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
            <div className="flex flex-col items-center justify-center min-h-[40vh] px-2 text-center">
              <p className="text-sm fc-text-dim mb-3">{loadError}</p>
              <button
                type="button"
                onClick={() => {
                  setLoadError(null);
                  loadPersonalRecords();
                }}
                className="fc-btn fc-btn-primary fc-press h-10 px-5 text-sm"
              >
                Retry
              </button>
            </div>
          </ClientPageShell>
      </ProtectedRoute>
    );
  }

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
            <PageSkeleton variant="dashboard" />
          </ClientPageShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="client">
      <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
        <div className={ps.psV1}>
          <PsHero
            glow="cyan"
            onBack={() => router.push("/client/progress")}
            backAriaLabel="Back to progress hub"
            eyebrow="Progress · records"
            eyebrowColor="var(--fc-group-a)"
            title="Personal Records"
            subtitle="Best lifts tracked"
          />

          {backfilling ? (
            <div className="mt-4 py-6 text-center border-y border-[color:var(--fc-hairline)]">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--fc-group-a)] border-t-transparent" />
              <p className={cn(ps.psFontMono, "text-sm fc-text-dim")}>
                Analyzing your workout history...
              </p>
            </div>
          ) : (prStats && prStats.totalPRs > 0) || totalRecords > 0 ? (
            <div className="mt-4 space-y-4">
              <section className="rounded-[18px] border border-[color:var(--fc-hairline)] bg-transparent p-4">
                <p
                  className={cn(
                    ps.psFontMono,
                    "mb-2 text-[10px] uppercase tracking-[0.08em] text-[color:var(--fc-text-subtle)]",
                  )}
                >
                  Overview
                </p>
                <div className={cn(ps.psFontMono, "space-y-1 text-sm fc-text-primary")}>
                  {prStats && prStats.prsThisWeek > 0 && (
                    <p>
                      PRs this week:{" "}
                      <span className={cn(ps.psFontDisplay, "text-base font-bold tabular-nums")}>
                        {prStats.prsThisWeek}
                      </span>
                    </p>
                  )}
                  {prStats && prStats.prsThisMonth > 0 && (
                    <p>
                      PRs this month:{" "}
                      <span className={cn(ps.psFontDisplay, "text-base font-bold tabular-nums")}>
                        {prStats.prsThisMonth}
                      </span>
                    </p>
                  )}
                </div>
                {dualPrSubtitle && (
                  <p className={cn(ps.psFontMono, "mt-1 text-xs leading-snug fc-text-dim")}>
                    {dualPrSubtitle}
                  </p>
                )}
                {prStats?.latestPR && (
                  <p className={cn(ps.psFontMono, "mt-2 text-xs leading-snug fc-text-dim")}>
                    Latest:{" "}
                    <span className="font-semibold fc-text-primary">
                      {prStats.latestPR.exercises?.name || "Unknown Exercise"}
                    </span>{" "}
                    —{" "}
                    {formatClientPrLine({
                      record_type: prStats.latestPR.record_type,
                      record_value: prStats.latestPR.record_value,
                      weight_at_record: prStats.latestPR.weight_at_record,
                      reps_at_record: prStats.latestPR.reps_at_record,
                    })}{" "}
                    (
                    {new Date(prStats.latestPR.achieved_date + "T12:00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )}
                    )
                  </p>
                )}
              </section>

              <div className="sticky top-0 z-10 -mx-1 border-b border-[color:var(--fc-hairline)] bg-[color:var(--fc-bg-deep)] px-1 py-2">
                <label
                  className={cn(
                    ps.psFontMono,
                    "mb-1.5 block text-[10px] uppercase tracking-[0.08em] text-[color:var(--fc-text-subtle)]",
                  )}
                >
                  Filter
                </label>
                <Select
                  value={filterExercise ?? "__all__"}
                  onValueChange={(v) => setFilterExercise(v === "__all__" ? null : v)}
                >
                  <SelectTrigger className="fc-select h-10 w-full text-sm">
                    <Filter className="h-3.5 w-3.5 shrink-0 fc-text-subtle" />
                    <SelectValue placeholder="All exercises" />
                  </SelectTrigger>
                  <SelectContent align="start" className="max-h-[min(16rem,70vh)]">
                    <SelectItem value="__all__">All exercises</SelectItem>
                    {exerciseNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <section className="min-w-0 -mx-1 px-1 overflow-x-auto">
                <PRTimelineChart
                  milestones={chartExercise?.milestones ?? []}
                  exerciseName={chartExercise?.name ?? "—"}
                  recordType="max_strength"
                  valueUnit={null}
                  defaultTimeRange="3M"
                  defaultExpanded={true}
                />
              </section>

              {prTimeline.length > 0 && (
                <main className="space-y-2">
                  {prTimeline
                    .filter((pr) => !filterExercise || pr.exercises?.name === filterExercise)
                    .map((pr) => {
                      const exerciseName = pr.exercises?.name || "Unknown Exercise";
                      const isRecent =
                        new Date(pr.achieved_date + "T12:00:00") >=
                        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                      const valueLine = formatClientPrLine({
                        record_type: pr.record_type,
                        record_value: pr.record_value,
                        weight_at_record: pr.weight_at_record,
                        reps_at_record: pr.reps_at_record,
                      });
                      const kindNote = prKindNote(pr.record_type);

                      return (
                        <div
                          key={pr.id}
                          className="rounded-[14px] border border-[color:var(--fc-hairline)] bg-transparent px-3 py-2.5"
                        >
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span
                                className={cn(
                                  ps.psFontDisplay,
                                  "text-[13px] font-bold tracking-tight fc-text-primary",
                                )}
                              >
                                {exerciseName}
                              </span>
                              <span
                                className={cn(
                                  ps.psFontDisplay,
                                  "text-sm font-bold tabular-nums fc-text-primary",
                                )}
                              >
                                {valueLine}
                              </span>
                            </div>
                            <div
                              className={cn(
                                ps.psFontMono,
                                "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[color:var(--fc-text-subtle)]",
                              )}
                            >
                              <span>
                                {new Date(pr.achieved_date + "T12:00:00").toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                              {pr.improvement_percentage != null &&
                                pr.improvement_percentage > 0 && (
                                  <span className="font-medium text-[color:var(--fc-status-success)]">
                                    +{pr.improvement_percentage.toFixed(1)}%
                                  </span>
                                )}
                              {isRecent ? (
                                <span className="text-[color:var(--fc-status-success)]">
                                  · recent
                                </span>
                              ) : null}
                            </div>
                            {kindNote ? (
                              <p
                                className={cn(
                                  ps.psFontMono,
                                  "text-[10px] text-[color:var(--fc-text-subtle)]",
                                )}
                              >
                                {kindNote}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                </main>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-[18px] border border-[color:var(--fc-hairline)] bg-transparent px-4 py-8 text-center">
              <Trophy className="mx-auto mb-2 h-8 w-8 fc-text-dim opacity-70" aria-hidden />
              <p
                className={cn(
                  ps.psFontDisplay,
                  "mb-1 text-base font-bold tracking-tight fc-text-primary",
                )}
              >
                No records yet
              </p>
              <p className={cn(ps.psFontMono, "mb-4 text-sm fc-text-dim")}>
                Complete workouts to build your personal records.
              </p>
              <button
                type="button"
                onClick={() => router.push("/client/train")}
                className="fc-btn fc-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
              >
                <Dumbbell className="h-4 w-4" />
                Start a workout
              </button>
            </div>
          )}
        </div>
      </ClientPageShell>
    </ProtectedRoute>
  );
}
