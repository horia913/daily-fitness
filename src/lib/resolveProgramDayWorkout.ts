/**
 * Resolve program day assignment → workout content (master template vs instance workout).
 * Used by program start paths after the instance-key migration (program_day_assignments.id).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type ProgramScheduleSlot,
  type ProgramState,
  programDayAssignmentToScheduleSlot,
} from '@/lib/programStateService'

export interface ProgramDayAssignmentRow {
  id: string
  program_assignment_id: string
  day_type: string
  day_number: number
  program_day: number | null
  week_number: number | null
  workout_template_id: string | null
  program_instance_workout_id: string | null
  workout_assignment_id: string | null
  name: string | null
  description: string | null
  is_optional?: boolean | null
}

export interface ProgramDayWorkoutMeta {
  displayName: string
  description: string | null
  estimatedDuration: number
  coachId: string
  /** FK-safe value for workout_assignments.workout_template_id (master template only). */
  assignmentTemplateId: string | null
  /** Id passed to block loaders (master template or instance workout). */
  contentId: string
  contentKind: 'master_template' | 'instance_workout'
  programInstanceWorkoutId: string | null
  workoutTemplateId: string | null
}

export type ResolveChosenSlotResult =
  | { ok: true; chosenSlot: ProgramScheduleSlot; programDayAssignmentId: string }
  | { ok: false; status: number; error: string; message: string }

const PDA_SELECT =
  'id, program_assignment_id, day_type, day_number, program_day, week_number, workout_template_id, program_instance_workout_id, workout_assignment_id, name, description, is_optional'

/**
 * Validate requested program_day_assignments.id against the client's active assignment.
 * Builds a ProgramScheduleSlot from the instance row (does not use master program_schedule).
 */
export async function validateAndResolveProgramDaySlot(
  supabaseAdmin: SupabaseClient,
  clientId: string,
  requestedDayAssignmentId: string | null,
  state: ProgramState,
): Promise<ResolveChosenSlotResult> {
  if (!state.assignment) {
    return {
      ok: false,
      status: 404,
      error: 'No active program',
      message: 'No active program assignment found',
    }
  }

  const programAssignmentId = state.assignment.id
  const programId = state.assignment.program_id

  if (!requestedDayAssignmentId) {
    const chosenSlot = state.nextSlot
    if (!chosenSlot) {
      return {
        ok: false,
        status: 409,
        error: 'Program completed',
        message: 'All program workouts have been completed',
      }
    }
    return { ok: true, chosenSlot, programDayAssignmentId: chosenSlot.id }
  }

  const { data: pda, error: pdaErr } = await supabaseAdmin
    .from('program_day_assignments')
    .select(PDA_SELECT)
    .eq('id', requestedDayAssignmentId)
    .maybeSingle()

  if (pdaErr) {
    console.error('[resolveProgramDayWorkout] program_day_assignments lookup:', pdaErr)
    return {
      ok: false,
      status: 500,
      error: 'Database error',
      message: 'Failed to load program day assignment',
    }
  }

  if (!pda) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid slot',
      message: 'The selected schedule slot does not belong to this program',
    }
  }

  if (pda.program_assignment_id !== programAssignmentId) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid slot',
      message: 'The selected schedule slot does not belong to this program',
    }
  }

  const { data: paRow } = await supabaseAdmin
    .from('program_assignments')
    .select('id, client_id, status')
    .eq('id', programAssignmentId)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()

  if (!paRow) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid slot',
      message: 'The selected schedule slot does not belong to this program',
    }
  }

  if (pda.day_type !== 'workout') {
    return {
      ok: false,
      status: 400,
      error: 'Invalid workout type',
      message: 'This program day is not a workout day',
    }
  }

  const completedKeys = new Set(
    state.completedSlots.map((c) => c.program_day_assignment_id),
  )
  if (completedKeys.has(pda.id)) {
    return {
      ok: false,
      status: 409,
      error: 'Slot already completed',
      message: 'This program day has already been completed',
    }
  }

  const fromState = state.slots.find((s) => s.id === pda.id)
  const chosenSlot =
    fromState ?? programDayAssignmentToScheduleSlot(pda as ProgramDayAssignmentRow, programId)

  return { ok: true, chosenSlot, programDayAssignmentId: pda.id }
}

/** Resolve display + assignment metadata from a program_day_assignments row. */
export async function resolveProgramDayWorkoutMeta(
  supabase: SupabaseClient,
  pda: Pick<
    ProgramDayAssignmentRow,
    | 'program_assignment_id'
    | 'workout_template_id'
    | 'program_instance_workout_id'
    | 'name'
    | 'description'
  >,
): Promise<ProgramDayWorkoutMeta | null> {
  const instanceId = pda.program_instance_workout_id?.trim() || null
  const masterTemplateId = pda.workout_template_id?.trim() || null

  const { data: paRow } = await supabase
    .from('program_assignments')
    .select('coach_id')
    .eq('id', pda.program_assignment_id)
    .maybeSingle()

  if (!paRow?.coach_id) return null

  if (instanceId) {
    const { data: piw } = await supabase
      .from('program_instance_workouts')
      .select('id, name, description, estimated_duration, source_template_id')
      .eq('id', instanceId)
      .maybeSingle()

    if (!piw) return null

    return {
      displayName: pda.name?.trim() || piw.name || 'Workout',
      description: pda.description ?? piw.description ?? null,
      estimatedDuration: piw.estimated_duration ?? 60,
      coachId: paRow.coach_id,
      assignmentTemplateId: masterTemplateId ?? piw.source_template_id ?? null,
      contentId: instanceId,
      contentKind: 'instance_workout',
      programInstanceWorkoutId: instanceId,
      workoutTemplateId: masterTemplateId,
    }
  }

  if (!masterTemplateId) return null

  const { data: template } = await supabase
    .from('workout_templates')
    .select('id, name, description, estimated_duration, coach_id')
    .eq('id', masterTemplateId)
    .maybeSingle()

  if (!template) return null

  return {
    displayName: pda.name?.trim() || template.name || 'Workout',
    description: pda.description ?? template.description ?? null,
    estimatedDuration: template.estimated_duration ?? 60,
    coachId: template.coach_id ?? paRow.coach_id,
    assignmentTemplateId: masterTemplateId,
    contentId: masterTemplateId,
    contentKind: 'master_template',
    programInstanceWorkoutId: null,
    workoutTemplateId: masterTemplateId,
  }
}

export async function fetchProgramDayAssignmentById(
  supabase: SupabaseClient,
  programDayAssignmentId: string,
): Promise<ProgramDayAssignmentRow | null> {
  const { data, error } = await supabase
    .from('program_day_assignments')
    .select(PDA_SELECT)
    .eq('id', programDayAssignmentId)
    .maybeSingle()

  if (error) {
    console.error('[resolveProgramDayWorkout] fetchProgramDayAssignmentById:', error)
    return null
  }
  return (data as ProgramDayAssignmentRow | null) ?? null
}
