"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell } from "@/components/client-ui";
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
  formatRecordDisplay,
  getRecordType,
} from "@/lib/personalRecords";
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
  "bg-[color:var(--fc-accent-primary)]/10 text-[color:var(--fc-accent-primary)] border border-[color:var(--fc-accent-primary)]/20",
];

function getExerciseIconClass(exerciseName: string, index: number): string {
  return EXERCISE_ICON_CLASSES[index % EXERCISE_ICON_CLASSES.length];
}

export default function PersonalRecordsPage() {
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
  const thisMonthStart = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const thisMonthCount = personalRecords.filter(
    (r) => new Date(r.date) >= thisMonthStart
  ).length;

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
    const weightPRs = prTimeline.filter((pr) => pr.record_type === "weight");
    for (const pr of weightPRs) {
      const id = pr.exercise_id;
      const name = pr.exercises?.name ?? "Unknown Exercise";
      if (!byExercise.has(id)) {
        byExercise.set(id, { name, milestones: [] });
      }
      byExercise.get(id)!.milestones.push({
        date: pr.achieved_date,
        weight: pr.record_value ?? 0,
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

  if (loadError && !loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6">
            <div className="flex flex-col items-center justify-center min-h-[40vh] px-2 text-center">
              <p className="text-sm fc-text-dim mb-3">{loadError}</p>
              <button
                type="button"
                onClick={() => {
                  setLoadError(null);
                  loadPersonalRecords();
                }}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-400 transition-colors"
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
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6">
            <div className="animate-pulse space-y-3">
              <div className="h-8 w-48 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-4 w-full rounded bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-24 w-full rounded-lg bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-14 w-full rounded-lg bg-[color:var(--fc-glass-highlight)]" />
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  const summaryLine = [
    `${prStats?.totalPRs ?? totalRecords} PR${(prStats?.totalPRs ?? totalRecords) === 1 ? "" : "s"}`,
    prStats && prStats.prsThisWeek > 0 ? `${prStats.prsThisWeek} this week` : null,
    (prStats?.prsThisMonth ?? thisMonthCount) > 0
      ? `${prStats?.prsThisMonth ?? thisMonthCount} this month`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ProtectedRoute>
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden space-y-4">
          <header className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/client/progress";
              }}
              className="shrink-0 p-2 -ml-2 rounded-xl fc-text-subtle hover:fc-text-primary hover:bg-white/[0.06] transition-colors"
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
            <div className="py-6 text-center border-y border-white/5">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--fc-accent)] border-t-transparent mb-2" />
              <p className="text-sm fc-text-dim">Analyzing your workout history...</p>
            </div>
          ) : (prStats && prStats.totalPRs > 0) || totalRecords > 0 ? (
            <>
              <section className="border-b border-white/5 pb-4">
                <p className="text-sm uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  Overview
                </p>
                <p className="text-sm font-medium fc-text-primary leading-snug">{summaryLine}</p>
                {prStats?.latestPR && (
                  <p className="text-xs fc-text-dim mt-2 leading-snug">
                    Latest:{" "}
                    <span className="font-semibold fc-text-primary">
                      {prStats.latestPR.exercises?.name || "Unknown Exercise"}
                    </span>{" "}
                    — {prStats.latestPR.record_value}
                    {prStats.latestPR.record_unit} (
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
                  unit="kg"
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
                <p className="text-sm uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  Recent PRs
                </p>
                <div className="flex flex-col border-y border-white/5">
                  {recentRecords.map((record) => {
                    const display =
                      record.weight > 0
                        ? `${record.weight} kg`
                        : formatRecordDisplay(record.weight, record.reps);
                    return (
                      <div
                        key={record.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 pl-1 pr-1 border-b border-white/5 last:border-0 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold fc-text-primary truncate">
                            {record.exerciseName}
                          </p>
                          <p className="text-[11px] font-mono uppercase tracking-wide fc-text-dim">
                            {formatRelative(record.date)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-mono font-bold fc-text-primary">{display}</p>
                          <p className="text-[10px] fc-text-dim">
                            {record.reps} rep{record.reps !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="sticky top-0 z-10 -mx-1 py-2 bg-[color:var(--fc-bg-base)]/90 backdrop-blur-sm px-1">
                <label className="text-sm uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 block">
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
                      const achievementText =
                        pr.record_type === "weight"
                          ? `${exerciseName}: ${pr.record_value}${pr.record_unit}`
                          : pr.record_type === "reps"
                            ? `${exerciseName}: ${pr.record_value} ${pr.record_unit}`
                            : `${exerciseName}: ${pr.record_value} ${pr.record_unit}`;

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
                                {achievementText}
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
                              <span className="capitalize">{pr.record_type.replace("_", " ")}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </main>
              )}

              {viewMode === "grouped" && (
                <main className="flex flex-col border-y border-white/5">
                  {groupedByExercise.map(({ exerciseName, records }, groupIdx) => {
                    const latest = records[0];
                    const isOpen = openGroup === exerciseName;
                    const iconClass = getExerciseIconClass(exerciseName, groupIdx);

                    return (
                      <div key={exerciseName} className="border-b border-white/5 last:border-0">
                        <button
                          type="button"
                          onClick={() => setOpenGroup(isOpen ? null : exerciseName)}
                          className="w-full flex items-center justify-between gap-2 py-2.5 pl-1 pr-1 text-left hover:bg-white/[0.02] transition-colors"
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
                                {latest
                                  ? `${latest.weight} kg · ${formatRelative(latest.date)}`
                                  : "—"}
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
                          <div className="pb-2 pl-1 space-y-1.5 border-t border-white/5 pt-2">
                            {records.map((record) => (
                              <div
                                key={record.id}
                                className="flex justify-between items-center gap-2 py-1.5 px-2 rounded-lg fc-glass-soft text-xs"
                              >
                                <span className="fc-text-dim shrink-0">
                                  {new Date(record.date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                                <div className="flex items-center gap-2 min-w-0 justify-end">
                                  <span className="font-mono font-bold fc-text-primary tabular-nums">
                                    {record.weight} kg × {record.reps}
                                  </span>
                                  <span className="text-[9px] font-semibold fc-text-success whitespace-nowrap">
                                    {getRecordType(record.weight, record.reps).label}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </main>
              )}
            </>
          ) : (
            <div className="py-8 px-2 text-center border-y border-white/5">
              <Trophy className="mx-auto mb-2 h-8 w-8 fc-text-dim opacity-70" aria-hidden />
              <p className="text-sm font-semibold fc-text-primary mb-1">No records yet</p>
              <p className="text-sm fc-text-dim mb-4">
                Complete workouts to build your personal records.
              </p>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/client/workouts";
                }}
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
