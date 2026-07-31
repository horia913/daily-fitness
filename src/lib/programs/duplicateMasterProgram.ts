import type { SupabaseClient } from '@supabase/supabase-js'
import { copyWorkout } from '@/lib/groupModel/copyWorkout'
import { newId } from '@/lib/groupModel/newId'
import WorkoutTemplateService, { type ProgramSchedule } from '@/lib/workoutTemplateService'

function scheduleKey(row: Pick<ProgramSchedule, 'week_number' | 'program_day'>): string {
  return `${row.week_number ?? 1}:${row.program_day ?? 1}`
}

/**
 * Master → master fork: new program_id with copied phases, schedule, workouts, progression rules.
 * Does not touch instances or assignments.
 */
export async function duplicateMasterProgram(
  supabase: SupabaseClient,
  sourceProgramId: string,
  coachId: string,
): Promise<string> {
  const { data: source, error: sourceErr } = await supabase
    .from('workout_programs')
    .select('*')
    .eq('id', sourceProgramId)
    .eq('coach_id', coachId)
    .single()

  if (sourceErr || !source) {
    throw new Error(sourceErr?.message ?? 'Program not found')
  }

  const { data: blocks, error: blocksErr } = await supabase
    .from('training_blocks')
    .select('*')
    .eq('program_id', sourceProgramId)
    .order('block_order', { ascending: true })

  if (blocksErr) throw blocksErr

  const { data: newProgram, error: createErr } = await supabase
    .from('workout_programs')
    .insert({
      name: `${String(source.name)} (copy)`,
      description: source.description,
      coach_id: coachId,
      difficulty_level: source.difficulty_level,
      target_audience: source.target_audience,
      is_active: true,
      type: source.type ?? 'fixed',
      periodization_style: source.periodization_style,
    })
    .select('id')
    .single()

  if (createErr || !newProgram?.id) {
    throw createErr ?? new Error('Failed to create program copy')
  }

  const newProgramId = String(newProgram.id)
  const blockIdMap = new Map<string, string>()

  for (const block of blocks ?? []) {
    const newBlockId = newId()
    blockIdMap.set(String(block.id), newBlockId)
    const { error: insErr } = await supabase.from('training_blocks').insert({
      id: newBlockId,
      program_id: newProgramId,
      name: block.name,
      duration_weeks: block.duration_weeks,
      block_order: block.block_order,
      phase_label: block.phase_label ?? null,
      notes: block.notes ?? null,
    })
    if (insErr) throw insErr
  }

  const schedule = await WorkoutTemplateService.getProgramSchedule(sourceProgramId)
  const templateIdMap = new Map<string, string>()
  const uniqueTemplateIds = [
    ...new Set((schedule ?? []).map((s) => s.template_id).filter(Boolean)),
  ] as string[]

  for (const templateId of uniqueTemplateIds) {
    const newTemplateId = await copyWorkout(supabase, templateId, {
      kind: 'program_day',
      coachId,
    })
    templateIdMap.set(templateId, newTemplateId)
  }

  for (const slot of schedule ?? []) {
    if (!slot.template_id) continue
    const newTemplateId = templateIdMap.get(slot.template_id)
    if (!newTemplateId) continue
    await WorkoutTemplateService.setProgramSchedule({
      programId: newProgramId,
      programDay: slot.program_day,
      weekNumber: slot.week_number,
      templateId: newTemplateId,
      isOptional: Boolean(slot.is_optional),
    })
  }

  const newSchedule = await WorkoutTemplateService.getProgramSchedule(newProgramId)
  const newScheduleIdByKey = new Map(
    (newSchedule ?? []).map((s) => [scheduleKey(s), s.id]),
  )
  const scheduleIdMap = new Map<string, string>()
  for (const oldSlot of schedule ?? []) {
    const mapped = newScheduleIdByKey.get(scheduleKey(oldSlot))
    if (mapped) scheduleIdMap.set(oldSlot.id, mapped)
  }

  const { data: rules, error: rulesErr } = await supabase
    .from('program_progression_rules')
    .select('*')
    .eq('program_id', sourceProgramId)

  if (rulesErr) throw rulesErr

  if (rules?.length) {
    const inserts = rules.map((rule) => {
      const {
        id: _id,
        created_at: _c,
        updated_at: _u,
        program_id: _pid,
        training_block_id,
        program_schedule_id,
        set_entry_id: _setEntry,
        ...rest
      } = rule as Record<string, unknown>
      return {
        ...rest,
        program_id: newProgramId,
        training_block_id: training_block_id
          ? (blockIdMap.get(String(training_block_id)) ?? null)
          : null,
        program_schedule_id: program_schedule_id
          ? (scheduleIdMap.get(String(program_schedule_id)) ?? null)
          : null,
        set_entry_id: null,
      }
    })
    const { error: insRulesErr } = await supabase.from('program_progression_rules').insert(inserts)
    if (insRulesErr) throw insRulesErr
  }

  return newProgramId
}
