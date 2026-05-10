"use client";

import React, { useMemo, useState } from "react";
import { List } from "lucide-react";
import type { BlockGroupLite, ExerciseSummaryModel } from "./types";
import styles from "./clientWorkoutCompleteV1.module.css";
import { buildExerciseSummaryRows } from "./buildExerciseSummary";
import { ExerciseSummaryRow } from "./ExerciseSummaryRow";

export function WorkoutSummarySection(props: {
  blockGroups: BlockGroupLite[];
  prs: Array<{ exercise_id?: string }>;
}) {
  const rows = useMemo(
    () => buildExerciseSummaryRows(props.blockGroups),
    [props.blockGroups]
  );
  const [openKey, setOpenKey] = useState<string | null>(null);

  const prExerciseIds = useMemo(() => {
    const s = new Set<string>();
    for (const pr of props.prs) {
      if (pr.exercise_id) s.add(pr.exercise_id);
    }
    return s;
  }, [props.prs]);

  if (rows.length === 0) return null;

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHead}>
        <div className={styles.sectionTitle}>
          <List size={16} aria-hidden />
          Workout summary
        </div>
        <span className={styles.sectionMeta}>{rows.length} exercises</span>
      </div>
      {rows.map((row) => {
        const key = row.key;
        const hasPr = row.exerciseId ? prExerciseIds.has(row.exerciseId) : false;
        return (
          <ExerciseSummaryRow
            key={key}
            row={row as ExerciseSummaryModel}
            indexLabel={String(row.order).padStart(2, "0")}
            open={openKey === key}
            onToggle={() =>
              setOpenKey((prev) => (prev === key ? null : key))
            }
            exerciseHasPr={hasPr}
            prs={props.prs}
          />
        );
      })}
    </section>
  );
}
