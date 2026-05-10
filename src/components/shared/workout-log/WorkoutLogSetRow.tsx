import { cn } from "@/lib/utils";
import {
  formatActualStrengthLine,
  formatPrescribedStrengthLine,
} from "@/lib/workoutLog/prescribedWorkoutReference";
import type { PrescribedSetReference, WorkoutLogBlockType, WorkoutLogSet } from "@/types/workoutLog";

type Props = {
  set: WorkoutLogSet;
  /** Zero-based row position within the block; used when `set_number` is null. */
  rowIndex: number;
  setType: WorkoutLogBlockType;
  prescribed?: PrescribedSetReference | null;
  /** When true, row is # | prescribed | actual (no per-cell labels). */
  twoColumn?: boolean;
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

export function WorkoutLogSetRow({ set, rowIndex, setType, prescribed, twoColumn }: Props) {
  const displaySetNumber = set.set_number != null ? set.set_number : rowIndex + 1;

  const setNumberCell = (
    <span
      className={cn(
        "inline-flex min-w-[1.75rem] h-8 items-center justify-center rounded-lg font-semibold tabular-nums text-sm",
        "bg-[color:var(--fc-glass-border)]/40 text-[color:var(--fc-text-primary)] border border-[color:var(--fc-glass-border)]"
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
    return (
      <div className="grid grid-cols-[2.25rem_1fr_1fr] gap-2 py-2 px-2 rounded-lg text-sm border border-[color:var(--fc-glass-border)] items-start">
        {setNumberCell}
        <p className="fc-text-dim tabular-nums min-w-0 break-words">{prescribedLine ?? "—"}</p>
        <p className={cn("font-medium tabular-nums text-right min-w-0 break-words", outcomeClass(prescribed?.outcome))}>
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
