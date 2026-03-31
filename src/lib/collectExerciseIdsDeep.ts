/**
 * Recursively collect exercise UUIDs from workout block trees (RPC JSON, mapped
 * WorkoutSetEntry[], or nested form state). Used so batch `exercises` lookups
 * include every set type — not only rows under `block.exercises`.
 *
 * Only whitelisted keys are collected so we never pull `template_id`, `client_id`, etc.
 */

const EXERCISE_ID_KEYS = new Set([
  "exercise_id",
  "override_exercise_id",
  "superset_exercise_id",
  "compound_exercise_id",
  "preexhaust_isolation_exercise_id",
  "preexhaust_compound_exercise_id",
]);

export function collectExerciseIdsDeep(root: unknown): string[] {
  const out = new Set<string>();

  const walk = (v: unknown): void => {
    if (v == null) return;
    if (Array.isArray(v)) {
      for (const item of v) walk(item);
      return;
    }
    if (typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    for (const [k, val] of Object.entries(o)) {
      if (EXERCISE_ID_KEYS.has(k) && typeof val === "string" && val.length > 0) {
        out.add(val);
      }
      walk(val);
    }
  };

  walk(root);
  return Array.from(out);
}
