"use client";

import { useState, useEffect, useMemo } from "react";
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
  "bg-red-500/10 text-red-400 border border-red-500/20",
  "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  "bg-[color:var(--fc-status-success)]/10 fc-text-success border border-[color:var(--fc-status-success)]/20",
  "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  "bg-purple-500/10 text-purple-400 border border-purple-500/20",
];

function getExerciseIconClass(exerciseName: string, index: number): string {
  return EXERCISE_ICON_CLASSES[index % EXERCISE_ICON_CLASSES.length];
}

export default function PersonalRecordsPage() {
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

  const [loading, setLoading] = useState(true);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [filterExercise, setFilterExercise] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    if (user && !authLoading) {
      loadPersonalRecords();
    }
  }, [user, authLoading]);

  const loadPersonalRecords = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const records = await fetchPersonalRecords(user.id);
      setPersonalRecords(records);
    } catch (error) {
      console.error("Error loading personal records:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const recentRecords = useMemo(
    () => personalRecords.slice(0, 5),
    [personalRecords]
  );

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-24 pt-10 sm:px-6 lg:px-10 fc-page">
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

          {totalRecords > 0 ? (
            <>
              {/* PR Summary Hero */}
              <div
                className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-8 mb-8"
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                      <span className="text-xs font-semibold fc-text-success uppercase tracking-widest">
                        Personal records
                      </span>
                      <div className="h-px w-8 bg-[color:var(--fc-status-success)]/30" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none fc-text-primary mb-2">
                      {totalRecords}{" "}
                      <span className="text-lg font-light fc-text-subtle italic">
                        PRs
                      </span>
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                      {thisMonthCount > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full fc-glass-soft border border-[color:var(--fc-glass-border)]">
                          <Zap className="w-4 h-4 fc-text-success" />
                          <span className="text-sm font-semibold fc-text-success">
                            {thisMonthCount} this month
                          </span>
                        </div>
                      )}
                      <span className="text-sm fc-text-subtle italic">
                        Best lifts tracked
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)] flex items-center justify-center">
                      <Trophy className="w-12 h-12 sm:w-16 sm:h-16 fc-text-warning" />
                    </div>
                  </div>
                </div>
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
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : type.type === "endurance"
                          ? "bg-[color:var(--fc-status-success)]/10 fc-text-success border border-[color:var(--fc-status-success)]/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20";
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

              {/* Grouped PR list (collapsible) */}
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
