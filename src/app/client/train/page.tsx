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
import {
  ClientPageShell,
  ClientGlassCard,
  Eyebrow,
  IconButton,
} from "@/components/client-ui";
import { ActiveProgramCard } from "@/components/client/train/ActiveProgramCard";
import { ProgramCompletedCard } from "@/components/client/train/ProgramCompletedCard";
import { WeekStrip } from "@/components/client/train/WeekStrip";
import { OverdueWorkouts } from "@/components/client/train/OverdueWorkouts";
import { ExtraTraining } from "@/components/client/train/ExtraTraining";
import { ActivityWeekSummary } from "@/components/client/activity/ActivityWeekSummary";
import { LogActivityModal } from "@/components/client/activity/LogActivityModal";
import { GoalWizard } from "@/components/goals/GoalWizard";
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
import {
  Dumbbell,
  Check,
  MessageSquare,
  X,
  Bell,
  Target,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePageData } from "@/hooks/usePageData";
import {
  computeTrainRpcWeekday,
  resolveTrainPageTodayWeekday,
  rpcResponseToProgramWeekState,
  type TrainPageRpcResponse,
  type TrainPageRpcExtraWorkoutRow,
} from "@/lib/trainPageDataMapper";
import type { WorkoutSetEntry } from "@/types/workoutSetEntries";
import { fetchDashboardPageData } from "@/lib/clientDashboardPageData";

const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function formatTrainWeekRangeLabel(): string {
  const { start, end } = getCurrentWeekBounds();
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const a = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const b = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${a}–${b}`;
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
  /** Same semantics as `get_client_dashboard` → `weeklyProgress` (program-scoped this week). */
  weeklyProgress: { current: number; goal: number };
  /** Monday = 0 … Sunday = 6; aligned with snapshot → profile timezone (see trainPageDataMapper). */
  todayWeekday: number;
}

export default function TrainPage() {
  const { user, profile } = useAuth();
  const profileTimezone =
    profile && typeof (profile as { timezone?: string }).timezone === "string"
      ? (profile as { timezone?: string }).timezone
      : null;

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
        weeklyProgress: { current: 0, goal: 0 },
        todayWeekday: computeTrainRpcWeekday(profileTimezone),
      };
    }
    const rpcWeekday = computeTrainRpcWeekday(profileTimezone);
    const [{ data: rpcData, error: rpcError }, dashboardPage] = await Promise.all([
      supabase.rpc("get_train_page_data", {
        p_client_id: user.id,
        p_today_weekday: rpcWeekday,
      }),
      fetchDashboardPageData(user.id).catch(() => null),
    ]);
    if (rpcError) {
      throw new Error(rpcError.message || "Failed to load train page data");
    }

    const weeklyProgress =
      dashboardPage?.dashboard?.weeklyProgress ?? { current: 0, goal: 0 };

    const data = (rpcData ?? null) as TrainPageRpcResponse | null;
    const programWeek = data
      ? await rpcResponseToProgramWeekState(supabase, data, profileTimezone)
      : null;
    const todayWeekday = resolveTrainPageTodayWeekday(data, profileTimezone);
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
      weeklyProgress,
      todayWeekday,
    };
  }, [user?.id, profileTimezone]);

  const { addToast } = useToast();
  const {
    data: programData,
    loading: programLoading,
    error,
    refetch,
  } = usePageData(fetchProgramWeekOnly, [user?.id, profileTimezone]);

  const programWeek = programData?.programWeek ?? null;
  const extraWorkouts: ExtraWorkout[] = programData?.extraWorkouts ?? [];
  const exerciseCounts =
    programData?.exerciseCounts ?? new Map<string, number>();
  const templateCategories =
    programData?.templateCategories ?? new Map<string, string>();
  const weeklyProgress = programData?.weeklyProgress ?? {
    current: 0,
    goal: 0,
  };

  const loading = programLoading;
  const todayWeekday =
    programData?.todayWeekday ?? computeTrainRpcWeekday(profileTimezone);

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

  const getAvatarUrl = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    if (profile?.first_name) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.first_name}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || "User"}`;
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
        <ClientPageShell className="max-w-lg px-0 pb-32 pt-6">
          <header className="mb-2 flex items-center justify-between px-5 pt-0">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/client/me";
              }}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--fc-glass-border)] p-0 transition-opacity hover:opacity-90"
              style={{
                background:
                  "linear-gradient(135deg, var(--fc-surface-elevated), var(--fc-surface-card))",
              }}
              aria-label="Open profile"
            >
              <img
                src={getAvatarUrl()}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
            <IconButton
              size="md"
              variant="ghost"
              className="btn-ghost-icon shrink-0 border-transparent"
              aria-label="Notifications"
              onClick={() => {
                window.location.href = "/client";
              }}
            >
              <Bell className="h-5 w-5 fc-text-dim" strokeWidth={1.5} />
            </IconButton>
          </header>
          <header className="mb-6 px-5">
            <h1
              className="font-semibold leading-none tracking-[-0.025em] fc-text-primary"
              style={{
                fontFamily: "var(--font-bricolage-grotesque, var(--font-body))",
                fontSize: "32px",
              }}
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
                  <div className="px-4">
                    <ActiveProgramCard
                      programWeek={programWeek}
                      weeklyProgress={weeklyProgress}
                      onStartWorkout={handleStartWorkout}
                      onSelectDay={setSelectedDay}
                      isStarting={isStarting}
                      startingScheduleId={startingScheduleId}
                      exerciseCounts={exerciseCounts}
                    />
                  </div>

                  {programWeek.pauseStatus !== "paused" && (
                    <>
                      {/* Coach note (coach_managed); not a gate for week unlock */}
                      {programWeek.coachFeedback && !feedbackDismissed && (
                        <div className="mb-4 border-b border-white/5 border-l-[3px] border-l-[color:var(--fc-domain-workouts)] py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <MessageSquare className="w-5 h-5 mt-0.5 shrink-0 fc-text-workouts" />
                              <div className="min-w-0">
                                <Eyebrow tone="dim" density="section" className="!mb-1">
                                  Coach note
                                </Eyebrow>
                                <p className="text-sm fc-text-primary leading-relaxed">{programWeek.coachFeedback.notes}</p>
                              </div>
                            </div>
                            <IconButton
                              size="sm"
                              variant="ghost"
                              className="shrink-0 rounded-lg"
                              aria-label="Dismiss"
                              onClick={() => {
                                setFeedbackDismissed(true);
                                try {
                                  const key = `coach_feedback_dismissed_${programWeek.programAssignmentId}_${programWeek.currentWeekNumber}`;
                                  localStorage.setItem(key, "1");
                                } catch {}
                              }}
                            >
                              <X className="h-4 w-4" />
                            </IconButton>
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

                      {/* Mock Phone 2: .section-head + .section-title + .section-link */}
                      <div className="mx-auto mt-1 mb-3 flex max-w-lg items-baseline justify-between px-5">
                        <div className="flex min-w-0 items-baseline gap-2.5">
                          <h2
                            className="m-0 text-[17px] font-semibold leading-none tracking-[-0.01em] fc-text-primary"
                            style={{
                              fontFamily:
                                "var(--font-bricolage-grotesque, var(--f-headline))",
                            }}
                          >
                            This week
                          </h2>
                        </div>
                        <span className="shrink-0 text-xs font-medium fc-text-dim">
                          {formatTrainWeekRangeLabel()}
                        </span>
                      </div>

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
                <>
                  <div className="mx-5 mb-4 mt-2">
                    <button
                      type="button"
                      onClick={() => setAddGoalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--fc-accent-cyan)] transition-opacity hover:opacity-90"
                    >
                      <Target className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Set a training goal
                    </button>
                  </div>
                  <ActivityWeekSummary
                    activities={weekActivities}
                    onQuickAdd={() => setShowActivityModal(true)}
                  />
                </>
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
      <GoalWizard
        open={addGoalOpen}
        onClose={() => setAddGoalOpen(false)}
        initialCategory={null}
        onSuccess={() => {
          setAddGoalOpen(false);
        }}
      />
    </ProtectedRoute>
  );
}
