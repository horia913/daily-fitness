"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import {
  Trophy,
  Zap,
  Award,
  ChevronDown,
  ArrowLeft,
  Dumbbell,
  Filter,
} from "lucide-react";
import Link from "next/link";
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
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPersonalRecords = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(null);
    setLoadingStartedAt(Date.now());
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
          <div className="relative z-10 min-h-screen px-4 pb-32 pt-10 sm:px-6 lg:px-10 fc-page">
            <div className="mx-auto w-full max-w-6xl">
              <div className="fc-surface p-8 rounded-2xl border border-[color:var(--fc-surface-card-border)] text-center">
                <p className="text-[color:var(--fc-text-dim)] mb-4">{loadError}</p>
                <button type="button" onClick={() => { setLoadError(null); loadPersonalRecords(); }} className="fc-btn fc-btn-secondary fc-press h-10 px-6 text-sm">Retry</button>
              </div>
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
          <div className="relative z-10 min-h-screen px-4 pb-32 pt-10 sm:px-6 lg:px-10 fc-page">
            <div className="mx-auto w-full max-w-6xl">
              <div className="fc-surface p-8 rounded-2xl">
                <div className="animate-pulse space-y-6">
                  <div className="h-32 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-28 rounded-2xl bg-[color:var(--fc-glass-highlight)]"
                      />
                    ))}
                  </div>
                  <div className="h-48 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                </div>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:px-10 fc-page space-y-6">
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-10">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Link href="/client/progress" className="fc-surface w-10 h-10 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-surface-card-border)]">
                <ArrowLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
              </Link>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                    Personal Records
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                    Best lifts tracked
                  </p>
                </div>
              </div>
            </div>
          </div>

          {backfilling ? (
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-8 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-[color:var(--fc-accent)] border-t-transparent mb-4" />
              <p className="text-sm text-[color:var(--fc-text-dim)]">
                Analyzing your workout history...
              </p>
            </div>
          ) : (prStats && prStats.totalPRs > 0) || totalRecords > 0 ? (
            <>
              {/* PR Summary Hero (Enhanced) */}
              <div
                className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-8 mb-8"
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left flex-1">
                    <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                      <span className="text-xs font-semibold fc-text-success uppercase tracking-widest">
                        Personal records
                      </span>
                      <div className="h-px w-8 bg-[color:var(--fc-status-success)]/30" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none fc-text-primary mb-2">
                      {prStats?.totalPRs || totalRecords}{" "}
                      <span className="text-lg font-light fc-text-subtle italic">
                        PRs
                      </span>
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start mb-4">
                      {prStats && prStats.prsThisWeek > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full fc-glass-soft border border-[color:var(--fc-glass-border)]">
                          <Zap className="w-4 h-4 fc-text-success" />
                          <span className="text-sm font-semibold fc-text-success">
                            {prStats.prsThisWeek} this week
                          </span>
                        </div>
                      )}
                      {(prStats?.prsThisMonth || thisMonthCount) > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full fc-glass-soft border border-[color:var(--fc-glass-border)]">
                          <Zap className="w-4 h-4 fc-text-success" />
                          <span className="text-sm font-semibold fc-text-success">
                            {prStats?.prsThisMonth || thisMonthCount} this month
                          </span>
                        </div>
                      )}
                    </div>
                    {prStats?.latestPR && (
                      <div className="text-sm fc-text-subtle">
                        Latest: <span className="font-semibold fc-text-primary">{prStats.latestPR.exercises?.name || "Unknown Exercise"}</span> — {prStats.latestPR.record_value}{prStats.latestPR.record_unit} ({prStats.latestPR.record_type === "weight" ? "weight" : "reps"}) ({new Date(prStats.latestPR.achieved_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)] flex items-center justify-center">
                      <Trophy className="w-12 h-12 sm:w-16 sm:h-16 fc-text-warning" />
                    </div>
                  </div>
                </div>
              </div>

              {/* PR Progress — timeline chart (collapsible), wired to exercise filter */}
              <section className="mb-6">
                <PRTimelineChart
                  milestones={chartExercise?.milestones ?? []}
                  exerciseName={chartExercise?.name ?? "—"}
                  unit="kg"
                  defaultTimeRange="3M"
                  defaultExpanded={true}
                />
              </section>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setViewMode("grouped")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    viewMode === "grouped"
                      ? "fc-surface fc-text-primary shadow-sm"
                      : "text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)]"
                  }`}
                >
                  Grouped
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("timeline")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    viewMode === "timeline"
                      ? "fc-surface fc-text-primary shadow-sm"
                      : "text-[color:var(--fc-text-dim)] hover:text-[color:var(--fc-text-primary)]"
                  }`}
                >
                  Timeline
                </button>
              </div>

              {/* Recent Breakthroughs — grid on mobile (no horizontal scroll) */}
              <section className="mb-8">
                <h2 className="text-xl font-bold fc-text-primary mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 fc-text-error" />
                  Recent PRs
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentRecords.map((record, idx) => {
                    const type = getRecordType(record.weight, record.reps);
                    const iconClass =
                      type.type === "power"
                        ? "bg-[color:var(--fc-status-warning)]/10 text-[color:var(--fc-status-warning)] border border-[color:var(--fc-status-warning)]/20"
                        : type.type === "endurance"
                          ? "bg-[color:var(--fc-status-success)]/10 fc-text-success border border-[color:var(--fc-status-success)]/20"
                          : "bg-[color:var(--fc-accent-cyan)]/10 text-[color:var(--fc-accent-cyan)] border border-[color:var(--fc-accent-cyan)]/20";
                    return (
                      <div
                        key={record.id}
                        className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-5"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className={`p-2 rounded-lg ${iconClass}`}>
                            <Award className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-mono fc-text-subtle uppercase">
                            {formatRelative(record.date)}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold fc-text-primary mb-1">
                          {record.exerciseName}
                        </h3>
                        <div className="text-xl font-black font-mono fc-text-primary mb-2">
                          {record.weight > 0
                            ? `${record.weight} kg`
                            : formatRecordDisplay(record.weight, record.reps)}
                        </div>
                        <p className="text-sm fc-text-dim">
                          {record.reps} rep{record.reps !== 1 ? "s" : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Exercise filter dropdown */}
              <div className="sticky top-0 z-10 py-2 mb-4 bg-[color:var(--fc-bg-base)]/80 backdrop-blur-xl fc-page">
                <label className="text-xs font-medium fc-text-subtle uppercase tracking-wider mb-2 block">
                  Filter by exercise
                </label>
                <Select
                  value={filterExercise ?? "__all__"}
                  onValueChange={(v) =>
                    setFilterExercise(v === "__all__" ? null : v)
                  }
                >
                  <SelectTrigger className="w-full max-w-sm fc-select h-11">
                    <Filter className="w-4 h-4 fc-text-subtle" />
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

              {/* Timeline View */}
              {viewMode === "timeline" && prTimeline.length > 0 && (
                <main className="space-y-3">
                  {prTimeline
                    .filter((pr) => !filterExercise || pr.exercises?.name === filterExercise)
                    .map((pr) => {
                      const exerciseName = pr.exercises?.name || "Unknown Exercise";
                      const isRecent = new Date(pr.achieved_date + "T12:00:00") >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                      const achievementText = 
                        pr.record_type === "weight"
                          ? `${exerciseName}: ${pr.record_value}${pr.record_unit}`
                          : pr.record_type === "reps"
                          ? `${exerciseName}: ${pr.record_value} ${pr.record_unit}`
                          : `${exerciseName}: ${pr.record_value} ${pr.record_unit}`;
                      
                      return (
                        <div
                          key={pr.id}
                          className={`fc-surface rounded-2xl border p-4 transition-all ${
                            isRecent
                              ? "border-[color:var(--fc-status-success)]/30 bg-[color:var(--fc-status-success)]/5"
                              : "border-[color:var(--fc-surface-card-border)]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold fc-text-primary">
                                  {achievementText}
                                </span>
                                {isRecent && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-[color:var(--fc-status-success)]/20 text-[color:var(--fc-status-success)]">
                                    Recent
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs fc-text-subtle">
                                <span>{new Date(pr.achieved_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                {pr.improvement_percentage != null && pr.improvement_percentage > 0 && (
                                  <span className="fc-text-success font-medium">
                                    +{pr.improvement_percentage.toFixed(1)}% improvement
                                  </span>
                                )}
                                <span className="capitalize">{pr.record_type.replace("_", " ")}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </main>
              )}

              {/* Grouped PR list (collapsible) */}
              {viewMode === "grouped" && (
              <main className="space-y-4">
                {groupedByExercise.map(({ exerciseName, records }, groupIdx) => {
                  const latest = records[0];
                  const isOpen = openGroup === exerciseName;
                  const iconClass = getExerciseIconClass(
                    exerciseName,
                    groupIdx
                  );

                  return (
                    <div
                      key={exerciseName}
                      className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenGroup(isOpen ? null : exerciseName)
                        }
                        className="w-full flex items-center justify-between p-5 sm:p-6 text-left"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0 ${iconClass}`}
                          >
                            <Dumbbell className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-lg font-bold fc-text-primary truncate">
                              {exerciseName}
                            </h3>
                            <p className="text-sm fc-text-subtle italic truncate">
                              Latest:{" "}
                              {latest
                                ? `${latest.weight} kg · ${formatRelative(latest.date)}`
                                : "—"}
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-6 h-6 fc-text-subtle flex-shrink-0 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 sm:px-6 pb-6 border-t border-[color:var(--fc-glass-border)]">
                          <div className="pt-4 space-y-3">
                            {records.map((record) => (
                              <div
                                key={record.id}
                                className="flex justify-between items-center p-3 rounded-xl fc-glass-soft"
                              >
                                <span className="text-sm fc-text-dim">
                                  {new Date(record.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-bold fc-text-primary">
                                    {record.weight} kg × {record.reps}
                                  </span>
                                  <span className="text-[10px] font-semibold fc-text-success">
                                    {getRecordType(record.weight, record.reps)
                                      .label}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </main>
              )}

            </>
          ) : (
            <div
              className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-10 text-center"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                <Trophy className="h-10 w-10 fc-text-warning" />
              </div>
              <h3 className="mt-6 text-2xl font-semibold fc-text-primary">
                No records yet
              </h3>
              <p className="mt-2 text-sm fc-text-dim">
                Complete workouts to build your personal records. We track your
                best lifts here.
              </p>
              <Link href="/client/workouts" className="inline-block mt-6">
                <span className="fc-btn fc-btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl">
                  <Dumbbell className="w-5 h-5" />
                  Start a workout
                </span>
              </Link>
            </div>
          )}
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
