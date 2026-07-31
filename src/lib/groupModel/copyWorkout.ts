import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkoutKind } from './types'
import { newId } from './newId'

export interface CopyWorkoutOptions {
  kind: WorkoutKind
  name?: string
  isActive?: boolean
  coachId: string
}

/**
 * Deep-copy workout row + entries + slots + prescriptions with fresh ids.
 * Batched inserts — no per-row waterfalls.
 */
export async function copyWorkout(
  supabase: SupabaseClient,
  sourceWorkoutId: string,
  options: CopyWorkoutOptions,
): Promise<string> {
  const { data: source, error: sourceError } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('id', sourceWorkoutId)
    .single()

  if (sourceError || !source) {
    throw new Error(sourceError?.message ?? 'Source workout not found')
  }

  const { data: newTemplate, error: insertTemplateError } = await supabase
    .from('workout_templates')
    .insert({
      name: options.name ?? `${source.name} (copy)`,
      description: source.description,
      category: source.category,
      difficulty_level: source.difficulty_level,
      estimated_duration: source.estimated_duration,
      coach_id: options.coachId,
      is_active: options.isActive ?? true,
      kind: options.kind,
      source_workout_id: sourceWorkoutId,
    })
    .select('id')
    .single()

  if (insertTemplateError || !newTemplate) {
    throw insertTemplateError ?? new Error('Failed to create copied workout')
  }

  const newWorkoutId = newTemplate.id as string

  const { data: entries, error: entriesError } = await supabase
    .from('workout_set_entries')
    .select('*')
    .eq('template_id', sourceWorkoutId)
    .order('set_order', { ascending: true })

  if (entriesError) throw entriesError
  if (!entries?.length) return newWorkoutId

  const entryIdMap = new Map<string, string>()
  const entryInserts = entries.map((entry) => {
    const newIdVal = newId()
    entryIdMap.set(entry.id, newIdVal)
    const { id: _id, created_at: _c, updated_at: _u, template_id: _t, ...rest } = entry
    return { ...rest, id: newIdVal, template_id: newWorkoutId }
  })

  const { error: entriesInsertError } = await supabase.from('workout_set_entries').insert(entryInserts)
  if (entriesInsertError) throw entriesInsertError

  const oldEntryIds = entries.map((e) => e.id)
  const { data: slots, error: slotsError } = await supabase
    .from('workout_set_entry_exercises')
    .select('*')
    .in('set_entry_id', oldEntryIds)
    .order('exercise_order', { ascending: true })

  if (slotsError) throw slotsError

  const slotIdMap = new Map<string, string>()
  const slotInserts = (slots ?? []).map((slot) => {
    const newSlotId = newId()
    slotIdMap.set(slot.id, newSlotId)
    const { id: _id, created_at: _c, updated_at: _u, set_entry_id, ...rest } = slot
    return {
      ...rest,
      id: newSlotId,
      set_entry_id: entryIdMap.get(set_entry_id) ?? set_entry_id,
    }
  })

  if (slotInserts.length > 0) {
    const { error: slotInsertError } = await supabase
      .from('workout_set_entry_exercises')
      .insert(slotInserts)
    if (slotInsertError) throw slotInsertError
  }

  const oldSlotIds = (slots ?? []).map((s) => s.id)
  if (oldSlotIds.length > 0) {
    const { data: prescriptions, error: rxError } = await supabase
      .from('workout_set_prescriptions')
      .select('*')
      .in('slot_id', oldSlotIds)
      .order('set_number', { ascending: true })

    if (rxError) throw rxError

    if (prescriptions?.length) {
      const rxInserts = prescriptions.map((rx) => {
        const { id: _id, created_at: _c, updated_at: _u, slot_id, ...rest } = rx
        return {
          ...rest,
          id: newId(),
          slot_id: slotIdMap.get(slot_id) ?? slot_id,
        }
      })
      const { error: rxInsertError } = await supabase
        .from('workout_set_prescriptions')
        .insert(rxInserts)
      if (rxInsertError) throw rxInsertError
    }
  }

  return newWorkoutId
}
