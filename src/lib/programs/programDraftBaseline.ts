import type { SupabaseClient } from '@supabase/supabase-js'
import WorkoutTemplateService from '@/lib/workoutTemplateService'
import { TrainingBlockService } from '@/lib/trainingBlockService'
import { loadWorkoutForCanvas } from '@/lib/groupModel/canvasLoad'
import { normalizeProgramType, sumTrainingBlockWeeks } from '@/lib/programs/stationBlockWeeks'
import type { ProgramDraftState } from '@/types/programDraft'
import type { StationProgram } from '@/types/programStation'
import type { TrainingBlock } from '@/types/trainingBlock'
import { cloneProgramDraft } from './programDraftUtils'

function mapProgramRow(row: Record<string, unknown>, trainingBlocks: TrainingBlock[]): StationProgram {
  const derivedWeeks = sumTrainingBlockWeeks(trainingBlocks)
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    description: (row.description as string) ?? '',
    coach_id: String(row.coach_id),
    difficulty_level: (row.difficulty_level as StationProgram['difficulty_level']) ?? 'intermediate',
    duration_weeks: derivedWeeks > 0 ? derivedWeeks : 4,
    target_audience: String(row.target_audience ?? 'general_fitness'),
    category: null,
    is_active: row.is_active !== false,
    type: normalizeProgramType(row.type),
    periodization_style: (row.periodization_style as string) ?? null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

export async function loadProgramDraftBaseline(
  supabase: SupabaseClient,
  programId: string,
  coachId: string,
  categoryId = 'none',
): Promise<ProgramDraftState> {
  const [{ data: programRow, error }, schedule, trainingBlocks] = await Promise.all([
    supabase
      .from('workout_programs')
      .select(
        'id, name, description, coach_id, difficulty_level, target_audience, is_active, type, periodization_style, created_at, updated_at',
      )
      .eq('id', programId)
      .single(),
    WorkoutTemplateService.getProgramSchedule(programId),
    TrainingBlockService.getTrainingBlocks(programId),
  ])

  if (error || !programRow) {
    throw error ?? new Error('Program not found')
  }

  const templateIds = [
    ...new Set((schedule ?? []).map((s) => s.template_id).filter(Boolean)),
  ] as string[]

  const workouts: ProgramDraftState['workouts'] = {}
  await Promise.all(
    templateIds.map(async (tid) => {
      const loaded = await loadWorkoutForCanvas(supabase, tid)
      if (loaded) workouts[tid] = loaded
    }),
  )

  const state: ProgramDraftState = {
    programId,
    coachId,
    program: mapProgramRow(programRow as Record<string, unknown>, trainingBlocks ?? []),
    categoryId,
    trainingBlocks: trainingBlocks ?? [],
    schedule: schedule ?? [],
    workouts,
    structureDirty: false,
    dirtyWorkoutIds: [],
    pendingNewWorkoutIds: [],
    pendingNewBlockIds: [],
    pendingDeactivateWorkoutIds: [],
  }

  return cloneProgramDraft(state)
}
