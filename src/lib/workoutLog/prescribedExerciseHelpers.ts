/**
 * Pure helpers for prescribed exercise rows (template / workout_set_entry_exercises).
 * Kept separate from coachWorkoutAdherence to avoid pulling clientProgressionService → supabase in Jest.
 */

export type PrescribedExerciseRow = {
  exercise_id: string;
  reps?: string | null;
  weight_kg?: number | string | null;
  load_percentage?: number | string | null;
  /** Prescribed intensity — stored in `rir` column in DB. */
  rir?: number | string | null;
};

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function numInt(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

/** Parse reps range string (e.g. "10-12" or "10") to min/max — mirror clientProgressionService. */
export function parseRepsRange(repsString: string | null | undefined): {
  min: number;
  max: number;
} | null {
  if (!repsString || typeof repsString !== "string") return null;
  const trimmed = repsString.trim();
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-").map((p) => p.trim());
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const max = parseInt(parts[1], 10);
      if (!isNaN(min) && !isNaN(max) && min <= max) {
        return { min, max };
      }
    }
  }
  const single = parseInt(trimmed, 10);
  if (!isNaN(single) && single > 0) {
    return { min: single, max: single };
  }
  return null;
}

export function prescribedRpe(pe: PrescribedExerciseRow): number | null {
  return numInt(pe.rir);
}

export function repsTargetMin(pe: PrescribedExerciseRow): number | null {
  const raw = pe.reps;
  if (raw === null || raw === undefined) return null;
  const r = parseRepsRange(typeof raw === "string" ? raw : String(raw));
  return r ? r.min : null;
}

export function prescribedWeightKg(pe: PrescribedExerciseRow): number | null {
  const w = num(pe.weight_kg);
  if (w !== null && w > 0) return w;
  const lp = num(pe.load_percentage);
  if (lp !== null) return null;
  return null;
}

export function hasAnyPrescription(pe: PrescribedExerciseRow): boolean {
  const r = repsTargetMin(pe);
  const w = prescribedWeightKg(pe);
  const p = prescribedRpe(pe);
  return r !== null || w !== null || p !== null;
}

export function buildPrescriptionMaps(
  setEntries: Array<{ id: string; set_type: string }>,
  exercises: Array<PrescribedExerciseRow & { set_entry_id: string }>
): {
  bySetEntry: Map<string, Map<string, PrescribedExerciseRow>>;
  setTypeByEntry: Map<string, string>;
} {
  const setTypeByEntry = new Map<string, string>();
  for (const e of setEntries) {
    setTypeByEntry.set(e.id, String(e.set_type || "").toLowerCase());
  }
  const bySetEntry = new Map<string, Map<string, PrescribedExerciseRow>>();
  for (const row of exercises) {
    const sid = row.set_entry_id;
    if (!bySetEntry.has(sid)) bySetEntry.set(sid, new Map());
    bySetEntry.get(sid)!.set(row.exercise_id, row);
  }
  return { bySetEntry, setTypeByEntry };
}
