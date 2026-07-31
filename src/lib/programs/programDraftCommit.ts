import type { SupabaseClient } from '@supabase/supabase-js'
import WorkoutTemplateService from '@/lib/workoutTemplateService'
import { TrainingBlockService } from '@/lib/trainingBlockService'
import { saveWorkoutFromCanvas, formatSaveError } from '@/lib/groupModel/canvasSave'
import type { ProgramCommitResult, ProgramDraftState } from '@/types/programDraft'
import type { StationProgram } from '@/types/programStation'
import {
  blocksNewSinceBaseline,
  blocksRemovedSinceBaseline,
  blocksUpdatedSinceBaseline,
  scheduleSlotsChangedOrNew,
  scheduleSlotsInBaselineNotInWorking,
} from './programDraftMutations'
import {
  programMetaChanged,
  sortedDirtyWorkoutIds,
} from './programDraftUtils'

async function commitProgramMetadata(
  working: ProgramDraftState,
  baseline: ProgramDraftState,
): Promise<void> {
  if (!programMetaChanged(working.program, baseline.program)) {
    return
  }
  await WorkoutTemplateService.updateProgram(working.programId, {
    name: working.program.name,
    description: working.program.description,
    difficulty_level: working.program.difficulty_level,
    target_audience: working.program.target_audience,
    is_active: working.program.is_active,
    coach_id: working.program.coach_id,
    type: working.program.type,
    periodization_style: working.program.periodization_style ?? null,
  } as Partial<StationProgram>)
}

async function insertBlockWithClientId(
  supabase: SupabaseClient,
  block: ProgramDraftState['trainingBlocks'][0],
): Promise<void> {
  const { error } = await supabase.from('training_blocks').insert({
    id: block.id,
    program_id: block.program_id,
    name: block.name,
    duration_weeks: block.duration_weeks,
    block_order: block.block_order,
    phase_label: block.phase_label ?? null,
    notes: block.notes ?? null,
  })
  if (error) throw error
}

async function commitTrainingBlocks(
  supabase: SupabaseClient,
  working: ProgramDraftState,
  baseline: ProgramDraftState,
): Promise<void> {
  const removed = blocksRemovedSinceBaseline(baseline, working)
  for (const block of removed) {
    await TrainingBlockService.deleteTrainingBlock(block.id)
  }

  const created = blocksNewSinceBaseline(baseline, working)
  for (const block of created) {
    await insertBlockWithClientId(supabase, block)
  }

  const updated = blocksUpdatedSinceBaseline(baseline, working)
  for (const block of updated) {
    await TrainingBlockService.updateTrainingBlock(block.id, {
      name: block.name,
      duration_weeks: block.duration_weeks,
      block_order: block.block_order,
      phase_label: block.phase_label,
      notes: block.notes,
    })
  }

  const orderChanged =
    working.trainingBlocks.map((b) => b.id).join(',') !==
    baseline.trainingBlocks.map((b) => b.id).join(',')
  if (orderChanged) {
    await TrainingBlockService.reorderTrainingBlocks(
      working.programId,
      working.trainingBlocks.map((b) => b.id),
    )
  }
}

async function commitSchedule(
  working: ProgramDraftState,
  baseline: ProgramDraftState,
): Promise<void> {
  const removed = scheduleSlotsInBaselineNotInWorking(baseline, working)
  for (const slot of removed) {
    await WorkoutTemplateService.removeProgramSchedule(
      working.programId,
      slot.program_day,
      slot.week_number,
    )
  }

  const upserted = scheduleSlotsChangedOrNew(baseline, working)
  for (const slot of upserted) {
    if (!slot.template_id) continue
    await WorkoutTemplateService.setProgramSchedule({
      programId: working.programId,
      programDay: slot.program_day,
      weekNumber: slot.week_number,
      templateId: slot.template_id,
      isOptional: Boolean(slot.is_optional),
    })
  }
}

async function deactivateWorkouts(
  supabase: SupabaseClient,
  templateIds: string[],
): Promise<void> {
  for (const id of templateIds) {
    const { error } = await supabase
      .from('workout_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}

export async function commitProgramDraft(
  supabase: SupabaseClient,
  working: ProgramDraftState,
  baseline: ProgramDraftState,
  categories: Array<{ id: string; name: string }>,
): Promise<ProgramCommitResult> {
  const contentCommittedIds: string[] = []
  let structureCommitted = false

  try {
    if (working.structureDirty) {
      await commitProgramMetadata(working, baseline)
      await commitTrainingBlocks(supabase, working, baseline)
      structureCommitted = true
    }

    const dirtyIds = sortedDirtyWorkoutIds(working.dirtyWorkoutIds)
    let pendingNewWorkoutIds = [...working.pendingNewWorkoutIds]
    for (const templateId of dirtyIds) {
      const workout = working.workouts[templateId]
      if (!workout) continue
      const result = await saveWorkoutFromCanvas({
        supabase,
        userId: working.coachId,
        workout,
        isNew: pendingNewWorkoutIds.includes(templateId),
      })
      if (!result.success) {
        return {
          success: false,
          error: result.error ?? 'Content save failed',
          partialMessage: structureCommitted
            ? `Metadata/phases saved. Workout ${templateId} failed: ${result.error}`
            : `Failed on workout ${templateId}: ${result.error}`,
          structureCommitted,
          contentCommittedIds,
          failedContentId: templateId,
          pendingNewWorkoutIds,
        }
      }
      contentCommittedIds.push(templateId)
      pendingNewWorkoutIds = pendingNewWorkoutIds.filter((id) => id !== templateId)
    }

    if (working.structureDirty) {
      await commitSchedule(working, baseline)
      await deactivateWorkouts(supabase, working.pendingDeactivateWorkoutIds)
      structureCommitted = true
    } else if (working.pendingDeactivateWorkoutIds.length > 0) {
      await deactivateWorkouts(supabase, working.pendingDeactivateWorkoutIds)
      structureCommitted = true
    }

    return { success: true, structureCommitted, contentCommittedIds }
  } catch (err: unknown) {
    const message = formatSaveError(err)
    return {
      success: false,
      error: message,
      partialMessage: structureCommitted
        ? `Partial save completed; failed: ${message}`
        : message,
      structureCommitted,
      contentCommittedIds,
    }
  }
}
