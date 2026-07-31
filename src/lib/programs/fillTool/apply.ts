import type { ProgramDraftState } from '@/types/programDraft'

import { collectScopedExercises, executeFillAtTarget } from './placement'

import type { FillApplyResult, FillPreview } from './types'



export function applyFillStamp(

  draft: ProgramDraftState,

  preview: FillPreview,

): FillApplyResult {

  const { config } = preview

  let next = draft

  const scoped = collectScopedExercises(draft, config)

  const workoutsUpdated = new Set<string>()

  let writtenCount = 0



  const targetWeeks = new Set<number>()

  for (const row of preview.rows) {

    for (const cell of row.cells) {

      if (cell.status === 'write') {

        targetWeeks.add(cell.absoluteWeek)

      }

    }

  }



  for (const absoluteWeek of targetWeeks) {

    const weekIndex = absoluteWeek - config.sourceAbsoluteWeek

    const beforeWorkouts = { ...next.workouts }

    const beforePending = [...next.pendingNewWorkoutIds]



    next = executeFillAtTarget(next, config, absoluteWeek, weekIndex, scoped)



    for (const id of next.pendingNewWorkoutIds) {

      if (!beforePending.includes(id)) workoutsUpdated.add(id)

    }

    for (const id of next.dirtyWorkoutIds) {

      if (beforeWorkouts[id] !== next.workouts[id]) workoutsUpdated.add(id)

    }

  }



  for (const row of preview.rows) {

    for (const cell of row.cells) {

      if (cell.status === 'write') writtenCount++

    }

  }



  return {

    preview,

    draft: next,

    workoutsUpdated: [...workoutsUpdated],

    writtenCount,

  }

}


