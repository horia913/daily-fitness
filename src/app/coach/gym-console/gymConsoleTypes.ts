export interface ClientStatus {
  clientId: string;
  clientName: string;
  programName: string | null;
  programAssignmentId: string | null;
  currentWeek: number | null;
  currentDay: number | null;
  nextWorkout: {
    workoutName: string;
    templateId: string;
    scheduleId: string;
    programAssignmentId: string;
    blockCount: number;
    exerciseCount: number;
  } | null;
  activeSession: {
    sessionId: string;
    workoutLogId: string;
    workoutAssignmentId: string;
    templateName: string | null;
    setsLogged: number;
    startedAt: string;
    currentBlock: number;
    currentExercise: string;
    currentSet: string;
    lastSetLoggedAt: string;
    isIdle: boolean;
  } | null;
  status: "active_session" | "idle_session" | "no_session" | "no_program" | "program_completed";
}

export interface ClientForModal {
  client_id: string;
  coach_id: string;
  status: string;
  profiles?: { id: string; first_name?: string; last_name?: string; email?: string };
}

export interface BlockExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  sets?: number;
  reps?: string;
  weight_kg?: number;
}

export interface WorkoutBlock {
  id: string;
  set_type?: string;
  set_name?: string;
  block_type?: string;
  block_name?: string;
  set_order?: number;
  exercises: BlockExercise[];
}

export interface NextWorkoutResponse {
  status: "active" | "completed" | "no_program";
  client_name?: string;
  program_name?: string;
  position_label?: string;
  workout_name?: string;
  blocks?: WorkoutBlock[];
  template_id?: string;
  [key: string]: unknown;
}
