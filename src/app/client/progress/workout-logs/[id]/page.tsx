"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Button } from "@/components/ui/button";
import {
  Share2,
  FileText,
  Repeat2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { groupSetsIntoBlocks } from "@/lib/workoutLog/groupSetsIntoBlocks";
import { WorkoutLogBody } from "@/components/shared/workout-log/WorkoutLogBody";
import type {
  PrescribedWorkoutReference,
  WorkoutLogFullPayload,
  WorkoutLogSet,
} from "@/types/workoutLog";

export default function WorkoutLogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();
  const workoutLogId = useMemo(() => String(params?.id || ""), [params?.id]);

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<WorkoutLogFullPayload | null>(null);
  const [prescribedReference, setPrescribedReference] =
    useState<PrescribedWorkoutReference | null>(null);

  useEffect(() => {
    if (workoutLogId) {
      setLoading(true);
      setPayload(null);
    }
  }, [workoutLogId]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user && !authLoading && workoutLogId) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setLoading(false);
        setLoadError("Loading took too long. Tap Retry to try again.");
      }, 20_000);
      loadWorkoutLog().finally(() => {
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
    }
    if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading, workoutLogId]);

  const loadWorkoutLog = async () => {
    if (!user?.id || !workoutLogId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setPrescribedReference(null);

      const { data, error } = await supabase.rpc("get_workout_log_full", {
        p_log_id: workoutLogId,
        p_viewer_id: user.id,
      });
      if (error || !data) {
        console.error("Error loading workout log:", error);
        setLoading(false);
        return;
      }
      const candidate = Array.isArray(data) ? data[0] : data;
      if (!candidate || typeof candidate !== "object") {
        console.error("Error loading workout log: invalid RPC payload");
        setLoading(false);
        return;
      }
      const obj = candidate as Record<string, unknown>;
      const rawSetLogs = obj.setLogs;
      const setLogsArray: WorkoutLogSet[] = Array.isArray(rawSetLogs)
        ? (rawSetLogs as WorkoutLogSet[])
        : rawSetLogs && typeof rawSetLogs === "object"
          ? (Object.values(rawSetLogs as Record<string, unknown>) as WorkoutLogSet[])
          : [];
      const blocks = groupSetsIntoBlocks(setLogsArray);
      const normalizedPersonalRecords = Array.isArray(obj.personalRecords)
        ? obj.personalRecords
        : [];
      if (!obj.session || typeof obj.session !== "object") {
        console.error("Error loading workout log: missing session");
        setLoading(false);
        return;
      }
      const payload: WorkoutLogFullPayload = {
        session: obj.session as WorkoutLogFullPayload["session"],
        blocks,
        personalRecords:
          normalizedPersonalRecords as WorkoutLogFullPayload["personalRecords"],
        previousLog:
          (obj.previousLog as WorkoutLogFullPayload["previousLog"]) ?? null,
      };
      setPayload(payload);

      try {
        const presRes = await fetch(
          `/api/client/workout-logs/${encodeURIComponent(workoutLogId)}/prescribed-reference`
        );
        if (presRes.ok) {
          const presJson = (await presRes.json()) as {
            prescribedReference: PrescribedWorkoutReference | null;
          };
          setPrescribedReference(presJson.prescribedReference ?? null);
        } else {
          setPrescribedReference(null);
        }
      } catch {
        setPrescribedReference(null);
      }
    } catch (error) {
      console.error("Error loading workout log:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loadError) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="mx-auto w-full max-w-lg px-4 pb-[var(--fc-bottom-safe-area)] pt-6 lg:max-w-7xl">
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
              <p className="text-sm text-[color:var(--fc-text-dim)] mb-3">{loadError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="fc-btn fc-btn-secondary fc-press h-10 px-4 text-sm"
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
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="mx-auto w-full max-w-lg px-4 pb-[var(--fc-bottom-safe-area)] pt-6 lg:max-w-7xl">
            <PageSkeleton variant="dashboard" />
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!payload) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="mx-auto w-full max-w-lg px-4 pb-[var(--fc-bottom-safe-area)] pt-6 lg:max-w-7xl">
            <div className="text-center py-8">
              <p className="text-sm fc-text-dim">Workout log not found</p>
              <Button
                onClick={() => router.push("/client/progress/workout-logs")}
                className="fc-btn fc-btn-secondary mt-3 h-10 text-sm"
              >
                Back to Logs
              </Button>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="mx-auto w-full max-w-lg space-y-4 px-4 pb-36 pt-6 lg:max-w-7xl">
            {payload.blocks.length === 0 ? (
              <div className="fc-card-shell p-4 text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[color:var(--fc-text-subtle)]" />
                <h3 className="text-sm uppercase tracking-wider mb-2 font-bold fc-text-primary">Workout not completed</h3>
                <p className="text-xs fc-text-dim">Started but not finished — no sets logged.</p>
              </div>
            ) : (
              <WorkoutLogBody
                payload={payload}
                prescribedReference={prescribedReference}
                onBack={() => router.push("/client/progress/workout-logs")}
              />
            )}

            <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 z-50 bg-gradient-to-t from-[color:var(--fc-bg-base)] via-[color:var(--fc-bg-base)]/95 to-transparent backdrop-blur-sm">
              <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-2 sm:grid-cols-3 lg:max-w-7xl">
                <Button
                  onClick={() => router.push("/client/progress/workout-logs")}
                  className="fc-btn rounded-xl h-10 text-sm font-semibold gap-1.5 bg-[color:var(--fc-status-error)] hover:opacity-90 text-[color:var(--fc-bg-base)] border-0"
                >
                  <Repeat2 className="w-4 h-4" />
                  Repeat
                </Button>
                <button
                  type="button"
                  className="rounded-xl h-10 text-sm fc-glass border border-[color:var(--fc-glass-border)] flex items-center justify-center gap-1.5 font-semibold fc-text-primary hover:fc-glass-soft"
                >
                  <Share2 className="w-4 h-4 fc-text-workouts" />
                  Share
                </button>
                <button
                  type="button"
                  className="rounded-xl h-10 text-sm fc-glass border border-[color:var(--fc-glass-border)] hidden sm:flex items-center justify-center gap-1.5 font-semibold fc-text-dim hover:fc-glass-soft col-span-2 sm:col-span-1"
                >
                  <FileText className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
