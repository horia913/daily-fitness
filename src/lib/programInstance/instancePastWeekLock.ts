/**
 * Past-week locking for client-instance Station editor.
 * A week is locked when it has real (non–coach-skip) completions and is not
 * the foundation current week — preserves client history.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  scheduleSlotsChangedOrNew,
  scheduleSlotsInBaselineNotInWorking,
} from '@/lib/programs/programDraftMutations'
import { computeBlockWeekRanges } from '@/lib/programs/stationBlockWeeks'
import { sortedDirtyWorkoutIds } from '@/lib/programs/programDraftUtils'
import type { ProgramDraftState } from '@/types/programDraft'

export type PastWeekLockSnapshot = {
  foundationWeek: number
  /** Weeks with ≥1 non-skip completion. */
  weeksWithCompletions: ReadonlySet<number>
  /** Locked for edit: has completions AND not foundation current week. */
  lockedWeeks: ReadonlySet<number>
  currentWeekHasCompletions: boolean
}

export const PAST_WEEK_LOCK_REASON =
  "This week is completed and locked to preserve the client's history"

export const CURRENT_WEEK_COMPLETIONS_WARNING =
  "This week has completed sessions — your changes apply going forward and won't alter already-logged workouts"

/**
 * Load foundation current week + weeks that have client completions for an assignment.
 * Prefer loadClientInstanceEditorContext when progress coloring is also needed.
 */
export async function loadPastWeekLockSnapshot(
  supabase: SupabaseClient,
  assignmentId: string,
): Promise<PastWeekLockSnapshot | null> {
  const { loadClientInstanceEditorContext } = await import(
    '@/lib/programInstance/instanceClientProgressStatus'
  )
  const ctx = await loadClientInstanceEditorContext(supabase, assignmentId)
  return ctx?.lock ?? null
}

export function isWeekLocked(
  lock: PastWeekLockSnapshot | null | undefined,
  absoluteWeek: number,
): boolean {
  return Boolean(lock?.lockedWeeks.has(absoluteWeek))
}

/** Absolute weeks present in the draft's phase layout. */
export function draftCoveredWeeks(state: ProgramDraftState): Set<number> {
  const weeks = new Set<number>()
  for (const range of computeBlockWeekRanges(state.trainingBlocks)) {
    for (let w = range.startWeek; w <= range.endWeek; w++) weeks.add(w)
  }
  return weeks
}

export function weeksTouchedByScheduleDiff(
  baseline: ProgramDraftState,
  working: ProgramDraftState,
): Set<number> {
  const weeks = new Set<number>()
  for (const slot of scheduleSlotsChangedOrNew(baseline, working)) {
    const w = Number(slot.week_number)
    if (Number.isFinite(w) && w >= 1) weeks.add(w)
  }
  for (const slot of scheduleSlotsInBaselineNotInWorking(baseline, working)) {
    const w = Number(slot.week_number)
    if (Number.isFinite(w) && w >= 1) weeks.add(w)
  }
  return weeks
}

export function weeksTouchedByDirtyWorkouts(working: ProgramDraftState): Set<number> {
  const weeks = new Set<number>()
  const dirtyIds = sortedDirtyWorkoutIds(working.dirtyWorkoutIds)
  if (dirtyIds.length === 0) return weeks
  const dirty = new Set(dirtyIds)
  for (const slot of working.schedule) {
    if (!slot.template_id || !dirty.has(slot.template_id)) continue
    const w = Number(slot.week_number)
    if (Number.isFinite(w) && w >= 1) weeks.add(w)
  }
  return weeks
}

/**
 * Weeks that would disappear from the phase calendar (structure shrink / delete).
 * Removing a locked week from the layout is treated as rewriting history.
 */
export function weeksRemovedFromLayout(
  baseline: ProgramDraftState,
  working: ProgramDraftState,
): Set<number> {
  const before = draftCoveredWeeks(baseline)
  const after = draftCoveredWeeks(working)
  const removed = new Set<number>()
  for (const w of before) {
    if (!after.has(w)) removed.add(w)
  }
  return removed
}

export type LockedWeekEditCheck =
  | { ok: true }
  | { ok: false; error: string; lockedWeeksTouched: number[] }

/**
 * Reject draft commits that modify locked weeks (or remove them from the layout).
 */
export function assertNoLockedWeekEdits(
  lock: PastWeekLockSnapshot,
  baseline: ProgramDraftState,
  working: ProgramDraftState,
): LockedWeekEditCheck {
  if (lock.lockedWeeks.size === 0) return { ok: true }

  const touched = new Set<number>()
  for (const w of weeksTouchedByScheduleDiff(baseline, working)) touched.add(w)
  for (const w of weeksTouchedByDirtyWorkouts(working)) touched.add(w)
  if (working.structureDirty) {
    for (const w of weeksRemovedFromLayout(baseline, working)) touched.add(w)
  }

  const lockedWeeksTouched = [...touched]
    .filter((w) => lock.lockedWeeks.has(w))
    .sort((a, b) => a - b)

  if (lockedWeeksTouched.length === 0) return { ok: true }

  const label =
    lockedWeeksTouched.length === 1
      ? `Week ${lockedWeeksTouched[0]}`
      : `Weeks ${lockedWeeksTouched.join(', ')}`

  return {
    ok: false,
    error: `${label} ${lockedWeeksTouched.length === 1 ? 'is' : 'are'} locked (completed history). Revert those changes or edit the current/future weeks only.`,
    lockedWeeksTouched,
  }
}
