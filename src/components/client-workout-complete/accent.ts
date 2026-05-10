import type { CompleteAccent } from "./types";

export function getCompleteAccent(input: {
  prCount: number;
  isFirstEverWorkout: boolean;
  skippedExerciseCount: number;
}): CompleteAccent {
  if (input.prCount >= 1) return "lime";
  if (input.isFirstEverWorkout) return "purple";
  if (input.skippedExerciseCount > 0) return "warning";
  return "cyan";
}

export function titleForAccent(accent: CompleteAccent): string {
  switch (accent) {
    case "lime":
      return "Crushed it.";
    case "purple":
      return "First one down.";
    case "warning":
      return "Logged.";
    default:
      return "Well done.";
  }
}
