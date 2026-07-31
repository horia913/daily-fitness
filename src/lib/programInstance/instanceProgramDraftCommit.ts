import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchApi } from '@/lib/apiClient'
import { formatSaveError } from '@/lib/groupModel/canvasSave'
import { saveInstanceWorkoutFromCanvas } from '@/lib/programInstance/instanceCanvasSave'
import type { ProgramCommitResult, ProgramDraftState } from '@/types/programDraft'
import {
  blocksNewSinceBaseline,
  blocksRemovedSinceBaseline,
  blocksUpdatedSinceBaseline,
  scheduleSlotsChangedOrNew,
  scheduleSlotsInBaselineNotInWorking,
} from '@/lib/programs/programDraftMutations'
import { scheduleSlotKey, sortedDirtyWorkoutIds } from '@/lib/programs/programDraftUtils'

async function patchInstancePhase(
  clientId: string,
  assignmentId: string,
  phaseId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const res = await fetchApi(
    `/api/coach/clients/${clientId}/program-assignments/${assignmentId}/phases/${phaseId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Phase update failed')
  }
}

async function patchScheduleSlot(
  clientId: string,
  assignmentId: string,
  snapshotRowId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const res = await fetchApi(
    `/api/coach/clients/${clientId}/program-assignments/${assignmentId}/snapshot/${snapshotRowId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Schedule update failed')
  }
}

async function commitInstancePhases(
  supabase: SupabaseClient,
  working: ProgramDraftState,
  baseline: ProgramDraftState,
  assignmentId: string,
  clientId: string,
): Promise<void> {
  const removed = blocksRemovedSinceBaseline(baseline, working)
  for (const block of removed) {
    const { error } = await supabase
      .from('program_instance_phases')
      .delete()
      .eq('id', block.id)
      .eq('program_assignment_id', assignmentId)
    if (error) throw error
  }

  const created = blocksNewSinceBaseline(baseline, working)
  for (const block of created) {
    const { error } = await supabase.from('program_instance_phases').insert({
      id: block.id,
      program_assignment_id: assignmentId,
      name: block.name,
      duration_weeks: block.duration_weeks,
      phase_order: block.block_order,
      phase_label: block.phase_label ?? null,
      notes: block.notes ?? null,
    })
    if (error) throw error
  }

  const updated = blocksUpdatedSinceBaseline(baseline, working)
  for (const block of updated) {
    await patchInstancePhase(clientId, assignmentId, block.id, {
      name: block.name,
      duration_weeks: block.duration_weeks,
      phase_label: block.phase_label ?? null,
      notes: block.notes ?? null,
    })
  }

  const orderChanged =
    working.trainingBlocks.map((b) => b.id).join(',') !==
    baseline.trainingBlocks.map((b) => b.id).join(',')
  if (orderChanged) {
    for (const block of working.trainingBlocks) {
      const { error } = await supabase
        .from('program_instance_phases')
        .update({ phase_order: block.block_order, updated_at: new Date().toISOString() })
        .eq('id', block.id)
        .eq('program_assignment_id', assignmentId)
      if (error) throw error
    }
  }
}

async function insertScheduleSlot(
  supabase: SupabaseClient,
  assignmentId: string,
  slot: ProgramDraftState['schedule'][0],
  workoutName: string,
): Promise<void> {
  const week = slot.week_number ?? 1
  const programDay = slot.program_day ?? 1
  const { error } = await supabase.from('program_day_assignments').insert({
    id: slot.id,
    program_assignment_id: assignmentId,
    day_number: (week - 1) * 7 + programDay,
    week_number: week,
    program_day: programDay,
    program_instance_phase_id: slot.training_block_id ?? null,
    program_instance_workout_id: slot.template_id,
    day_type: 'workout',
    name: workoutName,
    is_optional: Boolean(slot.is_optional),
    workout_template_id: null,
  })
  if (error) throw error
}

async function commitInstanceSchedule(
  supabase: SupabaseClient,
  working: ProgramDraftState,
  baseline: ProgramDraftState,
  assignmentId: string,
  clientId: string,
): Promise<void> {
  const baselineByKey = new Map(
    baseline.schedule.map((s) => [scheduleSlotKey(s.week_number, s.program_day), s]),
  )

  const cleared = scheduleSlotsInBaselineNotInWorking(baseline, working)
  for (const slot of cleared) {
    await patchScheduleSlot(clientId, assignmentId, slot.id, {
      day_type: 'rest',
      program_instance_workout_id: null,
    })
  }

  const changed = scheduleSlotsChangedOrNew(baseline, working)
  for (const slot of changed) {
    const key = scheduleSlotKey(slot.week_number, slot.program_day)
    const prior = baselineByKey.get(key)
    const workout = slot.template_id ? working.workouts[slot.template_id] : null

    if (!slot.template_id) {
      if (prior) {
        await patchScheduleSlot(clientId, assignmentId, prior.id, {
          day_type: 'rest',
          program_instance_workout_id: null,
        })
      }
      continue
    }

    if (!prior) {
      await insertScheduleSlot(
        supabase,
        assignmentId,
        slot,
        workout?.name?.trim() || slot.template_name || 'Workout',
      )
      continue
    }

    await patchScheduleSlot(clientId, assignmentId, prior.id, {
      program_instance_workout_id: slot.template_id,
      day_type: 'workout',
      is_optional: Boolean(slot.is_optional),
      name: workout?.name?.trim() || slot.template_name || prior.template_name,
    })

    if ((prior.training_block_id ?? null) !== (slot.training_block_id ?? null)) {
      const { error } = await supabase
        .from('program_day_assignments')
        .update({
          program_instance_phase_id: slot.training_block_id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prior.id)
        .eq('program_assignment_id', assignmentId)
      if (error) throw error
    }
  }
}

/**
 * Persist a client-instance Station draft — instance tables only, never master.
 */
export async function commitInstanceProgramDraft(
  supabase: SupabaseClient,
  working: ProgramDraftState,
  baseline: ProgramDraftState,
): Promise<ProgramCommitResult> {
  const assignmentId = working.assignmentId
  const clientId = working.clientId
  if (!assignmentId || !clientId) {
    return { success: false, error: 'Missing client instance context' }
  }

  const contentCommittedIds: string[] = []
  let structureCommitted = false
  let pendingNewWorkoutIds = [...working.pendingNewWorkoutIds]

  try {
    if (working.structureDirty) {
      await commitInstancePhases(supabase, working, baseline, assignmentId, clientId)
      structureCommitted = true
    }

    const dirtyIds = sortedDirtyWorkoutIds(working.dirtyWorkoutIds)
    for (const workoutId of dirtyIds) {
      const workout = working.workouts[workoutId]
      if (!workout) continue
      const result = await saveInstanceWorkoutFromCanvas({
        supabase,
        assignmentId,
        workout,
      })
      if (!result.success) {
        return {
          success: false,
          error: result.error ?? 'Content save failed',
          partialMessage: structureCommitted
            ? `Phases saved. Workout failed: ${result.error}`
            : `Failed on workout: ${result.error}`,
          structureCommitted,
          contentCommittedIds,
          failedContentId: workoutId,
          pendingNewWorkoutIds,
        }
      }
      contentCommittedIds.push(workoutId)
      pendingNewWorkoutIds = pendingNewWorkoutIds.filter((id) => id !== workoutId)
    }

    if (working.structureDirty) {
      await commitInstanceSchedule(supabase, working, baseline, assignmentId, clientId)
      structureCommitted = true
    }

    return { success: true, structureCommitted, contentCommittedIds, pendingNewWorkoutIds }
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
      pendingNewWorkoutIds,
    }
  }
}
