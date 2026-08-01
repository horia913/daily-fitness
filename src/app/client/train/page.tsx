"use client";

/**
 * Train Page - Client Training Hub
 *
 * Data: get_train_page_data RPC (+ mapper) for program; shared client-dashboard
 * query for score / weekly progress. Day exercise previews lazy-load on expand.
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell } from "@/components/client-ui";
import { ProgramCompletedCard } from "@/components/client/train/ProgramCompletedCard";
import { startProgramWorkout } from "@/lib/startProgramWorkout";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgramWeekState } from "@/lib/programWeekStateBuilder";
import { useToast } from "@/components/ui/toast-provider";
import { Dumbbell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  computeTrainRpcWeekday,
  rpcResponseToProgramWeekState,
  type TrainPageRpcResponse,
  type TrainPageRpcExtraWorkoutRow,
} from "@/lib/trainPageDataMapper";
import { fetchDashboardPageData } from "@/lib/clientDashboardPageData";
import { TrainPageHeader } from "@/components/client/train/TrainPageHeader";
import {
  TrainHeroCard,
  resolveTrainPrimaryWorkout,
} from "@/components/client/train/TrainHeroCard";
import {
  TrainPrimaryCta,
  TrainWeekProgress,
} from "@/components/client/train/TrainPrimaryCta";
import { TrainWeekDayList } from "@/components/client/train/TrainWeekDayList";
import { TrainCoachNote } from "@/components/client/train/TrainCoachNote";
import { TrainExtraTrainingSection } from "@/components/client/train/TrainExtraTrainingSection";
import { useTrainPhaseContext } from "@/components/client/train/useTrainPhaseContext";
import styles from "@/components/client/train/trainPage.module.css";

/** Build exercise counts Map from RPC schedule + extraWorkouts (no block fetch). */
function buildExerciseCountsFromRpc(
  data: TrainPageRpcResponse | null,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!data) return map;
  for (const s of data.schedule ?? []) {
    if (s.template_id) map.set(s.template_id, s.exercise_count ?? 0);
  }
  for (const w of data.extraWorkouts ?? []) {
    if (w.template_id) map.set(w.template_id, w.exercise_count ?? 0);
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

interface TrainProgramQueryData {
  programWeek: ProgramWeekState | null;
  extraWorkouts: ExtraWorkout[];
  exerciseCounts: Map<string, number>;
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

  const rpcWeekday = computeTrainRpcWeekday(profileTimezone);
  const { addToast } = useToast();

  const trainProgramQuery = useQuery({
    queryKey: ["train-page", user?.id, rpcWeekday],
    queryFn: async (): Promise<TrainProgramQueryData> => {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_train_page_data",
        {
          p_client_id: user!.id,
          p_today_weekday: rpcWeekday,
        },
      );
      if (rpcError) {
        throw new Error(rpcError.message || "Failed to load train page data");
      }

      const data = (rpcData ?? null) as TrainPageRpcResponse | null;
      let programWeek: ProgramWeekState | null = null;
      let todayWeekday = computeTrainRpcWeekday(profileTimezone);
      if (data) {
        const bundle = await rpcResponseToProgramWeekState(
          supabase,
          data,
          profileTimezone,
        );
        programWeek = bundle.programWeek;
        todayWeekday = bundle.todayWeekday;
      }
      const extraFromRpc: TrainPageRpcExtraWorkoutRow[] = Array.isArray(
        data?.extraWorkouts,
      )
        ? data.extraWorkouts
        : [];
      const exerciseCounts = buildExerciseCountsFromRpc(data);
      const extraWorkouts = buildExtraWorkoutsFromRpc(
        extraFromRpc,
        exerciseCounts,
      );

      return {
        programWeek,
        extraWorkouts,
        exerciseCounts,
        todayWeekday,
      };
    },
    enabled: !!user?.id,
  });

  const dashboardQuery = useQuery({
    queryKey: ["client-dashboard", user?.id],
    queryFn: () => fetchDashboardPageData(user!.id),
    enabled: !!user?.id,
  });

  const programWeek = trainProgramQuery.data?.programWeek ?? null;
  const extraWorkouts: ExtraWorkout[] =
    trainProgramQuery.data?.extraWorkouts ?? [];
  const exerciseCounts =
    trainProgramQuery.data?.exerciseCounts ?? new Map<string, number>();
  const todayWeekday =
    trainProgramQuery.data?.todayWeekday ??
    computeTrainRpcWeekday(profileTimezone);

  const weeklyProgress = dashboardQuery.data?.dashboard?.weeklyProgress ?? {
    current: 0,
    goal: 0,
  };
  const athleteScore = dashboardQuery.data?.athleteScore ?? null;
  const scoreError = dashboardQuery.data?.scoreError ?? null;
  const athleteScoreChipState =
    dashboardQuery.data?.dashboard?.athleteScoreChipState ?? "no_program";

  const loading = trainProgramQuery.isLoading;
  const error = trainProgramQuery.isError;
  const errorMessage =
    trainProgramQuery.error instanceof Error
      ? trainProgramQuery.error.message
      : "Failed to load train page data";

  const absoluteWeek =
    programWeek && programWeek.displayWeekNumber > 0
      ? programWeek.displayWeekNumber
      : (programWeek?.currentWeekNumber ?? 1);

  const { phaseChipLabel, eyebrowLine } = useTrainPhaseContext(
    programWeek?.programAssignmentId,
    absoluteWeek,
    programWeek?.totalWeeks ?? 0,
    programWeek?.pauseStatus === "paused",
  );

  const handleStartWorkout = async (scheduleId: string) => {
    if (isStarting) return;

    setIsStarting(true);
    setStartingScheduleId(scheduleId);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const result = await startProgramWorkout({
        programDayAssignmentId: scheduleId,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!result.ok) {
        if (result.code === "WEEK_LOCKED") {
          addToast({
            title: result.message || "Complete the current week first.",
            variant: "destructive",
          });
        } else if (result.code === "ALREADY_COMPLETED") {
          void trainProgramQuery.refetch();
          addToast({
            title:
              result.message ||
              result.error ||
              "This workout is already completed. Refreshing.",
            variant: "destructive",
          });
        } else if (result.code === "TIMEOUT") {
          addToast({
            title: "Request timed out. Please try again.",
            variant: "destructive",
          });
        } else {
          addToast({
            title: result.message || result.error || "Could not start workout.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      clearTimeout(timeout);
      console.error("Error starting workout:", err);
      addToast({
        title: "Could not start workout. Check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
      setStartingScheduleId(null);
    }
  };

  const getAvatarUrl = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    return null;
  };

  const avatarInitial = (
    profile?.first_name?.[0] ??
    user?.email?.[0] ??
    "A"
  ).toUpperCase();

  const primaryWorkout = programWeek
    ? resolveTrainPrimaryWorkout(programWeek)
    : null;

  const showActiveProgram =
    programWeek?.hasProgram &&
    !programWeek.isCompleted &&
    programWeek.pauseStatus !== "paused";

  const showHeaderEyebrow =
    programWeek?.hasProgram && !programWeek.isCompleted;

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        <ClientPageShell className="max-w-lg lg:max-w-3xl w-full !p-0">
          <div className={styles.page}>
          <TrainPageHeader
            eyebrowLine={
              showHeaderEyebrow ? eyebrowLine : ""
            }
            avatarUrl={getAvatarUrl()}
            avatarInitial={avatarInitial}
            onAvatarClick={() => {
              window.location.href = "/client/me";
            }}
            userId={user?.id ?? null}
            athleteScore={athleteScore}
            scoreError={scoreError}
            athleteScoreChipState={athleteScoreChipState}
            showScore={!loading && !error}
          />

          {error ? (
            <div className={styles.errorBlock}>
              <p className={styles.errorText}>{errorMessage}</p>
              <button
                type="button"
                onClick={() => {
                  void trainProgramQuery.refetch();
                  void dashboardQuery.refetch();
                }}
                className="fc-btn fc-btn-secondary fc-press h-11 px-6 text-sm"
              >
                Retry
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className={styles.loadingStack}>
              <SkeletonCard className="fc-surface border border-[color:var(--fc-surface-card-border)]" />
              <Skeleton variant="rectangular" className="h-14 w-full" />
              <SkeletonCard className="fc-surface border border-[color:var(--fc-surface-card-border)]" />
            </div>
          ) : !error ? (
            <>
              {programWeek?.hasProgram && programWeek.isCompleted ? (
                <ProgramCompletedCard programWeek={programWeek} />
              ) : programWeek?.hasProgram &&
                programWeek.pauseStatus === "paused" ? (
                <div className={styles.pausedCard}>
                  <p className={styles.pausedEyebrow}>Program paused</p>
                  <p className={styles.pausedTitle}>
                    Your coach has paused your program
                  </p>
                  <p className={styles.pausedSub}>
                    Training will resume when your coach unpauses.
                    {programWeek.pauseReason
                      ? ` “${programWeek.pauseReason}”`
                      : ""}
                  </p>
                </div>
              ) : programWeek?.hasProgram ? (
                <>
                  <TrainHeroCard
                    programWeek={programWeek}
                    phaseChipLabel={phaseChipLabel}
                    exerciseCounts={exerciseCounts}
                  />

                  {primaryWorkout?.scheduleId ? (
                    <TrainPrimaryCta
                      onClick={() => {
                        if (primaryWorkout.scheduleId) {
                          void handleStartWorkout(primaryWorkout.scheduleId);
                        }
                      }}
                      disabled={!primaryWorkout.scheduleId}
                      isLoading={
                        isStarting &&
                        startingScheduleId === primaryWorkout.scheduleId
                      }
                    />
                  ) : null}

                  <TrainWeekProgress weeklyProgress={weeklyProgress} />

                  {programWeek.isWeekCompleteAwaitingReview ? (
                    <div className={styles.weekComplete}>
                      <p className={styles.weekCompleteTitle}>
                        All workouts this week completed
                      </p>
                      <p className={styles.weekCompleteSub}>
                        Next week unlocks on your calendar when it begins.
                      </p>
                    </div>
                  ) : null}

                  <div className={styles.sectionHead}>
                    <div className={styles.sectionTitleWrap}>
                      <span className={styles.sectionAccentBar} aria-hidden />
                      <h2 className={styles.sectionTitle}>This week</h2>
                    </div>
                    {programWeek.programId ? (
                      <button
                        type="button"
                        className={styles.sectionLink}
                        onClick={() => {
                          window.location.href = `/client/programs/${programWeek.programId}/details`;
                        }}
                      >
                        Full program →
                      </button>
                    ) : null}
                  </div>

                  <TrainWeekDayList
                    days={programWeek.days}
                    todayWeekday={todayWeekday}
                    todayScheduleId={programWeek.todaySlot?.scheduleId ?? null}
                    exerciseCounts={exerciseCounts}
                    progression={
                      programWeek.assignmentStartDate &&
                      programWeek.clientTimezone &&
                      programWeek.totalWeeks > 0
                        ? {
                            startDate: programWeek.assignmentStartDate,
                            totalWeeks: programWeek.totalWeeks,
                            timeZone: programWeek.clientTimezone,
                            pauses: {
                              accumulatedDays: programWeek.pauseAccumulatedDays,
                              pauseStatus: programWeek.pauseStatus,
                              pausedAt: programWeek.pausedAt,
                            },
                            weekNumber:
                              programWeek.displayWeekNumber > 0
                                ? programWeek.displayWeekNumber
                                : programWeek.currentWeekNumber,
                          }
                        : null
                    }
                    onStartWorkout={(scheduleId) => {
                      void handleStartWorkout(scheduleId);
                    }}
                    isStarting={isStarting}
                    startingScheduleId={startingScheduleId}
                  />

                  {programWeek.coachFeedback?.notes ? (
                    <TrainCoachNote notes={programWeek.coachFeedback.notes} />
                  ) : null}
                </>
              ) : (
                <EmptyState
                  icon={<Dumbbell className="w-6 h-6" />}
                  title="No program assigned yet"
                  description="Your coach will assign your training program. In the meantime, check below for any assigned workouts."
                />
              )}

              <TrainExtraTrainingSection workouts={extraWorkouts} />

              <button
                type="button"
                className={`fc-btn fc-btn-secondary fc-btn-ghost fc-press ${styles.ghostCta}`}
                onClick={() => {
                  window.location.href =
                    "/client/progress/workout-logs?from=train";
                }}
              >
                Workout history
              </button>

              {showActiveProgram && programWeek?.programId ? (
                <button
                  type="button"
                  className={`fc-btn fc-btn-secondary fc-btn-ghost fc-press ${styles.ghostCta}`}
                  onClick={() => {
                    window.location.href = `/client/programs/${programWeek.programId}/details`;
                  }}
                >
                  View full program
                </button>
              ) : null}
            </>
          ) : null}
          </div>
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
