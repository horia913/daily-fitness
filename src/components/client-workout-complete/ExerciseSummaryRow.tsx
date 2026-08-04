"use client";

import React from "react";
import {
  formatSoloGroupBadge,
} from "@/components/client/workout-execution/groupLetterBadges";
import { groupIndexToHue } from "@/components/client/workout-execution/live-card";
import type { ExerciseSummaryModel, PrescribedRpeMap } from "./types";
import {
  CompressedSetList,
  buildLinesForRow,
  collapseFootnote,
} from "./CompressedSetList";
import styles from "./clientWorkoutCompleteV6.module.css";
import { cn } from "@/lib/utils";

const HUE_CLASS = {
  a: styles.exHueA,
  b: styles.exHueB,
  c: styles.exHueC,
  d: styles.exHueD,
} as const;

export function ExerciseSummaryRow(props: {
  row: ExerciseSummaryModel;
  groupIndex: number;
  prs: Array<{
    exercise_id?: string;
    record_type?: string;
    record_value?: number | string;
  }>;
  exerciseHasPr: boolean;
  prescribed?: PrescribedRpeMap;
  ratingTargetId: string | null;
  onTapNa: (setLogIds: string[]) => void;
  onRate: (setLogIds: string[], rpe: number) => void;
  ratingBusy: boolean;
}) {
  const hue = groupIndexToHue(props.groupIndex);
  const badge = formatSoloGroupBadge(props.groupIndex);
  const lines = buildLinesForRow(props.row, props.prs, props.prescribed);
  const collapseNote = collapseFootnote(lines);
  const hasUnrated = lines.some(
    (l) => l.loggedRpe == null || !(Number(l.loggedRpe) > 0),
  );
  const rateHint = hasUnrated ? "↳ tap N/A to rate how these felt" : null;
  const footNotes = [
    props.row.techniqueNote,
    collapseNote,
    rateHint,
  ].filter(Boolean) as string[];

  return (
    <div className={cn(styles.ex, HUE_CLASS[hue])}>
      <div className={styles.exhead}>
        <span className={styles.badge}>{badge}</span>
        <span className={styles.exname}>{props.row.name}</span>
        {props.exerciseHasPr ? (
          <span className={styles.prchip}>PR</span>
        ) : null}
      </div>
      <CompressedSetList
        lines={lines}
        exerciseId={props.row.exerciseId}
        prs={props.prs}
        ratingTargetId={props.ratingTargetId}
        onTapNa={props.onTapNa}
        onRate={props.onRate}
        ratingBusy={props.ratingBusy}
        footNotes={footNotes}
      />
    </div>
  );
}
