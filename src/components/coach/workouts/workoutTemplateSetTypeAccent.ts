export type WorkoutTemplateSetAccent = "cyan" | "purple" | "warning" | "good";

export function workoutTemplateSetTypeAccent(
  setType: string | undefined | null,
): WorkoutTemplateSetAccent {
  const t = (setType || "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (t === "straight_set" || t === "straight") return "cyan";
  if (t === "cluster_set" || t === "rest_pause") return "purple";
  if (
    t === "drop_set" ||
    t === "superset" ||
    t === "giant_set" ||
    t === "pre_exhaustion" ||
    t === "pre_exhaust"
  ) {
    return "warning";
  }
  if (
    t === "amrap" ||
    t === "emom" ||
    t === "emom_reps" ||
    t === "for_time" ||
    t === "tabata" ||
    t === "speed_work" ||
    t === "endurance" ||
    t === "timed_set"
  ) {
    return "good";
  }
  return "cyan";
}
