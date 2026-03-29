/**
 * Pure progression generation engine.
 *
 * IMPORTANT — `ProgramProgressionRule.rir` (DB column `rir`):
 * Stores **prescribed RPE** (1–10), not “reps in reserve”. No column rename; values are RPE.
 *
 * Prescribed RPE progression (non-deload profiles):
 *   newRPE = min(10, week1RPE + floor((weekNumber - 1) / rpeIncreaseFrequency))
 *   e.g. week1 RPE 7, frequency 2 → W2:7, W3:8, W5:9
 * Deload (reduction): RPE = max(1, week1RPE - 1)
 *
 * ─── weekIndex convention ───────────────────────────────────────────────────
 * weekIndex = weekNumber - 2
 *   → weekIndex = 0 for Week 2 (first generated week)
 *   → weekIndex = 1 for Week 3, etc.
 *
 * specWeekIndex = weekIndex + 1  (1-indexed from Week 1, used in all formulas)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Set-type tiers:
 *   Tier 1 (full):    straight_set
 *   Tier 2 (partial): superset, giant_set, pre_exhaustion, cluster_set, rest_pause, drop_set
 *   Tier 3 (skip):    amrap, emom, for_time, tabata
 *     → Tier 3 exercises are copied from Week 1 unchanged to all subsequent weeks.
 *
 * All fields that are null in Week 1 are never modified.
 * No database calls or side effects.
 */

import type { ProgramProgressionRule } from './programProgressionService'
import type { ProgressionProfile, TrainingBlockGoal } from '@/types/trainingBlock'

// ─── Tier classification ──────────────────────────────────────────────────────

export const TIER_3_SKIP = new Set([
  'amrap', 'emom', 'for_time', 'tabata',
])

// ─── Profile configs ──────────────────────────────────────────────────────────

const VOLUME_RAMP_CONFIG = {
  rep_ceiling: 12,
  rep_floor: 8,
  isolation_rep_ceiling: 15,
  isolation_rep_floor: 10,
  cluster_rep_ceiling: 6,
  cluster_rep_floor: 3,
  set_max_addition: 2,
  weight_bump_on_reset: 0.025,
  /** RPE steps every N block weeks: +1 RPE per floor((weekNumber-1)/N) */
  rpe_increase_frequency: 2,
} as const

const INTENSITY_RAMP_CONFIG = {
  weight_increment_pct: 0.025,
  rep_floor: 2,
  set_floor: 2,
  /** Steeper RPE ramp than volume (every week of block index). */
  rpe_increase_frequency: 1,
  rest_increment: 15,
  rest_max: 300,
} as const

const TAPER_CONFIG = {
  set_floor: 1,
  rep_floor: 1,
  weight_increment_pct: 0.015,
  rest_increment: 30,
  rest_max: 360,
} as const

const DENSITY_CONFIG = {
  rest_reduction_per_week: 10,
  rest_floor: 30,
  rest_between_pairs_floor: 15,
  intra_cluster_rest_floor: 5,
  rest_pause_duration_floor: 5,
  rep_increment_frequency: 2,
} as const

const REDUCTION_CONFIG = {
  sets_multiplier: 0.5,
  sets_floor: 2,
  weight_multiplier: 0.6,
} as const

const LINEAR_CONFIG = {
  weight_increment_pct: 0.025,
  rep_increment: 1,
  rpe_increase_frequency: 2,
} as const

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ProgressionGeneratorInput {
  week1Rules: ProgramProgressionRule[]
  profile: ProgressionProfile
  durationWeeks: number
  goal: TrainingBlockGoal
}

export interface ProgressionChange {
  exerciseName: string
  /** Keyed to the progression rule's set_entry_id so the UI can map changes per exercise row reliably. */
  set_entry_id?: string
  field: string
  previousValue: number
  newValue: number
  changeDescription: string
  /** True for the synthetic change record emitted when a rep-ceiling cycle fires. */
  isCycleEvent?: boolean
}

export interface GeneratedWeekRules {
  weekNumber: number
  rules: ProgramProgressionRule[]
  changes: ProgressionChange[]
}

export interface GenerationResult {
  weekRules: GeneratedWeekRules[]
  summary: {
    autoProgressed: number
    unchanged: number
    unchangedTypes: string[]
  }
}

// ─── Private utilities ────────────────────────────────────────────────────────

type R = ProgramProgressionRule & Record<string, any>

function parseReps(v: string | number | null | undefined): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isNaN(v) ? null : v
  const s = String(v).trim()
  if (!s) return null
  const n = parseInt(s.split('-')[0], 10)
  return Number.isNaN(n) ? null : n
}

/**
 * Round weight to practical increments:
 *   < 20 kg  → nearest 0.5 kg
 *   20–49 kg → nearest 1 kg
 *   ≥ 50 kg  → nearest 0.5 kg
 */
export function roundWeight(kg: number): number {
  if (kg < 20) return Math.round(kg * 2) / 2
  if (kg < 50) return Math.round(kg)
  return Math.round(kg * 2) / 2
}

function getExerciseName(rule: ProgramProgressionRule): string {
  return rule.exercise?.name ?? 'Exercise'
}

function cloneRuleForWeek(
  rule: ProgramProgressionRule,
  weekNumber: number,
): ProgramProgressionRule {
  const { id, created_at, updated_at, ...rest } = rule
  return { ...JSON.parse(JSON.stringify(rest)), week_number: weekNumber } as ProgramProgressionRule
}

function addChange(
  changes: ProgressionChange[],
  setEntryId: string | undefined,
  name: string,
  field: string,
  prev: number,
  next: number,
  desc: string,
  isCycleEvent?: boolean,
): void {
  changes.push({
    exerciseName: name, field,
    set_entry_id: setEntryId,
    previousValue: prev, newValue: next,
    changeDescription: desc, isCycleEvent,
  })
}

const PRESCRIBED_RPE_CEILING = 10

/** `b.rir` / `r.rir` = prescribed RPE in DB column `rir`. */
function prescribedRpeForWeek(
  week1P: number,
  weekNumber: number,
  increaseEveryNWeeks: number,
): number {
  const steps = Math.floor((weekNumber - 1) / increaseEveryNWeeks)
  return Math.min(PRESCRIBED_RPE_CEILING, week1P + steps)
}

function applyPrescribedRpeProgression(
  r: R,
  b: R,
  weekNumber: number,
  increaseEveryNWeeks: number,
  changes: ProgressionChange[],
  setEntryId: string | undefined,
  name: string,
): void {
  const week1P = b.rir as number | null
  if (week1P == null) return
  const newP = prescribedRpeForWeek(week1P, weekNumber, increaseEveryNWeeks)
  const prevP = (r.rir as number | null) ?? week1P
  if (newP !== prevP) {
    r.rir = newP
    const d = newP - prevP
    addChange(
      changes,
      setEntryId,
      name,
      'rir',
      prevP,
      newP,
      d > 0 ? `+${d} RPE` : `${d} RPE`,
    )
  }
}

// ─── Profile: Volume Ramp ─────────────────────────────────────────────────────

/**
 * Emit the cycle event: increment sets (capped), optionally bump weight,
 * then push a single isCycleEvent change record.
 * Rep field has already been reset to floor by the caller.
 */
function emitCycle(
  r: R,
  base: R,
  prevSets: number | null,
  prevWeight: number | null,
  repFloor: number,
  bumpWeight: boolean,
  changes: ProgressionChange[],
  name: string,
): void {
  const setEntryId = (base.set_entry_id as string | undefined) ?? undefined
  const week1Sets = base.sets as number | null
  let newSets = prevSets
  if (prevSets != null && week1Sets != null) {
    newSets = Math.min(prevSets + 1, week1Sets + VOLUME_RAMP_CONFIG.set_max_addition)
    r.sets = newSets
  }

  let newWeight: number | null = null
  if (bumpWeight && prevWeight != null) {
    newWeight = roundWeight(prevWeight * (1 + VOLUME_RAMP_CONFIG.weight_bump_on_reset))
    r.weight_kg = newWeight
  }

  const setsStr =
    newSets != null && prevSets != null && newSets !== prevSets
      ? `sets ${prevSets}→${newSets}, `
      : ''
  const weightStr =
    prevWeight != null && newWeight != null && prevWeight !== newWeight
      ? `, weight ${prevWeight}→${newWeight}kg`
      : ''

  addChange(
    changes,
    setEntryId,
    name,
    'cycle',
    0,
    0,
    `↑ New cycle: ${setsStr}reps reset to ${repFloor}${weightStr}`,
    true,
  )
}

function applyVolumeRamp(
  prev: ProgramProgressionRule,
  base: ProgramProgressionRule,
  weekNumber: number,
  weekIndex: number,
): { rule: ProgramProgressionRule; changes: ProgressionChange[] } {
  const r = cloneRuleForWeek(prev, weekNumber) as R
  const b = base as R
  const changes: ProgressionChange[] = []
  const name = getExerciseName(base)
  const setEntryId = (b.set_entry_id as string | undefined) ?? undefined
  const cfg = VOLUME_RAMP_CONFIG
  const specWeekIndex = weekIndex + 1 // 1-indexed from Week 1

  applyPrescribedRpeProgression(
    r,
    b,
    weekNumber,
    cfg.rpe_increase_frequency,
    changes,
    setEntryId,
    name,
  )

  const prevSets = r.sets as number | null
  const prevWeight = r.weight_kg as number | null

  switch (prev.set_type) {
    case 'straight_set': {
      const prevReps = parseReps(r.reps)
      if (prevReps != null) {
        const wouldBe = prevReps + 1
        if (wouldBe > cfg.rep_ceiling) {
          r.reps = String(cfg.rep_floor)
          emitCycle(r, b, prevSets, prevWeight, cfg.rep_floor, true, changes, name)
        } else {
          r.reps = String(wouldBe)
          addChange(changes, setEntryId, name, 'reps', prevReps, wouldBe, '+1 rep')
        }
      }
      break
    }

    case 'giant_set': {
      const prevReps = parseReps(r.reps)
      if (prevReps != null) {
        const wouldBe = prevReps + 1
        if (wouldBe > cfg.rep_ceiling) {
          r.reps = String(cfg.rep_floor)
          emitCycle(r, b, prevSets, null, cfg.rep_floor, false, changes, name)
        } else {
          r.reps = String(wouldBe)
          addChange(changes, setEntryId, name, 'reps', prevReps, wouldBe, '+1 rep')
        }
      }
      break
    }

    case 'superset': {
      const prev1 = parseReps(r.first_exercise_reps)
      const prev2 = parseReps(r.second_exercise_reps)
      const would1 = prev1 != null ? prev1 + 1 : null
      const would2 = prev2 != null ? prev2 + 1 : null
      const cycled1 = would1 != null && would1 > cfg.rep_ceiling
      const cycled2 = would2 != null && would2 > cfg.rep_ceiling

      if (cycled1 || cycled2) {
        // Reset BOTH rep fields when either hits the ceiling
        if (prev1 != null) r.first_exercise_reps = String(cfg.rep_floor)
        if (prev2 != null) r.second_exercise_reps = String(cfg.rep_floor)
        emitCycle(r, b, prevSets, null, cfg.rep_floor, false, changes, name)
      } else {
        if (prev1 != null && would1 != null) {
          r.first_exercise_reps = String(would1)
          addChange(changes, setEntryId, name, 'first_exercise_reps', prev1, would1, '+1 rep (A)')
        }
        if (prev2 != null && would2 != null) {
          r.second_exercise_reps = String(would2)
          addChange(changes, setEntryId, name, 'second_exercise_reps', prev2, would2, '+1 rep (B)')
        }
      }
      break
    }

    case 'pre_exhaustion': {
      const prevIso = parseReps(r.isolation_reps)
      const prevComp = parseReps(r.compound_reps)
      const wouldIso = prevIso != null ? prevIso + 1 : null
      const wouldComp = prevComp != null ? prevComp + 1 : null
      const cycledIso = wouldIso != null && wouldIso > cfg.isolation_rep_ceiling
      const cycledComp = wouldComp != null && wouldComp > cfg.rep_ceiling

      if (cycledIso || cycledComp) {
        if (prevIso != null) r.isolation_reps = String(cfg.isolation_rep_floor)
        if (prevComp != null) r.compound_reps = String(cfg.rep_floor)
        emitCycle(r, b, prevSets, null, cfg.rep_floor, false, changes, name)
      } else {
        if (prevIso != null && wouldIso != null) {
          r.isolation_reps = String(wouldIso)
          addChange(changes, setEntryId, name, 'isolation_reps', prevIso, wouldIso, '+1 iso rep')
        }
        if (prevComp != null && wouldComp != null) {
          r.compound_reps = String(wouldComp)
          addChange(changes, setEntryId, name, 'compound_reps', prevComp, wouldComp, '+1 comp rep')
        }
      }
      break
    }

    case 'cluster_set': {
      // Sets unchanged; reps_per_cluster has its own ceiling/floor (no weight bump, no set increment)
      const prevClusterReps = r.reps_per_cluster as number | null
      if (prevClusterReps != null) {
        const wouldBe = prevClusterReps + 1
        if (wouldBe > cfg.cluster_rep_ceiling) {
          r.reps_per_cluster = cfg.cluster_rep_floor
          addChange(changes, setEntryId, name, 'reps_per_cluster', prevClusterReps, cfg.cluster_rep_floor,
            `↑ reps reset to ${cfg.cluster_rep_floor}`)
        } else {
          r.reps_per_cluster = wouldBe
          addChange(changes, setEntryId, name, 'reps_per_cluster', prevClusterReps, wouldBe, '+1 rep/cluster')
        }
      }
      break
    }

    case 'rest_pause': {
      // Sets unchanged; reps increment with ceiling/floor (no weight bump)
      const prevReps = parseReps(r.reps)
      if (prevReps != null) {
        const wouldBe = prevReps + 1
        if (wouldBe > cfg.rep_ceiling) {
          r.reps = String(cfg.rep_floor)
          addChange(changes, setEntryId, name, 'reps', prevReps, cfg.rep_floor, `reps reset to ${cfg.rep_floor}`)
        } else {
          r.reps = String(wouldBe)
          addChange(changes, setEntryId, name, 'reps', prevReps, wouldBe, '+1 rep')
        }
      }
      break
    }

    case 'drop_set': {
      // Sets unchanged; reps +1/week, no ceiling/floor; weight_reduction_percentage: NEVER touch
      const prevReps = parseReps(r.exercise_reps)
      if (prevReps != null) {
        r.exercise_reps = String(prevReps + 1)
        addChange(changes, setEntryId, name, 'exercise_reps', prevReps, prevReps + 1, '+1 rep')
      }
      break
    }
  }

  return { rule: r as ProgramProgressionRule, changes }
}

// ─── Profile: Intensity Ramp ──────────────────────────────────────────────────

function applyIntensityRamp(
  prev: ProgramProgressionRule,
  base: ProgramProgressionRule,
  weekNumber: number,
  weekIndex: number,
  totalWeeks: number,
): { rule: ProgramProgressionRule; changes: ProgressionChange[] } {
  // drop_set: copy Week 1 as-is — drop sets are volume/metabolic tools, not intensity tools
  if (prev.set_type === 'drop_set') {
    return { rule: cloneRuleForWeek(base, weekNumber), changes: [] }
  }

  const r = cloneRuleForWeek(prev, weekNumber) as R
  const b = base as R
  const changes: ProgressionChange[] = []
  const name = getExerciseName(base)
  const setEntryId = (b.set_entry_id as string | undefined) ?? undefined
  const cfg = INTENSITY_RAMP_CONFIG
  const specWeekIndex = weekIndex + 1

  // halfPoint and sixtyPercent computed from totalWeeks per spec
  const halfPoint = Math.ceil(totalWeeks / 2)
  const sixtyPercent = Math.ceil(totalWeeks * 0.6)

  // Weight: +2.5% per week from Week 1 baseline (non-cumulative)
  const week1Weight = b.weight_kg as number | null
  if (week1Weight != null) {
    const newWeight = roundWeight(week1Weight * (1 + cfg.weight_increment_pct * specWeekIndex))
    const prevWeight = r.weight_kg as number | null
    const prevW = prevWeight ?? week1Weight
    if (newWeight !== prevW) {
      r.weight_kg = newWeight
      const d = newWeight - prevW
      addChange(changes, setEntryId, name, 'weight_kg', prevW, newWeight, d > 0 ? `+${d.toFixed(1)}kg` : `${d.toFixed(1)}kg`)
    }
  }

  applyPrescribedRpeProgression(
    r,
    b,
    weekNumber,
    cfg.rpe_increase_frequency,
    changes,
    setEntryId,
    name,
  )

  // Sets: stable first 60%, -1/week last 40% (from Week 1 baseline)
  const week1Sets = b.sets as number | null
  if (week1Sets != null) {
    let newSets: number
    if (specWeekIndex >= sixtyPercent) {
      const weeksIntoLast = specWeekIndex - sixtyPercent
      newSets = Math.max(week1Sets - (weeksIntoLast + 1), cfg.set_floor)
    } else {
      newSets = week1Sets
    }
    const prevSets = r.sets as number | null
    if (prevSets != null && newSets !== prevSets) {
      r.sets = newSets
      const d = newSets - prevSets
      addChange(changes, setEntryId, name, 'sets', prevSets, newSets, d < 0 ? `${d} set` : `+${d} set`)
    }
  }

  // Helper: apply rep reduction from Week 1 baseline
  const applyRepReduction = (field: string, label: string, isIntField = false) => {
    const week1Reps = parseReps(b[field])
    if (week1Reps == null) return
    let newReps: number
    if (specWeekIndex >= halfPoint) {
      const weeksIntoSecondHalf = specWeekIndex - halfPoint
      newReps = Math.max(week1Reps - (weeksIntoSecondHalf + 1), cfg.rep_floor)
    } else {
      newReps = week1Reps // stable first half
    }
    const prevReps = parseReps(r[field])
    if (prevReps == null || newReps === prevReps) return
    r[field] = isIntField ? newReps : String(newReps)
    addChange(changes, setEntryId, name, field, prevReps, newReps, label)
  }

  // Helper: +15s rest per week from Week 1 baseline
  const applyRestIncrease = (field: string, label: string) => {
    const week1Rest = b[field] as number | null
    if (week1Rest == null) return
    const newRest = Math.min(week1Rest + cfg.rest_increment * specWeekIndex, cfg.rest_max)
    const prevRest = r[field] as number | null
    const prevR = prevRest ?? week1Rest
    if (newRest !== prevR) {
      r[field] = newRest
      addChange(changes, setEntryId, name, field, prevR, newRest, label)
    }
  }

  switch (prev.set_type) {
    case 'straight_set':
      applyRepReduction('reps', '-1 rep')
      applyRestIncrease('rest_seconds', '+15s rest')
      break

    case 'superset':
      applyRepReduction('first_exercise_reps', '-1 rep (A)')
      applyRepReduction('second_exercise_reps', '-1 rep (B)')
      applyRestIncrease('rest_between_pairs', '+15s pair rest')
      break

    case 'giant_set':
      applyRepReduction('reps', '-1 rep')
      applyRestIncrease('rest_between_pairs', '+15s pair rest')
      break

    case 'pre_exhaustion':
      applyRepReduction('isolation_reps', '-1 iso rep')
      applyRepReduction('compound_reps', '-1 comp rep')
      applyRestIncrease('rest_between_pairs', '+15s pair rest')
      break

    case 'cluster_set': {
      // reps_per_cluster: unchanged (weight-focused)
      // intra_cluster_rest: +5s per week from Week 1 baseline
      const week1IntraRest = b.intra_cluster_rest as number | null
      if (week1IntraRest != null) {
        const newIntraRest = week1IntraRest + 5 * specWeekIndex
        const prevIntraRest = r.intra_cluster_rest as number | null
        if (prevIntraRest != null && newIntraRest !== prevIntraRest) {
          r.intra_cluster_rest = newIntraRest
          addChange(changes, setEntryId, name, 'intra_cluster_rest', prevIntraRest, newIntraRest,
            `+${newIntraRest - prevIntraRest}s intra rest`)
        }
      }
      applyRestIncrease('rest_seconds', '+15s rest')
      break
    }

    case 'rest_pause':
      applyRepReduction('reps', '-1 rep')
      applyRestIncrease('rest_seconds', '+15s rest')
      break
  }

  return { rule: r as ProgramProgressionRule, changes }
}

// ─── Profile: Taper ───────────────────────────────────────────────────────────

function applyTaper(
  prev: ProgramProgressionRule,
  base: ProgramProgressionRule,
  weekNumber: number,
  weekIndex: number,
): { rule: ProgramProgressionRule; changes: ProgressionChange[] } {
  const r = cloneRuleForWeek(prev, weekNumber) as R
  const b = base as R
  const changes: ProgressionChange[] = []
  const name = getExerciseName(base)
  const setEntryId = (b.set_entry_id as string | undefined) ?? undefined
  const cfg = TAPER_CONFIG
  const specWeekIndex = weekIndex + 1

  // Sets: -1/week from previous (cumulative), floor 1
  const prevSets = r.sets as number | null
  if (prevSets != null) {
    const newSets = Math.max(prevSets - 1, cfg.set_floor)
    if (newSets !== prevSets) {
      r.sets = newSets
      addChange(changes, setEntryId, name, 'sets', prevSets, newSets, `-1 set`)
    }
  }

  // Weight: +1.5% per week from Week 1 baseline (non-cumulative)
  const week1Weight = b.weight_kg as number | null
  if (week1Weight != null) {
    const newWeight = roundWeight(week1Weight * (1 + cfg.weight_increment_pct * specWeekIndex))
    const prevWeight = r.weight_kg as number | null
    const prevW = prevWeight ?? week1Weight
    if (newWeight !== prevW) {
      r.weight_kg = newWeight
      const d = newWeight - prevW
      addChange(changes, setEntryId, name, 'weight_kg', prevW, newWeight, d > 0 ? `+${d.toFixed(1)}kg` : `${d.toFixed(1)}kg`)
    }
  }

  // Prescribed RPE (column `rir`): hold Week 1 baseline for every taper week
  const week1P = b.rir as number | null
  if (week1P != null) {
    const newP = week1P
    const prevP = (r.rir as number | null) ?? week1P
    if (newP !== prevP) {
      r.rir = newP
      const d = newP - prevP
      addChange(
        changes,
        setEntryId,
        name,
        'rir',
        prevP,
        newP,
        d > 0 ? `+${d} RPE` : `${d} RPE`,
      )
    }
  }

  // Helper: +30s rest per week from Week 1 baseline
  const applyTaperRest = (field: string) => {
    const week1Rest = b[field] as number | null
    if (week1Rest == null) return
    const newRest = Math.min(week1Rest + cfg.rest_increment * specWeekIndex, cfg.rest_max)
    const prevRest = r[field] as number | null
    const prevR = prevRest ?? week1Rest
    if (newRest !== prevR) {
      r[field] = newRest
      addChange(changes, setEntryId, name, field, prevR, newRest, `+${newRest - prevR}s rest`)
    }
  }

  // Helper: -1 rep per week from previous (cumulative), floor 1
  const applyRepReduction = (field: string, label: string) => {
    const prevReps = parseReps(r[field])
    if (prevReps == null) return
    const newReps = Math.max(prevReps - 1, cfg.rep_floor)
    if (newReps !== prevReps) {
      r[field] = String(newReps)
      addChange(changes, setEntryId, name, field, prevReps, newReps, label)
    }
  }

  switch (prev.set_type) {
    case 'straight_set':
      applyRepReduction('reps', '-1 rep')
      applyTaperRest('rest_seconds')
      break
    case 'superset':
      applyRepReduction('first_exercise_reps', '-1 rep (A)')
      applyRepReduction('second_exercise_reps', '-1 rep (B)')
      applyTaperRest('rest_between_pairs')
      break
    case 'giant_set':
      applyRepReduction('reps', '-1 rep')
      applyTaperRest('rest_between_pairs')
      break
    case 'pre_exhaustion':
      applyRepReduction('isolation_reps', '-1 iso rep')
      applyRepReduction('compound_reps', '-1 comp rep')
      applyTaperRest('rest_between_pairs')
      break
    case 'cluster_set':
      // reps_per_cluster stays in taper (already low rep)
      applyTaperRest('rest_seconds')
      break
    case 'rest_pause':
      applyRepReduction('reps', '-1 rep')
      applyTaperRest('rest_seconds')
      break
    case 'drop_set':
      // Sets already handled above; drop set reps stay
      applyTaperRest('rest_seconds')
      break
  }

  return { rule: r as ProgramProgressionRule, changes }
}

// ─── Profile: Density Increase ────────────────────────────────────────────────

function applyDensityIncrease(
  prev: ProgramProgressionRule,
  base: ProgramProgressionRule,
  weekNumber: number,
  weekIndex: number,
): { rule: ProgramProgressionRule; changes: ProgressionChange[] } {
  const r = cloneRuleForWeek(prev, weekNumber) as R
  const changes: ProgressionChange[] = []
  const name = getExerciseName(base)
  const setEntryId = (base.set_entry_id as string | undefined) ?? undefined
  const cfg = DENSITY_CONFIG
  const specWeekIndex = weekIndex + 1

  // Helper: reduce a rest field (cumulative from prev)
  const reduceRest = (field: string, floor: number, amount: number, label: string) => {
    const prevRest = r[field] as number | null
    if (prevRest == null) return
    const newRest = Math.max(prevRest - amount, floor)
    if (newRest !== prevRest) {
      r[field] = newRest
      addChange(changes, setEntryId, name, field, prevRest, newRest, label)
    }
  }

  // Helper: +1 rep when specWeekIndex is even (every other week starting Week 3)
  const incRepIfEven = (field: string, label: string) => {
    if (specWeekIndex % cfg.rep_increment_frequency !== 0) return
    const prevReps = parseReps(r[field])
    if (prevReps == null) return
    const newReps = prevReps + 1
    r[field] = String(newReps)
    addChange(changes, setEntryId, name, field, prevReps, newReps, label)
  }

  switch (prev.set_type) {
    case 'straight_set':
      reduceRest('rest_seconds', cfg.rest_floor, cfg.rest_reduction_per_week, `-${cfg.rest_reduction_per_week}s rest`)
      incRepIfEven('reps', '+1 rep')
      break
    case 'superset':
      reduceRest('rest_between_pairs', cfg.rest_between_pairs_floor, cfg.rest_reduction_per_week, `-${cfg.rest_reduction_per_week}s pair rest`)
      incRepIfEven('first_exercise_reps', '+1 rep (A)')
      incRepIfEven('second_exercise_reps', '+1 rep (B)')
      break
    case 'giant_set':
      reduceRest('rest_between_pairs', cfg.rest_between_pairs_floor, cfg.rest_reduction_per_week, `-${cfg.rest_reduction_per_week}s pair rest`)
      incRepIfEven('reps', '+1 rep')
      break
    case 'pre_exhaustion':
      reduceRest('rest_between_pairs', cfg.rest_between_pairs_floor, cfg.rest_reduction_per_week, `-${cfg.rest_reduction_per_week}s pair rest`)
      incRepIfEven('isolation_reps', '+1 iso rep')
      incRepIfEven('compound_reps', '+1 comp rep')
      break
    case 'cluster_set':
      reduceRest('intra_cluster_rest', cfg.intra_cluster_rest_floor, 5, '-5s intra rest')
      reduceRest('rest_seconds', cfg.rest_floor, cfg.rest_reduction_per_week, `-${cfg.rest_reduction_per_week}s rest`)
      break
    case 'rest_pause':
      reduceRest('rest_pause_duration', cfg.rest_pause_duration_floor, 5, '-5s pause')
      reduceRest('rest_seconds', cfg.rest_floor, cfg.rest_reduction_per_week, `-${cfg.rest_reduction_per_week}s rest`)
      break
    case 'drop_set':
      reduceRest('rest_seconds', cfg.rest_floor, cfg.rest_reduction_per_week, `-${cfg.rest_reduction_per_week}s rest`)
      break
  }

  return { rule: r as ProgramProgressionRule, changes }
}

// ─── Profile: Reduction (Deload) ─────────────────────────────────────────────

/**
 * FLAT profile: always derives from Week 1 baseline, not from previous week.
 * deloadSets and deloadWeight are pre-computed once before the main loop.
 */
function applyReduction(
  base: ProgramProgressionRule,
  weekNumber: number,
  deloadSets: number,
  deloadWeight: number | null,
): { rule: ProgramProgressionRule; changes: ProgressionChange[] } {
  const r = cloneRuleForWeek(base, weekNumber) as R
  const b = base as R
  const changes: ProgressionChange[] = []
  const name = getExerciseName(base)
  const setEntryId = (b.set_entry_id as string | undefined) ?? undefined
  const cfg = REDUCTION_CONFIG

  // Sets (from Week 1 * 0.5, floor 2)
  const week1Sets = b.sets as number | null
  if (week1Sets != null && deloadSets !== week1Sets) {
    r.sets = deloadSets
    addChange(changes, setEntryId, name, 'sets', week1Sets, deloadSets, `${deloadSets} sets (deload)`)
  }

  // Weight (from Week 1 * 0.6)
  if (deloadWeight != null) {
    const week1Weight = b.weight_kg as number | null
    if (week1Weight != null && deloadWeight !== week1Weight) {
      r.weight_kg = deloadWeight
      addChange(changes, setEntryId, name, 'weight_kg', week1Weight, deloadWeight, `60% weight`)
    }
  }

  // Prescribed RPE (column `rir`): deload = easier than Week 1 (−1 RPE, floor 1)
  const week1P = b.rir as number | null
  if (week1P != null) {
    const newP = Math.max(1, week1P - 1)
    if (newP !== week1P) {
      r.rir = newP
      addChange(changes, setEntryId, name, 'rir', week1P, newP, `-1 RPE (deload)`)
    }
  }

  // Reps: unchanged (maintain movement patterns)
  // Rest: unchanged

  return { rule: r as ProgramProgressionRule, changes }
}

// ─── Profile: Linear ──────────────────────────────────────────────────────────

function applyLinear(
  prev: ProgramProgressionRule,
  base: ProgramProgressionRule,
  weekNumber: number,
  weekIndex: number,
): { rule: ProgramProgressionRule; changes: ProgressionChange[] } {
  const r = cloneRuleForWeek(prev, weekNumber) as R
  const b = base as R
  const changes: ProgressionChange[] = []
  const name = getExerciseName(base)
  const setEntryId = (b.set_entry_id as string | undefined) ?? undefined
  const cfg = LINEAR_CONFIG

  applyPrescribedRpeProgression(
    r,
    b,
    weekNumber,
    cfg.rpe_increase_frequency,
    changes,
    setEntryId,
    name,
  )

  // weekIndex even (0, 2, 4…) = weight weeks (Week 2, 4, 6…)
  // weekIndex odd  (1, 3, 5…) = reps weeks  (Week 3, 5, 7…)
  const isWeightWeek = weekIndex % 2 === 0

  if (isWeightWeek) {
    // Weight: +2.5% from previous (cumulative)
    const prevWeight = r.weight_kg as number | null
    if (prevWeight != null) {
      const newWeight = roundWeight(prevWeight * (1 + cfg.weight_increment_pct))
      if (newWeight !== prevWeight) {
        r.weight_kg = newWeight
        const d = newWeight - prevWeight
        addChange(changes, setEntryId, name, 'weight_kg', prevWeight, newWeight, d > 0 ? `+${d.toFixed(1)}kg` : `${d.toFixed(1)}kg`)
      }
    }
  } else {
    // Reps: +1 from previous (cumulative)
    const incRep = (field: string, label: string, isInt = false) => {
      const prevReps = parseReps(r[field])
      if (prevReps == null) return
      const newReps = prevReps + cfg.rep_increment
      r[field] = isInt ? newReps : String(newReps)
      addChange(changes, setEntryId, name, field, prevReps, newReps, label)
    }

    switch (prev.set_type) {
      case 'straight_set':
      case 'giant_set':
        incRep('reps', '+1 rep')
        break
      case 'superset':
        incRep('first_exercise_reps', '+1 rep (A)')
        incRep('second_exercise_reps', '+1 rep (B)')
        break
      case 'pre_exhaustion':
        incRep('isolation_reps', '+1 iso rep')
        incRep('compound_reps', '+1 comp rep')
        break
      case 'cluster_set':
        incRep('reps_per_cluster', '+1 rep/cluster', true)
        break
      case 'rest_pause':
        incRep('reps', '+1 rep')
        break
      case 'drop_set':
        incRep('exercise_reps', '+1 rep')
        break
    }
  }

  return { rule: r as ProgramProgressionRule, changes }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Generate progression rules for weeks 2 through durationWeeks from Week 1 rules.
 *
 * weekIndex convention:
 *   weekIndex = weekNumber - 2  (0 for Week 2, 1 for Week 3, …)
 *
 * Returns a GenerationResult containing:
 *   weekRules — the generated week data
 *   summary   — auto-progressed vs. unchanged exercise counts
 */
export function generateProgression(input: ProgressionGeneratorInput): GenerationResult {
  const { week1Rules, profile, durationWeeks } = input

  const empty: GenerationResult = {
    weekRules: [],
    summary: { autoProgressed: 0, unchanged: 0, unchangedTypes: [] },
  }

  if (profile === 'none' || durationWeeks < 2 || !week1Rules.length) {
    return empty
  }

  // Summary is computed from the FULL set of Week 1 rules, not per-week changes
  const summary = {
    autoProgressed: week1Rules.filter(r => !TIER_3_SKIP.has(r.set_type)).length,
    unchanged: week1Rules.filter(r => TIER_3_SKIP.has(r.set_type)).length,
    unchangedTypes: [
      ...new Set(
        week1Rules
          .filter(r => TIER_3_SKIP.has(r.set_type))
          .map(r => r.set_type),
      ),
    ],
  }

  // Pre-compute flat Reduction deload values once from Week 1 (prevents cumulative drift)
  const deloadValues =
    profile === 'reduction'
      ? week1Rules.map(r => {
          const w1Sets = r.sets as number | null
          const w1Weight = r.weight_kg as number | null
          return {
            sets:
              w1Sets != null
                ? Math.max(Math.ceil(w1Sets * REDUCTION_CONFIG.sets_multiplier), REDUCTION_CONFIG.sets_floor)
                : null,
            weight: w1Weight != null ? roundWeight(w1Weight * REDUCTION_CONFIG.weight_multiplier) : null,
          }
        })
      : null

  const weekRules: GeneratedWeekRules[] = []

  // Carry-forward state: starts as Week 1 values, updated each iteration
  // (not used for Reduction, which always derives from base)
  let prevWeekRules: ProgramProgressionRule[] = week1Rules.map(r => cloneRuleForWeek(r, 1))

  for (let weekNumber = 2; weekNumber <= durationWeeks; weekNumber++) {
    // weekIndex = 0 for Week 2, 1 for Week 3, etc.
    const weekIndex = weekNumber - 2
    const allChanges: ProgressionChange[] = []
    const rules: ProgramProgressionRule[] = []

    for (let i = 0; i < week1Rules.length; i++) {
      const baseRule = week1Rules[i]   // Week 1 baseline (never mutated)
      const prevRule = prevWeekRules[i] // Previous week's actual values

      // Tier 3 (amrap, emom, for_time, tabata): copy Week 1 unchanged
      // Must still appear in output so the bulk-insert writes rows for these exercises
      if (TIER_3_SKIP.has(baseRule.set_type)) {
        rules.push(cloneRuleForWeek(baseRule, weekNumber))
        continue
      }

      let out: { rule: ProgramProgressionRule; changes: ProgressionChange[] }

      switch (profile) {
        case 'volume_ramp':
          out = applyVolumeRamp(prevRule, baseRule, weekNumber, weekIndex)
          break
        case 'intensity_ramp':
          out = applyIntensityRamp(prevRule, baseRule, weekNumber, weekIndex, durationWeeks)
          break
        case 'taper':
          out = applyTaper(prevRule, baseRule, weekNumber, weekIndex)
          break
        case 'density_increase':
          out = applyDensityIncrease(prevRule, baseRule, weekNumber, weekIndex)
          break
        case 'reduction': {
          const dv = deloadValues![i]
          // Null-safe fallback: if week1 sets was null, pass 2 (function will skip if week1Sets null)
          out = applyReduction(
            baseRule,
            weekNumber,
            dv.sets ?? (baseRule.sets ?? 2),
            dv.weight,
          )
          break
        }
        case 'linear':
          out = applyLinear(prevRule, baseRule, weekNumber, weekIndex)
          break
        default:
          out = { rule: cloneRuleForWeek(prevRule, weekNumber), changes: [] }
      }

      out.rule.week_number = weekNumber
      rules.push(out.rule)
      allChanges.push(...out.changes)
    }

    // Update carry-forward state for cumulative profiles
    // (Reduction ignores prevWeekRules since it always derives from baseRule)
    prevWeekRules = rules

    weekRules.push({ weekNumber, rules, changes: allChanges })
  }

  return { weekRules, summary }
}

// ─── Dev verification tests ───────────────────────────────────────────────────
// TEMPORARY: Remove after confirming output matches expected values.

function _makeTestRule(setType: string, overrides: Record<string, unknown>): ProgramProgressionRule {
  return {
    set_type: setType,
    exercise: { name: setType } as any,
    ...overrides,
  } as unknown as ProgramProgressionRule
}

if (
  typeof process !== 'undefined' &&
  (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
) {
  console.log('\n=== Progression Generator — Test Verification ===')

  // Test 1: Volume Ramp, straight_set, 6 weeks
  const t1 = generateProgression({
    week1Rules: [_makeTestRule('straight_set', { sets: 3, reps: '10', weight_kg: 60, rir: 3, rest_seconds: 90 })],
    profile: 'volume_ramp', durationWeeks: 6, goal: 'hypertrophy',
  })
  console.log('Test 1 — Volume Ramp, straight_set, 6w:')
  t1.weekRules.forEach(w => {
    const r = w.rules[0] as any
    console.log(`  Week ${w.weekNumber}: sets:${r.sets}, reps:${r.reps}, weight:${r.weight_kg}, RPE:${r.rir}, rest:${r.rest_seconds}`)
  })
  console.log('  Expected: W2:3×11@60,RPE3 | W3:3×12@60,RPE4 | W4:4×8@61.5,RPE4 | W5:4×9@61.5,RPE5 | W6:4×10@61.5,RPE5')

  // Test 2: Intensity Ramp, straight_set, 4 weeks
  const t2 = generateProgression({
    week1Rules: [_makeTestRule('straight_set', { sets: 4, reps: '5', weight_kg: 100, rir: 3, rest_seconds: 180 })],
    profile: 'intensity_ramp', durationWeeks: 4, goal: 'strength',
  })
  console.log('Test 2 — Intensity Ramp, straight_set, 4w:')
  t2.weekRules.forEach(w => {
    const r = w.rules[0] as any
    console.log(`  Week ${w.weekNumber}: sets:${r.sets}, reps:${r.reps}, weight:${r.weight_kg}, RPE:${r.rir}, rest:${r.rest_seconds}`)
  })
  console.log('  Expected: W2:4×5@102.5,RPE4,rest195 | W3:4×4@105,RPE5,rest210 | W4:3×3@107.5,RPE6,rest225')

  // Test 3: Volume Ramp, amrap (Tier 3 — all weeks unchanged)
  const t3 = generateProgression({
    week1Rules: [_makeTestRule('amrap', { sets: 3, duration_minutes: 10, weight_kg: 40 })],
    profile: 'volume_ramp', durationWeeks: 4, goal: 'conditioning',
  })
  console.log('Test 3 — Volume Ramp, amrap (Tier 3):')
  t3.weekRules.forEach(w => {
    const r = w.rules[0] as any
    console.log(`  Week ${w.weekNumber}: sets:${r.sets}, duration_minutes:${r.duration_minutes}, weight:${r.weight_kg}`)
  })
  console.log(`  Summary: autoProgressed:${t3.summary.autoProgressed}, unchanged:${t3.summary.unchanged} (${t3.summary.unchangedTypes.join(',')})`)
  console.log('  Expected: all weeks identical to W1, unchanged=1 (amrap)')

  // Test 4: Reduction, straight_set, 2 weeks
  const t4 = generateProgression({
    week1Rules: [_makeTestRule('straight_set', { sets: 4, reps: '10', weight_kg: 100, rir: 2, rest_seconds: 120 })],
    profile: 'reduction', durationWeeks: 2, goal: 'deload',
  })
  console.log('Test 4 — Reduction, straight_set, 2w:')
  t4.weekRules.forEach(w => {
    const r = w.rules[0] as any
    console.log(`  Week ${w.weekNumber}: sets:${r.sets}, reps:${r.reps}, weight:${r.weight_kg}, RPE:${r.rir}, rest:${r.rest_seconds}`)
  })
  console.log('  Expected: W2: sets:2, reps:10, weight:60, RPE:1, rest:120')

  // Test 5: Density, straight_set, 4 weeks
  const t5 = generateProgression({
    week1Rules: [_makeTestRule('straight_set', { sets: 4, reps: '10', weight_kg: 60, rir: 2, rest_seconds: 90 })],
    profile: 'density_increase', durationWeeks: 4, goal: 'conditioning',
  })
  console.log('Test 5 — Density, straight_set, 4w:')
  t5.weekRules.forEach(w => {
    const r = w.rules[0] as any
    console.log(`  Week ${w.weekNumber}: sets:${r.sets}, reps:${r.reps}, weight:${r.weight_kg}, RPE:${r.rir}, rest:${r.rest_seconds}`)
  })
  console.log('  Expected: W2:4×10@60,RPE2,rest80 | W3:4×11@60,RPE2,rest70 | W4:4×11@60,RPE2,rest60')

  // Test 6: Linear, straight_set, 4 weeks
  const t6 = generateProgression({
    week1Rules: [_makeTestRule('straight_set', { sets: 3, reps: '10', weight_kg: 40, rir: 3, rest_seconds: 90 })],
    profile: 'linear', durationWeeks: 4, goal: 'hypertrophy',
  })
  console.log('Test 6 — Linear, straight_set, 4w:')
  t6.weekRules.forEach(w => {
    const r = w.rules[0] as any
    console.log(`  Week ${w.weekNumber}: sets:${r.sets}, reps:${r.reps}, weight:${r.weight_kg}, RPE:${r.rir}, rest:${r.rest_seconds}`)
  })
  console.log('  Expected: W2:3×10@41,RPE3 | W3:3×11@41,RPE4 | W4:3×11@42,RPE4')

  console.log('=== End Test Verification ===\n')
}
