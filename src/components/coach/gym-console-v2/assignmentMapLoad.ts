'use client'

/**
 * Load assignment map data for gym-console-v2 (Piece 3A).
 * Full PDA schedule + completions + next-due + instance phases — not the current-week-only RPC.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getActiveProgramAssignment,
  getNextSlot,
} from '@/lib/programStateService'
import { loadInstancePhases } from '@/lib/programInstance/instanceCanvasLoad'
import type { TrainingBlock } from '@/types/trainingBlock'

export type AssignmentMapSlot = {
  id: string
  week_number: number
  program_day: number
  template_id: string | null
  program_instance_workout_id: string | null
  template_name: string | null
  is_optional: boolean
}

export type AssignmentMapData = {
  assignmentId: string
  programId: string
  slots: AssignmentMapSlot[]
  completedPdaIds: Set<string>
  nextDuePdaId: string | null
  nextDueWeek: number | null
  nextDueProgramDay: number | null
  blocks: TrainingBlock[]
}

function mapPhaseToBlock(
  phase: {
    id: string
    name: string
    duration_weeks: number
    phase_order: number
    phase_label: string | null
    notes: string | null
  },
  programId: string,
): TrainingBlock {
  return {
    id: phase.id,
    program_id: programId,
    name: phase.name,
    duration_weeks: phase.duration_weeks,
    block_order: phase.phase_order,
    phase_label: phase.phase_label,
    notes: phase.notes,
  }
}

export async function resolveAssignmentId(
  supabase: SupabaseClient,
  opts: { clientId?: string | null; assignmentId?: string | null },
): Promise<{ assignmentId: string; programId: string } | null> {
  if (opts.assignmentId?.trim()) {
    const { data, error } = await supabase
      .from('program_assignments')
      .select('id, program_id, status')
      .eq('id', opts.assignmentId.trim())
      .maybeSingle()
    if (error || !data?.id || !data.program_id) return null
    return { assignmentId: data.id, programId: data.program_id }
  }
  if (opts.clientId?.trim()) {
    const active = await getActiveProgramAssignment(supabase, opts.clientId.trim())
    if (!active?.id || !active.program_id) return null
    return { assignmentId: active.id, programId: active.program_id }
  }
  return null
}

export async function loadAssignmentMapData(
  supabase: SupabaseClient,
  opts: { clientId?: string | null; assignmentId?: string | null },
): Promise<AssignmentMapData | null> {
  const resolved = await resolveAssignmentId(supabase, opts)
  if (!resolved) return null

  const { assignmentId, programId } = resolved

  const [pdaRes, completionsRes, nextSlot, phases] = await Promise.all([
    supabase
      .from('program_day_assignments')
      .select(
        'id, week_number, program_day, workout_template_id, program_instance_workout_id, name, is_optional, day_type',
      )
      .eq('program_assignment_id', assignmentId)
      .order('week_number', { ascending: true })
      .order('program_day', { ascending: true }),
    supabase
      .from('program_day_completions')
      .select('program_day_assignment_id, notes')
      .eq('program_assignment_id', assignmentId),
    getNextSlot(supabase, assignmentId, programId),
    loadInstancePhases(supabase, assignmentId),
  ])

  if (pdaRes.error) {
    console.error('[loadAssignmentMapData] PDA:', pdaRes.error.message)
    throw pdaRes.error
  }
  if (completionsRes.error) {
    console.error('[loadAssignmentMapData] completions:', completionsRes.error.message)
    throw completionsRes.error
  }

  const completedPdaIds = new Set<string>()
  for (const row of completionsRes.data ?? []) {
    const notes = row.notes ?? ''
    if (notes.startsWith('Skipped by coach')) continue
    if (row.program_day_assignment_id) completedPdaIds.add(row.program_day_assignment_id)
  }

  const nameByInstanceId = new Map<string, string>()
  const instanceIds = [
    ...new Set(
      (pdaRes.data ?? [])
        .map((r) => r.program_instance_workout_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  if (instanceIds.length > 0) {
    const { data: workouts } = await supabase
      .from('program_instance_workouts')
      .select('id, name')
      .in('id', instanceIds)
    for (const w of workouts ?? []) {
      if (w?.id && w?.name) nameByInstanceId.set(w.id, w.name)
    }
  }

  const slots: AssignmentMapSlot[] = (pdaRes.data ?? [])
    .filter((row) => row.day_type !== 'rest')
    .map((row) => {
      const instanceId = row.program_instance_workout_id ?? null
      const masterId = row.workout_template_id ?? null
      return {
        id: row.id,
        week_number: Number(row.week_number) || 1,
        program_day: Number(row.program_day) || 1,
        template_id: masterId,
        program_instance_workout_id: instanceId,
        template_name:
          (instanceId ? nameByInstanceId.get(instanceId) : null) ??
          (typeof row.name === 'string' ? row.name : null),
        is_optional: Boolean(row.is_optional),
      }
    })

  const blocks = phases.map((p) => mapPhaseToBlock(p, programId))

  return {
    assignmentId,
    programId,
    slots,
    completedPdaIds,
    nextDuePdaId: nextSlot?.program_day_assignment_id ?? nextSlot?.id ?? null,
    nextDueWeek: nextSlot?.week_number ?? null,
    nextDueProgramDay: nextSlot?.day_number ?? null,
    blocks,
  }
}

export type AssignmentDayStatus = 'rest' | 'done' | 'missed' | 'upcoming' | 'nextDue'

/** Sequence-relative status: past vs next-due in program order (multi-week safe). */
export function getAssignmentDayStatus(opts: {
  hasWorkout: boolean
  isCompleted: boolean
  scheduleId: string | null
  weekNumber: number
  programDay: number
  nextDuePdaId: string | null
  nextDueWeek: number | null
  nextDueProgramDay: number | null
}): AssignmentDayStatus {
  if (!opts.hasWorkout) return 'rest'
  if (opts.isCompleted) return 'done'
  if (opts.scheduleId && opts.nextDuePdaId && opts.scheduleId === opts.nextDuePdaId) {
    return 'nextDue'
  }
  if (opts.nextDueWeek != null && opts.nextDueProgramDay != null) {
    const beforeNext =
      opts.weekNumber < opts.nextDueWeek ||
      (opts.weekNumber === opts.nextDueWeek && opts.programDay < opts.nextDueProgramDay)
    if (beforeNext) return 'missed'
  }
  return 'upcoming'
}
