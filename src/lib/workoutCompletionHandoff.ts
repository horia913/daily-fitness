/**
 * Completion summary handoff — serialize live workout state so
 * /client/workouts/[id]/complete can render instantly, while
 * /api/complete-workout runs in the background.
 */

import type { LoggedSet, LiveWorkoutSetEntry } from "@/types/workoutSetEntries";
import { prescribedKey } from "@/components/client-workout-complete/setLinesFromLogs";

export const COMPLETION_HANDOFF_KEY = "df_workout_completion_handoff_v1";

/** Survives React Strict Mode remount (soft nav) when sessionStorage was cleared too early. */
let stickyHandoff: WorkoutCompletionHandoff | null = null;

/** Serializable set log shape matching complete-page WorkoutSetLog fields. */
export type HandoffSetLog = {
  id: string;
  workout_log_id: string;
  set_entry_id: string;
  set_type: string;
  exercise_id: string | null;
  weight: number | null;
  reps: number | null;
  set_number: number | null;
  completed_at: string;
  rpe?: number | null;
  dropset_initial_weight?: number | null;
  dropset_initial_reps?: number | null;
  dropset_final_weight?: number | null;
  dropset_final_reps?: number | null;
  dropset_percentage?: number | null;
  superset_exercise_a_id?: string | null;
  superset_weight_a?: number | null;
  superset_reps_a?: number | null;
  superset_exercise_b_id?: string | null;
  superset_weight_b?: number | null;
  superset_reps_b?: number | null;
  amrap_total_reps?: number | null;
  fortime_total_reps?: number | null;
  actual_time_seconds?: number | null;
  actual_duration_seconds?: number | null;
  actual_distance_meters?: number | null;
  actual_hr_avg?: number | null;
  actual_speed_kmh?: number | null;
  exercises?: { id: string; name: string };
};

export type HandoffBlockGroup = {
  set_entry_id: string;
  set_type: string;
  set_name: string;
  set_order: number;
  sets: HandoffSetLog[];
  /** Serializable Map substitute */
  exerciseNames: Record<string, string>;
};

export type HandoffPr = {
  exercise_id?: string | null;
  exercise_name: string;
  record_type?: string;
  record_value?: number | null;
  exercises?: { id: string; name: string } | null;
};

export type WorkoutCompletionHandoff = {
  version: 1;
  createdAt: number;
  workoutLogId: string;
  sessionId: string | null;
  assignmentId: string;
  assignment: {
    id: string;
    workout_template_id: string | null;
    status: string;
    name?: string | null;
    notes?: string | null;
    scheduled_date?: string | null;
  };
  totals: {
    sets: number;
    reps: number;
    weight: number;
    durationMinutes: number;
  };
  blockGroups: HandoffBlockGroup[];
  /** Prescribed RPE keyed by `${set_entry_id}:${exercise_id}:${set_number}` */
  prescribedRpe: Array<[string, number | null]>;
  personalRecords: HandoffPr[];
  coachFirstName?: string | null;
};

function isCardioType(t: string | null | undefined): boolean {
  return t === "speed_work" || t === "endurance";
}

function completedAtIso(v: Date | string | undefined): string {
  if (!v) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function loggedSetToHandoff(
  s: LoggedSet & Record<string, unknown>,
  setType: string,
  workoutLogId: string,
  exerciseName?: string,
): HandoffSetLog {
  const eid = s.exercise_id || null;
  return {
    id: s.id,
    workout_log_id: workoutLogId,
    set_entry_id: s.set_entry_id,
    set_type: setType,
    exercise_id: eid,
    weight: s.weight_kg != null ? Number(s.weight_kg) : null,
    reps: s.reps_completed != null ? Number(s.reps_completed) : null,
    set_number: s.set_number ?? null,
    completed_at: completedAtIso(s.completed_at),
    rpe: s.rpe != null ? Number(s.rpe) : null,
    dropset_initial_weight:
      s.dropset_initial_weight != null
        ? Number(s.dropset_initial_weight)
        : null,
    dropset_initial_reps:
      s.dropset_initial_reps != null ? Number(s.dropset_initial_reps) : null,
    dropset_final_weight:
      s.dropset_final_weight != null ? Number(s.dropset_final_weight) : null,
    dropset_final_reps:
      s.dropset_final_reps != null ? Number(s.dropset_final_reps) : null,
    dropset_percentage:
      s.dropset_percentage != null ? Number(s.dropset_percentage) : null,
    amrap_total_reps:
      s.amrap_total_reps != null ? Number(s.amrap_total_reps) : null,
    fortime_total_reps:
      s.fortime_total_reps != null ? Number(s.fortime_total_reps) : null,
    actual_time_seconds: s.actual_time_seconds ?? null,
    actual_duration_seconds: s.actual_duration_seconds ?? null,
    actual_distance_meters: s.actual_distance_meters ?? null,
    actual_hr_avg: s.actual_hr_avg ?? null,
    actual_speed_kmh: s.actual_speed_kmh ?? null,
    exercises:
      eid && exerciseName
        ? { id: eid, name: exerciseName }
        : eid
          ? { id: eid, name: "Exercise" }
          : undefined,
  };
}

export function buildPrescribedRpeEntries(
  workoutSetEntries: LiveWorkoutSetEntry[],
): Array<[string, number | null]> {
  const map = new Map<string, number | null>();
  for (const live of workoutSetEntries) {
    const entryId = live.setEntry.id;
    for (const ex of live.setEntry.exercises ?? []) {
      const eid = ex.exercise_id;
      if (!eid) continue;
      const slotRpe =
        ex.rpe != null && Number(ex.rpe) > 0 ? Number(ex.rpe) : null;
      const prescriptions = ex.prescriptions ?? [];
      if (prescriptions.length > 0) {
        for (const rx of prescriptions) {
          const sn = Number(rx.set_number);
          if (!Number.isFinite(sn)) continue;
          const prescribed =
            rx.rpe != null && Number(rx.rpe) > 0
              ? Number(rx.rpe)
              : slotRpe;
          map.set(prescribedKey(entryId, eid, sn), prescribed);
        }
      } else if (slotRpe != null) {
        for (let sn = 1; sn <= 20; sn++) {
          map.set(prescribedKey(entryId, eid, sn), slotRpe);
        }
      }
    }
  }
  return Array.from(map.entries());
}

export function buildBlockGroupsFromLive(args: {
  workoutSetEntries: LiveWorkoutSetEntry[];
  loggedSetsBySetEntryId: Record<string, LoggedSet[]>;
  workoutLogId: string;
  exerciseLookup?: Record<string, { name: string }>;
}): HandoffBlockGroup[] {
  const {
    workoutSetEntries,
    loggedSetsBySetEntryId,
    workoutLogId,
    exerciseLookup = {},
  } = args;

  const groups: HandoffBlockGroup[] = [];

  for (const live of workoutSetEntries) {
    const entryId = live.setEntry.id;
    const logged = loggedSetsBySetEntryId[entryId] ?? live.existingSetLogs ?? [];
    if (logged.length === 0) continue;

    const setType = live.setEntry.set_type || "straight_set";
    const exerciseNames: Record<string, string> = {};
    for (const ex of live.setEntry.exercises ?? []) {
      const eid = ex.exercise_id;
      if (!eid) continue;
      const name =
        ex.exercise?.name ||
        exerciseLookup[eid]?.name ||
        "Exercise";
      exerciseNames[eid] = name;
    }

    const sets = logged.map((s) => {
      const name = s.exercise_id
        ? exerciseNames[s.exercise_id]
        : undefined;
      return loggedSetToHandoff(
        s as LoggedSet & Record<string, unknown>,
        setType,
        workoutLogId,
        name,
      );
    });

    groups.push({
      set_entry_id: entryId,
      set_type: setType,
      set_name: live.setEntry.set_name || `Set ${live.setEntry.set_order}`,
      set_order: live.setEntry.set_order ?? groups.length + 1,
      sets,
      exerciseNames,
    });
  }

  return groups.sort((a, b) => a.set_order - b.set_order);
}

export function computeLiveTotals(args: {
  workoutSetEntries: LiveWorkoutSetEntry[];
  loggedSetsBySetEntryId: Record<string, LoggedSet[]>;
  durationMinutes: number;
}): {
  sets: number;
  reps: number;
  weight: number;
  durationMinutes: number;
} {
  let sets = 0;
  let reps = 0;
  let weight = 0;

  for (const live of args.workoutSetEntries) {
    const setType = live.setEntry.set_type || "straight_set";
    const logged =
      args.loggedSetsBySetEntryId[live.setEntry.id] ??
      live.existingSetLogs ??
      [];
    for (const s of logged) {
      sets += 1;
      if (isCardioType(setType)) continue;
      const r = Number(s.reps_completed) || 0;
      const w = Number(s.weight_kg) || 0;
      reps += r;
      weight += w * r;
    }
  }

  return {
    sets,
    reps,
    weight,
    durationMinutes: args.durationMinutes,
  };
}

export type BuildHandoffInput = {
  workoutLogId: string;
  sessionId: string | null;
  assignment: {
    id: string;
    workout_template_id: string | null;
    status: string;
    name?: string | null;
    notes?: string | null;
    scheduled_date?: string | null;
  };
  workoutSetEntries: LiveWorkoutSetEntry[];
  loggedSetsBySetEntryId: Record<string, LoggedSet[]>;
  durationMinutes: number;
  personalRecords: HandoffPr[];
  exerciseLookup?: Record<string, { name: string }>;
  coachFirstName?: string | null;
};

export function buildWorkoutCompletionHandoff(
  input: BuildHandoffInput,
): WorkoutCompletionHandoff {
  const blockGroups = buildBlockGroupsFromLive({
    workoutSetEntries: input.workoutSetEntries,
    loggedSetsBySetEntryId: input.loggedSetsBySetEntryId,
    workoutLogId: input.workoutLogId,
    exerciseLookup: input.exerciseLookup,
  });
  const totals = computeLiveTotals({
    workoutSetEntries: input.workoutSetEntries,
    loggedSetsBySetEntryId: input.loggedSetsBySetEntryId,
    durationMinutes: input.durationMinutes,
  });

  return {
    version: 1,
    createdAt: Date.now(),
    workoutLogId: input.workoutLogId,
    sessionId: input.sessionId,
    assignmentId: input.assignment.id,
    assignment: {
      id: input.assignment.id,
      workout_template_id: input.assignment.workout_template_id,
      status: input.assignment.status,
      name: input.assignment.name ?? null,
      notes: input.assignment.notes ?? null,
      scheduled_date: input.assignment.scheduled_date ?? null,
    },
    totals,
    blockGroups,
    prescribedRpe: buildPrescribedRpeEntries(input.workoutSetEntries),
    personalRecords: input.personalRecords,
    coachFirstName: input.coachFirstName ?? null,
  };
}

export function writeCompletionHandoff(payload: WorkoutCompletionHandoff): void {
  stickyHandoff = payload;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(COMPLETION_HANDOFF_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("[completion-handoff] write failed", e);
  }
}

export function readCompletionHandoff(): WorkoutCompletionHandoff | null {
  if (stickyHandoff) {
    if (
      stickyHandoff.createdAt &&
      Date.now() - stickyHandoff.createdAt > 2 * 60 * 60 * 1000
    ) {
      stickyHandoff = null;
    } else {
      return stickyHandoff;
    }
  }
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(COMPLETION_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkoutCompletionHandoff;
    if (!parsed || parsed.version !== 1 || !parsed.workoutLogId) return null;
    // Stale after 2 hours — ignore
    if (
      parsed.createdAt &&
      Date.now() - parsed.createdAt > 2 * 60 * 60 * 1000
    ) {
      return null;
    }
    stickyHandoff = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCompletionHandoff(): void {
  stickyHandoff = null;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(COMPLETION_HANDOFF_KEY);
  } catch {
    /* ignore */
  }
}

/** Convert handoff block groups into runtime shape with Map exerciseNames. */
export function hydrateBlockGroupsFromHandoff(
  groups: HandoffBlockGroup[],
): Array<{
  set_entry_id: string;
  set_type: string;
  set_name: string;
  set_order: number;
  sets: HandoffSetLog[];
  exerciseNames: Map<string, string>;
}> {
  return groups.map((g) => ({
    set_entry_id: g.set_entry_id,
    set_type: g.set_type,
    set_name: g.set_name,
    set_order: g.set_order,
    sets: g.sets,
    exerciseNames: new Map(Object.entries(g.exerciseNames ?? {})),
  }));
}
