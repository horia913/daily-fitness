/**
 * Canonical client start for program workouts — all Home / Train entry points use this.
 * POST /api/program-workouts/start-from-progress → navigate to live screen.
 */

export type StartProgramWorkoutErrorCode =
  | "WEEK_LOCKED"
  | "ALREADY_COMPLETED"
  | "TIMEOUT"
  | "UNKNOWN";

export type StartProgramWorkoutResult =
  | { ok: true; workoutAssignmentId: string }
  | {
      ok: false;
      error: string;
      code: StartProgramWorkoutErrorCode;
      message?: string;
    };

export type StartProgramWorkoutOptions = {
  /** program_day_assignments.id — omit to use server's next incomplete slot */
  programDayAssignmentId?: string | null;
  signal?: AbortSignal;
  /** When false, returns assignment id without navigating (tests / callers that route themselves) */
  navigate?: boolean;
};

export async function startProgramWorkout(
  options: StartProgramWorkoutOptions = {},
): Promise<StartProgramWorkoutResult> {
  const body: Record<string, string> = {};
  if (options.programDayAssignmentId) {
    body.program_day_assignment_id = options.programDayAssignmentId;
  }

  let response: Response;
  try {
    response = await fetch("/api/program-workouts/start-from-progress", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Request timed out", code: "TIMEOUT" };
    }
    throw err;
  }

  const data = (await response.json().catch(() => ({}))) as {
    workout_assignment_id?: string;
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    const code: StartProgramWorkoutErrorCode =
      data.error === "WEEK_LOCKED"
        ? "WEEK_LOCKED"
        : response.status === 409
          ? "ALREADY_COMPLETED"
          : "UNKNOWN";
    return {
      ok: false,
      error: data.error || data.message || "Could not start workout",
      code,
      message: data.message,
    };
  }

  const workoutAssignmentId = data.workout_assignment_id;
  if (!workoutAssignmentId) {
    return { ok: false, error: "No workout assignment returned", code: "UNKNOWN" };
  }

  if (options.navigate !== false) {
    // Explicit start intent: skip the pre-start summary gate.
    window.location.href = `/client/workouts/${workoutAssignmentId}/start?start=1`;
  }

  return { ok: true, workoutAssignmentId };
}
