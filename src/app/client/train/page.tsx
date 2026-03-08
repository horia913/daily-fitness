"use client";

/**
 * Train Page - Client Training Hub
 * 
 * APPROACH: Pages render immediately with empty/placeholder content, then populate when data arrives.
 * This ensures the page is always functional, even if data fetching hangs or fails.
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
import { ProgramWeekState, OverdueSlotCard } from "@/lib/programWeekStateBuilder";
import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePageData } from "@/hooks/usePageData";


/** 0=Monday .. 6=Sunday (client timezone) */
function getTodayWeekday(): number {
  return (new Date().getDay() + 6) % 7;
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
  const router = useRouter();

  const [isStarting, setIsStarting] = useState(false);
  const [startingScheduleId, setStartingScheduleId] = useState<string | null>(null);

  // Phase 1: Load program week only (single API call) so main content appears quickly
  const fetchProgramWeekOnly = useCallback(async (): Promise<TrainPageData> => {
    if (!user?.id) {
      return { programWeek: null, extraWorkouts: [], exerciseCounts: new Map() };
    }
    const todayWeekday = getTodayWeekday();
    const response = await fetch(`/api/client/program-week?todayWeekday=${todayWeekday}`, {
      credentials: "include",
    });
    if (response.status === 401 || response.status === 403) {
      await supabase.auth.getSession();
      const retryResponse = await fetch(`/api/client/program-week?todayWeekday=${todayWeekday}`, {
        credentials: "include",
      });
      if (!retryResponse.ok) {
        const errorData = await retryResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch program week after retry");
      }
      const programData = await retryResponse.json();
      return { programWeek: programData, extraWorkouts: [], exerciseCounts: new Map() };
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to fetch program week");
    }
    const programData = await response.json();
    return { programWeek: programData, extraWorkouts: [], exerciseCounts: new Map() };
  }, [user?.id]);

  const { data: programData, loading: programLoading, error, refetch } = usePageData(fetchProgramWeekOnly, [user?.id]);
  const programWeek = programData?.programWeek ?? null;

  const extraWorkouts: ExtraWorkout[] = [];
  const exerciseCounts = new Map<string, number>();

  const loading = programLoading;

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
          alert(data.message || "Complete the current week first.");
        } else if (response.status === 409) {
          refetch();
          alert(data.message || data.error || "This workout is already completed. Refreshing.");
        } else {
          alert(data.message || data.error || "Could not start workout.");
        }
        return;
      }

      if (data.workout_assignment_id) {
        window.location.href = `/client/workouts/${data.workout_assignment_id}/start`;
      }
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === "AbortError") {
        alert("Request timed out. Please try again.");
      } else {
        console.error("Error starting workout:", err);
        alert("Could not start workout. Check your connection.");
      }
    } finally {
      setIsStarting(false);
      setStartingScheduleId(null);
    }
  };

  const handleDayClick = async (scheduleId: string, isCompleted: boolean) => {
    if (isCompleted) {
      // Navigate to the workout log for review — never allow re-starting a completed slot
      if (!programWeek?.programAssignmentId) return;

      try {
        const { data: logs } = await supabase
          .from("workout_logs")
          .select("id")
          .eq("client_id", user?.id)
          .eq("program_assignment_id", programWeek.programAssignmentId)
          .eq("program_schedule_id", scheduleId)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (logs?.id) {
          router.push(`/client/progress/workout-logs/${logs.id}`);
        } else {
          // Log exists in ledger but no tagged workout_log found — show info, never re-start
          alert("Workout completed — no log found to view.");
        }
      } catch (err) {
        console.error("Error finding workout log:", err);
      }
    } else {
      // Start the workout
      await handleStartWorkout(scheduleId);
    }
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
                className="fc-btn fc-btn-secondary fc-press h-10 px-6 text-sm"
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
                    isStarting={isStarting}
                    startingScheduleId={startingScheduleId}
                    exerciseCounts={exerciseCounts}
                  />

                  {/* Section 3: Week Overview Strip */}
                  <WeekStrip
                    days={programWeek.days}
                    todaySlot={programWeek.todaySlot}
                    todayWeekday={getTodayWeekday()}
                    onDayClick={handleDayClick}
                  />

                  {/* Section 4: Overdue Workouts Warning */}
                  <OverdueWorkouts
                    overdueSlots={programWeek.overdueSlots}
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
