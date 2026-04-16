"use client";

/**
 * Train Page - Client Training Hub
 *
 * Data: Single get_train_page_data RPC for the initial render. Workout blocks are
 * prefetched in the background after the page loads so the day preview shows exercises instantly.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell, ClientGlassCard } from "@/components/client-ui";
import { ActiveProgramCard } from "@/components/client/train/ActiveProgramCard";
import { ProgramCompletedCard } from "@/components/client/train/ProgramCompletedCard";
import { WeekStrip } from "@/components/client/train/WeekStrip";
import { OverdueWorkouts } from "@/components/client/train/OverdueWorkouts";
import { ExtraTraining } from "@/components/client/train/ExtraTraining";
import { ActivityWeekSummary } from "@/components/client/activity/ActivityWeekSummary";
import { LogActivityModal } from "@/components/client/activity/LogActivityModal";
import { AddGoalModal } from "@/components/goals/AddGoalModal";
import {
  getActivitiesByDateRange,
  getCurrentWeekBounds,
  logActivity,
  type ClientActivity,
  type LogActivityInput,
} from "@/lib/clientActivityService";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ProgramWeekState,
  OverdueSlotCard,
  type ProgramWeekDayCard,
} from "@/lib/programWeekStateBuilder";
import {
  WorkoutDayPreview,
  type PreviewDayStatus,
} from "@/components/client/train/WorkoutDayPreview";
import { useToast } from "@/components/ui/toast-provider";
import { Dumbbell, Check, MessageSquare, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePageData } from "@/hooks/usePageData";
import {
  rpcResponseToProgramWeekState,
  type TrainPageRpcResponse,
  type TrainPageRpcExtraWorkoutRow,
} from "@/lib/trainPageDataMapper";
import type { WorkoutSetEntry } from "@/types/workoutSetEntries";

const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** 0=Monday .. 6=Sunday (client timezone) */
function getTodayWeekday(): number {
  return (new Date().getDay() + 6) % 7;
}

function getDayStatus(
  day: ProgramWeekDayCard,
  todayWeekday: number,
): PreviewDayStatus {
  if (!day.templateId) return "rest";
  if (day.isCompleted) return "completed";
  if (day.dayOfWeek === todayWeekday) return "today";
  if (day.dayOfWeek < todayWeekday) return "missed";
  return "upcoming";
}

/** Build exercise counts Map from RPC schedule + extraWorkouts (no block fetch). */
function buildExerciseCountsFromRpc(
  data: TrainPageRpcResponse | null,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!data) return map;
  for (const s of data.schedule ?? []) {
    if (s.template_id)
      map.set(s.template_id, s.exercise_count ?? 0);
  }
  for (const w of data.extraWorkouts ?? []) {
    if (w.template_id)
      map.set(w.template_id, w.exercise_count ?? 0);
  }
  return map;
}

function buildExtraWorkoutsFromRpc(
  extraFromRpc: TrainPageRpcExtraWorkoutRow[],
  exerciseCounts: Map<string, number>,
): ExtraWorkout[] {
  if (!extraFromRpc.length) return [];
  return extraFromRpc.map((r) => {
    const templateId = r.template_id ?? "";
    return {
      id: r.id,
      name: r.template_name ?? "Workout",
      exerciseCount: exerciseCounts.get(templateId) ?? 0,
      estimatedDuration: r.estimated_duration ?? 45,
      templateId,
    };
  });
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
  templateCategories: Map<string, string>;
}

export default function TrainPage() {
  const { user } = useAuth();

  const [isStarting, setIsStarting] = useState(false);
  const [startingScheduleId, setStartingScheduleId] = useState<string | null>(
    null,
  );
  const [selectedDay, setSelectedDay] = useState<ProgramWeekDayCard | null>(
    null,
  );
  const [selectedOverdueSlot, setSelectedOverdueSlot] =
    useState<OverdueSlotCard | null>(null);
  const [selectedRestWeekday, setSelectedRestWeekday] = useState<number | null>(
    null,
  );
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);
  const [addGoalOpen, setAddGoalOpen] = useState(false);

  // Extra activities state
  const [weekActivities, setWeekActivities] = useState<ClientActivity[]>([]);
  const [showActivityModal, setShowActivityModal] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const { start, end } = getCurrentWeekBounds();
    getActivitiesByDateRange(user.id, start, end)
      .then(setWeekActivities)
      .catch(() => {});
  }, [user?.id]);

  // Single RPC for initial render; blocks are prefetched in background for day preview
  const fetchProgramWeekOnly = useCallback(async (): Promise<TrainPageData> => {
    if (!user?.id) {
      return {
        programWeek: null,
        extraWorkouts: [],
        exerciseCounts: new Map(),
        templateCategories: new Map(),
      };
    }
    const todayWeekday = getTodayWeekday();
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_train_page_data",
      {
        p_client_id: user.id,
        p_today_weekday: todayWeekday,
      },
    );
    if (rpcError) {
      throw new Error(rpcError.message || "Failed to load train page data");
    }

    const data = (rpcData ?? null) as TrainPageRpcResponse | null;
    const programWeek = data
      ? await rpcResponseToProgramWeekState(supabase, data, todayWeekday)
      : null;
    const extraFromRpc: TrainPageRpcExtraWorkoutRow[] = Array.isArray(data?.extraWorkouts)
      ? data.extraWorkouts
      : [];
    const exerciseCounts = buildExerciseCountsFromRpc(data);
    const extraWorkouts = buildExtraWorkoutsFromRpc(extraFromRpc, exerciseCounts);

    const templateIdSet = new Set<string>();
    for (const d of programWeek?.days ?? []) {
      if (d.templateId) templateIdSet.add(d.templateId);
    }
    for (const s of data?.schedule ?? []) {
      if (s.template_id) templateIdSet.add(s.template_id);
    }
    for (const w of extraFromRpc) {
      if (w.template_id) templateIdSet.add(w.template_id);
    }
    const templateIds = [...templateIdSet];
    const templateCategories = new Map<string, string>();
    if (templateIds.length > 0) {
      const { data: catRows } = await supabase
        .from("workout_templates")
        .select("id, category")
        .in("id", templateIds);
      for (const row of catRows ?? []) {
        const id = (row as { id?: string }).id;
        if (id)
          templateCategories.set(
            id,
            String((row as { category?: string | null }).category ?? ""),
          );
      }
    }

    return {
      programWeek,
      extraWorkouts,
      exerciseCounts,
      templateCategories,
    };
  }, [user?.id]);

  const { addToast } = useToast();
  const {
    data: programData,
    loading: programLoading,
    error,
    refetch,
  } = usePageData(fetchProgramWeekOnly, [user?.id]);

  const programWeek = programData?.programWeek ?? null;
  const extraWorkouts: ExtraWorkout[] = programData?.extraWorkouts ?? [];
  const exerciseCounts =
    programData?.exerciseCounts ?? new Map<string, number>();
  const templateCategories =
    programData?.templateCategories ?? new Map<string, string>();

  const loading = programLoading;
  const todayWeekday = getTodayWeekday();

  useEffect(() => {
    if (!programWeek?.coachFeedback || !programWeek?.programAssignmentId) return;
    try {
      const key = `coach_feedback_dismissed_${programWeek.programAssignmentId}_${programWeek.currentWeekNumber}`;
      if (localStorage.getItem(key) === '1') setFeedbackDismissed(true);
    } catch {}
  }, [programWeek?.programAssignmentId, programWeek?.currentWeekNumber, programWeek?.coachFeedback]);

  // Background prefetch: load blocks for all templates once page data arrives (no effect on initial render)
  const [prefetchedBlocks, setPrefetchedBlocks] = useState<Map<string, WorkoutSetEntry[]>>(new Map());
  const prefetchedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (programWeek?.pauseStatus === "paused" || !programWeek?.days?.length) return;
    const templateIds = [
      ...new Set(programWeek.days.map((d) => d.templateId).filter(Boolean)),
    ];
    if (templateIds.length === 0) return;
    const key = templateIds.sort().join(",");
    if (prefetchedForRef.current === key) return;
    prefetchedForRef.current = key;

    let cancelled = false;
    (async () => {
      try {
        const { WorkoutBlockService } = await import("@/lib/workoutBlockService");
        const blocksMap = await WorkoutBlockService.getWorkoutBlocksForTemplates(templateIds, { lite: true });
        if (!cancelled) setPrefetchedBlocks(blocksMap);
      } catch {
        // Prefetch is best-effort; WorkoutDayPreview will load on-demand as fallback
      }
    })();
    return () => { cancelled = true; };
  }, [programWeek?.days, programWeek?.pauseStatus]);

  // Default selected day to today or first day when program first loads (do not override user selection)
  React.useEffect(() => {
    if (
      !programWeek?.hasProgram ||
      programWeek.isCompleted ||
      programWeek.pauseStatus === "paused" ||
      !programWeek.days?.length
    )
      return;
    setSelectedDay((prev) =>
      prev !== null
        ? prev
        : (programWeek.todaySlot ?? programWeek.days[0] ?? null),
    );
  }, [
    programWeek?.hasProgram,
    programWeek?.isCompleted,
    programWeek?.days?.length,
    programWeek?.todaySlot?.scheduleId,
    programWeek?.days?.[0]?.scheduleId,
    programWeek?.pauseStatus,
  ]);

  const handleStartWorkout = async (scheduleId: string) => {
    if (isStarting) return;

    setIsStarting(true);
    setStartingScheduleId(scheduleId);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(
        "/api/program-workouts/start-from-progress",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ program_schedule_id: scheduleId }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);
      const data = await response.json();

      if (!response.ok) {
        if (data.error === "WEEK_LOCKED") {
          addToast({
            title: data.message || "Complete the current week first.",
            variant: "destructive",
          });
        } else if (response.status === 409) {
          refetch();
          addToast({
            title:
              data.message ||
              data.error ||
              "This workout is already completed. Refreshing.",
            variant: "destructive",
          });
        } else {
          addToast({
            title: data.message || data.error || "Could not start workout.",
            variant: "destructive",
          });
        }
        return;
      }

      if (data.workout_assignment_id) {
        window.location.href = `/client/workouts/${data.workout_assignment_id}/start`;
      }
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === "AbortError") {
        addToast({
          title: "Request timed out. Please try again.",
          variant: "destructive",
        });
      } else {
        console.error("Error starting workout:", err);
        addToast({
          title: "Could not start workout. Check your connection.",
          variant: "destructive",
        });
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

  const handleLogActivity = async (input: LogActivityInput) => {
    if (!user?.id) return;
    await logActivity(user.id, input);
    const { start, end } = getCurrentWeekBounds();
    const updated = await getActivitiesByDateRange(user.id, start, end);
    setWeekActivities(updated);
  };

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        <ClientPageShell className="max-w-lg px-4 pb-32 pt-6">
          {/* Section 1: Page Header */}
          <header className="mb-6">
            <h1
              className="font-bold fc-text-primary"
              style={{ fontSize: "var(--fc-type-h2)" }}
            >
              Training
            </h1>
          </header>

          {error && (
            <div className="mb-6 border-b border-white/5 border-l-2 border-l-[color:var(--fc-status-error)] py-4 text-center">
              <p className="mb-3 text-sm fc-text-dim">{error}</p>
              <button
                onClick={() => refetch()}
                className="fc-btn fc-btn-secondary fc-press h-11 px-6 text-sm"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            /* Loading State */
            <div className="space-y-4">
              <SkeletonCard className="fc-surface border border-[color:var(--fc-surface-card-border)]" />
              <Skeleton variant="rectangular" className="h-14 w-full" />
              <SkeletonCard className="fc-surface border border-[color:var(--fc-surface-card-border)]" />
            </div>
          ) : !error ? (
            <>
              {programWeek?.hasProgram && programWeek?.isCompleted ? (
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

                  {programWeek.pauseStatus !== "paused" && (
                    <>
                      <div className="mb-4 -mt-2">
                        <button
                          type="button"
                          onClick={() => setAddGoalOpen(true)}
                          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                        >
                          Set a training goal
                        </button>
                      </div>

                      {/* Coach note (coach_managed); not a gate for week unlock */}
                      {programWeek.coachFeedback && !feedbackDismissed && (
                        <div className="mb-4 border-b border-white/5 border-l-[3px] border-l-[color:var(--fc-domain-workouts)] py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <MessageSquare className="w-5 h-5 mt-0.5 shrink-0 fc-text-workouts" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wider fc-text-dim mb-1">Coach note</p>
                                <p className="text-sm fc-text-primary leading-relaxed">{programWeek.coachFeedback.notes}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setFeedbackDismissed(true);
                                try {
                                  const key = `coach_feedback_dismissed_${programWeek.programAssignmentId}_${programWeek.currentWeekNumber}`;
                                  localStorage.setItem(key, '1');
                                } catch {}
                              }}
                              className="shrink-0 p-1 rounded-lg fc-text-dim hover:fc-text-primary transition-colors"
                              aria-label="Dismiss"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Week finished — next week follows your program calendar */}
                      {programWeek.isWeekCompleteAwaitingReview && (
                        <div className="mb-4 border-b border-white/5 border-l-[3px] border-l-cyan-500/60 py-4 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/15">
                              <Check className="h-6 w-6 text-cyan-400" aria-hidden />
                            </div>
                            <div>
                              <p className="mb-1 font-semibold fc-text-primary">
                                All workouts this week completed!
                              </p>
                              <p className="text-sm leading-relaxed fc-text-dim">
                                Next week unlocks on your calendar when it begins.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <WeekStrip
                        days={programWeek.days}
                        todaySlot={programWeek.todaySlot}
                        todayWeekday={todayWeekday}
                        onDaySelect={handleDaySelect}
                        selectedScheduleId={
                          selectedDay?.scheduleId ??
                          selectedOverdueSlot?.scheduleId ??
                          null
                        }
                        selectedRestWeekday={selectedRestWeekday}
                      />

                      <OverdueWorkouts
                        overdueSlots={programWeek.overdueSlots}
                        onOpenPreview={handleOpenOverduePreview}
                        onComplete={handleStartWorkout}
                        isStarting={isStarting}
                        startingScheduleId={startingScheduleId}
                      />

                      {(selectedDay ||
                        selectedOverdueSlot !== null ||
                        selectedRestWeekday !== null) && (
                        <div className="mb-6" data-workout-preview>
                          {selectedOverdueSlot ? (
                            <WorkoutDayPreview
                              key={selectedOverdueSlot.scheduleId}
                              day={null}
                              status="missed"
                              templateId={selectedOverdueSlot.templateId}
                              workoutName={selectedOverdueSlot.workoutName}
                              dayLabel={selectedOverdueSlot.dayLabel}
                              estimatedDuration={
                                selectedOverdueSlot.estimatedDuration
                              }
                              scheduleId={selectedOverdueSlot.scheduleId}
                              onStartWorkout={handleStartWorkout}
                              onClose={handleClosePreview}
                              isStarting={isStarting}
                              startingScheduleId={startingScheduleId}
                              clientId={user?.id}
                              blocks={prefetchedBlocks.get(selectedOverdueSlot.templateId) ?? undefined}
                              exerciseCount={
                                exerciseCounts.get(selectedOverdueSlot.templateId) ??
                                undefined
                              }
                            />
                          ) : selectedRestWeekday !== null ? (
                            <WorkoutDayPreview
                              key={`rest-${selectedRestWeekday}`}
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
                              key={selectedDay.scheduleId}
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
                              blocks={prefetchedBlocks.get(selectedDay.templateId) ?? undefined}
                              exerciseCount={
                                exerciseCounts.get(selectedDay.templateId) ??
                                undefined
                              }
                            />
                          ) : null}
                        </div>
                      )}
                    </>
                  )}

                </>
              ) : (
                /* No Program State */
                <EmptyState
                  icon={<Dumbbell className="w-6 h-6" />}
                  title="No program assigned yet"
                  description="Your coach will assign your training program. In the meantime, check below for any assigned workouts."
                />
              )}

              {/* Extra Training (coach-assigned extra workouts) */}
              {!loading && (
                <ExtraTraining
                  workouts={extraWorkouts}
                  templateCategories={templateCategories}
                />
              )}

              {!loading &&
                programWeek?.hasProgram &&
                !programWeek.isCompleted &&
                programWeek.pauseStatus !== "paused" && (
                <ActivityWeekSummary
                  activities={weekActivities}
                  onQuickAdd={() => setShowActivityModal(true)}
                />
              )}
            </>
          ) : null}
        </ClientPageShell>
      </AnimatedBackground>

      <LogActivityModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        onSave={handleLogActivity}
      />
      <AddGoalModal
        open={addGoalOpen}
        onClose={() => setAddGoalOpen(false)}
        defaultPillar="training"
        onSuccess={() => {
          setAddGoalOpen(false);
        }}
      />
    </ProtectedRoute>
  );
}
