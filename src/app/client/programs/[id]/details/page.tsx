"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Calendar,
  BookOpen,
  Play,
  Dumbbell,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import WorkoutTemplateService, {
  ProgramSchedule,
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Program {
  id: string;
  name: string;
  description: string;
  duration_weeks: number;
}

interface ProgramWeek {
  week_number: number;
  workouts: Array<{
    id: string;
    name: string;
    description: string;
    estimated_duration: number;
  }>;
}

function ProgramDetailsContent() {
  const { id } = useParams();
  const router = useRouter();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();
  const [program, setProgram] = useState<Program | null>(null);
  const [weeks, setWeeks] = useState<ProgramWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProgramDetails(id as string);
    }
  }, [id]);

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

      // Get program details through program_assignments to respect RLS
      // Clients should access workout_programs through program_assignments, not directly
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("program_assignments")
        .select(
          `
          *,
          program:workout_programs(
            id,
            name,
            description,
            duration_weeks
          )
        `
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
        console.error("Program not found or not assigned to you");
        throw new Error("Program not found or not assigned to you");
      }

      const programData = assignmentData.program as any;

      setProgram({
        id: programData.id,
        name: programData.name,
        description: programData.description || "",
        duration_weeks: programData.duration_weeks,
      });

      // Get program schedule using service method (replaces program_weeks query)
      const schedule = await WorkoutTemplateService.getProgramSchedule(
        programId
      );

      if (!schedule || schedule.length === 0) {
        setWeeks([]);
        return;
      }

      // Group schedule by week_number and collect template details
      const weeksMap = new Map<number, ProgramWeek>();

      for (const scheduleItem of schedule) {
        const weekNum = scheduleItem.week_number || 1;

        if (!weeksMap.has(weekNum)) {
          weeksMap.set(weekNum, {
            week_number: weekNum,
            workouts: [],
          });
        }

        // Get template details if template_id exists
        if (scheduleItem.template_id) {
          const { data: templateData } = await supabase
            .from("workout_templates")
            .select("id, name, description, estimated_duration")
            .eq("id", scheduleItem.template_id)
            .single();

          if (templateData) {
            const week = weeksMap.get(weekNum)!;
            // Avoid duplicates
            if (
              !week.workouts.find((w) => w.id === templateData.id)
            ) {
              week.workouts.push({
                id: templateData.id,
                name: templateData.name,
                description: templateData.description || "",
                estimated_duration: templateData.estimated_duration || 0,
              });
            }
          }
        }
      }

      // Convert map to array and sort by week number
      const weeksData = Array.from(weeksMap.values()).sort(
        (a, b) => a.week_number - b.week_number
      );

      setWeeks(weeksData);
      })(),
        30000,
        "timeout"
      );
    } catch (error) {
      console.error("Error loading program details:", error);
      setError("Failed to load program details");
    } finally {
      setLoading(false);
    }
  };

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
            <p
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
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
                <Button type="button" onClick={() => id && loadProgramDetails(id as string)} variant="default" className="fc-btn fc-btn-primary">
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

  const totalWorkouts = weeks.reduce(
    (sum, week) => sum + week.workouts.length,
    0
  );

  const totalMinutes = weeks.reduce(
    (sum, week) =>
      sum + week.workouts.reduce((s, w) => s + w.estimated_duration, 0),
    0
  );
  const progressPercent =
    program.duration_weeks > 0
      ? Math.min(
          100,
          Math.round((weeks.length / program.duration_weeks) * 100)
        )
      : 0;

  return (
    <AnimatedBackground>
      <div className="relative fc-app-bg isolate">
        <div className="fc-muted-overlay" />
        <div className="fc-grain-layer" />
        <div className="fc-vignette-layer" />
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen pb-28">
          <main className="max-w-4xl mx-auto space-y-8 relative z-10 fc-page px-4 sm:px-6 py-8">
            {/* Back + Program Header */}
            <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-8 mb-6">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <Link
                    href="/client"
                    className="fc-glass fc-card w-10 h-10 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)]"
                    aria-label="Back to dashboard"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-medium uppercase tracking-widest text-[color:var(--fc-text-dim)] block">
                        My Programs
                      </span>
                      <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)] truncate">
                        {program.name}
                      </h1>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="flex items-center gap-3 fc-text-dim flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {program.duration_weeks} Weeks
                    </span>
                    <span className="w-1 h-1 rounded-full bg-[color:var(--fc-glass-border)]" />
                    <span className="fc-text-workouts font-semibold">
                      {weeks.length} weeks loaded
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs fc-text-subtle font-mono mb-1 uppercase tracking-tighter">
                      Progress
                    </div>
                    <div className="text-2xl font-bold font-mono fc-text-primary">
                      {progressPercent}%
                    </div>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-[color:var(--fc-glass-highlight)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[color:var(--fc-status-error)] to-[color:var(--fc-domain-workouts)] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </GlassCard>

            {/* Stats horizontal scroll */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-x-auto">
              <GlassCard elevation={2} className="fc-glass fc-card p-5 flex items-center justify-between min-w-[200px] rounded-2xl border border-[color:var(--fc-glass-border)]">
                <div>
                  <p className="fc-text-subtle text-xs uppercase font-bold tracking-widest mb-1">
                    Workouts
                  </p>
                  <h3 className="text-2xl font-bold font-mono fc-text-primary">
                    {totalWorkouts}
                    <span className="fc-text-dim text-lg"> total</span>
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[color:var(--fc-domain-workouts)]/10 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 fc-text-workouts" />
                </div>
              </GlassCard>
              <GlassCard elevation={2} className="fc-glass fc-card p-5 flex items-center justify-between min-w-[200px] rounded-2xl border border-[color:var(--fc-glass-border)]">
                <div>
                  <p className="fc-text-subtle text-xs uppercase font-bold tracking-widest mb-1">
                    Weeks
                  </p>
                  <h3 className="text-2xl font-bold font-mono fc-text-primary">
                    {program.duration_weeks}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[color:var(--fc-status-success)]/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 fc-text-success" />
                </div>
              </GlassCard>
              <GlassCard elevation={2} className="fc-glass fc-card p-5 flex items-center justify-between min-w-[200px] rounded-2xl border border-[color:var(--fc-glass-border)]">
                <div>
                  <p className="fc-text-subtle text-xs uppercase font-bold tracking-widest mb-1">
                    Est. Total
                  </p>
                  <h3 className="text-2xl font-bold font-mono fc-text-primary">
                    {totalMinutes}
                    <span className="fc-text-dim text-lg">m</span>
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[color:var(--fc-domain-workouts)]/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 fc-text-workouts" />
                </div>
              </GlassCard>
            </section>

            {/* Program Curriculum */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight fc-text-primary px-2">
                Program Curriculum
              </h2>

              {weeks.length === 0 ? (
                <GlassCard elevation={2} className="fc-glass fc-card p-8 rounded-2xl">
                  <p className="text-center fc-text-dim">
                    No workout schedule found for this program.
                  </p>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {weeks.map((week) => (
                    <GlassCard
                      key={week.week_number}
                      elevation={2}
                      className="fc-glass fc-card p-5 rounded-2xl border border-[color:var(--fc-glass-border)] border-l-2 border-l-[color:var(--fc-glass-border)] hover:border-l-[color:var(--fc-domain-workouts)] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full fc-glass-soft border border-[color:var(--fc-glass-border)] flex items-center justify-center">
                            <span className="text-sm font-bold fc-text-primary">
                              {week.week_number}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold fc-text-primary">
                              Week {week.week_number}
                            </h4>
                            <p className="text-xs fc-text-subtle uppercase tracking-widest">
                              {week.workouts.length} workout
                              {week.workouts.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <ArrowLeft className="w-5 h-5 fc-text-subtle rotate-180" />
                      </div>
                      {week.workouts.length > 0 && (
                        <div className="mt-4 space-y-2 ml-4 pl-4 border-l-2 border-[color:var(--fc-glass-border)]">
                          {week.workouts.map((workout) => (
                            <div
                              key={workout.id}
                              className="p-4 rounded-2xl border border-[color:var(--fc-glass-border)] flex items-center justify-between gap-4 fc-glass-soft/50 hover:fc-glass-soft cursor-pointer transition-colors"
                              onClick={() =>
                                router.push(
                                  `/client/workouts/${workout.id}/details`
                                )
                              }
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold fc-text-primary">
                                  {workout.name}
                                </p>
                                <p className="text-xs fc-text-dim">
                                  {workout.estimated_duration} min
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/client/workouts/${workout.id}/details`
                                  );
                                }}
                                className="fc-btn rounded-lg h-9 bg-[color:var(--fc-domain-workouts)] hover:opacity-90 text-white border-0"
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </GlassCard>
                  ))}
                </div>
              )}
            </section>

            {/* Sticky bottom actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 z-50 bg-gradient-to-t from-[color:var(--fc-bg-base)]  via-[color:var(--fc-bg-base)]/95 to-transparent backdrop-blur-sm border-t border-[color:var(--fc-glass-border)]">
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
                  onClick={() =>
                    router.push(
                      weeks[0]?.workouts[0]?.id
                        ? `/client/workouts/${weeks[0].workouts[0].id}/details`
                        : "/client/workouts"
                    )
                  }
                  className="flex-[2] rounded-2xl h-14 font-bold gap-2 bg-[color:var(--fc-status-error)] hover:opacity-90 text-white border-0 uppercase tracking-widest"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Start Today&apos;s Workout
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
