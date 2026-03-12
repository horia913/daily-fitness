"use client";

/**
 * Train Page - Client Training Hub
 * 
 * APPROACH: Pages render immediately with empty/placeholder content, then populate when data arrives.
 * Loads program week (API) and standalone workout_assignments (Supabase) so both program and assigned workouts list display.
 */

import React, { useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell, ClientGlassCard } from "@/components/client-ui";
import { ActiveProgramCard } from "@/components/client/train/ActiveProgramCard";
import { ProgramCompletedCard } from "@/components/client/train/ProgramCompletedCard";
import { WeekStrip } from "@/components/client/train/WeekStrip";
import { OverdueWorkouts } from "@/components/client/train/OverdueWorkouts";
import { ExtraTraining } from "@/components/client/train/ExtraTraining";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgramWeekState, OverdueSlotCard, type ProgramWeekDayCard } from "@/lib/programWeekStateBuilder";
import { WorkoutDayPreview, type PreviewDayStatus } from "@/components/client/train/WorkoutDayPreview";
import { useToast } from "@/components/ui/toast-provider";
import { Dumbbell, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePageData } from "@/hooks/usePageData";


const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** 0=Monday .. 6=Sunday (client timezone) */
function getTodayWeekday(): number {
  return (new Date().getDay() + 6) % 7;
}

function getDayStatus(
  day: ProgramWeekDayCard,
  todayWeekday: number
): PreviewDayStatus {
  if (!day.templateId) return "rest";
  if (day.isCompleted) return "completed";
  if (day.dayOfWeek === todayWeekday) return "today";
  if (day.dayOfWeek < todayWeekday) return "missed";
  return "upcoming";
}

async function fetchExtraWorkouts(
  clientId: string
): Promise<{ workouts: ExtraWorkout[]; counts: Map<string, number> }> {
  const counts = new Map<string, number>();
  try {
    const { data: rows, error } = await supabase
      .from("workout_assignments")
      .select(
        `
        id,
        name,
        estimated_duration,
        workout_template_id,
        workout_templates (
          id,
          name,
          estimated_duration
        )
      `
      )
      .eq("client_id", clientId)
      .in("status", ["assigned", "in_progress"])
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.warn("[train] Error fetching workout_assignments:", error);
      return { workouts: [], counts };
    }
    if (!rows?.length) return { workouts: [], counts };

    const templateIds = [...new Set((rows as any[]).map((r) => r.workout_template_id).filter(Boolean))];
    if (templateIds.length > 0) {
      const { WorkoutBlockService } = await import("@/lib/workoutBlockService");
      const blocksByTemplate = await WorkoutBlockService.getWorkoutBlocksForTemplates(templateIds);
      templateIds.forEach((tid) => {
        const blocks = blocksByTemplate.get(tid) || [];
        const n = blocks.reduce((sum, b) => sum + ((b as any).exercises?.length || 0), 0);
        counts.set(tid, n);
      });
    }

    const workouts: ExtraWorkout[] = (rows as any[]).map((r) => {
      const template = r.workout_templates;
      const templateId = r.workout_template_id || template?.id || "";
      return {
        id: r.id,
        name: r.name || template?.name || "Workout",
        exerciseCount: counts.get(templateId) ?? 0,
        estimatedDuration: r.estimated_duration ?? template?.estimated_duration ?? 45,
        templateId,
      };
    });
    return { workouts, counts };
  } catch (e) {
    console.warn("[train] fetchExtraWorkouts failed:", e);
    return { workouts: [], counts };
  }
}

interface ExtraWorkout {
  id: string;
  name: string;
  exerciseCount: number;
  estimatedDuration: number;
  templateId: string;
}

interface TrainPageData {
  programWeek: ProgramWeekState | null;
  extraWorkouts: ExtraWorkout[];
  exerciseCounts: Map<string, number>;
}

export default function TrainPage() {
  const { user } = useAuth();

  const [isStarting, setIsStarting] = useState(false);
  const [startingScheduleId, setStartingScheduleId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<ProgramWeekDayCard | null>(null);
  const [selectedOverdueSlot, setSelectedOverdueSlot] = useState<OverdueSlotCard | null>(null);
  const [selectedRestWeekday, setSelectedRestWeekday] = useState<number | null>(null);

  // Phase 1: Load program week + standalone assigned workouts
  const fetchProgramWeekOnly = useCallback(async (): Promise<TrainPageData> => {
    if (!user?.id) {
      return { programWeek: null, extraWorkouts: [], exerciseCounts: new Map() };
    }
    const todayWeekday = getTodayWeekday();
    const programResponse = await fetch(`/api/client/program-week?todayWeekday=${todayWeekday}`, {
      credentials: "include",
    });
    if (programResponse.status === 401 || programResponse.status === 403) {
      await supabase.auth.getSession();
      const retryResponse = await fetch(`/api/client/program-week?todayWeekday=${todayWeekday}`, {
        credentials: "include",
      });
      if (!retryResponse.ok) {
        const errorData = await retryResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch program week after retry");
      }
      const programData = await retryResponse.json();
      const extra = await fetchExtraWorkouts(user.id);
      return { programWeek: programData, extraWorkouts: extra.workouts, exerciseCounts: extra.counts };
    }
    if (!programResponse.ok) {
      const errorData = await programResponse.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to fetch program week");
    }
    const programData = await programResponse.json();
    const extra = await fetchExtraWorkouts(user.id);
    return { programWeek: programData, extraWorkouts: extra.workouts, exerciseCounts: extra.counts };
  }, [user?.id]);

  const { addToast } = useToast();
  const { data: programData, loading: programLoading, error, refetch } = usePageData(fetchProgramWeekOnly, [user?.id]);
  const programWeek = programData?.programWeek ?? null;
  const extraWorkouts: ExtraWorkout[] = programData?.extraWorkouts ?? [];
  const exerciseCounts = programData?.exerciseCounts ?? new Map<string, number>();

  const loading = programLoading;
  const todayWeekday = getTodayWeekday();

  // Default selected day to today or first day when program first loads (do not override user selection)
  React.useEffect(() => {
    if (!programWeek?.hasProgram || programWeek.isCompleted || !programWeek.days?.length) return;
    setSelectedDay((prev) => (prev !== null ? prev : programWeek.todaySlot ?? programWeek.days[0] ?? null));
  }, [programWeek?.hasProgram, programWeek?.isCompleted, programWeek?.days?.length, programWeek?.todaySlot?.scheduleId, programWeek?.days?.[0]?.scheduleId]);

  const handleStartWorkout = async (scheduleId: string) => {
    if (isStarting) return;

    setIsStarting(true);
    setStartingScheduleId(scheduleId);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch("/api/program-workouts/start-from-progress", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program_schedule_id: scheduleId }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await response.json();

      if (!response.ok) {
        if (data.error === "WEEK_LOCKED") {
          addToast({ title: data.message || "Complete the current week first.", variant: "destructive" });
        } else if (response.status === 409) {
          refetch();
          addToast({ title: data.message || data.error || "This workout is already completed. Refreshing.", variant: "destructive" });
        } else {
          addToast({ title: data.message || data.error || "Could not start workout.", variant: "destructive" });
        }
        return;
      }

      if (data.workout_assignment_id) {
        window.location.href = `/client/workouts/${data.workout_assignment_id}/start`;
      }
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === "AbortError") {
        addToast({ title: "Request timed out. Please try again.", variant: "destructive" });
      } else {
        console.error("Error starting workout:", err);
        addToast({ title: "Could not start workout. Check your connection.", variant: "destructive" });
      }
    } finally {
      setIsStarting(false);
      setStartingScheduleId(null);
    }
  };

  const handleDaySelect = (day: ProgramWeekDayCard | null, weekday: number) => {
    setSelectedDay(day);
    setSelectedOverdueSlot(null);
    setSelectedRestWeekday(day === null ? weekday : null);
  };

  const handleOpenOverduePreview = (slot: OverdueSlotCard) => {
    setSelectedOverdueSlot(slot);
    setSelectedDay(null);
    setSelectedRestWeekday(null);
  };

  const handleClosePreview = () => {
    setSelectedDay(null);
    setSelectedOverdueSlot(null);
    setSelectedRestWeekday(null);
  };

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        <ClientPageShell className="max-w-lg px-4 pb-32 pt-6">
          {/* Section 1: Page Header */}
          <header className="mb-6">
            <h1 className="font-bold fc-text-primary" style={{ fontSize: "var(--fc-type-h2)" }}>
              Training
            </h1>
          </header>

          {/* Error State */}
          {error && (
            <ClientGlassCard className="p-6 text-center">
              <p className="text-sm fc-text-dim mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="fc-btn fc-btn-secondary fc-press h-11 px-6 text-sm"
              >
                Retry
              </button>
            </ClientGlassCard>
          )}

          {/* Main Content */}
          {!error && (
            <>
              {loading ? (
                /* Loading State */
                <div className="space-y-4">
                  <SkeletonCard className="fc-surface border border-[color:var(--fc-surface-card-border)]" />
                  <Skeleton variant="rectangular" className="h-14 w-full" />
                  <SkeletonCard className="fc-surface border border-[color:var(--fc-surface-card-border)]" />
                </div>
              ) : programWeek?.hasProgram && programWeek?.isCompleted ? (
                /* Section 2b: Program Completed — congratulations card (Fix D) */
                <ProgramCompletedCard programWeek={programWeek} />
              ) : programWeek?.hasProgram ? (
                <>
                  {/* Section 2: Active Program Card */}
                  <ActiveProgramCard
                    programWeek={programWeek}
                    onStartWorkout={handleStartWorkout}
                    onSelectDay={setSelectedDay}
                    isStarting={isStarting}
                    startingScheduleId={startingScheduleId}
                    exerciseCounts={exerciseCounts}
                  />

                  {/* Section 3: Week Overview Strip */}
                  <WeekStrip
                    days={programWeek.days}
                    todaySlot={programWeek.todaySlot}
                    todayWeekday={todayWeekday}
                    onDaySelect={handleDaySelect}
                    selectedScheduleId={selectedDay?.scheduleId ?? selectedOverdueSlot?.scheduleId ?? null}
                    selectedRestWeekday={selectedRestWeekday}
                  />

                  {/* Section 3c: Workout Day Preview */}
                  {(selectedDay || selectedOverdueSlot !== null || selectedRestWeekday !== null) && (
                    <div className="mb-6" data-workout-preview>
                      {selectedOverdueSlot ? (
                        <WorkoutDayPreview
                          day={null}
                          status="missed"
                          templateId={selectedOverdueSlot.templateId}
                          workoutName={selectedOverdueSlot.workoutName}
                          dayLabel={selectedOverdueSlot.dayLabel}
                          estimatedDuration={selectedOverdueSlot.estimatedDuration}
                          scheduleId={selectedOverdueSlot.scheduleId}
                          onStartWorkout={handleStartWorkout}
                          onClose={handleClosePreview}
                          isStarting={isStarting}
                          startingScheduleId={startingScheduleId}
                          clientId={user?.id}
                        />
                      ) : selectedRestWeekday !== null ? (
                        <WorkoutDayPreview
                          day={null}
                          status="rest"
                          templateId={null}
                          workoutName=""
                          dayLabel={`${WEEKDAY_NAMES[selectedRestWeekday]} — Rest`}
                          estimatedDuration={0}
                          scheduleId={null}
                          onStartWorkout={handleStartWorkout}
                          onClose={handleClosePreview}
                          isStarting={isStarting}
                          startingScheduleId={startingScheduleId}
                          clientId={user?.id}
                        />
                      ) : selectedDay ? (
                        <WorkoutDayPreview
                          day={selectedDay}
                          status={getDayStatus(selectedDay, todayWeekday)}
                          templateId={selectedDay.templateId}
                          workoutName={selectedDay.workoutName}
                          dayLabel={`Day ${selectedDay.dayNumber} — ${WEEKDAY_NAMES[selectedDay.dayOfWeek]}`}
                          estimatedDuration={selectedDay.estimatedDuration}
                          scheduleId={selectedDay.scheduleId}
                          onStartWorkout={handleStartWorkout}
                          onClose={handleClosePreview}
                          isStarting={isStarting}
                          startingScheduleId={startingScheduleId}
                          clientId={user?.id}
                        />
                      ) : null}
                    </div>
                  )}

                  {/* Section 3b: This week's workouts list */}
                  {programWeek.days.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-5 h-5 fc-text-dim" />
                        <h3 className="text-lg font-bold fc-text-primary">This week&apos;s workouts</h3>
                      </div>
                      <ul className="space-y-2">
                        {programWeek.days.map((day) => (
                          <li key={day.scheduleId}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDay(day);
                                setSelectedOverdueSlot(null);
                                setSelectedRestWeekday(null);
                              }}
                              className="w-full text-left rounded-xl p-4 fc-surface border border-[color:var(--fc-surface-card-border)] hover:opacity-90 transition-opacity flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold fc-text-primary truncate">{day.workoutName}</p>
                                <p className="text-xs fc-text-dim">
                                  {day.dayLabel} · ~{day.estimatedDuration || 45} min
                                </p>
                              </div>
                              <span className="text-xs font-medium fc-text-dim shrink-0">
                                {day.isCompleted ? "Done" : "View"}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Section 4: Overdue Workouts Warning */}
                  <OverdueWorkouts
                    overdueSlots={programWeek.overdueSlots}
                    onOpenPreview={handleOpenOverduePreview}
                    onComplete={handleStartWorkout}
                    isStarting={isStarting}
                    startingScheduleId={startingScheduleId}
                  />
                </>
              ) : (
                /* Section 6: No Program State */
                <EmptyState
                  icon={<Dumbbell className="w-6 h-6" />}
                  title="No program assigned yet"
                  description="Your coach will assign your training program. In the meantime, check below for any assigned workouts."
                />
              )}

              {/* Section 5: Extra Training */}
              {!loading && <ExtraTraining workouts={extraWorkouts} />}
            </>
          )}
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
