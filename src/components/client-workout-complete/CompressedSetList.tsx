"use client";

import React from "react";
import { compressSets, maxWeightInLines } from "./compressStrengthSets";
import type { CompressLine } from "./compressStrengthSets";
import styles from "./clientWorkoutCompleteV1.module.css";

function formatWeight(w: number): string {
  if (!Number.isFinite(w)) return "—";
  if (Math.abs(w - Math.round(w)) < 0.01) return String(Math.round(w));
  return String(w);
}

function prLinePredicate(
  exerciseId: string | null,
  prs: Array<{
    exercise_id?: string;
    record_type?: string;
    record_value?: number | string;
  }>
): (weight: number, reps: number) => boolean {
  return (weight: number, reps: number) => {
    if (!exerciseId) return false;
    for (const pr of prs) {
      if (pr.exercise_id !== exerciseId) continue;
      const rt = String(pr.record_type ?? "");
      const val = Number(pr.record_value);
      if (!Number.isFinite(val)) continue;
      if (rt === "weight" || rt.includes("rm")) {
        if (Math.abs(val - weight) < 0.05) return true;
      }
      if (rt === "reps") {
        if (Math.abs(val - reps) < 0.5 && weight > 0) return true;
      }
    }
    return false;
  };
}

export function CompressedSetList(props: {
  lines: CompressLine[];
  exerciseId: string | null;
  prs: Array<{
    exercise_id?: string;
    record_type?: string;
    record_value?: number | string;
  }>;
}) {
  if (props.lines.length === 0) {
    return <p className={styles.coachText}>No sets logged.</p>;
  }

  const isPr = prLinePredicate(props.exerciseId, props.prs);
  const annotated: CompressLine[] = props.lines.map((l) => ({
    ...l,
    isPR: l.isPR || isPr(l.weight, l.reps),
  }));

  const groups = compressSets(annotated);
  const maxW = maxWeightInLines(annotated);

  return (
    <div>
      {groups.map((g, idx) => {
        const rangeLabel =
          g.range.start === g.range.end
            ? `Set ${g.range.start}`
            : `Sets ${g.range.start}–${g.range.end}`;
        const isTop = g.count === 1 && g.weight === maxW && maxW > 0;
        const badge = g.containsPR
          ? `×${g.count} PR`
          : isTop
            ? "top"
            : `×${g.count}`;
        const rowPr = g.containsPR;

        return (
          <div
            key={`${g.range.start}-${g.range.end}-${idx}`}
            className={`${styles.setGroupRow} ${rowPr ? styles.setGroupRowPr : ""}`.trim()}
          >
            <div
              className={`${styles.rangeLabel} ${rowPr ? styles.rangeLabelPr : ""}`.trim()}
            >
              {rangeLabel}
            </div>
            <div className={styles.valueCol}>
              <span>{g.reps}</span>{" "}
              <span className={styles.dimX}>×</span>{" "}
              <span>{formatWeight(g.weight)}</span>{" "}
              <span className={styles.dimUnit}>kg</span>
            </div>
            <span
              className={`${styles.countBadge} ${rowPr ? styles.countBadgePr : ""}`.trim()}
            >
              {badge}
            </span>
          </div>
        );
      })}
    </div>
  );
}
