"use client";

import React, { useMemo, useState, useCallback } from "react";
import { fetchApi } from "@/lib/apiClient";
import { useToast } from "@/components/ui/toast-provider";
import type { BlockGroupLite, PrescribedRpeMap } from "./types";
import styles from "./clientWorkoutCompleteV6.module.css";
import { buildExerciseSummaryRows } from "./buildExerciseSummary";
import { ExerciseSummaryRow } from "./ExerciseSummaryRow";

export function WorkoutSummarySection(props: {
  blockGroups: BlockGroupLite[];
  prs: Array<{ exercise_id?: string; record_type?: string; record_value?: number | string }>;
  prescribed?: PrescribedRpeMap;
  /** Called after a successful RPE PATCH so parent can update blockGroups. */
  onSetRpeUpdated?: (setLogId: string, rpe: number) => void;
}) {
  const { addToast } = useToast();
  const rows = useMemo(
    () => buildExerciseSummaryRows(props.blockGroups),
    [props.blockGroups],
  );

  const prExerciseIds = useMemo(() => {
    const s = new Set<string>();
    for (const pr of props.prs) {
      if (pr.exercise_id) s.add(pr.exercise_id);
    }
    return s;
  }, [props.prs]);

  const [ratingTargetId, setRatingTargetId] = useState<string | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);

  const onTapNa = useCallback((setLogIds: string[]) => {
    const first = setLogIds[0] ?? null;
    setRatingTargetId((prev) => (prev === first ? null : first));
  }, []);

  const onRate = useCallback(
    async (setLogIds: string[], rpe: number) => {
      if (setLogIds.length === 0) return;
      setRatingBusy(true);
      try {
        for (const id of setLogIds) {
          if (id.startsWith("temp-")) continue;
          const res = await fetchApi(`/api/sets/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rpe }),
            credentials: "include",
          });
          if (!res.ok) {
            throw new Error(`PATCH failed ${res.status}`);
          }
          props.onSetRpeUpdated?.(id, rpe);
        }
        setRatingTargetId(null);
      } catch {
        setRatingTargetId(null);
        addToast({
          title: "Couldn't save effort",
          description: "Try again in a moment.",
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        setRatingBusy(false);
      }
    },
    [addToast, props],
  );

  if (rows.length === 0) return null;

  return (
    <section>
      <div className={styles.sec}>
        <span className={styles.secL}>What you lifted</span>
        <span className={styles.secKey}>
          effort · <b>target</b> / <b>yours</b>
        </span>
      </div>
      {rows.map((row, i) => {
        const hasPr = row.exerciseId
          ? prExerciseIds.has(row.exerciseId)
          : false;
        return (
          <ExerciseSummaryRow
            key={row.key}
            row={row}
            groupIndex={i}
            prs={props.prs}
            exerciseHasPr={hasPr}
            prescribed={props.prescribed}
            ratingTargetId={ratingTargetId}
            onTapNa={onTapNa}
            onRate={onRate}
            ratingBusy={ratingBusy}
          />
        );
      })}
    </section>
  );
}
