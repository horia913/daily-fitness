import type { ProgramSchedule } from '@/lib/workoutTemplateService'

export const PROGRAM_DAY_SHORT_LABELS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
] as const

export function programDayLabel(dayNum: number): string {
  if (dayNum >= 1 && dayNum <= 7) return PROGRAM_DAY_SHORT_LABELS[dayNum - 1]
  return `Day ${dayNum}`
}

export function getScheduleSlot(
  schedule: ProgramSchedule[],
  absoluteWeek: number,
  programDay: number,
): ProgramSchedule | undefined {
  return schedule.find(
    (row) => (row.week_number ?? 1) === absoluteWeek && (row.program_day ?? 1) === programDay,
  )
}

export interface DaySlotSummary {
  label: string
  isRest: boolean
  isOptional: boolean
  templateId: string | null
  exerciseCount?: number
  groupLabels?: string[]
}

export function summarizeDaySlot(
  slot: ProgramSchedule | undefined,
  templateName?: string | null,
  exerciseCount?: number,
  groupLabels?: string[],
): DaySlotSummary {
  const templateId = slot?.template_id ?? null
  if (!templateId) {
    return { label: 'Rest', isRest: true, isOptional: false, templateId: null, exerciseCount: 0 }
  }
  return {
    label: templateName?.trim() || slot?.template_name?.trim() || 'Workout',
    isRest: false,
    isOptional: Boolean(slot?.is_optional),
    templateId,
    exerciseCount: exerciseCount ?? undefined,
    groupLabels: groupLabels?.length ? groupLabels : undefined,
  }
}

/** Program timeline day index (1-based) for column date display. */
export function programTimelineDay(absoluteWeek: number, programDay: number): number {
  return (absoluteWeek - 1) * 7 + programDay
}
