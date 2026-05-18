"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { CoachWorkoutLogDetailPayload } from "@/lib/coachClientSummaryServer";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { WorkoutLogBody } from "@/components/shared/workout-log/WorkoutLogBody";

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

  const detail = payload;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 lg:max-w-7xl">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex p-2 rounded-xl border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)] fc-glass hover:border-[color:var(--fc-domain-workouts)]/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fc-accent-cyan)]"
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
        <div className="fc-card-shell p-6 sm:p-8">
          <PageSkeleton variant="form" />
        </div>
      ) : error || !detail ? (
        <p className="text-sm fc-text-error py-4">{error || "Not found"}</p>
      ) : (
        <WorkoutLogBody
          payload={detail.payload}
          prescribedReference={detail.prescribedReference ?? null}
          adherence={detail.adherence}
          derivedDurationMinutes={detail.displayDurationMinutes ?? undefined}
          onBack={() => router.back()}
          headerActions={
            <>
              {detail.payload.session.workoutTemplateId && (
                <Button className="fc-btn fc-btn-primary gap-2" asChild>
                  <Link href={`/coach/workouts/templates/${detail.payload.session.workoutTemplateId}`}>
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
            </>
          }
        />
      )}
    </div>
  );
}
