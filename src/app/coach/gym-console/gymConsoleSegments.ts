/**
 * Map gym-console prescription rules → shared ExerciseDisplay segments (v6 grammar).
 */

import type { CurrentWeekRules } from '@/lib/clientProgressionService'
import type { ExerciseDisplaySegments } from '@/components/exercise-display'
import type { WorkLineOutput } from './gymConsoleWorkLine'

function formatRestMss(seconds: number | null | undefined): string | undefined {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return undefined
  const n = Math.round(seconds)
  const m = Math.floor(n / 60)
  const s = n % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function setsRepsFromRule(rule: CurrentWeekRules, work: WorkLineOutput): string | undefined {
  const loadStripped = work.primary?.replace(/\s*@\s*.+$/, '').trim()
  if (loadStripped) return loadStripped

  const sets = rule.targetSets
  const min = rule.targetRepsMin
  const max = rule.targetRepsMax
  const raw = rule.repsVarchar?.trim() || rule.exerciseReps?.trim() || null
  const reps =
    min != null && max != null ? (min === max ? `${min}` : `${min}-${max}`) : raw

  if (sets != null && reps) return `${sets} × ${reps}`
  if (sets != null) return `${sets} sets`
  if (reps) return reps
  return undefined
}

function loadFromRule(rule: CurrentWeekRules): string | undefined {
  if (rule.targetLoadPercentage != null) return `${rule.targetLoadPercentage}% 1RM`
  if (rule.targetWeightKg != null) {
    if (rule.targetWeightKg === 0) return 'BW'
    return `${rule.targetWeightKg} kg`
  }
  return undefined
}

export function segmentsFromWorkAndRule(
  work: WorkLineOutput,
  rule: CurrentWeekRules | null,
): ExerciseDisplaySegments {
  if (!rule || work.isEmpty) {
    return work.primary ? { setsReps: work.primary } : {}
  }

  const extras = [...work.blockSpecific]
  const tempo = rule.tempo?.trim()

  return {
    setsReps: setsRepsFromRule(rule, work),
    load: loadFromRule(rule),
    rir: rule.targetRir != null ? `RIR ${rule.targetRir}` : undefined,
    technique: tempo || undefined,
    rest: formatRestMss(rule.restSeconds),
    extras: extras.length > 0 ? extras : undefined,
  }
}

export function humanizeSetType(setType: string | null | undefined): string {
  const t = (setType || 'straight_set').toLowerCase().replace(/\s+/g, '_')
  const map: Record<string, string> = {
    straight_set: 'Straight',
    straight: 'Straight',
    warm_up: 'Warm-up',
    warm_up_set: 'Warm-up',
    warmup: 'Warm-up',
    cluster_set: 'Cluster',
    drop_set: 'Drop',
    rest_pause: 'Rest-pause',
    superset: 'Superset',
    giant_set: 'Giant set',
    pre_exhaustion: 'Pre-exhaust',
    pre_exhaust: 'Pre-exhaust',
    amrap: 'AMRAP',
    emom: 'EMOM',
    tabata: 'Tabata',
    for_time: 'For time',
    speed_work: 'Speed',
    endurance: 'Endurance',
  }
  return map[t] ?? t.replace(/_/g, ' ')
}
