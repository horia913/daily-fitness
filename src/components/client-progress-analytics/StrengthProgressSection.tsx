"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Dumbbell, TrendingUp } from "lucide-react";
import {
  getCompoundLiftDisplayName,
  getExerciseProgression,
  type ExerciseProgression,
  type StrengthTimeRange,
  type TrainedExercise,
} from "@/lib/strengthAnalytics";
import v6 from "./progressAnalyticsV6.module.css";
import { SectionCard, SectionHead } from "./AnalyticsSectionChrome";
import { ExerciseGainCard } from "./ExerciseGainCard";
import EmptyStateBlock from "@/components/coach/client-detail/EmptyStateBlock";
import { cn } from "@/lib/utils";

const COMPOUND_ORDER = ["Bench Press", "Squat", "Deadlift", "Overhead Press"] as const;

export function StrengthProgressSection({
  clientId,
  pageTimeRange,
  topProgressions,
  compoundProgressions,
  trainedExercises,
}: {
  clientId: string | undefined;
  pageTimeRange: StrengthTimeRange;
  topProgressions: ExerciseProgression[];
  compoundProgressions: ExerciseProgression[];
  trainedExercises: TrainedExercise[];
}) {
  const [gainProgById, setGainProgById] = useState<Record<string, ExerciseProgression>>({});
  const [gainRangeById, setGainRangeById] = useState<Record<string, StrengthTimeRange>>({});
  const [gainLoadingId, setGainLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || topProgressions.length === 0) {
      setGainProgById({});
      return;
    }
    if (pageTimeRange === "3M") {
      const o: Record<string, ExerciseProgression> = {};
      topProgressions.forEach((p) => {
        o[p.exerciseId] = p;
      });
      setGainProgById(o);
      setGainRangeById({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const rows = await Promise.all(
        topProgressions.map((p) => getExerciseProgression(clientId, p.exerciseId, "3M")),
      );
      if (cancelled) return;
      const o: Record<string, ExerciseProgression> = {};
      topProgressions.forEach((p, i) => {
        const g = rows[i];
        o[p.exerciseId] = g ?? p;
      });
      setGainProgById(o);
      setGainRangeById({});
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, pageTimeRange, topProgressions]);

  const onGainRange = useCallback(
    async (exerciseId: string, r: StrengthTimeRange) => {
      if (!clientId) return;
      setGainRangeById((s) => ({ ...s, [exerciseId]: r }));
      setGainLoadingId(exerciseId);
      try {
        const g = await getExerciseProgression(clientId, exerciseId, r);
        if (g) setGainProgById((prev) => ({ ...prev, [exerciseId]: g }));
      } finally {
        setGainLoadingId(null);
      }
    },
    [clientId],
  );

  const sessionCountFor = useCallback(
    (id: string) => trainedExercises.find((e) => e.id === id)?.sessionCount,
    [trainedExercises],
  );

  const featured = COMPOUND_ORDER.map((label) =>
    compoundProgressions.find((p) => getCompoundLiftDisplayName(p.exerciseName) === label),
  ).filter((p): p is ExerciseProgression => Boolean(p));

  const hasStrength = topProgressions.length > 0 || trainedExercises.length > 0;

  if (!hasStrength) {
    return (
      <SectionCard>
        <SectionHead
          icon={Dumbbell}
          iconClassName="bg-[color:var(--fc-group-c-soft)] text-[var(--fc-accent)]"
          title="Strength progress"
          description="Estimated 1RM & progression"
        />
        <EmptyStateBlock
          icon={Dumbbell}
          title="No strength data yet"
          description="Log a workout to start tracking 1RM progression."
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <SectionHead
        icon={Dumbbell}
        iconClassName="bg-[color:var(--fc-group-c-soft)] text-[var(--fc-accent)]"
        title="Strength progress"
        description="Estimated 1RM & progression"
      />

      {topProgressions.length > 0 ? (
        <div>
          <div
            className="mb-2 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--fc-accent)]"
            style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
          >
            <TrendingUp className="h-[11px] w-[11px] shrink-0" aria-hidden />
            Biggest gains
          </div>
          <div className="flex flex-col gap-2.5">
            {topProgressions.map((seed) => {
              const id = seed.exerciseId;
              const activeR = gainRangeById[id] ?? "3M";
              const prog = gainProgById[id] ?? seed;
              const busy = gainLoadingId === id;
              return (
                <div key={id} className={busy ? "opacity-70" : undefined}>
                  <ExerciseGainCard
                    progression={prog}
                    activeRange={activeR}
                    sessionCount={sessionCountFor(id)}
                    onRangeChange={(r) => void onGainRange(id, r)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {featured.length > 0 ? (
        <div
          className={cn(
            "border-t border-[var(--line-2)] pt-[11px]",
            topProgressions.length > 0 && "mt-2",
          )}
        >
          <div
            className="mb-2 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--t3)]"
            style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)' }}
          >
            <Dumbbell className="h-[11px] w-[11px] shrink-0" aria-hidden />
            Featured lifts
          </div>
          <div className="flex flex-col gap-2">
            {featured.map((p) => (
              <ExerciseGainCard
                key={p.exerciseId}
                progression={p}
                activeRange="3M"
                variant="featured"
                nameOverride={getCompoundLiftDisplayName(p.exerciseName)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
