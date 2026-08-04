import type { CanvasExercise, CanvasGroup } from '@/lib/groupModel/canvasTypes'
import type { Prescription } from '@/lib/groupModel/types'
import type { ExerciseDisplaySegments } from './types'

function formatRest(seconds?: number | null): string | null {
  if (seconds == null || seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function sortedPrescriptions(slot: CanvasExercise): Prescription[] {
  return [...slot.prescriptions].sort((a, b) => a.set_number - b.set_number)
}

function isIsometricPerSide(slot: CanvasExercise, first: Prescription | undefined): boolean {
  const tempo = first?.tempo?.toLowerCase() ?? ''
  if (tempo.includes('isometric')) return true
  const reps = first?.reps?.toLowerCase() ?? ''
  return reps.includes('/side') || reps.includes('per side')
}

/** Mirrors workout-canvas/formatSummary.ts measurementValues + per-side isometric. */
function measurementValues(slot: CanvasExercise): string[] {
  const rows = sortedPrescriptions(slot)
  const first = rows[0]
  const perSide = slot.measurement === 'time' && isIsometricPerSide(slot, first)

  if (slot.measurement === 'reps') {
    return rows.map((r) => r.reps).filter((v): v is string => Boolean(v?.trim()))
  }

  if (slot.measurement === 'time') {
    return rows
      .filter((r) => r.work_seconds != null)
      .map((r) => `${r.work_seconds}s${perSide ? '/side' : ''}`)
  }

  return rows
    .filter((r) => r.distance_meters != null)
    .map((r) => `${r.distance_meters}m`)
}

function buildSetsReps(
  slot: CanvasExercise,
  group: CanvasGroup,
  compact: boolean,
): string | undefined {
  const rows = sortedPrescriptions(slot)
  const setCount = rows.length
  const values = measurementValues(slot)

  const showSetPrefix =
    !compact && (group.rounds_driver === 'fixed' || group.rounds_driver === 'for_time')

  if (showSetPrefix) {
    if (values.length > 0) return `${setCount} × ${values.join('/')}`
    return setCount > 0 ? `${setCount} sets` : undefined
  }

  if (values.length > 0) return values.join('/')
  return undefined
}

function formatLoad(first: Prescription | undefined): string | undefined {
  if (!first) return undefined
  if (first.load_percentage != null) return `${first.load_percentage}% 1RM`
  if (first.weight_kg != null) {
    if (first.weight_kg === 0) return 'BW'
    return `${first.weight_kg} kg`
  }
  return undefined
}

function protocolExtras(slot: CanvasExercise, group: CanvasGroup): string[] {
  const extras: string[] = []
  const first = sortedPrescriptions(slot)[0]

  if (slot.technique === 'cluster') {
    if (slot.clusters_per_set != null && slot.reps_per_cluster != null) {
      extras.push(`${slot.clusters_per_set} × ${slot.reps_per_cluster} clusters`)
    }
    if (slot.intra_cluster_rest_seconds != null && slot.intra_cluster_rest_seconds > 0) {
      extras.push(`intra-cluster ${slot.intra_cluster_rest_seconds}s`)
    }
  }

  if (slot.technique === 'rest_pause') {
    const pauses = slot.max_rest_pauses ?? '—'
    const dur = slot.rest_pause_seconds ?? '—'
    extras.push(`+ up to ${pauses} rest-pause × ${dur}s`)
  }

  if (slot.technique === 'drop_set') {
    const rows = sortedPrescriptions(slot)
    if (rows.length > 1) {
      const drops = rows
        .slice(1)
        .map((r) => {
          const load =
            r.load_percentage != null
              ? `${r.load_percentage}%`
              : r.weight_kg != null
                ? `${r.weight_kg}kg`
                : null
          const reps = r.reps?.trim()
          if (load && reps) return `${reps} @ ${load}`
          if (reps) return reps
          return load
        })
        .filter(Boolean)
      if (drops.length) extras.push(`drop ${drops.join(' → ')}`)
    } else if (slot.drop_percentage != null) {
      extras.push(`${slot.drop_percentage}% drop`)
    }
  }

  if (group.rounds_driver === 'amrap' && group.duration_seconds) {
    const mins = Math.round(group.duration_seconds / 60)
    extras.push(`AMRAP ${mins} min`)
  }

  if (group.rounds_driver === 'interval' && group.interval_seconds) {
    extras.push(`every ${group.interval_seconds}s`)
    if (group.duration_seconds) {
      const mins = Math.round(group.duration_seconds / 60)
      extras.push(`${mins} min`)
    }
  }

  if (group.rounds_driver === 'for_time' && group.time_cap_seconds) {
    extras.push(`cap ${formatRest(group.time_cap_seconds)}`)
  }

  if (slot.target_time_seconds != null) {
    extras.push(`target ${formatRest(slot.target_time_seconds)}`)
  }
  if (slot.target_pace_seconds_per_km != null) {
    const pace = formatRest(slot.target_pace_seconds_per_km)
    if (pace) extras.push(`pace ${pace}/km`)
  }
  if (slot.target_speed_pct != null) {
    extras.push(`${slot.target_speed_pct}% speed`)
  }
  if (slot.hr_zone != null) {
    extras.push(`HR zone ${slot.hr_zone}`)
  }
  if (slot.target_hr_pct != null) {
    extras.push(`${slot.target_hr_pct}% max HR`)
  }

  if (first?.tempo && isIsometricPerSide(slot, first) && slot.measurement !== 'time') {
    // tempo shown in technique segment; per-side reps may already be in setsReps
  }

  return extras
}

/**
 * Build structured prescription segments from canvas slot + group.
 * Grammar mirrors components/workout-canvas/formatSummary.ts.
 */
export function buildPrescriptionSegments(
  slot: CanvasExercise,
  group: CanvasGroup,
  options?: { compact?: boolean },
): ExerciseDisplaySegments {
  const compact = options?.compact ?? false
  const rows = sortedPrescriptions(slot)
  const first = rows[0]

  const setsReps = buildSetsReps(slot, group, compact)
  const load = formatLoad(first)
  const rpe = first?.rpe != null ? `RPE ${first.rpe}` : undefined
  const technique = first?.tempo?.trim() || undefined

  const restSeconds = slot.rest_seconds ?? group.rest_seconds
  const rest = formatRest(restSeconds) ?? undefined

  const extras = protocolExtras(slot, group)

  return {
    setsReps,
    load,
    rpe,
    technique,
    rest,
    extras: extras.length > 0 ? extras : undefined,
  }
}
