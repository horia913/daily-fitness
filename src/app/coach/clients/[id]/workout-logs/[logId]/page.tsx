"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, ExternalLink } from "lucide-react";
import type { CoachWorkoutLogDetailPayload } from "@/lib/coachClientSummaryServer";
import {
  adherenceTierFromPercent,
  type CellOutcome,
} from "@/lib/coachWorkoutAdherence";
import { cn } from "@/lib/utils";

function fmtNum(n: number | null | undefined, suffix = ""): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n}${suffix}`;
}

function cellTone(o: CellOutcome): string {
  if (o === "green") return "text-emerald-400";
  if (o === "red") return "text-red-400";
  return "text-gray-400";
}

export default function CoachClientWorkoutLogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const logId = params.logId as string;
  const [payload, setPayload] = useState<CoachWorkoutLogDetailPayload | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/coach/clients/${clientId}/workout-logs/${logId}/detail`
      );
      if (res.status === 404) {
        setPayload(null);
        setError("Log not found or you do not have access.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Failed to load (${res.status})`);
      }
      const json = (await res.json()) as CoachWorkoutLogDetailPayload;
      setPayload(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load log");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, logId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Stored total is Σ(weight × reps) per set, not total kg on the bar. */
  const formatLoadTimesReps = (v: number | string | null) => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (Number.isNaN(n)) return "—";
    return `${Math.round(n).toLocaleString()} kg×reps`;
  };

  const log = payload?.log;
  const adherence = payload?.adherence;
  const tier = adherenceTierFromPercent(adherence?.adherencePercent ?? null);

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
      ) : error || !payload || !log ? (
        <p className="text-sm fc-text-error py-4">{error || "Not found"}</p>
      ) : (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <div className="fc-icon-tile fc-icon-workouts shrink-0">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold fc-text-primary break-words">
                {log.workoutName}
              </h1>
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

          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-4">
              <dt className="fc-text-dim text-xs uppercase tracking-wide">
                Active time
              </dt>
              <dd className="font-semibold fc-text-primary mt-1">
                {payload.displayDurationMinutes != null
                  ? `${payload.displayDurationMinutes} min`
                  : log.total_duration_minutes != null
                    ? `${log.total_duration_minutes} min`
                    : "—"}
              </dd>
              {payload.durationDisplaySource === "capped_stored" && (
                <p className="text-[10px] fc-text-dim mt-1 leading-snug">
                  Capped for display; stored session clock was longer (app may have
                  been left open).
                </p>
              )}
              {payload.durationDisplaySource === "set_span" && (
                <p className="text-[10px] fc-text-dim mt-1 leading-snug">
                  Time from first to last logged set.
                </p>
              )}
            </div>
            <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-4">
              <dt className="fc-text-dim text-xs uppercase tracking-wide">
                Sets
              </dt>
              <dd className="font-semibold fc-text-primary mt-1">
                {log.total_sets_completed != null ? log.total_sets_completed : "—"}
              </dd>
            </div>
            <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-4">
              <dt className="fc-text-dim text-xs uppercase tracking-wide">
                Volume load
              </dt>
              <dd className="font-semibold fc-text-primary mt-1">
                {formatLoadTimesReps(log.total_weight_lifted)}
              </dd>
              <p className="text-[10px] fc-text-dim mt-1 leading-snug">
                Sum of weight × reps per set (not bar weight only).
              </p>
            </div>
            <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-4">
              <dt className="fc-text-dim text-xs uppercase tracking-wide">
                vs last (same assignment)
              </dt>
              <dd className="font-semibold fc-text-primary mt-1 space-y-0.5">
                <div>
                  Volume (kg×reps):{" "}
                  {payload.volumeDeltaKg != null ? (
                    <span
                      className={cn(
                        payload.volumeDeltaKg > 0
                          ? "text-emerald-400"
                          : payload.volumeDeltaKg < 0
                            ? "text-red-400"
                            : "text-gray-400"
                      )}
                    >
                      {payload.volumeDeltaKg > 0 ? "+" : ""}
                      {Math.round(payload.volumeDeltaKg).toLocaleString()}
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
                <div>
                  Sets:{" "}
                  {payload.setsDelta != null ? (
                    <span
                      className={cn(
                        payload.setsDelta > 0
                          ? "text-emerald-400"
                          : payload.setsDelta < 0
                            ? "text-red-400"
                            : "text-gray-400"
                      )}
                    >
                      {payload.setsDelta > 0 ? "+" : ""}
                      {payload.setsDelta}
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
              </dd>
            </div>
          </dl>

          {adherence && adherence.totalPrescribedSets > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan-400/70 mb-2">
                Workout adherence
              </h2>
              <p className="text-sm fc-text-primary">
                <span
                  className={cn(
                    tier === "green" && "text-emerald-400",
                    tier === "amber" && "text-amber-400",
                    tier === "red" && "text-red-400"
                  )}
                >
                  {adherence.adherencePercent != null
                    ? `${Math.round(adherence.adherencePercent)}%`
                    : "—"}
                </span>
                <span className="fc-text-dim">
                  {" "}
                  ({adherence.setsOnTarget}/{adherence.totalPrescribedSets} prescribed
                  sets on target)
                </span>
              </p>
            </div>
          )}

          {adherence && adherence.exerciseBlocks.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan-400/60">
                Set-by-set (prescribed vs actual)
              </h2>
              {adherence.exerciseBlocks.map((block) => (
                <div
                  key={`${block.exerciseId}-${block.blockTypeLabel}`}
                  className="rounded-xl border border-[color:var(--fc-glass-border)] overflow-hidden"
                >
                  <div className="px-3 py-2 bg-white/[0.03] border-b border-white/5">
                    <p className="text-sm font-semibold fc-text-primary">
                      {block.exerciseName ?? block.exerciseId}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {block.blockTypeLabel} · Target: {block.prescribedSummary}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-white/5 fc-text-dim text-left">
                          <th className="py-2 px-3 font-medium">Set</th>
                          <th className="py-2 px-3 font-medium">Weight</th>
                          <th className="py-2 px-3 font-medium">Reps</th>
                          <th className="py-2 px-3 font-medium">RPE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {block.sets.map((s, idx) => (
                          <tr
                            key={`${block.exerciseId}-${s.setNumber}-${idx}`}
                            className="border-b border-white/5 last:border-b-0"
                          >
                            <td className="py-2 px-3 tabular-nums text-white">
                              {s.setNumber}
                            </td>
                            <td className="py-2 px-3">
                              <span className={cellTone(s.weight.outcome)}>
                                {fmtNum(s.weight.actual)}{" "}
                                <span className="fc-text-dim">
                                  / {fmtNum(s.weight.prescribed)}
                                </span>
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={cellTone(s.reps.outcome)}>
                                {fmtNum(s.reps.actual)}{" "}
                                <span className="fc-text-dim">
                                  / {fmtNum(s.reps.prescribedMin)} target
                                </span>
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={cellTone(s.rpe.outcome)}>
                                {fmtNum(s.rpe.actual)}{" "}
                                <span className="fc-text-dim">
                                  / {fmtNum(s.rpe.prescribed)}
                                </span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

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
              <Link href={`/coach/clients/${clientId}/workouts`}>
                Training tab
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
