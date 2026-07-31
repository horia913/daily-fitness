import type { CanvasExercise } from '@/lib/groupModel/canvasTypes'



export type FillScope = 'exercise' | 'group' | 'day' | 'week'



export type FillPatternKind = 'linear' | 'step' | 'hold' | 'wave'



export type FillPropertyKey =

  | 'load_pct'

  | 'load_kg'

  | 'reps'

  | 'rir'

  | 'work_seconds'

  | 'distance_meters'

  | 'rest_after_exercise'



export type LoadUnit = 'pct' | 'kg'



export type FillSkipReason = 'different_exercise' | 'property_not_ramped' | 'non_numeric_reps'



export type FillPreviewCellStatus = 'source' | 'write' | 'skip_different'



export interface ExerciseMatchKey {

  groupIndex: number

  exerciseOrder: number

  exerciseId: string

}



export interface FillPatternInputs {

  step?: number

  hold?: number

  jump?: number

  waveLength?: number

  withinStep?: number

  cycleStep?: number

}



export interface FillStampConfig {

  sourceAbsoluteWeek: number

  sourceProgramDay: number

  scope: FillScope

  scopeMatchKeys: ExerciseMatchKey[]

  /** Null when pattern is Hold (pure copy). */

  property: FillPropertyKey | null

  pattern: FillPatternKind

  patternInputs: FillPatternInputs

  /** Inclusive end of ramp range. weekIndex 0 = source week. */

  endAbsoluteWeek: number

  activeBlockId: string | null

}



export interface FillPreviewCell {

  weekIndex: number

  absoluteWeek: number

  display: string

  status: FillPreviewCellStatus

  skipReason?: FillSkipReason

  /** Target weekday for placement (source program day for day/exercise/group). */

  programDay: number

}



export interface FillPreviewRow {

  rowId: string

  programDay: number

  matchKey?: ExerciseMatchKey

  label: string

  baselineDisplay: string

  cells: FillPreviewCell[]

  canRampProperty: boolean

}



export interface FillSkipEntry {

  absoluteWeek: number

  weekIndex: number

  programDay: number

  label: string

  reason: FillSkipReason

}



export interface FillPreview {

  config: FillStampConfig

  weekLabels: string[]

  absoluteWeeks: number[]

  rows: FillPreviewRow[]

  skips: FillSkipEntry[]

  summary: {
    willWrite: number
    skippedDifferent: number
    sourceEmpty?: boolean
    sourceEmptyMessage?: string
  }

}



export interface FillApplyResult {

  preview: FillPreview

  draft: import('@/types/programDraft').ProgramDraftState

  workoutsUpdated: string[]

  writtenCount: number

}



export interface ScopedExercise {

  programDay: number

  matchKey: ExerciseMatchKey

  label: string

  slot: CanvasExercise

  groupIndex: number

  canRampProperty: boolean

}


