import type { SupabaseClient } from '@supabase/supabase-js'
import {
  mapWorkoutCanvasRpcToCanvasWorkout,
  type WorkoutCanvasRpcPayload,
} from '@/lib/groupModel/canvasLoadRpcMapper'
import type { CanvasWorkout } from '@/lib/groupModel/canvasTypes'

/** Load one program_instance_workouts row + group model (one RPC). */
export async function loadInstanceWorkoutForCanvas(
  supabase: SupabaseClient,
  instanceWorkoutId: string,
): Promise<CanvasWorkout | null> {
  const { data, error } = await supabase.rpc('get_instance_workout_canvas', {
    p_program_instance_workout_id: instanceWorkoutId,
  })

  if (error) {
    console.error('[loadInstanceWorkoutForCanvas] get_instance_workout_canvas:', error.message)
    return null
  }

  return mapWorkoutCanvasRpcToCanvasWorkout(data as WorkoutCanvasRpcPayload | null, {
    defaultKind: 'program_day',
  })
}

export interface InstancePhaseRow {
  id: string
  name: string
  duration_weeks: number
  phase_order: number
  phase_label: string | null
  notes: string | null
}

export interface InstanceWorkoutSummary {
  id: string
  name: string
  estimated_duration: number | null
}

/** Load instance phases for an assignment (N = sum of duration_weeks). */
export async function loadInstancePhases(
  supabase: SupabaseClient,
  assignmentId: string,
): Promise<InstancePhaseRow[]> {
  const { data, error } = await supabase
    .from('program_instance_phases')
    .select('id, name, duration_weeks, phase_order, phase_label, notes')
    .eq('program_assignment_id', assignmentId)
    .order('phase_order', { ascending: true })
  if (error) {
    console.error('[loadInstancePhases]', error.message)
    return []
  }
  return (data ?? []) as InstancePhaseRow[]
}

/** All instance workouts owned by this assignment (for schedule picker). */
export async function loadInstanceWorkoutsForAssignment(
  supabase: SupabaseClient,
  assignmentId: string,
): Promise<InstanceWorkoutSummary[]> {
  const { data, error } = await supabase
    .from('program_instance_workouts')
    .select('id, name, estimated_duration')
    .eq('program_assignment_id', assignmentId)
    .order('name', { ascending: true })
  if (error) {
    console.error('[loadInstanceWorkoutsForAssignment]', error.message)
    return []
  }
  return (data ?? []) as InstanceWorkoutSummary[]
}
