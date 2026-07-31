import { cn } from "@/lib/utils";
import {
  formatActualStrengthLine,
  formatPrescribedStrengthLine,
} from "@/lib/workoutLog/prescribedWorkoutReference";
import {
  clientEffortLabelFromStoredRpe,
  rpeToEffortTier,
  type EffortTier,
} from "@/lib/workoutEffortLabels";
import type { PrescribedSetReference, WorkoutLogBlockType, WorkoutLogSet } from "@/types/workoutLog";
import styles from "./workoutLogClientV6.module.css";

export type WorkoutLogViewVariant = "default" | "client";

type Props = {
  set: WorkoutLogSet;
  /** Zero-based row position within the block; used when `set_number` is null. */
  rowIndex: number;
  setType: WorkoutLogBlockType;
  prescribed?: PrescribedSetReference | null;
  /** When true, row is # | prescribed | actual (no per-cell labels). */
  twoColumn?: boolean;
  /** Client history skin (v6). Coach / default keeps prior layout. */
  variant?: WorkoutLogViewVariant;
};

function outcomeClass(outcome: PrescribedSetReference["outcome"] | undefined): string {
  switch (outcome) {
    case "hit":
      return "fc-text-primary";
    case "over":
      return "fc-text-warning";
    case "under":
      return "text-amber-600 dark:text-amber-400";
    case "miss":
    case "flag":
      return "fc-text-error";
    default:
      return "fc-text-primary";
  }
}

function formatWeight(w: number): string {
  if (!Number.isFinite(w)) return "—";
  if (Math.abs(w - Math.round(w)) < 0.01) return String(Math.round(w));
  return String(w);
}

/** Client grammar: `reps × weight` (reps first). */
function formatRepsTimesWeight(
  reps: number | null | undefined,
  weight: number | null | undefined,
): string {
  const hasReps = reps != null && Number.isFinite(Number(reps));
  const hasWeight = weight != null && Number.isFinite(Number(weight));
  if (!hasReps && !hasWeight) return "—";
  const r = hasReps ? String(Math.round(Number(reps))) : "—";
  const w = hasWeight ? formatWeight(Number(weight)) : "—";
  const kg = hasWeight && Number(weight) > 0 ? " kg" : "";
  return `${r} × ${w}${kg}`;
}

function formatClientActualLine(set: WorkoutLogSet, setType: WorkoutLogBlockType): string {
  if (setType === "superset") {
    const a = formatRepsTimesWeight(set.superset_reps_a, set.superset_weight_a);
    const b = formatRepsTimesWeight(set.superset_reps_b, set.superset_weight_b);
    const segs = [a, b].filter((s) => s !== "—");
    return segs.length ? segs.join(" + ") : "—";
  }
  if (setType === "giant_set" && set.giant_set_exercises?.length) {
    const segs = set.giant_set_exercises
      .map((g) => formatRepsTimesWeight(g.reps, g.weight))
      .filter((s) => s !== "—");
    return segs.length ? segs.join(" + ") : "—";
  }
  if (setType === "pre_exhaustion") {
    const iso = formatRepsTimesWeight(
      set.preexhaust_isolation_reps,
      set.preexhaust_isolation_weight,
    );
    const compound = formatRepsTimesWeight(
      set.preexhaust_compound_reps,
      set.preexhaust_compound_weight,
    );
    const segs = [iso, compound].filter((s) => s !== "—");
    return segs.length ? segs.join(" + ") : formatRepsTimesWeight(set.reps, set.weight);
  }
  return formatRepsTimesWeight(set.reps, set.weight);
}

const EFFORT_CLASS: Record<EffortTier, string> = {
  easy: styles.effortEasy,
  medium: styles.effortMedium,
  hard: styles.effortHard,
  max: styles.effortMax,
};

function EffortWord({ rpe }: { rpe: number | null | undefined }) {
  const tier = rpeToEffortTier(rpe);
  const label = clientEffortLabelFromStoredRpe(rpe);
  if (tier == null || !label) {
    return <span className={styles.effortMuted}>N/A</span>;
  }
  return <span className={EFFORT_CLASS[tier]}>{label}</span>;
}

export function WorkoutLogSetRow({
  set,
  rowIndex,
  setType,
  prescribed,
  twoColumn,
  variant = "default",
}: Props) {
  const displaySetNumber = set.set_number != null ? set.set_number : rowIndex + 1;

  if (variant === "client") {
    if (setType === "speed_work" || setType === "endurance") {
      const prescribedLine = prescribed?.prescribedLine ?? null;
      const actualParts = [
        set.actual_time_seconds != null ? `${set.actual_time_seconds}s` : null,
        set.actual_distance_meters != null ? `${set.actual_distance_meters}m` : null,
        set.actual_hr_avg != null ? `${set.actual_hr_avg} bpm` : null,
        set.actual_speed_kmh != null ? `${set.actual_speed_kmh} km/h` : null,
      ].filter(Boolean);
      const actualLine = actualParts.length ? actualParts.join(" · ") : "—";

      if (twoColumn) {
        return (
          <div className={cn(styles.setRow, styles.setRowTwoCol)}>
            <span className={styles.setNum}>{displaySetNumber}</span>
            <div className={styles.prescribed}>{prescribedLine ?? "—"}</div>
            <div className={styles.actualCell}>
              <span className={styles.actual}>{actualLine}</span>
              <EffortWord rpe={set.rpe} />
            </div>
          </div>
        );
      }

      return (
        <div className={styles.setRow}>
          <span className={styles.setNum}>{displaySetNumber}</span>
          <span className={styles.actual}>{actualLine}</span>
          <EffortWord rpe={set.rpe} />
        </div>
      );
    }

    const actualLine = formatClientActualLine(set, setType);
    const prescribedLine = prescribed ? formatPrescribedStrengthLine(prescribed) : null;

    if (twoColumn) {
      return (
        <div className={cn(styles.setRow, styles.setRowTwoCol)}>
          <span className={styles.setNum}>{displaySetNumber}</span>
          <p className={styles.prescribed}>{prescribedLine ?? "—"}</p>
          <div className={styles.actualCell}>
            <span className={cn(styles.actual, outcomeClass(prescribed?.outcome))}>
              {actualLine}
            </span>
            <EffortWord rpe={set.rpe} />
          </div>
        </div>
      );
    }

    return (
      <div className={styles.setRow}>
        <span className={styles.setNum}>{displaySetNumber}</span>
        <span className={styles.actual}>{actualLine}</span>
        <EffortWord rpe={set.rpe} />
      </div>
    );
  }

  const setNumberCell = (
    <span
      className={cn(
        "inline-flex min-w-[1.75rem] h-8 items-center justify-center rounded-lg font-semibold tabular-nums text-sm",
        "bg-[color:var(--fc-glass-border)]/40 text-[color:var(--fc-text-primary)] border border-[color:var(--fc-glass-border)]",
      )}
    >
      {displaySetNumber}
    </span>
  );

  if (setType === "speed_work" || setType === "endurance") {
    const prescribedLine = prescribed?.prescribedLine ?? null;
    const actualParts = [
      set.actual_time_seconds != null ? `${set.actual_time_seconds}s` : null,
      set.actual_distance_meters != null ? `${set.actual_distance_meters}m` : null,
      set.actual_hr_avg != null ? `${set.actual_hr_avg} bpm` : null,
      set.actual_speed_kmh != null ? `${set.actual_speed_kmh} km/h` : null,
    ].filter(Boolean);
    const actualLine = actualParts.length ? actualParts.join(" · ") : "—";

    if (twoColumn) {
      return (
        <div className="grid grid-cols-[2.25rem_1fr_1fr] gap-2 text-xs sm:text-sm py-2 px-2 rounded-lg border border-[color:var(--fc-glass-border)] items-center">
          {setNumberCell}
          <div className="fc-text-dim tabular-nums min-w-0 truncate">{prescribedLine ?? "—"}</div>
          <div className={cn("text-right tabular-nums min-w-0 truncate", outcomeClass(prescribed?.outcome))}>
            {actualLine}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-[2.25rem_1fr] gap-2 text-xs sm:text-sm py-2 px-2 rounded-lg border border-[color:var(--fc-glass-border)] items-center">
        {setNumberCell}
        <div className="tabular-nums text-right fc-text-primary min-w-0">{actualLine}</div>
      </div>
    );
  }

  const actualLine = formatActualStrengthLine(set, setType);
  const prescribedLine = prescribed ? formatPrescribedStrengthLine(prescribed) : null;

  if (twoColumn) {
    const infoBadge = prescribed?.informationalRowBadge;
    return (
      <div
        className={cn(
          "grid grid-cols-[2.25rem_1fr_1fr] gap-2 py-2 px-2 rounded-lg text-sm border items-start",
          infoBadge
            ? "border-[color:var(--fc-glass-border)]/50 bg-[color:var(--fc-glass-border)]/[0.06]"
            : "border-[color:var(--fc-glass-border)]",
        )}
      >
        <div className="flex flex-col items-center gap-1">
          {setNumberCell}
          {infoBadge ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-center fc-text-dim max-w-[5.5rem] leading-tight rounded px-1 py-0.5 border border-[color:var(--fc-glass-border)]/50">
              {infoBadge}
            </span>
          ) : null}
        </div>
        <p className="fc-text-dim tabular-nums min-w-0 break-words">{prescribedLine ?? "—"}</p>
        <p
          className={cn(
            "font-medium tabular-nums text-right min-w-0 break-words",
            outcomeClass(prescribed?.outcome),
            infoBadge && "fc-text-dim",
          )}
        >
          {actualLine}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[2.25rem_1fr] gap-2 py-2 px-2 rounded-lg text-sm border border-[color:var(--fc-glass-border)] items-start">
      {setNumberCell}
      <p className={cn("font-medium tabular-nums fc-text-primary min-w-0 break-words")}>{actualLine}</p>
    </div>
  );
}
