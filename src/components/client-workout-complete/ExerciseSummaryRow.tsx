"use client";

import React from "react";
import { ChevronDown, Star } from "lucide-react";
import type { ExerciseSummaryModel } from "./types";
import styles from "./clientWorkoutCompleteV1.module.css";
import { rowTotals } from "./buildExerciseSummary";
import { buildCompressLinesForExercise } from "./setLinesFromLogs";
import { CompressedSetList } from "./CompressedSetList";

function pillClass(v: ExerciseSummaryModel["setTypeVariant"]) {
  if (v === "straight") return styles.pillStraight;
  if (v === "cluster") return styles.pillCluster;
  if (v === "drop") return styles.pillDrop;
  return styles.pillOther;
}

function shortPillLabel(v: ExerciseSummaryModel["setTypeVariant"], full: string) {
  if (v === "straight") return "Straight";
  if (v === "cluster") return "Cluster";
  if (v === "drop") return "Drop";
  return full.split(" ")[0] ?? full;
}

export function ExerciseSummaryRow(props: {
  row: ExerciseSummaryModel;
  indexLabel: string;
  open: boolean;
  onToggle: () => void;
  exerciseHasPr: boolean;
  prs: Array<{
    exercise_id?: string;
    record_type?: string;
    record_value?: number | string;
  }>;
}) {
  const t = rowTotals(props.row);
  const kgRounded = t.totalKg >= 100 ? Math.round(t.totalKg) : Math.round(t.totalKg * 10) / 10;

  const lines = buildCompressLinesForExercise(
    props.row.blockType,
    props.row.sets,
    props.row.exerciseId ?? "",
    () => false
  );

  return (
    <div
      className={styles.exerciseRow}
      data-open={props.open ? "true" : "false"}
      role="button"
      tabIndex={0}
      onClick={props.onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          props.onToggle();
        }
      }}
    >
      <div className={styles.rowHead}>
        <div className={styles.rowIdx}>{props.indexLabel}</div>
        <div className={styles.rowMeta}>
          <div className={styles.nameRow}>
            <span className={styles.exName}>{props.row.name}</span>
            <span
              className={`${styles.pill} ${pillClass(props.row.setTypeVariant)}`.trim()}
            >
              {shortPillLabel(props.row.setTypeVariant, props.row.setTypeLabel)}
            </span>
          </div>
          <div className={styles.footRow}>
            <span>
              <span className={styles.footStrong}>{t.setCount}</span> sets
            </span>
            <span aria-hidden>·</span>
            <span>
              <span className={styles.footStrong}>{t.totalReps}</span> reps
            </span>
            <span aria-hidden>·</span>
            <span>
              <span className={styles.footStrong}>{kgRounded}</span> kg
            </span>
            {props.exerciseHasPr ? (
              <>
                <span aria-hidden>·</span>
                <span className={styles.prTag}>
                  <Star size={8} aria-hidden />
                  PR
                </span>
              </>
            ) : null}
          </div>
        </div>
        <ChevronDown size={13} className={styles.chevron} aria-hidden />
      </div>
      {props.open ? (
        <div className={styles.expandBody} onClick={(e) => e.stopPropagation()}>
          <CompressedSetList
            lines={lines}
            exerciseId={props.row.exerciseId}
            prs={props.prs}
          />
        </div>
      ) : null}
    </div>
  );
}
