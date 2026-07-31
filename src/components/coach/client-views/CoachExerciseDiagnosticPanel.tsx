"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { fetchApi } from "@/lib/apiClient";
import type {
  CoachExerciseDiagnosticPayload,
  DiagnosticExerciseOption,
  DiagnosticTimeRange,
} from "@/lib/coachExerciseDiagnostic";
import CoachExerciseDiagnosticChart from "@/components/coach/client-detail/CoachExerciseDiagnosticChart";
import sec from "@/components/coach/client-detail/coachClientDetailUi.module.css";
import prStyles from "@/components/coach/client-views/ClientPRTimeline.module.css";

type Props = {
  clientId: string;
  timeRange: DiagnosticTimeRange;
  timeZone?: string | null;
};

export default function CoachExerciseDiagnosticPanel({
  clientId,
  timeRange,
  timeZone,
}: Props) {
  const [exercises, setExercises] = useState<DiagnosticExerciseOption[]>([]);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [data, setData] = useState<CoachExerciseDiagnosticPayload | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    setError(null);
    fetchApi(`/api/coach/clients/${clientId}/exercise-diagnostic?list=1`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error ?? `Failed (${res.status})`);
        return body as { exercises: DiagnosticExerciseOption[] };
      })
      .then((body) => {
        if (cancelled) return;
        const list = Array.isArray(body.exercises) ? body.exercises : [];
        setExercises(list);
        setExerciseId((prev) => {
          if (prev && list.some((e) => e.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
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

    fetchApi(`/api/coach/clients/${clientId}/exercise-diagnostic?${qs}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error ?? `Failed (${res.status})`);
        return body as CoachExerciseDiagnosticPayload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load diagnostic");
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

  if (loadingList) {
    return (
      <section className={sec.section}>
        <p className={prStyles.prEyebrow}>EXERCISE DIAGNOSTIC</p>
        <p className="text-sm text-[color:var(--fc-text-subtle)] py-4 m-0">Loading…</p>
      </section>
    );
  }

  if (exercises.length === 0) {
    return (
      <section className={sec.section}>
        <p className={prStyles.prEyebrow}>EXERCISE DIAGNOSTIC</p>
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
          <p className={prStyles.prEyebrow}>EXERCISE DIAGNOSTIC</p>
          <h2 className={sec.sectionTitle} style={{ marginTop: 4 }}>
            Volume · avg load · strength
          </h2>
        </div>
        <span className={sec.sectionMeta}>Indexed · weekly</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={prStyles.fieldLabel}>Exercise</span>
        <div className={prStyles.selectWrap}>
          <select
            className={prStyles.select}
            value={exerciseId ?? ""}
            onChange={(e) => setExerciseId(e.target.value || null)}
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
                {!ex.strengthEligible ? " (no est. 1RM)" : ""}
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
        <p className="text-sm text-[color:var(--fc-text-subtle)] py-6 m-0">Loading chart…</p>
      ) : data ? (
        <CoachExerciseDiagnosticChart data={data} />
      ) : null}
    </section>
  );
}
