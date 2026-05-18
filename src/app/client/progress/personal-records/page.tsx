"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Trophy, ChevronDown, ArrowLeft, Dumbbell, Filter } from "lucide-react";
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
  formatKgRepsLift,
  formatPrKindTag,
  formatPrLatestLine,
  formatPrRecentListLine,
} from "@/lib/personalRecordDisplay";
import {
  getPRTimeline,
  getPRStats,
  backfillPRs,
  type PersonalRecord as StoredPR,
} from "@/lib/prService";
import { PRTimelineChart, type PRMilestone } from "@/components/progress/PRTimelineChart";

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const EXERCISE_ICON_CLASSES = [
  "bg-[color:var(--fc-status-error)]/10 text-[color:var(--fc-status-error)] border border-[color:var(--fc-status-error)]/20",
  "bg-[color:var(--fc-accent-cyan)]/10 text-[color:var(--fc-accent-cyan)] border border-[color:var(--fc-accent-cyan)]/20",
  "bg-[color:var(--fc-status-success)]/10 fc-text-success border border-[color:var(--fc-status-success)]/20",
  "bg-[color:var(--fc-status-warning)]/10 text-[color:var(--fc-status-warning)] border border-[color:var(--fc-status-warning)]/20",
  "bg-[color:var(--fc-accent-cyan)]/10 text-[color:var(--fc-accent-cyan)] border border-[color:var(--fc-accent-cyan)]/20",
];

function getExerciseIconClass(exerciseName: string, index: number): string {
  return EXERCISE_ICON_CLASSES[index % EXERCISE_ICON_CLASSES.length];
}

function personalRecordToUiRow(record: PersonalRecord) {
  return {
    record_type: record.prKind ?? "",
    record_value:
      record.prKind === "strength_endurance" ? record.volume : record.weight,
    weight_at_record: record.weight,
    reps_at_record: record.reps,
  };
}

function exerciseHeaderLatest(records: PersonalRecord[]): string {
  const ms = records.find((r) => r.prKind === "max_strength");
  if (ms) return `${ms.weight} kg · ${formatRelative(ms.date)}`;
  const vol = records.find((r) => r.prKind === "strength_endurance");
  if (vol && vol.volume != null) {
    return `${vol.volume} vol · ${formatRelative(vol.date)}`;
  }
  const first = records[0];
  return first ? `${first.record} · ${formatRelative(first.date)}` : "—";
}

function sortRecordsForExpandedView(records: PersonalRecord[]): PersonalRecord[] {
  return [...records].sort((a, b) => {
    const aMs = a.prKind === "max_strength" ? 0 : 1;
    const bMs = b.prKind === "max_strength" ? 0 : 1;
    if (aMs !== bMs) return aMs - bMs;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

export default function PersonalRecordsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

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
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grouped" | "timeline">("grouped");
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

  const filteredRecords = useMemo(() => {
    if (!filterExercise) return personalRecords;
    return personalRecords.filter((r) => r.exerciseName === filterExercise);
  }, [personalRecords, filterExercise]);

  const groupedByExercise = useMemo(() => {
    const map = new Map<string, PersonalRecord[]>();
    filteredRecords.forEach((r) => {
      const list = map.get(r.exerciseName) ?? [];
      list.push(r);
      map.set(r.exerciseName, list);
    });
    return Array.from(map.entries()).map(([name, records]) => ({
      exerciseName: name,
      records: records.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }));
  }, [filteredRecords]);

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

  const recentRecords = useMemo(
    () => personalRecords.slice(0, 5),
    [personalRecords]
  );

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
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
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
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
            <PageSkeleton variant="dashboard" />
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden space-y-4">
          <header className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => router.push("/client/progress")}
              className="shrink-0 p-2 -ml-2 rounded-xl fc-text-subtle hover:fc-text-primary hover:bg-[color:var(--fc-glass-highlight)] transition-colors"
              aria-label="Back to progress"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight fc-text-primary truncate">
                Personal Records
              </h1>
              <p className="text-xs fc-text-dim mt-0.5">Best lifts tracked</p>
            </div>
          </header>

          {backfilling ? (
            <div className="py-6 text-center border-y border-[color:var(--fc-glass-border)]">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--fc-accent-cyan)] border-t-transparent mb-2" />
              <p className="text-sm fc-text-dim">Analyzing your workout history...</p>
            </div>
          ) : (prStats && prStats.totalPRs > 0) || totalRecords > 0 ? (
            <>
              <section className="border-b border-[color:var(--fc-glass-border)] pb-4">
                <p className="text-sm uppercase tracking-wider fc-text-dim mb-2">
                  Overview
                </p>
                <div className="space-y-1 text-sm fc-text-primary">
                  {prStats && prStats.prsThisWeek > 0 && (
                    <p>
                      PRs this week:{" "}
                      <span className="font-semibold">{prStats.prsThisWeek}</span>
                    </p>
                  )}
                  {prStats && prStats.prsThisMonth > 0 && (
                    <p>
                      PRs this month:{" "}
                      <span className="font-semibold">{prStats.prsThisMonth}</span>
                    </p>
                  )}
                </div>
                {dualPrSubtitle && (
                  <p className="text-xs fc-text-dim mt-1 leading-snug">{dualPrSubtitle}</p>
                )}
                {prStats?.latestPR && (
                  <p className="text-xs fc-text-dim mt-2 leading-snug">
                    Latest:{" "}
                    <span className="font-semibold fc-text-primary">
                      {prStats.latestPR.exercises?.name || "Unknown Exercise"}
                    </span>{" "}
                    —{" "}
                    {formatPrLatestLine({
                      record_type: prStats.latestPR.record_type,
                      record_value: prStats.latestPR.record_value,
                      record_unit: prStats.latestPR.record_unit,
                      weight_at_record: prStats.latestPR.weight_at_record,
                      reps_at_record: prStats.latestPR.reps_at_record,
                    })}{" "}
                    (
                    {new Date(prStats.latestPR.achieved_date + "T12:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    )
                  </p>
                )}
              </section>

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

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grouped")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border transition-colors ${
                    viewMode === "grouped"
                      ? "fc-glass border-[color:var(--fc-glass-border-strong)] fc-text-primary"
                      : "border-[color:var(--fc-glass-border)] fc-text-subtle hover:fc-text-primary"
                  }`}
                >
                  Grouped
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("timeline")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border transition-colors ${
                    viewMode === "timeline"
                      ? "fc-glass border-[color:var(--fc-glass-border-strong)] fc-text-primary"
                      : "border-[color:var(--fc-glass-border)] fc-text-subtle hover:fc-text-primary"
                  }`}
                >
                  Timeline
                </button>
              </div>

              <section>
                <p className="text-sm uppercase tracking-wider fc-text-dim mb-2">
                  Recent PRs
                </p>
                <div className="flex flex-col border-y border-[color:var(--fc-glass-border)]">
                  {recentRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 pl-1 pr-1 border-b border-[color:var(--fc-glass-border)] last:border-0 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold fc-text-primary truncate">
                            {record.exerciseName}
                          </p>
                          <p className="text-[11px] font-mono uppercase tracking-wide fc-text-dim">
                            {formatRelative(record.date)}
                          </p>
                        </div>
                        <p className="text-sm font-mono font-bold fc-text-primary text-right shrink-0 tabular-nums">
                          {formatPrRecentListLine(personalRecordToUiRow(record))}
                        </p>
                      </div>
                  ))}
                </div>
              </section>

              <div className="sticky top-0 z-10 -mx-1 py-2 bg-[color:var(--fc-bg-base)]/90 backdrop-blur-sm px-1">
                <label className="text-sm uppercase tracking-wider fc-text-dim mb-1.5 block">
                  Filter
                </label>
                <Select
                  value={filterExercise ?? "__all__"}
                  onValueChange={(v) => setFilterExercise(v === "__all__" ? null : v)}
                >
                  <SelectTrigger className="w-full fc-select h-10 text-sm">
                    <Filter className="w-3.5 h-3.5 fc-text-subtle shrink-0" />
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

              {viewMode === "timeline" && prTimeline.length > 0 && (
                <main className="space-y-2">
                  {prTimeline
                    .filter((pr) => !filterExercise || pr.exercises?.name === filterExercise)
                    .map((pr) => {
                      const exerciseName = pr.exercises?.name || "Unknown Exercise";
                      const isRecent =
                        new Date(pr.achieved_date + "T12:00:00") >=
                        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                      const valueLine = formatPrRecentListLine({
                        record_type: pr.record_type,
                        record_value: pr.record_value,
                        record_unit: pr.record_unit,
                        weight_at_record: pr.weight_at_record,
                        reps_at_record: pr.reps_at_record,
                      });
                      const typeLabel = formatPrKindTag(pr.record_type);

                      return (
                        <div
                          key={pr.id}
                          className={`rounded-xl border px-3 py-2 transition-all ${
                            isRecent
                              ? "border-[color:var(--fc-status-success)]/30 bg-[color:var(--fc-status-success)]/5"
                              : "border-[color:var(--fc-glass-border)] fc-surface"
                          }`}
                        >
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold fc-text-primary leading-snug">
                                {exerciseName}: {valueLine}
                              </span>
                              {isRecent && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[color:var(--fc-status-success)]/20 text-[color:var(--fc-status-success)]">
                                  Recent
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] fc-text-subtle">
                              <span>
                                {new Date(pr.achieved_date + "T12:00:00").toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              {pr.improvement_percentage != null && pr.improvement_percentage > 0 && (
                                <span className="fc-text-success font-medium">
                                  +{pr.improvement_percentage.toFixed(1)}%
                                </span>
                              )}
                              <span>{typeLabel}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </main>
              )}

              {viewMode === "grouped" && (
                <main className="flex flex-col border-y border-[color:var(--fc-glass-border)]">
                  {groupedByExercise.map(({ exerciseName, records }, groupIdx) => {
                    const latest = records[0];
                    const isOpen = openGroup === exerciseName;
                    const iconClass = getExerciseIconClass(exerciseName, groupIdx);

                    return (
                      <div key={exerciseName} className="border-b border-[color:var(--fc-glass-border)] last:border-0">
                        <button
                          type="button"
                          onClick={() => setOpenGroup(isOpen ? null : exerciseName)}
                          className="w-full flex items-center justify-between gap-2 py-2.5 pl-1 pr-1 text-left hover:bg-[color:var(--fc-glass-highlight)] transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${iconClass}`}
                            >
                              <Dumbbell className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold fc-text-primary truncate">{exerciseName}</h3>
                              <p className="text-[11px] fc-text-dim truncate">
                                Latest:{" "}
                                {exerciseHeaderLatest(records)}
                              </p>
                            </div>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 fc-text-subtle shrink-0 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="pb-2 pl-1 space-y-1.5 border-t border-[color:var(--fc-glass-border)] pt-2">
                            {sortRecordsForExpandedView(records).map((record) => {
                              const isMax = record.prKind === "max_strength";
                              const isVol = record.prKind === "strength_endurance";
                              return (
                              <div
                                key={record.id}
                                className={`flex justify-between items-start gap-2 py-2 px-2 rounded-lg fc-glass-soft ${
                                  isVol ? "opacity-90" : ""
                                }`}
                              >
                                <span className="fc-text-dim shrink-0 text-xs pt-0.5">
                                  {new Date(record.date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                                <div className="flex flex-col items-end gap-0.5 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`font-mono font-bold tabular-nums text-right ${
                                        isMax
                                          ? "text-base fc-text-primary"
                                          : "text-sm fc-text-subtle"
                                      }`}
                                    >
                                      {isMax
                                        ? `${record.weight} kg`
                                        : `${record.volume ?? record.weight} vol`}
                                    </span>
                                    <span
                                      className={`text-[9px] font-semibold whitespace-nowrap ${
                                        isMax ? "fc-text-success" : "fc-text-dim"
                                      }`}
                                    >
                                      {formatPrKindTag(record.prKind ?? "")}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[10px] tabular-nums ${
                                      isMax ? "fc-text-dim" : "fc-text-subtle"
                                    }`}
                                  >
                                    {isMax
                                      ? `(× ${record.reps} rep${record.reps !== 1 ? "s" : ""})`
                                      : `(${formatKgRepsLift(record.weight, record.reps)})`}
                                  </span>
                                </div>
                              </div>
                            );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </main>
              )}
            </>
          ) : (
            <div className="py-8 px-2 text-center border-y border-[color:var(--fc-glass-border)]">
              <Trophy className="mx-auto mb-2 h-8 w-8 fc-text-dim opacity-70" aria-hidden />
              <p className="text-sm font-semibold fc-text-primary mb-1">No records yet</p>
              <p className="text-sm fc-text-dim mb-4">
                Complete workouts to build your personal records.
              </p>
              <button
                type="button"
                onClick={() => router.push("/client/workouts")}
                className="fc-btn fc-btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
              >
                <Dumbbell className="w-4 h-4" />
                Start a workout
              </button>
            </div>
          )}
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
