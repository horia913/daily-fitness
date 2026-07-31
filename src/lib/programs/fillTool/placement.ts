import type { CanvasWorkout } from '@/lib/groupModel/canvasTypes'

import { cloneGroupInMemory } from '@/lib/programs/inMemoryWorkoutCopy'

import {

  createDayWithGroupInDraft,

  insertClonedGroupAtIndexInDraft,

  placeDayCopyInDraft,

  updateWorkoutInDraft,

} from '@/lib/programs/programDraftMutations'

import type { ProgramDraftState } from '@/types/programDraft'

import { getScheduleSlot } from '@/lib/programs/stationScheduleUtils'

import { evaluatePattern } from './patterns'

import {

  applyValuesToSlot,

  formatPropertyPreviewValue,

  readBaselineValues,

  roundForProperty,

} from './properties'

import {

  getSourceWorkout,

  isEmptyShellWorkout,

  sortedGroups,

  sourceWeekFillableDays,

} from './matching'

import { expandScopedExercises } from './scopedExercises'

import {

  resolveDayTargetAction,

  resolveExerciseTargetAction,

  resolveGroupTargetAction,

  type FillTargetAction,

} from './slotDecision'

import type { FillStampConfig, ScopedExercise } from './types'



export function computeRampedValues(

  config: FillStampConfig,

  baselineValues: number[],

  weekIndex: number,

): number[] {

  if (config.pattern === 'hold' || !config.property) {

    return baselineValues

  }

  const baselineScalar = baselineValues[0]

  const patternScalar = evaluatePattern(

    config.pattern,

    baselineScalar,

    weekIndex,

    config.patternInputs,

  )

  const delta = patternScalar - baselineScalar

  return baselineValues.map((v) => roundForProperty(config.property!, v + delta))

}



export function collectScopedExercises(

  draft: ProgramDraftState,

  config: FillStampConfig,

): ScopedExercise[] {

  const out: ScopedExercise[] = []



  if (config.scope === 'week') {

    for (const day of sourceWeekFillableDays(draft, config.sourceAbsoluteWeek)) {

      const source = getSourceWorkout(draft, config.sourceAbsoluteWeek, day)

      if (!source) continue

      out.push(

        ...expandScopedExercises(

          source.workout,

          'day',

          [],

          config.property,

          day,

        ),

      )

    }

    return out

  }



  const source = getSourceWorkout(draft, config.sourceAbsoluteWeek, config.sourceProgramDay)

  if (!source) return out

  return expandScopedExercises(

    source.workout,

    config.scope,

    config.scopeMatchKeys,

    config.property,

    config.sourceProgramDay,

  )

}



export function rampWorkoutForConfig(

  workout: CanvasWorkout,

  config: FillStampConfig,

  weekIndex: number,

  scopedExercises: ScopedExercise[],

  programDayFilter?: number,

): CanvasWorkout {

  if (config.pattern === 'hold' || !config.property) return workout



  let next = workout

  for (const scoped of scopedExercises) {

    if (programDayFilter != null && scoped.programDay !== programDayFilter) continue

    if (!scoped.canRampProperty) continue



    const baselineValues = readBaselineValues(scoped.slot, config.property)

    if (!baselineValues?.length) continue



    const ramped = computeRampedValues(config, baselineValues, weekIndex)

    const found = sortedGroups(next)[scoped.groupIndex]

    if (!found) continue



    next = {

      ...next,

      groups: next.groups.map((group) => {

        if (group.id !== found.id) return group

        return {

          ...group,

          slots: group.slots.map((slot) =>

            slot.exercise_order === scoped.matchKey.exerciseOrder &&

            slot.exercise_id === scoped.matchKey.exerciseId

              ? applyValuesToSlot(slot, config.property!, ramped)

              : slot,

          ),

        }

      }),

    }

  }

  return next

}



function placeGroupAtIndex(

  draft: ProgramDraftState,

  config: FillStampConfig,

  sourceTemplateId: string,

  sourceGroupIndex: number,

  targetWeek: number,

  targetProgramDay: number,

): ProgramDraftState {

  const sourceWorkout = draft.workouts[sourceTemplateId]

  if (!sourceWorkout) return draft

  const sourceGroups = sortedGroups(sourceWorkout)

  const sourceGroup = sourceGroups[sourceGroupIndex]

  if (!sourceGroup) return draft



  const clonedGroup = cloneGroupInMemory(sourceGroup)

  const sourceSlot = getScheduleSlot(draft.schedule, config.sourceAbsoluteWeek, config.sourceProgramDay)

  const blockId = sourceSlot?.training_block_id ?? config.activeBlockId

  const isOptional = Boolean(sourceSlot?.is_optional)



  const targetSchedule = getScheduleSlot(draft.schedule, targetWeek, targetProgramDay)

  if (!targetSchedule?.template_id) {

    return createDayWithGroupInDraft(

      draft,

      targetWeek,

      targetProgramDay,

      clonedGroup,

      sourceGroupIndex,

      blockId,

      isOptional,

    )

  }



  return insertClonedGroupAtIndexInDraft(

    draft,

    targetSchedule.template_id,

    clonedGroup,

    sourceGroupIndex,

  )

}



function placeDayAndRamp(

  draft: ProgramDraftState,

  config: FillStampConfig,

  sourceWeek: number,

  sourceProgramDay: number,

  targetWeek: number,

  targetProgramDay: number,

  weekIndex: number,

  scopedExercises: ScopedExercise[],

): ProgramDraftState {

  const sourceSlot = getScheduleSlot(draft.schedule, sourceWeek, sourceProgramDay)

  if (!sourceSlot?.template_id) return draft



  let next = placeDayCopyInDraft(

    draft,

    sourceWeek,

    sourceProgramDay,

    targetWeek,

    targetProgramDay,

    sourceSlot.training_block_id ?? config.activeBlockId,

  )



  const placed = getScheduleSlot(next.schedule, targetWeek, targetProgramDay)

  if (!placed?.template_id) return next

  const workout = next.workouts[placed.template_id]

  if (!workout) return next



  const ramped = rampWorkoutForConfig(workout, config, weekIndex, scopedExercises, targetProgramDay)

  if (ramped === workout) return next

  return updateWorkoutInDraft(next, placed.template_id, ramped)

}



function overwriteDayInPlace(

  draft: ProgramDraftState,

  config: FillStampConfig,

  targetWeek: number,

  targetProgramDay: number,

  weekIndex: number,

  scopedExercises: ScopedExercise[],

): ProgramDraftState {

  const target = getSourceWorkout(draft, targetWeek, targetProgramDay)

  if (!target) return draft

  const ramped = rampWorkoutForConfig(

    target.workout,

    config,

    weekIndex,

    scopedExercises,

    targetProgramDay,

  )

  if (ramped === target.workout) return draft

  return updateWorkoutInDraft(draft, target.templateId, ramped)

}



function applyDayTarget(

  draft: ProgramDraftState,

  config: FillStampConfig,

  targetWeek: number,

  targetProgramDay: number,

  weekIndex: number,

  scopedExercises: ScopedExercise[],

  sourceWeek: number,

  sourceProgramDay: number,

): ProgramDraftState {

  const source = getSourceWorkout(draft, sourceWeek, sourceProgramDay)

  if (!source || isEmptyShellWorkout(source.workout)) return draft

  const action = resolveDayTargetAction(draft, targetWeek, targetProgramDay, source.workout)

  if (action === 'skip_different') return draft

  if (action === 'place') {

    return placeDayAndRamp(

      draft,

      config,

      sourceWeek,

      sourceProgramDay,

      targetWeek,

      targetProgramDay,

      weekIndex,

      scopedExercises,

    )

  }

  if (config.pattern === 'hold' || !config.property) {

    return placeDayAndRamp(

      draft,

      config,

      sourceWeek,

      sourceProgramDay,

      targetWeek,

      targetProgramDay,

      weekIndex,

      scopedExercises,

    )

  }

  return overwriteDayInPlace(draft, config, targetWeek, targetProgramDay, weekIndex, scopedExercises)

}



function resolveGroupAction(

  draft: ProgramDraftState,

  config: FillStampConfig,

  targetWeek: number,

  targetProgramDay: number,

): FillTargetAction {

  const groupIndex = config.scopeMatchKeys[0]?.groupIndex

  if (groupIndex == null) return 'skip_different'

  const source = getSourceWorkout(draft, config.sourceAbsoluteWeek, config.sourceProgramDay)

  if (!source) return 'skip_different'

  const sourceGroup = sortedGroups(source.workout)[groupIndex]

  if (!sourceGroup) return 'skip_different'

  return resolveGroupTargetAction(draft, targetWeek, targetProgramDay, groupIndex, sourceGroup)

}



function resolveExerciseAction(

  draft: ProgramDraftState,

  config: FillStampConfig,

  targetWeek: number,

  targetProgramDay: number,

): FillTargetAction {

  const key = config.scopeMatchKeys[0]

  if (!key) return 'skip_different'

  return resolveExerciseTargetAction(draft, targetWeek, targetProgramDay, key)

}



export function executeFillAtTarget(

  draft: ProgramDraftState,

  config: FillStampConfig,

  targetAbsoluteWeek: number,

  weekIndex: number,

  scopedExercises: ScopedExercise[],

): ProgramDraftState {

  if (weekIndex === 0) return draft



  switch (config.scope) {

    case 'week': {

      let next = draft

      for (const programDay of sourceWeekFillableDays(next, config.sourceAbsoluteWeek)) {

        next = applyDayTarget(

          next,

          config,

          targetAbsoluteWeek,

          programDay,

          weekIndex,

          scopedExercises,

          config.sourceAbsoluteWeek,

          programDay,

        )

      }

      return next

    }

    case 'day': {

      return applyDayTarget(

        draft,

        config,

        targetAbsoluteWeek,

        config.sourceProgramDay,

        weekIndex,

        scopedExercises,

        config.sourceAbsoluteWeek,

        config.sourceProgramDay,

      )

    }

    case 'group':

    case 'exercise': {

      const action =

        config.scope === 'group'

          ? resolveGroupAction(draft, config, targetAbsoluteWeek, config.sourceProgramDay)

          : resolveExerciseAction(draft, config, targetAbsoluteWeek, config.sourceProgramDay)

      if (action === 'skip_different') return draft



      const groupIndex = config.scopeMatchKeys[0]?.groupIndex

      if (groupIndex == null) return draft

      const source = getSourceWorkout(draft, config.sourceAbsoluteWeek, config.sourceProgramDay)

      if (!source) return draft



      if (action === 'place') {

        let next = placeGroupAtIndex(

          draft,

          config,

          source.templateId,

          groupIndex,

          targetAbsoluteWeek,

          config.sourceProgramDay,

        )

        const placed = getScheduleSlot(next.schedule, targetAbsoluteWeek, config.sourceProgramDay)

        if (!placed?.template_id) return next

        const workout = next.workouts[placed.template_id]

        if (!workout) return next

        const ramped = rampWorkoutForConfig(workout, config, weekIndex, scopedExercises)

        if (ramped === workout) return next

        return updateWorkoutInDraft(next, placed.template_id, ramped)

      }



      const target = getSourceWorkout(draft, targetAbsoluteWeek, config.sourceProgramDay)

      if (!target) return draft

      const ramped = rampWorkoutForConfig(target.workout, config, weekIndex, scopedExercises)

      if (ramped === target.workout) return draft

      return updateWorkoutInDraft(draft, target.templateId, ramped)

    }

    default:

      return draft

  }

}



export function displayForScopedExercise(

  config: FillStampConfig,

  scoped: ScopedExercise,

  weekIndex: number,

): string {

  if (config.pattern === 'hold' || !config.property) {

    return 'Copy'

  }

  if (!scoped.canRampProperty) {

    return 'Copy'

  }

  const baseline = readBaselineValues(scoped.slot, config.property)

  if (!baseline?.length) return 'Copy'

  const values = computeRampedValues(config, baseline, weekIndex)

  return formatPropertyPreviewValue(config.property, values)

}


