"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  BookOpen,
  Play,
  Check,
  ChevronRight,
} from "lucide-react";
import { MetricGauge } from "@/components/ui/MetricGauge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import WorkoutTemplateService from "@/lib/workoutTemplateService";
import { WorkoutBlockService } from "@/lib/workoutBlockService";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Program {
  id: string;
  name: string;
  description: string;
  duration_weeks: number;
}

interface InlineExerciseLine {
  name: string;
  setsReps: string;
  rest: string | null;
}

interface WorkoutWithExercises {
  id: string;
  name: string;
  description: string;
  estimated_duration: number;
  exerciseLines: InlineExerciseLine[];
}

interface ProgramWeekExtended {
  week_number: number;
  workouts: WorkoutWithExercises[];
}

/** Build compact "name — sets x reps — rest" lines from blocks for program preview */
function buildInlineExerciseLines(blocks: any[]): InlineExerciseLine[] {
  const lines: InlineExerciseLine[] = [];
  if (!blocks || blocks.length === 0) return lines;

  for (const block of blocks) {
    const blockType = (block.block_type || "").toLowerCase();
    const restBlock = block.rest_seconds != null ? `${block.rest_seconds}s` : null;

    if (block.exercises && block.exercises.length > 0) {
      for (const ex of block.exercises) {
        const name = ex.exercise?.name || ex.exercise_letter || "Exercise";
        let setsReps = "";
        let rest: string | null = ex.rest_seconds != null ? `${ex.rest_seconds}s` : restBlock;

        if (["straight_set", "superset", "giant_set", "pre_exhaustion"].includes(blockType)) {
          const sets = ex.sets ?? block.total_sets;
          const reps = ex.reps ?? block.reps_per_set ?? "";
          if (sets != null && reps) setsReps = `${sets}×${reps}`;
          else if (reps) setsReps = String(reps);
        } else if (blockType === "drop_set") {
          const sets = ex.sets ?? block.total_sets;
          if (sets != null) setsReps = `${sets} sets drop`;
          else setsReps = "Drop set";
        } else if (blockType === "cluster_set") {
          const c = ex.cluster_sets?.[0];
          if (c) setsReps = `${c.reps_per_cluster} reps × ${c.clusters_per_set} clusters`;
          else setsReps = "Cluster";
        } else if (blockType === "rest_pause") {
          setsReps = "Rest-pause";
        } else if (blockType === "amrap") {
          const dur = block.duration_seconds ? Math.floor(block.duration_seconds / 60) : null;
          setsReps = dur ? `${dur} min AMRAP` : "AMRAP";
        } else if (blockType === "emom") {
          const dur = block.duration_seconds ? Math.floor(block.duration_seconds / 60) : null;
          setsReps = dur ? `EMOM ${dur} min` : "EMOM";
        } else if (blockType === "for_time") {
          setsReps = "For time";
        } else if (blockType === "tabata") {
          setsReps = "Tabata";
        } else if (blockType === "circuit") {
          const rounds = block.total_sets ?? "";
          setsReps = rounds ? `${rounds} rounds` : "Circuit";
        } else {
          const sets = ex.sets ?? block.total_sets;
          const reps = ex.reps ?? block.reps_per_set ?? "";
          if (sets != null && reps) setsReps = `${sets}×${reps}`;
          else if (reps) setsReps = String(reps);
        }

        lines.push({ name, setsReps: setsReps || "—", rest });
      }
    } else {
      const sets = block.total_sets;
      const reps = block.reps_per_set;
      if (blockType === "amrap" || blockType === "emom") {
        const dur = block.duration_seconds ? Math.floor(block.duration_seconds / 60) : null;
        lines.push({ name: block.block_name || blockType, setsReps: dur ? `${dur} min` : blockType, rest: null });
      } else {
        lines.push({
          name: block.block_name || blockType,
          setsReps: sets != null && reps ? `${sets}×${reps}` : (reps || String(sets) || "—"),
          rest: restBlock,
        });
      }
    }
  }
  return lines;
}

function ProgramDetailsContent() {
  const { id } = useParams();
  const router = useRouter();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();
  const [program, setProgram] = useState<Program | null>(null);
  const [weeks, setWeeks] = useState<ProgramWeekExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockedWeekMax, setUnlockedWeekMax] = useState<number>(1);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState(false);

  const isValidUuid = (val: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  useEffect(() => {
    if (!id) return;
    const idStr = id as string;
    if (!isValidUuid(idStr)) {
      setError("Invalid program link. Please go back and try again.");
      setLoading(false);
      return;
    }
    loadProgramDetails(idStr);
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/client/program-week", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.unlockedWeekMax != null) setUnlockedWeekMax(data.unlockedWeekMax);
          if (data.isCompleted === true) setIsCompleted(true);
        }
      } catch {
        // non-fatal
      }
    })();
  }, []);

  useEffect(() => {
    if (weeks.length > 0 && unlockedWeekMax >= 1 && selectedWeek === 1) {
      setSelectedWeek(unlockedWeekMax);
    }
  }, [weeks.length, unlockedWeekMax]);

  const loadProgramDetails = async (programId: string) => {
    try {
      setLoading(true);
      setError(null);

      await withTimeout(
        (async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");

          const { data: assignmentData, error: assignmentError } = await supabase
            .from("program_assignments")
            .select(
              `*,
              program:workout_programs(id, name, description, duration_weeks)`
            )
            .eq("program_id", programId)
            .eq("client_id", user.id)
            .eq("status", "active")
            .maybeSingle();

          if (assignmentError) {
            console.error("Error fetching program through assignment:", assignmentError);
            throw new Error("Failed to load program details");
          }

          if (!assignmentData || !assignmentData.program) {
            throw new Error("Program not found or not assigned to you");
          }

          const programData = assignmentData.program as any;
          setProgram({
            id: programData.id,
            name: programData.name,
            description: programData.description || "",
            duration_weeks: programData.duration_weeks,
          });

          const schedule = await WorkoutTemplateService.getProgramSchedule(programId);
          if (!schedule || schedule.length === 0) {
            setWeeks([]);
            return;
          }

          const uniqueTemplateIds = Array.from(
            new Set(schedule.map((s: any) => s.template_id).filter(Boolean))
          );

          const { data: templatesRows } = await supabase
            .from("workout_templates")
            .select("id, name, description, estimated_duration")
            .in("id", uniqueTemplateIds);

          const templatesMap = new Map(
            (templatesRows || []).map((t: any) => [t.id, t])
          );

          const blocksByTemplate = await WorkoutBlockService.getWorkoutBlocksForTemplates(
            uniqueTemplateIds
          );

          const weekMap = new Map<number, { week_number: number; items: { template_id: string; program_day: number }[] }>();
          for (const item of schedule) {
            const wn = item.week_number ?? 1;
            if (!weekMap.has(wn)) weekMap.set(wn, { week_number: wn, items: [] });
            if (item.template_id) {
              weekMap.get(wn)!.items.push({
                template_id: item.template_id,
                program_day: item.program_day ?? 1,
              });
            }
          }

          const weeksData: ProgramWeekExtended[] = [];
          for (const wn of Array.from(weekMap.keys()).sort((a, b) => a - b)) {
            const { items } = weekMap.get(wn)!;
            items.sort((a, b) => a.program_day - b.program_day);

            const workouts: WorkoutWithExercises[] = [];
            for (const { template_id } of items) {
              const template = templatesMap.get(template_id);
              const blocks = blocksByTemplate.get(template_id) || [];
              const exerciseLines = buildInlineExerciseLines(blocks);

              workouts.push({
                id: template_id,
                name: template?.name ?? "Workout",
                description: template?.description ?? "",
                estimated_duration: template?.estimated_duration ?? 0,
                exerciseLines,
              });
            }
            weeksData.push({ week_number: wn, workouts });
          }

          setWeeks(weeksData);
        })(),
        30000,
        "timeout"
      );
    } catch (err) {
      console.error("Error loading program details:", err);
      setError("Failed to load program details");
    } finally {
      setLoading(false);
    }
  };

  const selectedWeekData = useMemo(
    () => weeks.find((w) => w.week_number === selectedWeek),
    [weeks, selectedWeek]
  );

  const totalWorkouts = useMemo(
    () => weeks.reduce((sum, w) => sum + w.workouts.length, 0),
    [weeks]
  );

  const completedWeeksCount = isCompleted ? program?.duration_weeks ?? 0 : Math.max(0, unlockedWeekMax - 1);
  const progressPercent =
    program && program.duration_weeks > 0
      ? Math.min(100, Math.round((completedWeeksCount / program.duration_weeks) * 100))
      : 0;

  const firstWorkoutOfUnlockedWeek = useMemo(() => {
    const w = weeks.find((x) => x.week_number === unlockedWeekMax);
    return w?.workouts[0];
  }, [weeks, unlockedWeekMax]);

  if (loading) {
    return (
      <AnimatedBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard elevation={2} className="p-8 text-center">
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4"
              style={{
                borderColor: `${getSemanticColor("trust").primary}40`,
                borderTopColor: "transparent",
              }}
            />
            <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>
              Loading program details...
            </p>
          </GlassCard>
        </div>
      </AnimatedBackground>
    );
  }

  if (error || !program) {
    return (
      <AnimatedBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard elevation={2} className="p-8 text-center">
            <p className="text-red-500 mb-4">{error || "Program not found"}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {error && (
                <Button
                  type="button"
                  onClick={() => id && loadProgramDetails(id as string)}
                  variant="default"
                  className="fc-btn fc-btn-primary"
                >
                  Retry
                </Button>
              )}
              <Button onClick={() => router.back()} variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </GlassCard>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      <div className="relative fc-app-bg isolate">
        <div className="fc-muted-overlay" />
        <div className="fc-grain-layer" />
        <div className="fc-vignette-layer" />
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen pb-44 sm:pb-48">
          <main className="max-w-4xl mx-auto space-y-6 relative z-10 fc-page px-4 sm:px-6 py-8">
            {/* Back + Program Header */}
            <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-8 mb-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Link
                    href="/client"
                    className="flex items-center justify-center shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)] sm:fc-glass sm:fc-card"
                    aria-label="Back to dashboard"
                  >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Link>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium uppercase tracking-widest text-[color:var(--fc-text-dim)] block">
                        My Programs
                      </span>
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)] break-words line-clamp-2">
                        {program.name}
                      </h1>
                    </div>
                  </div>
                </div>
                {program.description && (
                  <p className="text-sm fc-text-dim leading-relaxed">{program.description}</p>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 fc-text-dim flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {program.duration_weeks} Weeks
                    </span>
                    <span className="w-1 h-1 rounded-full bg-[color:var(--fc-glass-border)]" />
                    <span className="fc-text-workouts font-semibold">
                      {totalWorkouts} workouts
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <MetricGauge
                      value={progressPercent}
                      label="Progress"
                      suffix="%"
                      size={120}
                      strokeWidth={7}
                      color="var(--fc-domain-workouts)"
                      gradient={["var(--fc-status-error)", "var(--fc-domain-workouts)"]}
                      animate={true}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Week selector — sticky */}
            {weeks.length > 0 && (
              <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[color:var(--fc-bg-base)]/90 backdrop-blur-md border-b border-[color:var(--fc-glass-border)]">
                <p className="text-xs font-bold uppercase tracking-widest fc-text-dim mb-2">
                  Week
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {weeks.map((w) => {
                    const isSelected = w.week_number === selectedWeek;
                    const isCompletedWeek = w.week_number < unlockedWeekMax;
                    const isFuture = w.week_number > unlockedWeekMax;
                    return (
                      <button
                        key={w.week_number}
                        type="button"
                        onClick={() => setSelectedWeek(w.week_number)}
                        className={`
                          shrink-0 w-10 h-10 rounded-xl font-bold font-mono text-sm border-2 transition-all
                          ${isSelected
                            ? "bg-[color:var(--fc-domain-workouts)] text-white border-[color:var(--fc-domain-workouts)]"
                            : isCompletedWeek
                            ? "bg-[color:var(--fc-status-success)]/20 text-[color:var(--fc-status-success)] border-[color:var(--fc-status-success)]/40"
                            : isFuture
                            ? "fc-glass border-[color:var(--fc-glass-border)] fc-text-dim"
                            : "fc-glass border-[color:var(--fc-glass-border)] fc-text-primary"
                          }
                        `}
                        aria-pressed={isSelected}
                        aria-label={`Week ${w.week_number}`}
                      >
                        {isCompletedWeek ? (
                          <Check className="w-4 h-4 mx-auto" />
                        ) : (
                          w.week_number
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected week content */}
            <section className="space-y-4">
              {selectedWeekData && (
                <>
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-lg font-bold fc-text-primary">
                      Week {selectedWeek} of {program.duration_weeks}
                    </h2>
                    {selectedWeek < unlockedWeekMax && (
                      <span className="text-xs font-semibold fc-text-success uppercase tracking-wider">
                        Completed
                      </span>
                    )}
                    {selectedWeek === unlockedWeekMax && (
                      <span className="text-xs font-semibold fc-domain-workouts uppercase tracking-wider">
                        Current week
                      </span>
                    )}
                    {selectedWeek > unlockedWeekMax && (
                      <span className="text-xs font-semibold fc-text-dim uppercase tracking-wider">
                        Upcoming
                      </span>
                    )}
                  </div>

                  {selectedWeekData.workouts.length === 0 ? (
                    <GlassCard elevation={2} className="fc-glass fc-card p-8 rounded-2xl">
                      <p className="text-center fc-text-dim">No workouts in this week.</p>
                    </GlassCard>
                  ) : (
                    <div className="space-y-4">
                      {selectedWeekData.workouts.map((workout) => {
                        const isUnlocked = selectedWeek <= unlockedWeekMax;
                        return (
                          <GlassCard
                            key={workout.id}
                            elevation={2}
                            className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] overflow-hidden"
                          >
                            <div className="p-5">
                              <div className="flex items-start justify-between gap-4 mb-4">
                                <div>
                                  <h3 className="text-lg font-bold fc-text-primary">
                                    {workout.name}
                                  </h3>
                                  <p className="text-sm fc-text-dim">
                                    ~{workout.estimated_duration} min
                                  </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="fc-btn rounded-lg border-[color:var(--fc-glass-border)]"
                                    onClick={() =>
                                      router.push(`/client/workouts/${workout.id}/details`)
                                    }
                                  >
                                    View details
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                  </Button>
                                  {isUnlocked && (
                                    <Button
                                      size="sm"
                                      className="fc-btn rounded-lg bg-[color:var(--fc-domain-workouts)] hover:opacity-90 text-white border-0"
                                      onClick={() =>
                                        router.push(`/client/workouts/${workout.id}/details`)
                                      }
                                    >
                                      <Play className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                {workout.exerciseLines.map((line, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-3 text-sm py-1 border-b border-[color:var(--fc-glass-border)]/50 last:border-0"
                                  >
                                    <span className="font-medium fc-text-primary min-w-0 truncate">
                                      {line.name}
                                    </span>
                                    <span className="font-mono text-xs fc-text-dim shrink-0">
                                      {line.setsReps}
                                    </span>
                                    {line.rest && (
                                      <span className="text-xs fc-accent-cyan shrink-0">
                                        {line.rest} rest
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </GlassCard>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Sticky bottom actions — above app bottom nav (~64px + 12px margin) */}
            <div className="fixed left-0 right-0 p-4 sm:p-6 z-[9999] bg-gradient-to-t from-[color:var(--fc-bg-base)] via-[color:var(--fc-bg-base)]/95 to-transparent backdrop-blur-sm border-t border-[color:var(--fc-glass-border)]" style={{ bottom: "76px" }}>
              <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => router.push("/client/scheduling")}
                  variant="outline"
                  className="flex-1 rounded-2xl h-14 fc-glass border border-[color:var(--fc-glass-border)] font-bold gap-2 fc-text-primary"
                >
                  <Calendar className="w-5 h-5" />
                  <span className="hidden sm:inline">View Schedule</span>
                  <span className="sm:hidden">Schedule</span>
                </Button>
                <Button
                  onClick={() => {
                    if (firstWorkoutOfUnlockedWeek) {
                      router.push(`/client/workouts/${firstWorkoutOfUnlockedWeek.id}/details`);
                    } else {
                      router.push("/client/workouts");
                    }
                  }}
                  disabled={!firstWorkoutOfUnlockedWeek}
                  className="flex-[2] rounded-2xl h-14 font-bold gap-2 bg-[color:var(--fc-status-error)] hover:opacity-90 text-white border-0 uppercase tracking-widest disabled:opacity-50"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Continue Program
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AnimatedBackground>
  );
}

export default function ProgramDetailsPage() {
  return (
    <ProtectedRoute requiredRole="client">
      <ProgramDetailsContent />
    </ProtectedRoute>
  );
}
