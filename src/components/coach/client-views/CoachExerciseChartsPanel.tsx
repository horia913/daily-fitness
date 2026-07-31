"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { fetchApi } from "@/lib/apiClient";
import {
  shortestFittingChartRange,
  type CoachExerciseChartOption,
  type CoachExerciseChartRange,
  type CoachExerciseChartsPayload,
} from "@/lib/coachExerciseCharts/getCoachExerciseCharts";
import CoachExerciseAdherenceChart from "@/components/coach/client-detail/CoachExerciseAdherenceChart";
import CoachExerciseProgressionChart from "@/components/coach/client-detail/CoachExerciseProgressionChart";
import chartStyles from "@/components/coach/client-detail/CoachExerciseCharts.module.css";
import sec from "@/components/coach/client-detail/coachClientDetailUi.module.css";
import prStyles from "@/components/coach/client-views/ClientPRTimeline.module.css";

type Props = {
  clientId: string;
  timeRange: CoachExerciseChartRange;
  onTimeRangeChange?: (range: CoachExerciseChartRange) => void;
  timeZone?: string | null;
};

export default function CoachExerciseChartsPanel({
  clientId,
  timeRange,
  onTimeRangeChange,
  timeZone,
}: Props) {
  const [exercises, setExercises] = useState<CoachExerciseChartOption[]>([]);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [data, setData] = useState<CoachExerciseChartsPayload | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyDefaultRangeForExercise = (ex: CoachExerciseChartOption | undefined) => {
    if (!ex?.firstTrained || !onTimeRangeChange) return;
    const next = shortestFittingChartRange(
      ex.firstTrained,
      new Date(),
      timeZone ?? "UTC",
    );
    onTimeRangeChange(next);
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    setError(null);
    fetchApi(`/api/coach/clients/${clientId}/exercise-charts?list=1`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error ?? `Failed (${res.status})`);
        return body as { exercises: CoachExerciseChartOption[] };
      })
      .then((body) => {
        if (cancelled) return;
        const list = Array.isArray(body.exercises) ? body.exercises : [];
        setExercises(list);
        const first = list[0];
        setExerciseId(first?.id ?? null);
        if (first) applyDefaultRangeForExercise(first);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load exercises");
          setExercises([]);
          setExerciseId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fit once per client list load
  }, [clientId]);

  useEffect(() => {
    if (!exerciseId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoadingChart(true);
    setError(null);
    const qs = new URLSearchParams({
      exerciseId,
      range: timeRange,
    });
    if (timeZone) qs.set("tz", timeZone);

    fetchApi(`/api/coach/clients/${clientId}/exercise-charts?${qs}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error ?? `Failed (${res.status})`);
        return body as CoachExerciseChartsPayload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load charts");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingChart(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, exerciseId, timeRange, timeZone]);

  const onExerciseChange = (nextId: string | null) => {
    setExerciseId(nextId);
    const ex = exercises.find((e) => e.id === nextId);
    applyDefaultRangeForExercise(ex);
  };

  if (loadingList) {
    return (
      <section className={sec.section}>
        <p className={prStyles.prEyebrow}>EXERCISE PERFORMANCE</p>
        <p className="text-sm text-[color:var(--fc-text-subtle)] py-4 m-0">
          Loading…
        </p>
      </section>
    );
  }

  if (exercises.length === 0) {
    return (
      <section className={sec.section}>
        <p className={prStyles.prEyebrow}>EXERCISE PERFORMANCE</p>
        <p className="text-sm text-[color:var(--fc-text-subtle)] py-4 m-0">
          No weighted sets logged yet.
        </p>
      </section>
    );
  }

  return (
    <section className={sec.section}>
      <div className={sec.sectionHead}>
        <div>
          <p className={prStyles.prEyebrow}>EXERCISE PERFORMANCE</p>
          <h2 className={sec.sectionTitle} style={{ marginTop: 4 }}>
            Adherence · Progression
          </h2>
        </div>
        <span className={sec.sectionMeta}>Weekly · one picker</span>
      </div>

      <div className={chartStyles.panel}>
        <div className="flex flex-col gap-1.5">
          <span className={prStyles.fieldLabel}>Exercise</span>
          <div className={prStyles.selectWrap}>
            <select
              className={prStyles.select}
              value={exerciseId ?? ""}
              onChange={(e) => onExerciseChange(e.target.value || null)}
            >
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                  {!ex.strengthEligible ? " (progression only)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className={prStyles.selectChevron} aria-hidden size={12} />
          </div>
        </div>

        {error ? (
          <p className="text-sm text-[color:var(--fc-effort-max)] m-0">{error}</p>
        ) : null}

        {loadingChart ? (
          <p className="text-sm text-[color:var(--fc-text-subtle)] py-6 m-0">
            Loading charts…
          </p>
        ) : data ? (
          <>
            <CoachExerciseAdherenceChart data={data} />
            <CoachExerciseProgressionChart data={data} />
          </>
        ) : null}
      </div>
    </section>
  );
}
