"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Share2, FileText, Repeat2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { groupSetsIntoBlocks } from "@/lib/workoutLog/groupSetsIntoBlocks";
import { WorkoutLogBody } from "@/components/shared/workout-log/WorkoutLogBody";
import { useToast } from "@/components/ui/toast-provider";
import { shareOrCopy } from "@/lib/shareOrCopy";
import { exportWorkoutLogPdf } from "@/lib/exportWorkoutLogPdf";
import { dedupeAsync } from "@/lib/dedupeAsync";
import { filterSessionPersonalRecordsForDisplay } from "@/lib/prService";
import { resolveWorkoutDisplayDurationMinutes } from "@/lib/workoutLogDuration";
import type {
  PrescribedWorkoutReference,
  WorkoutLogFullPayload,
  WorkoutLogPersonalRecord,
  WorkoutLogSet,
} from "@/types/workoutLog";

type LoadedLog = {
  payload: WorkoutLogFullPayload;
  assignmentExists: boolean;
  prescribedReference: PrescribedWorkoutReference | null;
};

async function fetchWorkoutLogBundle(
  workoutLogId: string,
  viewerId: string,
): Promise<LoadedLog | null> {
  const { data, error } = await supabase.rpc("get_workout_log_full", {
    p_log_id: workoutLogId,
    p_viewer_id: viewerId,
  });
  if (error || !data) {
    console.error("Error loading workout log:", error);
    return null;
  }
  const candidate = Array.isArray(data) ? data[0] : data;
  if (!candidate || typeof candidate !== "object") {
    console.error("Error loading workout log: invalid RPC payload");
    return null;
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
    ? (obj.personalRecords as WorkoutLogPersonalRecord[])
    : [];
  if (!obj.session || typeof obj.session !== "object") {
    console.error("Error loading workout log: missing session");
    return null;
  }

  const prExIds = [
    ...new Set(
      normalizedPersonalRecords.map((p) => p.exerciseId).filter(Boolean),
    ),
  ];
  const metaById = new Map<
    string,
    { category: string | null; primary_muscle_group_id: string | null }
  >();
  if (prExIds.length > 0) {
    const { data: exRows } = await supabase
      .from("exercises")
      .select("id, category, primary_muscle_group_id")
      .in("id", prExIds);
    for (const row of exRows ?? []) {
      metaById.set(row.id as string, {
        category: (row.category as string | null) ?? null,
        primary_muscle_group_id:
          (row.primary_muscle_group_id as string | null) ?? null,
      });
    }
  }

  const filteredPrs = filterSessionPersonalRecordsForDisplay(
    normalizedPersonalRecords.map((pr) => {
      const meta = metaById.get(pr.exerciseId);
      return {
        ...pr,
        category: meta?.category ?? null,
        primary_muscle_group_id: meta?.primary_muscle_group_id ?? null,
      };
    }),
  ).map(({ category: _c, primary_muscle_group_id: _m, ...pr }) => pr);

  const session = obj.session as WorkoutLogFullPayload["session"];
  const setAts = setLogsArray.map((s) => s.completed_at);
  const displayDuration = resolveWorkoutDisplayDurationMinutes({
    storedMinutes: session.totalDurationMinutes,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    setCompletedAts: setAts,
  });
  if (displayDuration != null) {
    session.totalDurationMinutes = displayDuration;
  }

  const nextPayload: WorkoutLogFullPayload = {
    session,
    blocks,
    personalRecords: filteredPrs,
    previousLog:
      (obj.previousLog as WorkoutLogFullPayload["previousLog"]) ?? null,
  };

  let assignmentExists = false;
  const assignmentId = nextPayload.session.workoutAssignmentId;
  if (assignmentId) {
    const { data: assignment, error: aErr } = await supabase
      .from("workout_assignments")
      .select("id")
      .eq("id", assignmentId)
      .maybeSingle();
    assignmentExists = !aErr && Boolean(assignment?.id);
  }

  let prescribedReference: PrescribedWorkoutReference | null = null;
  try {
    const presRes = await fetch(
      `/api/client/workout-logs/${encodeURIComponent(workoutLogId)}/prescribed-reference`,
    );
    if (presRes.ok) {
      const presJson = (await presRes.json()) as {
        prescribedReference: PrescribedWorkoutReference | null;
      };
      prescribedReference = presJson.prescribedReference ?? null;
    }
  } catch {
    prescribedReference = null;
  }

  return { payload: nextPayload, assignmentExists, prescribedReference };
}

export default function WorkoutLogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const workoutLogId = useMemo(() => String(params?.id || ""), [params?.id]);

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<WorkoutLogFullPayload | null>(null);
  const [prescribedReference, setPrescribedReference] =
    useState<PrescribedWorkoutReference | null>(null);
  const [fromTrain, setFromTrain] = useState(false);
  const [assignmentExists, setAssignmentExists] = useState<boolean | null>(
    null,
  );
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadGen = useRef(0);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setFromTrain(q.get("from") === "train");
  }, []);

  const backTarget = fromTrain
    ? "/client/train"
    : "/client/progress/workout-logs";

  useEffect(() => {
    if (workoutLogId) {
      setLoading(true);
      setPayload(null);
      setAssignmentExists(null);
      setLoadError(null);
    }
  }, [workoutLogId]);

  const loadWorkoutLog = useCallback(async () => {
    if (!user?.id || !workoutLogId) {
      setLoading(false);
      return;
    }
    const gen = ++loadGen.current;
    try {
      setLoading(true);
      setPrescribedReference(null);
      const bundle = await dedupeAsync(
        "workout-log-full",
        `${workoutLogId}:${user.id}`,
        () => fetchWorkoutLogBundle(workoutLogId, user.id),
      );
      if (gen !== loadGen.current) return;
      if (!bundle) {
        setPayload(null);
        return;
      }
      setPayload(bundle.payload);
      setAssignmentExists(bundle.assignmentExists);
      setPrescribedReference(bundle.prescribedReference);
    } catch (error) {
      if (gen !== loadGen.current) return;
      console.error("Error loading workout log:", error);
    } finally {
      if (gen === loadGen.current) setLoading(false);
    }
  }, [user?.id, workoutLogId]);

  useEffect(() => {
    if (user && !authLoading && workoutLogId) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setLoading(false);
        setLoadError("Loading took too long. Tap Retry to try again.");
      }, 20_000);
      void loadWorkoutLog().finally(() => {
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
  }, [user, authLoading, workoutLogId, loadWorkoutLog]);

  const handleShare = async () => {
    if (!payload || sharing) return;
    setSharing(true);
    try {
      const s = payload.session;
      const dateLabel =
        s.completedAt || s.startedAt
          ? new Date(s.completedAt || s.startedAt!).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—";
      const stats = [
        s.totalDurationMinutes != null ? `${s.totalDurationMinutes} min` : null,
        s.totalWeightLifted != null
          ? `${Math.round(Number(s.totalWeightLifted)).toLocaleString()} kg volume`
          : null,
        s.totalSetsCompleted != null ? `${s.totalSetsCompleted} sets` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      const title = s.workoutName?.trim() || "Workout";
      const text = `${title} — ${dateLabel}${stats ? `\n${stats}` : ""}`;
      const result = await shareOrCopy({
        title,
        text,
        url: typeof window !== "undefined" ? window.location.href : undefined,
      });
      if (result.ok && result.method === "clipboard") {
        addToast({
          variant: "success",
          title: "Copied to clipboard",
          description: "Workout summary and link are ready to paste.",
        });
      } else if (!result.ok && result.reason !== "cancelled") {
        addToast({
          variant: "destructive",
          title: "Couldn’t share",
          description: "Clipboard isn’t available on this device.",
        });
      }
    } finally {
      setSharing(false);
    }
  };

  const handleExportPdf = async () => {
    if (!payload || exporting) return;
    setExporting(true);
    try {
      await exportWorkoutLogPdf(payload);
      addToast({
        variant: "success",
        title: "PDF downloaded",
        description: "Your workout log was exported.",
      });
    } catch (err) {
      console.error("PDF export failed:", err);
      addToast({
        variant: "destructive",
        title: "Export failed",
        description: "Couldn’t create the PDF. Try again.",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleRepeat = () => {
    if (!payload?.session.workoutAssignmentId || !assignmentExists) return;
    router.push(
      `/client/workouts/${payload.session.workoutAssignmentId}/start`,
    );
  };

  if (loadError) {
    return (
      <ProtectedRoute requiredRole="client">
        <ClientPageShell className="mx-auto w-full max-w-lg px-4 pb-[var(--fc-bottom-safe-area)] pt-6 lg:max-w-7xl">
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <p className="text-sm text-[color:var(--fc-text-dim)] mb-3">
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="fc-btn fc-btn-secondary fc-press h-10 px-4 text-sm"
            >
              Retry
            </button>
          </div>
        </ClientPageShell>
      </ProtectedRoute>
    );
  }

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <ClientPageShell className="mx-auto w-full max-w-lg px-4 pb-[var(--fc-bottom-safe-area)] pt-6 lg:max-w-7xl">
          <PageSkeleton variant="dashboard" />
        </ClientPageShell>
      </ProtectedRoute>
    );
  }

  if (!payload) {
    return (
      <ProtectedRoute requiredRole="client">
        <ClientPageShell className="mx-auto w-full max-w-lg px-4 pb-[var(--fc-bottom-safe-area)] pt-6 lg:max-w-7xl">
          <div className="text-center py-8">
            <p className="text-sm fc-text-dim">Workout log not found</p>
            <Button
              onClick={() => router.push(backTarget)}
              className="fc-btn fc-btn-secondary mt-3 h-10 text-sm"
            >
              {fromTrain ? "Back to Train" : "Back to Logs"}
            </Button>
          </div>
        </ClientPageShell>
      </ProtectedRoute>
    );
  }

  const canRepeat = Boolean(
    payload.session.workoutAssignmentId && assignmentExists,
  );

  return (
    <ProtectedRoute requiredRole="client">
      <ClientPageShell className="mx-auto w-full max-w-lg space-y-4 px-4 pb-36 pt-6 lg:max-w-7xl">
        {payload.blocks.length === 0 ? (
          <div className="fc-card-shell p-4 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[color:var(--fc-text-subtle)]" />
            <h3 className="text-sm uppercase tracking-wider mb-2 font-bold fc-text-primary">
              Workout not completed
            </h3>
            <p className="text-xs fc-text-dim">
              Started but not finished — no sets logged.
            </p>
          </div>
        ) : (
          <WorkoutLogBody
            payload={payload}
            prescribedReference={prescribedReference}
            variant="client"
            onBack={() => router.push(backTarget)}
          />
        )}

        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[color:var(--fc-hairline)] bg-[color:var(--fc-bg-deep)] p-3 sm:p-4">
          <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-2 sm:grid-cols-3 lg:max-w-7xl">
            <Button
              type="button"
              onClick={handleRepeat}
              disabled={!canRepeat}
              title={
                canRepeat
                  ? "Start this workout again"
                  : "This workout is no longer available"
              }
              className="fc-btn fc-btn-primary rounded-xl h-10 text-sm font-semibold gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Repeat2 className="w-4 h-4" />
              Repeat
            </Button>
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="rounded-xl h-10 text-sm fc-glass border border-[color:var(--fc-glass-border)] flex items-center justify-center gap-1.5 font-semibold fc-text-primary hover:fc-glass-soft disabled:opacity-50"
            >
              <Share2 className="w-4 h-4 fc-text-workouts" />
              Share
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting}
              className="rounded-xl h-10 text-sm fc-glass border border-[color:var(--fc-glass-border)] flex items-center justify-center gap-1.5 font-semibold fc-text-dim hover:fc-glass-soft col-span-2 sm:col-span-1 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {exporting ? "Exporting…" : "Export PDF"}
            </button>
          </div>
          {!canRepeat && assignmentExists === false ? (
            <p className="mx-auto mt-2 max-w-lg text-center text-[11px] fc-text-dim lg:max-w-7xl">
              Repeat unavailable — this workout assignment no longer exists.
            </p>
          ) : null}
        </div>
      </ClientPageShell>
    </ProtectedRoute>
  );
}
