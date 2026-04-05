export type WorkoutStreakTierKey =
  | "starting"
  | "building"
  | "on_fire"
  | "unstoppable"
  | "legend";

export interface WorkoutStreakDisplay {
  tierKey: WorkoutStreakTierKey;
  label: string;
  flames: string;
  flameClass: string;
  accentClass: string;
  cardBorderClass: string;
  cardBgClass: string;
  pulseClass: string;
}

/**
 * Visual tier for workout streak (dashboard flame). Check-in streak uses separate copy.
 */
export function getWorkoutStreakDisplay(streakDays: number): WorkoutStreakDisplay | null {
  if (streakDays < 1) return null;

  if (streakDays <= 2) {
    return {
      tierKey: "starting",
      label: "Starting",
      flames: "🔥",
      flameClass: "text-zinc-400 opacity-80 text-sm",
      accentClass: "text-zinc-400",
      cardBorderClass: "border-l-zinc-400",
      cardBgClass: "bg-zinc-500/10 dark:bg-zinc-900/25",
      pulseClass: "",
    };
  }
  if (streakDays <= 6) {
    return {
      tierKey: "building",
      label: "Building",
      flames: "🔥",
      flameClass: "text-amber-500 text-base",
      accentClass: "text-amber-400",
      cardBorderClass: "border-l-amber-500",
      cardBgClass: "bg-amber-50 dark:bg-amber-900/20",
      pulseClass: "",
    };
  }
  if (streakDays <= 13) {
    return {
      tierKey: "on_fire",
      label: "On Fire",
      flames: "🔥",
      flameClass: "text-orange-500 text-lg drop-shadow-[0_0_8px_rgba(251,146,60,0.65)]",
      accentClass: "text-orange-400",
      cardBorderClass: "border-l-orange-500",
      cardBgClass: "bg-orange-500/10 dark:bg-orange-950/30",
      pulseClass: "animate-pulse",
    };
  }
  if (streakDays <= 29) {
    return {
      tierKey: "unstoppable",
      label: "Unstoppable",
      flames: "🔥🔥",
      flameClass: "text-red-500 text-lg",
      accentClass: "text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600",
      cardBorderClass: "border-l-red-500",
      cardBgClass: "bg-gradient-to-br from-orange-500/15 to-red-600/10 dark:from-orange-900/25 dark:to-red-950/20",
      pulseClass: "",
    };
  }
  return {
    tierKey: "legend",
    label: "Legend",
    flames: "🔥🔥🔥",
    flameClass: "text-amber-400 text-xl drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]",
    accentClass: "text-amber-300",
    cardBorderClass: "border-l-amber-400",
    cardBgClass: "bg-amber-500/15 dark:bg-amber-950/35",
    pulseClass: "animate-pulse",
  };
}
