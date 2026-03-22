"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Dumbbell } from "lucide-react";

type Row = {
  id: string;
  completed_at: string;
  total_duration_minutes: number | null;
  total_sets_completed: number | null;
  total_weight_lifted: number | string | null;
  workoutName: string;
};

export default function CoachClientWorkoutLogsListPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [rows, setRows] = useState<Row[]>([]);
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
          completed_at,
          total_duration_minutes,
          total_sets_completed,
          total_weight_lifted,
          workout_assignments ( workout_templates ( name ) )
        `
        )
        .eq("client_id", clientId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(50);

      if (qErr) throw qErr;
      const mapped: Row[] = (data || []).map((r: Record<string, unknown>) => {
        const wa = r.workout_assignments as
          | { workout_templates?: { name?: string } }
          | null
          | undefined;
        return {
          id: r.id as string,
          completed_at: r.completed_at as string,
          total_duration_minutes: r.total_duration_minutes as number | null,
          total_sets_completed: r.total_sets_completed as number | null,
          total_weight_lifted: r.total_weight_lifted as number | string | null,
          workoutName: wa?.workout_templates?.name || "Workout",
        };
      });
      setRows(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

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
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/coach/clients/${clientId}/workouts`}
          className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--fc-glass-border)] px-3 py-2 text-sm fc-text-primary fc-glass"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          Back to Training
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="fc-icon-tile fc-icon-workouts">
          <Dumbbell className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold fc-text-primary">Completed sessions</h1>
          <p className="text-sm fc-text-dim">Recent workout logs for this client.</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm fc-text-dim py-8">Loading…</p>
      ) : error ? (
        <p className="text-sm fc-text-error py-4">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm fc-text-dim py-8">No completed sessions yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/coach/clients/${clientId}/workout-logs/${r.id}`}
                className="block rounded-2xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-4 hover:border-[color:var(--fc-domain-workouts)]/50 transition-colors"
              >
                <p className="font-medium fc-text-primary">{r.workoutName}</p>
                <p className="text-xs fc-text-dim mt-1">
                  {new Date(r.completed_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs fc-text-subtle mt-2">
                  {r.total_duration_minutes != null ? `${r.total_duration_minutes} min` : "—"} ·{" "}
                  {r.total_sets_completed != null ? `${r.total_sets_completed} sets` : "—"} · Vol{" "}
                  {formatWeight(r.total_weight_lifted)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
