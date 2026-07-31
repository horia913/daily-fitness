import type { SupabaseClient } from '@supabase/supabase-js'
import WorkoutTemplateService from '@/lib/workoutTemplateService'
import { saveWorkoutFromCanvas } from '@/lib/groupModel/canvasSave'
import { createEmptyCanvasWorkout, type CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import { copyWorkout } from '@/lib/groupModel/copyWorkout'
import { cloneCanvasWorkoutInMemory } from '@/lib/programs/inMemoryWorkoutCopy'
import { newId } from '@/lib/groupModel/newId'
import { programDayLabel } from '@/lib/programs/stationScheduleUtils'
import { buildCanvasGroupsRpcPayload } from '@/lib/groupModel/canvasSave'

const EXERCISE_COUNT_CHUNK = 100

/** Count exercise slots per template — one RPC round-trip, flat fallback (no nested embed). */
export async function fetchExerciseCountsForTemplates(
  supabase: SupabaseClient,
  templateIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  const ids = [...new Set(templateIds.filter(Boolean))]
  if (ids.length === 0) return counts
  ids.forEach((id) => {
    counts[id] = 0
  })

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'count_exercises_by_template_ids',
    { p_template_ids: ids },
  )

  if (!rpcError && Array.isArray(rpcData)) {
    for (const row of rpcData as { template_id?: string; exercise_count?: number | string }[]) {
      const tid = row?.template_id
      if (tid) counts[tid] = Number(row.exercise_count) || 0
    }
    return counts
  }

  if (rpcError) {
    console.warn(
      '[fetchExerciseCountsForTemplates] count_exercises_by_template_ids unavailable; using flat fallback:',
      rpcError.message,
    )
  }

  const { data: entries, error: entriesError } = await supabase
    .from('workout_set_entries')
    .select('id, template_id')
    .in('template_id', ids)

  if (entriesError) {
    console.error('[fetchExerciseCountsForTemplates]', entriesError.message)
    return counts
  }

  const entryList = entries ?? []
  if (entryList.length === 0) return counts

  const entryToTemplate = new Map(
    entryList.map((entry) => [entry.id as string, entry.template_id as string]),
  )
  const entryIds = entryList.map((entry) => entry.id as string)

  for (let i = 0; i < entryIds.length; i += EXERCISE_COUNT_CHUNK) {
    const chunk = entryIds.slice(i, i + EXERCISE_COUNT_CHUNK)
    const { data: slots, error: slotsError } = await supabase
      .from('workout_set_entry_exercises')
      .select('set_entry_id')
      .in('set_entry_id', chunk)

    if (slotsError) {
      console.error('[fetchExerciseCountsForTemplates]', slotsError.message)
      continue
    }

    for (const slot of slots ?? []) {
      const templateId = entryToTemplate.get(slot.set_entry_id as string)
      if (templateId) counts[templateId] = (counts[templateId] ?? 0) + 1
    }
  }

  return counts
}

export async function createProgramDayWorkout(
  supabase: SupabaseClient,
  coachId: string,
  programId: string,
  programDay: number,
  weekNumber: number,
  name?: string,
): Promise<string> {
  const workoutId = newId()
  const workout = createEmptyCanvasWorkout({
    id: workoutId,
    name: name?.trim() || `${programDayLabel(programDay)} workout`,
    kind: 'program_day',
  })

  const result = await saveWorkoutFromCanvas({
    supabase,
    userId: coachId,
    workout,
    isNew: true,
  })
  if (!result.success) {
    throw new Error(result.error ?? 'Failed to create program day workout')
  }

  await WorkoutTemplateService.setProgramSchedule({
    programId,
    programDay,
    weekNumber,
    templateId: workoutId,
  })

  return workoutId
}

export async function insertLibraryWorkoutIntoDay(
  supabase: SupabaseClient,
  coachId: string,
  libraryWorkoutId: string,
  programId: string,
  programDay: number,
  weekNumber: number,
): Promise<string> {
  const copiedId = await copyWorkout(supabase, libraryWorkoutId, {
    kind: 'program_day',
    coachId,
    isActive: true,
  })

  await WorkoutTemplateService.setProgramSchedule({
    programId,
    programDay,
    weekNumber,
    templateId: copiedId,
  })

  return copiedId
}

/**
 * Immediate library commit from working-copy state (not autosaved program day).
 * When `sourceWorkout` is provided, writes that snapshot; otherwise copies from DB.
 */
export async function saveDayWorkoutToLibrary(
  supabase: SupabaseClient,
  coachId: string,
  dayWorkoutId: string,
  name: string,
  notes?: string,
  sourceWorkout?: CanvasWorkout,
): Promise<string> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Library name is required')
  }

  let libraryId: string

  if (sourceWorkout) {
    libraryId = newId()
    const libraryWorkout = cloneCanvasWorkoutInMemory(sourceWorkout, {
      newId: libraryId,
      kind: 'library',
      name: trimmedName,
      sourceWorkoutId: dayWorkoutId,
    })
    if (notes?.trim()) libraryWorkout.description = notes.trim()

    const { error: insertError } = await supabase.from('workout_templates').insert({
      id: libraryId,
      name: libraryWorkout.name,
      description: libraryWorkout.description ?? '',
      category: libraryWorkout.category ?? 'general',
      difficulty_level: (libraryWorkout.difficulty_level ?? 'intermediate').toLowerCase(),
      estimated_duration: libraryWorkout.estimated_duration ?? 60,
      coach_id: coachId,
      is_active: true,
      kind: 'library',
      source_workout_id: dayWorkoutId,
    })
    if (insertError) throw insertError

    const { error: rpcError } = await supabase.rpc('save_workout_canvas', {
      p_workout_id: libraryId,
      p_groups: buildCanvasGroupsRpcPayload(libraryWorkout),
    })
    if (rpcError) throw rpcError
  } else {
    libraryId = await copyWorkout(supabase, dayWorkoutId, {
      kind: 'library',
      name: trimmedName,
      coachId,
      isActive: true,
    })

    if (notes?.trim()) {
      const { error } = await supabase
        .from('workout_templates')
        .update({ description: notes.trim(), updated_at: new Date().toISOString() })
        .eq('id', libraryId)
      if (error) throw error
    }
  }

  return libraryId
}

/**
 * Remove schedule slot (day becomes rest) and deactivate the owned program_day workout.
 * We deactivate rather than delete to avoid orphaning historical references.
 */
export async function clearProgramDaySlot(
  supabase: SupabaseClient,
  programId: string,
  programDay: number,
  weekNumber: number,
  templateId: string | null,
): Promise<void> {
  await WorkoutTemplateService.removeProgramSchedule(programId, programDay, weekNumber)

  if (templateId) {
    const { error } = await supabase
      .from('workout_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', templateId)
    if (error) throw error
  }
}

export async function listLibraryWorkouts(
  supabase: SupabaseClient,
  coachId: string,
): Promise<Array<{ id: string; name: string; description?: string; exercise_count?: number }>> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('id, name, description')
    .eq('coach_id', coachId)
    .eq('kind', 'library')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  const templates = data ?? []
  const counts = await fetchExerciseCountsForTemplates(
    supabase,
    templates.map((t) => t.id),
  )
  return templates.map((t) => ({
    ...t,
    exercise_count: counts[t.id] ?? 0,
  }))
}
