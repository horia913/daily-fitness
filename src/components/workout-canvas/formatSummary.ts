import type { CanvasExercise, CanvasGroup } from '@/lib/groupModel/canvasTypes'

import { deriveSetType } from '@/lib/groupModel/deriveSetType'



function formatRest(seconds?: number | null): string | null {

  if (seconds == null || seconds <= 0) return null

  const m = Math.floor(seconds / 60)

  const s = seconds % 60

  return `${m}:${String(s).padStart(2, '0')}`

}



function formatDriverLabel(group: CanvasGroup): string | null {

  switch (group.rounds_driver) {

    case 'amrap':

      return group.duration_seconds

        ? `AMRAP · ${formatRest(group.duration_seconds)}`

        : 'AMRAP'

    case 'interval':

      return group.interval_seconds

        ? `Interval · every ${group.interval_seconds}s`

        : 'Interval'

    case 'for_time':

      return group.time_cap_seconds

        ? `For time · ${formatRest(group.time_cap_seconds)}`

        : 'For time'

    default:

      return group.total_sets > 1 ? `${group.total_sets} rounds` : null

  }

}



function measurementValues(slot: CanvasExercise): string[] {

  const rows = [...slot.prescriptions].sort((a, b) => a.set_number - b.set_number)

  if (slot.measurement === 'reps') {

    return rows.map((r) => r.reps).filter((v): v is string => Boolean(v?.trim()))

  }

  if (slot.measurement === 'time') {

    return rows

      .filter((r) => r.work_seconds != null)

      .map((r) => `${r.work_seconds}s`)

  }

  return rows

    .filter((r) => r.distance_meters != null)

    .map((r) => `${r.distance_meters}m`)

}



export function formatExerciseSummary(slot: CanvasExercise, group: CanvasGroup): string {

  const rows = [...slot.prescriptions].sort((a, b) => a.set_number - b.set_number)

  const setCount = rows.length

  const values = measurementValues(slot)

  const parts: string[] = []



  if (group.rounds_driver === 'fixed' || group.rounds_driver === 'for_time') {

    if (values.length > 0) {

      parts.push(`${setCount} × ${values.join('/')}`)

    } else {

      parts.push(`${setCount} sets`)

    }

  } else if (values.length > 0) {

    parts.push(values.join('/'))

  }



  const first = rows[0]

  if (first?.load_percentage != null) parts.push(`${first.load_percentage}% 1RM`)

  else if (first?.weight_kg != null) parts.push(`${first.weight_kg} kg`)



  if (first?.rpe != null) parts.push(`RPE ${first.rpe}`)

  if (first?.tempo) parts.push(first.tempo)



  const rest = slot.rest_seconds ?? group.rest_seconds

  const restLabel = formatRest(rest)

  if (restLabel) parts.push(`rest ${restLabel}`)



  if (parts.length === 0) return `${setCount} sets`

  return parts.join(' · ')

}



export function formatGroupMetaLabel(group: CanvasGroup): string {

  const setType = deriveSetType(

    {

      rounds_driver: group.rounds_driver,

      total_sets: group.total_sets,

    },

    group.slots.map((s) => ({ measurement: s.measurement, technique: s.technique })),

  )

  const driver = formatDriverLabel(group)

  const rest = formatRest(group.rest_seconds)

  const bits = [setType.replace(/_/g, ' '), driver, rest ? `rest ${rest}` : null].filter(Boolean)

  return bits.join(' · ')

}



/** Group index → A–Z (cap at Z). Used for builder canvas badges / labels. */
function indexToGroupLetter(groupIndex: number): string {
  const i = Math.min(Math.max(0, Math.floor(groupIndex)), 25)
  return String.fromCharCode(65 + i)
}

export function slotLetter(groupIndex: number, slotIndex: number, slotCount: number): string {
  const letter = indexToGroupLetter(groupIndex)
  if (slotCount === 1) return letter
  return `${letter}${slotIndex + 1}`
}

export function groupLetter(groupIndex: number): string {
  return indexToGroupLetter(groupIndex)
}


