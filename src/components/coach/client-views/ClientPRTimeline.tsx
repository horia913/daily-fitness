"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { PRTimelineChart, type PRMilestone } from "@/components/progress/PRTimelineChart";

type RecentPrItem = {
  exerciseId: string | null;
  exerciseName: string | null;
  weight: number | null;
  reps: number | null;
  achievedDate: string;
  workoutLogId: string | null;
};

type ApiResponse = {
  clientId: string;
  milestones: PRMilestone[];
  recent: RecentPrItem[];
};

export default function ClientPRTimeline({
  clientId,
}: {
  clientId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<PRMilestone[]>([]);
  const [recent, setRecent] = useState<RecentPrItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/coach/clients/${clientId}/pr-timeline`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error ?? `Failed to load PR timeline (${res.status})`);
        }
        return body as ApiResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setMilestones(Array.isArray(data.milestones) ? data.milestones : []);
        setRecent(Array.isArray(data.recent) ? data.recent : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load PR timeline");
          setMilestones([]);
          setRecent([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const latestExerciseName = useMemo(() => {
    return recent.find((r) => r.exerciseName)?.exerciseName ?? "Top lift";
  }, [recent]);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-cyan-300/70">
        PR History
      </h2>

      {loading ? (
        <p className="text-sm text-gray-500 py-6">Loading PR timeline...</p>
      ) : error ? (
        <p className="text-sm text-red-400 py-4">{error}</p>
      ) : milestones.length === 0 ? (
        <p className="text-sm text-gray-500 py-6">No PRs recorded yet</p>
      ) : (
        <div className="space-y-4">
          <PRTimelineChart
            milestones={milestones}
            exerciseName={latestExerciseName}
            defaultTimeRange="1Y"
            className="border-white/10"
          />

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Recent PRs
            </p>
            <ul className="space-y-2">
              {recent.map((item, idx) => (
                <li key={`${item.achievedDate}-${item.exerciseId ?? "x"}-${idx}`}>
                  <button
                    type="button"
                    className="w-full text-left rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 hover:bg-white/[0.05] transition-colors"
                    onClick={() => {
                      if (item.workoutLogId) {
                        window.location.href = `/coach/clients/${clientId}/workout-logs/${item.workoutLogId}`;
                      }
                    }}
                    disabled={!item.workoutLogId}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-white truncate">
                        {item.exerciseName ?? "Exercise"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(`${item.achievedDate}T12:00:00`).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="text-xs text-cyan-300 mt-1">
                      {(item.weight != null ? `${item.weight} kg` : "—")} ×{" "}
                      {(item.reps != null ? `${item.reps} reps` : "—")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!loading && !error && milestones.length === 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <Trophy className="w-4 h-4" />
          Complete workouts to start recording PR milestones.
        </div>
      )}
    </section>
  );
}
