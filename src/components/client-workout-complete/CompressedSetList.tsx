"use client";

import React from "react";
import {
  clientEffortLabelFromStoredRpe,
  rpeToEffortTier,
  type EffortTier,
} from "@/lib/workoutEffortLabels";
import { effortFromPrescribedRir } from "@/components/client/workout-execution/live-card/effortFromPrescribedRir";
import { SetEffortPicker } from "@/components/client/workout-execution/ui/SetEffortPicker";
import { compressSets } from "./compressStrengthSets";
import type { CompressLine } from "./compressStrengthSets";
import type { PrescribedRirMap, SetGroup } from "./types";
import { buildCompressLinesForExercise } from "./setLinesFromLogs";
import effortStyles from "@/components/client/workout-execution/ui/setEffortPicker.module.css";
import styles from "./clientWorkoutCompleteV6.module.css";
import { cn } from "@/lib/utils";

function formatWeight(w: number): string {
  if (!Number.isFinite(w)) return "—";
  if (Math.abs(w - Math.round(w)) < 0.01) return String(Math.round(w));
  return String(w);
}

const TIER_CLASS: Record<EffortTier, string> = {
  easy: styles.effEasy,
  medium: styles.effMedium,
  hard: styles.effHard,
  max: styles.effMax,
};

function prLinePredicate(
  exerciseId: string | null,
  prs: Array<{
    exercise_id?: string;
    record_type?: string;
    record_value?: number | string;
  }>,
): (weight: number, reps: number) => boolean {
  return (weight: number, reps: number) => {
    if (!exerciseId) return false;
    for (const pr of prs) {
      if (pr.exercise_id !== exerciseId) continue;
      const rt = String(pr.record_type ?? "");
      const val = Number(pr.record_value);
      if (!Number.isFinite(val)) continue;
      if (rt === "max_strength" || rt === "weight") {
        if (Math.abs(val - weight) < 0.05) return true;
      }
      if (rt === "strength_endurance") {
        const vol = weight * reps;
        if (Math.abs(val - vol) < 0.15) return true;
      }
    }
    return false;
  };
}

function EffortCell(props: {
  prescribedRir: number | null;
  loggedRpe: number | null;
  setLogIds: string[];
  ratingTargetId: string | null;
  onTapNa: (setLogIds: string[]) => void;
  ratingBusy: boolean;
}) {
  const target = effortFromPrescribedRir(props.prescribedRir);
  const loggedTier = rpeToEffortTier(props.loggedRpe);
  const loggedLabel = clientEffortLabelFromStoredRpe(props.loggedRpe);
  const hasLogged =
    props.loggedRpe != null &&
    Number(props.loggedRpe) > 0 &&
    loggedTier != null &&
    loggedLabel;

  return (
    <span className={styles.eff}>
      <span className={styles.effP}>{target.label ?? "—"}</span>
      <span className={styles.effSl}>/</span>
      {hasLogged ? (
        <span className={cn(styles.effA, TIER_CLASS[loggedTier!])}>
          {loggedLabel}
        </span>
      ) : (
        <button
          type="button"
          className={styles.effNa}
          disabled={props.ratingBusy}
          onClick={(e) => {
            e.stopPropagation();
            props.onTapNa(props.setLogIds);
          }}
          aria-label="Rate this set"
        >
          N/A
        </button>
      )}
    </span>
  );
}

export function CompressedSetList(props: {
  lines: CompressLine[];
  exerciseId: string | null;
  prs: Array<{
    exercise_id?: string;
    record_type?: string;
    record_value?: number | string;
  }>;
  ratingTargetId: string | null;
  onTapNa: (setLogIds: string[]) => void;
  onRate: (setLogIds: string[], rpe: number) => void;
  ratingBusy: boolean;
  footNotes: string[];
  /** History / log detail — effort word only when rated; no N/A control. */
  readOnly?: boolean;
}) {
  if (props.lines.length === 0) {
    return <p className={styles.exfoot}>No sets logged.</p>;
  }

  const isPr = prLinePredicate(props.exerciseId, props.prs);
  const annotated: CompressLine[] = props.lines.map((l) => ({
    ...l,
    isPR: l.isPR || isPr(l.weight, l.reps),
  }));

  const groups = compressSets(annotated);
  const readOnly = Boolean(props.readOnly);

  return (
    <>
      <div className={styles.exsets}>
        {groups.map((g: SetGroup, idx: number) => {
          const rangeLabel =
            g.range.start === g.range.end
              ? `Set ${g.range.start}`
              : `Sets ${g.range.start}–${g.range.end}`;
          const wLabel = formatWeight(g.weight);
          const isOpen =
            !readOnly &&
            props.ratingTargetId != null &&
            g.setLogIds.includes(props.ratingTargetId);
          const loggedTier = rpeToEffortTier(g.loggedRpe);
          const loggedLabel = clientEffortLabelFromStoredRpe(g.loggedRpe);
          const hasLogged =
            g.loggedRpe != null &&
            Number(g.loggedRpe) > 0 &&
            loggedTier != null &&
            loggedLabel;
          return (
            <React.Fragment key={`${g.range.start}-${g.range.end}-${idx}`}>
              <div className={styles.setline}>
                <span className={styles.sn}>{rangeLabel}</span>
                <span className={styles.sv}>
                  {g.reps} × {wLabel}
                  {Number(g.weight) > 0 ? " kg" : ""}
                </span>
                {readOnly ? (
                  hasLogged ? (
                    <span className={styles.eff}>
                      <span className={cn(styles.effA, TIER_CLASS[loggedTier!])}>
                        {loggedLabel}
                      </span>
                    </span>
                  ) : (
                    <span className={styles.eff} />
                  )
                ) : (
                  <EffortCell
                    prescribedRir={g.prescribedRir}
                    loggedRpe={g.loggedRpe}
                    setLogIds={g.setLogIds}
                    ratingTargetId={props.ratingTargetId}
                    onTapNa={props.onTapNa}
                    ratingBusy={props.ratingBusy}
                  />
                )}
              </div>
              {isOpen ? (
                <div className={effortStyles.promptBlock}>
                  <p className={effortStyles.promptLabel}>How hard was that?</p>
                  <SetEffortPicker
                    currentRPE={null}
                    disabled={props.ratingBusy}
                    onSelect={(rpe) => props.onRate(g.setLogIds, rpe)}
                  />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
      {props.footNotes.map((n) => (
        <div key={n} className={styles.exfoot}>
          {n}
        </div>
      ))}
    </>
  );
}

export function buildLinesForRow(
  row: {
    blockType: string;
    sets: import("./workoutSetLogTypes").WorkoutSetLog[];
    exerciseId: string | null;
  },
  prs: Array<{
    exercise_id?: string;
    record_type?: string;
    record_value?: number | string;
  }>,
  prescribed?: PrescribedRirMap,
): CompressLine[] {
  if (!row.exerciseId) return [];
  return buildCompressLinesForExercise(
    row.blockType,
    row.sets,
    row.exerciseId,
    prLinePredicate(row.exerciseId, prs),
    prescribed,
  );
}

export function collapseFootnote(lines: CompressLine[]): string | null {
  const groups = compressSets(lines);
  if (groups.length !== 1 || groups[0].count < 2) return null;
  const g = groups[0];
  const noRx = g.prescribedRir == null;
  if (noRx) {
    return `same across all ${g.count} sets · no effort prescribed`;
  }
  return `same across all ${g.count} sets`;
}

/** History / log-detail footnote: collapse note + not-rated (no N/A column). */
export function historySetFootnote(lines: CompressLine[]): string | null {
  if (lines.length === 0) return null;
  const groups = compressSets(lines);
  const parts: string[] = [];
  if (groups.length === 1 && groups[0].count >= 2) {
    parts.push(`same across all ${groups[0].count} sets`);
  }
  const allUnrated = lines.every(
    (l) => l.loggedRpe == null || !(Number(l.loggedRpe) > 0),
  );
  if (allUnrated) parts.push("not rated");
  return parts.length ? parts.join(" · ") : null;
}
