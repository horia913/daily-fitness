"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, ExternalLink } from "lucide-react";

type LogDetail = {
  id: string;
  completed_at: string;
  started_at: string | null;
  total_duration_minutes: number | null;
  total_sets_completed: number | null;
  total_weight_lifted: number | string | null;
  workoutName: string;
  templateId: string | null;
};

export default function CoachClientWorkoutLogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const logId = params.logId as string;
  const [log, setLog] = useState<LogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from("workout_logs")
        .select(
          `
          id,
          client_id,
          completed_at,
          started_at,
          total_duration_minutes,
          total_sets_completed,
          total_weight_lifted,
          workout_assignments (
            workout_template_id,
            workout_templates ( id, name )
          )
        `
        )
        .eq("id", logId)
        .eq("client_id", clientId)
        .maybeSingle();

      if (qErr) throw qErr;
      if (!data) {
        setLog(null);
        setError("Log not found or you do not have access.");
        return;
      }
      type Row = {
        id: string;
        completed_at: string;
        started_at: string | null;
        total_duration_minutes: number | null;
        total_sets_completed: number | null;
        total_weight_lifted: number | string | null;
        workout_assignments?: {
          workout_template_id?: string | null;
          workout_templates?: { id?: string; name?: string } | null;
        } | null;
      };
      const row = data as Row;
      const wa = row.workout_assignments;
      const tpl = wa?.workout_templates;
      setLog({
        id: row.id,
        completed_at: row.completed_at,
        started_at: row.started_at,
        total_duration_minutes: row.total_duration_minutes,
        total_sets_completed: row.total_sets_completed,
        total_weight_lifted: row.total_weight_lifted,
        workoutName: tpl?.name || "Workout",
        templateId: tpl?.id ?? wa?.workout_template_id ?? null,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load log");
      setLog(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, logId]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatWeight = (v: number | string | null) => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (Number.isNaN(n)) return "—";
    return `${Math.round(n)} kg`;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex p-2 rounded-xl border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)] fc-glass hover:border-[color:var(--fc-domain-workouts)]/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fc-accent)]"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden />
        </button>
        <Link
          href={`/coach/clients/${clientId}/workout-logs`}
          className="text-sm fc-text-dim hover:fc-text-primary"
        >
          All sessions
        </Link>
      </div>

      {loading ? (
        <p className="text-sm fc-text-dim py-8">Loading…</p>
      ) : error || !log ? (
        <p className="text-sm fc-text-error py-4">{error || "Not found"}</p>
      ) : (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <div className="fc-icon-tile fc-icon-workouts shrink-0">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold fc-text-primary break-words">{log.workoutName}</h1>
              <p className="text-sm fc-text-dim mt-2">
                Completed{" "}
                {new Date(log.completed_at).toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-4">
              <dt className="fc-text-dim text-xs uppercase tracking-wide">Duration</dt>
              <dd className="font-semibold fc-text-primary mt-1">
                {log.total_duration_minutes != null ? `${log.total_duration_minutes} min` : "—"}
              </dd>
            </div>
            <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-4">
              <dt className="fc-text-dim text-xs uppercase tracking-wide">Sets</dt>
              <dd className="font-semibold fc-text-primary mt-1">
                {log.total_sets_completed != null ? log.total_sets_completed : "—"}
              </dd>
            </div>
            <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-4">
              <dt className="fc-text-dim text-xs uppercase tracking-wide">Volume</dt>
              <dd className="font-semibold fc-text-primary mt-1">{formatWeight(log.total_weight_lifted)}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            {log.templateId && (
              <Button className="fc-btn fc-btn-primary gap-2" asChild>
                <Link href={`/coach/workouts/templates/${log.templateId}`}>
                  Open template
                  <ExternalLink className="w-4 h-4 opacity-80" />
                </Link>
              </Button>
            )}
            <Button variant="outline" className="fc-btn fc-btn-secondary" asChild>
              <Link href={`/coach/clients/${clientId}/workouts`}>Training tab</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
