import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeProgramType } from '@/lib/programs/stationBlockWeeks'
import { cloneProgramDraft } from '@/lib/programs/programDraftUtils'
import type { ProgramDraftState } from '@/types/programDraft'
import type { StationProgram } from '@/types/programStation'
import type { ProgramSchedule } from '@/lib/workoutTemplateService'
import type { TrainingBlock } from '@/types/trainingBlock'
import {
  loadInstancePhases,
  loadInstanceWorkoutForCanvas,
  type InstancePhaseRow,
} from '@/lib/programInstance/instanceCanvasLoad'
import { computeBlockWeekRanges } from '@/lib/programs/stationBlockWeeks'

function mapProgramRow(row: Record<string, unknown>, instanceTotalWeeks: number): StationProgram {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    description: (row.description as string) ?? '',
    coach_id: String(row.coach_id),
    difficulty_level: (row.difficulty_level as StationProgram['difficulty_level']) ?? 'intermediate',
    duration_weeks: instanceTotalWeeks > 0 ? instanceTotalWeeks : 4,
    target_audience: String(row.target_audience ?? 'general_fitness'),
    category: null,
    is_active: row.is_active !== false,
    type: normalizeProgramType(row.type),
    periodization_style: (row.periodization_style as string) ?? null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

function mapPhaseToBlock(phase: InstancePhaseRow, programId: string): TrainingBlock {
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

function resolvePhaseForWeek(
  phases: TrainingBlock[],
  weekNumber: number,
): string | null {
  const ranges = computeBlockWeekRanges(phases)
  const hit = ranges.find((r) => weekNumber >= r.startWeek && weekNumber <= r.endWeek)
  return hit?.blockId ?? phases[0]?.id ?? null
}

export interface LoadInstanceProgramDraftParams {
  supabase: SupabaseClient
  assignmentId: string
  clientId: string
  programId: string
  coachId: string
  clientName?: string
  clientAvatarUrl?: string | null
}

/**
 * Hydrate ProgramDraftState from instance tables so the Station editor can run
 * in client-instance mode with the same draft/mutation surface as master.
 */
export async function loadInstanceProgramDraftBaseline(
  params: LoadInstanceProgramDraftParams,
): Promise<ProgramDraftState> {
  const { supabase, assignmentId, clientId, programId, coachId, clientName, clientAvatarUrl } =
    params

  const [{ data: programRow, error: programError }, phases, { data: scheduleRows, error: schedError }] =
    await Promise.all([
      supabase
        .from('workout_programs')
        .select(
          'id, name, description, coach_id, difficulty_level, target_audience, is_active, type, periodization_style, created_at, updated_at',
        )
        .eq('id', programId)
        .single(),
      loadInstancePhases(supabase, assignmentId),
      supabase
        .from('program_day_assignments')
        .select(
          'id, program_assignment_id, week_number, program_day, day_number, program_instance_workout_id, program_instance_phase_id, day_type, name, is_optional, updated_at',
        )
        .eq('program_assignment_id', assignmentId)
        .order('week_number', { ascending: true })
        .order('program_day', { ascending: true }),
    ])

  if (programError || !programRow) {
    throw programError ?? new Error('Program not found')
  }
  if (schedError) {
    throw schedError
  }

  const trainingBlocks = phases.map((p) => mapPhaseToBlock(p, programId))
  const instanceTotalWeeks = trainingBlocks.reduce((s, b) => s + (b.duration_weeks || 0), 0)
  const program = mapProgramRow(programRow as Record<string, unknown>, instanceTotalWeeks)

  const schedule: ProgramSchedule[] = (scheduleRows ?? [])
    .filter((row) => row.day_type !== 'rest' && row.program_instance_workout_id)
    .map((row) => {
      const week = Number(row.week_number) || 1
      const programDay = Number(row.program_day) || 1
      const phaseId =
        (row.program_instance_phase_id as string | null) ??
        resolvePhaseForWeek(trainingBlocks, week)
      const instanceWorkoutId = String(row.program_instance_workout_id)
      return {
        id: String(row.id),
        program_id: programId,
        program_day: programDay,
        week_number: week,
        template_id: instanceWorkoutId,
        training_block_id: phaseId,
        is_optional: Boolean(row.is_optional),
        template_name: (row.name as string) ?? undefined,
        created_at: String(row.updated_at ?? new Date().toISOString()),
        updated_at: String(row.updated_at ?? new Date().toISOString()),
      }
    })

  const templateIds = [...new Set(schedule.map((s) => s.template_id).filter(Boolean))] as string[]
  const workouts: ProgramDraftState['workouts'] = {}
  await Promise.all(
    templateIds.map(async (iid) => {
      const loaded = await loadInstanceWorkoutForCanvas(supabase, iid)
      if (loaded) workouts[iid] = loaded
    }),
  )

  const state: ProgramDraftState = {
    programId,
    coachId,
    program,
    categoryId: 'none',
    trainingBlocks,
    schedule,
    workouts,
    structureDirty: false,
    dirtyWorkoutIds: [],
    pendingNewWorkoutIds: [],
    pendingNewBlockIds: [],
    pendingDeactivateWorkoutIds: [],
    editorMode: 'client',
    assignmentId,
    clientId,
    clientName,
    clientAvatarUrl,
  }

  return cloneProgramDraft(state)
}
