import type { PrescribedTimeBlockReference, WorkoutLogBlock } from "@/types/workoutLog";

type Props = {
  block: WorkoutLogBlock;
  prescribed?: PrescribedTimeBlockReference | null;
};

function sumReps(block: WorkoutLogBlock): number {
  return block.sets.reduce(
    (sum, setLog) => sum + (setLog.reps ?? setLog.amrap_total_reps ?? setLog.fortime_total_reps ?? 0),
    0
  );
}

export function WorkoutLogTimeBlockSummary({ block, prescribed }: Props) {
  const rounds = block.roundCount ?? Math.max(0, ...block.sets.map((setLog) => setLog.round_number ?? 0));
  const totalReps = sumReps(block);

  const prescribedRounds = prescribed?.prescribedRounds;
  const prescribedDuration = prescribed?.prescribedDurationSeconds;
  const prescribedRepsPer = prescribed?.prescribedRepsPerRound;
  const prescribedTarget = prescribed?.prescribedTargetReps;
  const prescribedCap = prescribed?.prescribedTimeCapSeconds;

  const prescribedParts: string[] = [];
  if (prescribedRounds != null) prescribedParts.push(`${prescribedRounds} rounds`);
  if (prescribedDuration != null) prescribedParts.push(`${prescribedDuration}s`);
  if (prescribedRepsPer != null) prescribedParts.push(`${prescribedRepsPer} reps/round`);
  if (prescribedTarget != null) prescribedParts.push(`${prescribedTarget} target reps`);
  if (prescribedCap != null) prescribedParts.push(`cap ${prescribedCap}s`);
  const prescribedSummary = prescribedParts.length ? prescribedParts.join(" · ") : null;

  const actualParts: string[] = [];
  if (rounds) actualParts.push(`${rounds} rounds`);
  actualParts.push(`${totalReps} total reps`);
  const actualSummary = actualParts.join(" · ");

  const prescribedLeft =
    prescribed?.headerSummary?.trim() || prescribedSummary || null;

  if (prescribed && prescribedLeft) {
    return (
      <div className="rounded-xl border border-[color:var(--fc-glass-border)] p-3 text-sm space-y-2">
        <div className="grid grid-cols-[1fr_1fr] gap-2 text-xs fc-text-dim font-medium">
          <span>Prescribed</span>
          <span className="text-right">Actual</span>
        </div>
        <div className="grid grid-cols-[1fr_1fr] gap-2 text-sm">
          <p className="fc-text-dim tabular-nums min-w-0 break-words">{prescribedLeft}</p>
          <p className="fc-text-primary font-medium text-right tabular-nums min-w-0 break-words">{actualSummary}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[color:var(--fc-glass-border)] p-3 text-sm space-y-1">
      <p className="fc-text-primary font-medium tabular-nums">
        {rounds ? `${rounds} rounds` : "Rounds: —"} · {totalReps} total reps
      </p>
    </div>
  );
}
