/**
 * Complete Workout Service (Unified Pipeline)
 *
 * SINGLE entry point for completing a workout — used by BOTH:
 *   - Client flow: POST /api/complete-workout
 *   - Coach flow:  POST /api/coach/pickup/mark-complete
 *
 * Steps:
 * 1. Fetch workout_log, verify ownership
 * 2. Idempotency guard (already completed → heal missing PDC if needed, then no-op)
 * 3. Compute totals from workout_set_logs
 * 4. Resolve program_assignment_id + program_day_assignment_id
 * 5. If program context: week-lock check, then REQUIRED program_day_completions insert
 * 6. ONLY THEN update workout_logs (completed_at, totals) — and session if provided
 * 7. Program progression (next slot / mark assignment completed)
 * 8. Sync goals/achievements (non-blocking, unchanged)
 *
 * Crash-safety: PDC is written before the log is marked completed. Worst case =
 * PDC exists with an incomplete log (retryable, foundation-correct).
 *
 * Does NOT:
 *   - Call advance_program_progress RPC (replaced)
 *   - Write to program_day_assignments
 *   - Write to program_assignment_progress
 *   - Write to program_workout_completions
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  getProgramScheduleSlotsForAssignment,
  getAssignmentSchedule,
  getCompletedSlots,
  getNextSlot,
  assertWeekUnlocked,
} from './programStateService'
import { resolveInstanceWeekForAssignment } from './programInstanceResolver'
import { resolveFoundationCompletion } from './progression/foundationCompletion'

// ============================================================================
// INTERFACES
// ============================================================================

export interface CompleteWorkoutParams {
  supabaseAdmin: SupabaseClient  // Service role client (bypasses RLS)
  supabaseAuth: SupabaseClient   // Session client (for RLS-protected reads)
  workoutLogId: string
  clientId: string
  completedBy: string            // user.id of the actor (client or coach)
  durationMinutes?: number
  sessionId?: string
  notes?: string
}

export interface CompleteWorkoutResult {
  success: boolean
  alreadyCompleted: boolean
  workoutLog: any
  totals: {
    sets: number
    reps: number
    weight: number
    duration_minutes: number
  }
  programProgression: {
    status: 'advanced' | 'program_completed' | 'no_program' | 'already_recorded' | 'week_locked'
    currentWeekNumber?: number
    currentDayNumber?: number
    isCompleted?: boolean
    programAssignmentId?: string
    programDayAssignmentId?: string
    unlockedWeekMax?: number
  } | null
  /** Newly unlocked achievements (for UI modal) */
  newAchievements: import('@/lib/achievementService').NewlyUnlockedAchievement[]
  /** Rank improvements for leaderboard toasts */
  leaderboardRankChanges: import('@/lib/leaderboardPopulationService').LeaderboardRankChange[]
}

const isValidUuid = (value: string | null | undefined): boolean => {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Idempotent PDC insert. 23505 (unique) = already recorded (ok).
 * Any other error throws so callers do not mark the log completed.
 */
async function insertProgramDayCompletion(args: {
  supabaseAdmin: SupabaseClient
  programAssignmentId: string
  programDayAssignmentId: string
  completedAtIso: string
  completedBy: string
  notes?: string | null
}): Promise<'inserted' | 'already_recorded'> {
  const { error: ledgerError } = await args.supabaseAdmin
    .from('program_day_completions')
    .insert({
      program_assignment_id: args.programAssignmentId,
      program_day_assignment_id: args.programDayAssignmentId,
      completed_at: args.completedAtIso,
      completed_by: args.completedBy,
      notes: args.notes || null,
    })
    .select('id')
    .maybeSingle()

  if (!ledgerError) return 'inserted'
  if (ledgerError.code === '23505') {
    console.log('[completeWorkoutService] Day already recorded in ledger (idempotent)')
    return 'already_recorded'
  }
  console.error('[completeWorkoutService] Error writing to ledger:', ledgerError)
  throw new Error(`Failed to write program_day_completions: ${ledgerError.message}`)
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export async function completeWorkout(params: CompleteWorkoutParams): Promise<CompleteWorkoutResult> {
  const {
    supabaseAdmin,
    workoutLogId,
    clientId,
    completedBy,
    durationMinutes,
    sessionId,
    notes,
  } = params

  // ========================================================================
  // STEP 1: Fetch workout_log and verify ownership
  // ========================================================================
  console.log('[completeWorkoutService] Fetching workout_log:', workoutLogId)
  const { data: workoutLog, error: logError } = await supabaseAdmin
    .from('workout_logs')
    .select('id, started_at, completed_at, client_id, workout_assignment_id, program_assignment_id, program_day_assignment_id')
    .eq('id', workoutLogId)
    .eq('client_id', clientId)
    .single()

  if (logError || !workoutLog) {
    console.error('[completeWorkoutService] Workout log not found:', logError)
    throw new Error(`Workout log not found: ${workoutLogId}`)
  }

  // ========================================================================
  // STEP 2: Idempotency guard — heal missing PDC if needed, then no-op
  // ========================================================================
  if (workoutLog.completed_at) {
    console.log('[completeWorkoutService] Already completed, checking PDC heal:', workoutLogId)
    const healPa = workoutLog.program_assignment_id as string | null
    const healPda = (workoutLog.program_day_assignment_id as string | null) ?? null
    if (healPa && healPda) {
      const { data: existingPdc, error: pdcLookupError } = await supabaseAdmin
        .from('program_day_completions')
        .select('id')
        .eq('program_assignment_id', healPa)
        .eq('program_day_assignment_id', healPda)
        .maybeSingle()

      if (pdcLookupError) {
        console.error('[completeWorkoutService] PDC heal lookup failed (non-blocking):', pdcLookupError)
      } else if (!existingPdc) {
        try {
          await insertProgramDayCompletion({
            supabaseAdmin,
            programAssignmentId: healPa,
            programDayAssignmentId: healPda,
            completedAtIso:
              typeof workoutLog.completed_at === 'string'
                ? workoutLog.completed_at
                : new Date(workoutLog.completed_at).toISOString(),
            completedBy,
            notes: notes || null,
          })
          console.log('[completeWorkoutService] Healed missing PDC for already-completed log:', {
            workoutLogId,
            programAssignmentId: healPa,
            programDayAssignmentId: healPda,
          })
        } catch (healErr) {
          // Already completed — do not fail the no-op; log and return as today.
          console.error('[completeWorkoutService] PDC heal insert failed (non-blocking):', healErr)
        }
      }
    }

    return {
      success: true,
      alreadyCompleted: true,
      workoutLog,
      totals: { sets: 0, reps: 0, weight: 0, duration_minutes: 0 },
      programProgression: null,
      newAchievements: [],
      leaderboardRankChanges: [],
    }
  }

  // ========================================================================
  // STEP 3: Fetch workout_set_logs and compute totals
  // ========================================================================
  const { data: setLogs, error: setsError } = await supabaseAdmin
    .from('workout_set_logs')
    .select('id, weight, reps, exercise_id, completed_at, workout_log_id, set_type')
    .eq('workout_log_id', workoutLogId)
    .eq('client_id', clientId)

  if (setsError) {
    console.error('[completeWorkoutService] Error fetching set logs:', setsError)
    throw new Error(`Failed to fetch set logs: ${setsError.message}`)
  }

  const countsTowardStrengthVolume = (t: string | null | undefined) =>
    t !== 'speed_work' && t !== 'endurance'

  const totalSetsCompleted = setLogs?.length || 0
  let totalRepsCompleted = 0
  let totalWeightLifted = 0
  for (const set of setLogs ?? []) {
    if (!countsTowardStrengthVolume(set.set_type)) continue
    totalRepsCompleted += set.reps || 0
    totalWeightLifted += (set.weight || 0) * (set.reps || 0)
  }

  const completedAt = new Date()
  const { resolveWorkoutPersistDurationMinutes } = await import(
    '@/lib/workoutLogDuration'
  )
  const totalDurationMinutes = resolveWorkoutPersistDurationMinutes({
    clientPassedMinutes:
      durationMinutes !== undefined && durationMinutes !== null
        ? durationMinutes
        : null,
    startedAt: workoutLog.started_at,
    completedAt,
    setCompletedAts: (setLogs ?? []).map((s) => s.completed_at),
  })
  const completedAtIso = completedAt.toISOString()

  // ========================================================================
  // STEP 4: Resolve program context (before marking the log completed)
  // ========================================================================
  let programProgression: CompleteWorkoutResult['programProgression'] = null

  let programAssignmentId: string | null = workoutLog.program_assignment_id
  let programDayAssignmentId: string | null = workoutLog.program_day_assignment_id ?? null

  if (!programDayAssignmentId && workoutLog.workout_assignment_id) {
    const { resolveProgramDayAssignmentIdByWorkoutAssignment } = await import('./resolveInstanceScheduleRow')
    programDayAssignmentId = await resolveProgramDayAssignmentIdByWorkoutAssignment(
      supabaseAdmin,
      workoutLog.workout_assignment_id
    )
    if (programDayAssignmentId) {
      await supabaseAdmin
        .from('workout_logs')
        .update({ program_day_assignment_id: programDayAssignmentId })
        .eq('id', workoutLogId)
    }
  }

  if ((!programAssignmentId || !programDayAssignmentId) && workoutLog.workout_assignment_id) {
    const { data: pda } = await supabaseAdmin
      .from('program_day_assignments')
      .select('id, program_assignment_id')
      .eq('workout_assignment_id', workoutLog.workout_assignment_id)
      .maybeSingle()

    if (pda?.program_assignment_id && pda?.id) {
      programAssignmentId = pda.program_assignment_id
      programDayAssignmentId = pda.id
      console.log('[completeWorkoutService] Resolved program context via bridge:', {
        programAssignmentId,
        programDayAssignmentId,
      })
    }
  }

  // ========================================================================
  // STEP 5: Week-lock + REQUIRED PDC insert (before log completed_at)
  // ========================================================================
  type AssignmentRow = {
    id: string
    client_id: string
    program_id: string
    start_date: string | null
    status: string | null
    pause_status: string | null
    paused_at: string | null
    pause_accumulated_days: number | null
    timezone_snapshot: string | null
  }

  let assignmentForProgression: AssignmentRow | null = null
  let allSlotsForProgression: Awaited<ReturnType<typeof getProgramScheduleSlotsForAssignment>> | null = null
  let totalWeeksForProgression: number | null = null
  let isAlreadyRecorded = false

  if (programAssignmentId && programDayAssignmentId) {
    const { data: assignment } = await supabaseAdmin
      .from('program_assignments')
      .select(
        'id, client_id, program_id, start_date, status, pause_status, paused_at, pause_accumulated_days, timezone_snapshot'
      )
      .eq('id', programAssignmentId)
      .single()

    if (!assignment) {
      console.error('[completeWorkoutService] Program assignment not found:', programAssignmentId)
      programProgression = { status: 'no_program' }
    } else {
      assignmentForProgression = assignment as AssignmentRow
      const [allSlots, completedSlots, weekRes] = await Promise.all([
        getProgramScheduleSlotsForAssignment(
          supabaseAdmin,
          assignment.program_id,
          programAssignmentId
        ),
        getCompletedSlots(supabaseAdmin, programAssignmentId),
        resolveInstanceWeekForAssignment(supabaseAdmin, programAssignmentId),
      ])
      allSlotsForProgression = allSlots
      totalWeeksForProgression = weekRes?.totalWeeks ?? null
      const totalWeeksCap = totalWeeksForProgression

      // WEEK LOCK — reject BEFORE marking the log completed
      const targetSlot = allSlots.find(s => s.id === programDayAssignmentId)
      if (targetSlot) {
        try {
          assertWeekUnlocked(
            targetSlot.week_number,
            allSlots,
            completedSlots,
            {
              start_date: assignment.start_date,
              totalWeeksCap,
              pause_status: assignment.pause_status ?? 'active',
              paused_at: assignment.paused_at ?? null,
              pause_accumulated_days: assignment.pause_accumulated_days ?? 0,
              timezone_snapshot: assignment.timezone_snapshot ?? 'UTC',
            }
          )
        } catch (lockErr: any) {
          if (lockErr.code === 'WEEK_LOCKED') {
            console.warn('[completeWorkoutService] Week lock rejected completion:', lockErr.message)
            return {
              success: false,
              alreadyCompleted: false,
              workoutLog,
              totals: { sets: 0, reps: 0, weight: 0, duration_minutes: 0 },
              programProgression: {
                status: 'week_locked' as any,
                programAssignmentId,
                programDayAssignmentId,
                unlockedWeekMax: lockErr.unlockedWeekMax,
              },
              newAchievements: [],
              leaderboardRankChanges: [],
            }
          }
          throw lockErr
        }
      }

      console.log('[completeWorkoutService] Recording program day completion:', {
        programAssignmentId,
        programDayAssignmentId,
        completedBy,
      })

      // REQUIRED ledger write — failure must not leave a completed log without PDC
      const ledgerResult = await insertProgramDayCompletion({
        supabaseAdmin,
        programAssignmentId,
        programDayAssignmentId,
        completedAtIso,
        completedBy,
        notes: notes || null,
      })
      isAlreadyRecorded = ledgerResult === 'already_recorded'
    }
  } else {
    programProgression = { status: 'no_program' }
  }

  // ========================================================================
  // STEP 6: Mark workout_logs completed (only after PDC is guaranteed, or standalone)
  // ========================================================================
  const { data: updatedLog, error: updateError } = await supabaseAdmin
    .from('workout_logs')
    .update({
      completed_at: completedAtIso,
      total_duration_minutes: totalDurationMinutes,
      total_sets_completed: totalSetsCompleted,
      total_reps_completed: totalRepsCompleted,
      total_weight_lifted: totalWeightLifted,
    })
    .eq('id', workoutLogId)
    .select()
    .single()

  if (updateError) {
    console.error('[completeWorkoutService] Error updating workout_log:', updateError)
    throw new Error(`Failed to update workout log: ${updateError.message}`)
  }

  if (isValidUuid(sessionId)) {
    const { error: sessionUpdateError } = await supabaseAdmin
      .from('workout_sessions')
      .update({
        status: 'completed',
        completed_at: completedAtIso,
      })
      .eq('id', sessionId!)
      .eq('client_id', clientId)

    if (sessionUpdateError) {
      console.warn('[completeWorkoutService] Failed to update session (non-blocking):', sessionUpdateError)
    }
  }

  // ========================================================================
  // STEP 7: Program progression (next slot / mark assignment completed)
  // ========================================================================
  if (
    programAssignmentId &&
    programDayAssignmentId &&
    assignmentForProgression &&
    allSlotsForProgression
  ) {
    const allSlots = allSlotsForProgression
    // Post-PDC ledger + schedule for position + foundation complete-check
    const [nextSlotResult, completedSlotsPost, assignmentSchedule] = await Promise.all([
      getNextSlot(
        supabaseAdmin,
        programAssignmentId,
        assignmentForProgression.program_id,
      ),
      getCompletedSlots(supabaseAdmin, programAssignmentId),
      getAssignmentSchedule(supabaseAdmin, programAssignmentId),
    ])
    const lastSlot = allSlots[allSlots.length - 1]
    const referenceSlot = nextSlotResult ?? lastSlot

    // Comparison only — fill-gap no longer controls the write
    const fillGapComplete = nextSlotResult === null && allSlots.length > 0

    // WRITE CONTROL: foundation in-scope completion → status='completed'
    // Fail-safe: if foundation throws, leave assignment active (do not mark complete).
    let isComplete = false
    let inScopeDone = 0
    let inScopeTotal = 0
    try {
      const foundationMath = resolveFoundationCompletion({
        assignment: {
          start_date: assignmentForProgression.start_date,
          pause_accumulated_days: assignmentForProgression.pause_accumulated_days,
          pause_status: assignmentForProgression.pause_status,
          paused_at: assignmentForProgression.paused_at,
          totalWeeks: totalWeeksForProgression ?? 0,
        },
        slots: assignmentSchedule.map((s) => ({
          id: s.id,
          week_number: s.week_number,
          program_day: s.program_day,
          is_optional: s.is_optional ?? false,
          day_type: s.day_type ?? null,
        })),
        completions: completedSlotsPost.map((c) => ({
          program_day_assignment_id: c.program_day_assignment_id,
          notes: c.notes,
        })),
        tz: assignmentForProgression.timezone_snapshot ?? 'UTC',
      })
      inScopeDone = foundationMath.inScopeDone
      inScopeTotal = foundationMath.inScopeTotal
      isComplete =
        foundationMath.inScopeTotal > 0 &&
        foundationMath.inScopeDone === foundationMath.inScopeTotal
      console.log(
        '[WRITEPATH complete-check]',
        'assignmentId:',
        programAssignmentId,
        'foundationComplete(WRITES):',
        isComplete,
        'fillGapWouldHave:',
        fillGapComplete,
        'inScopeDone:',
        inScopeDone,
        'inScopeTotal:',
        inScopeTotal,
      )
    } catch (foundationErr) {
      isComplete = false
      console.error(
        '[WRITEPATH complete-check] foundation failed — leaving assignment active (fail-safe):',
        'assignmentId:',
        programAssignmentId,
        foundationErr,
      )
    }

    if (isComplete) {
      const doStatusUpdate = async () => {
        const { error } = await supabaseAdmin
          .from('program_assignments')
          .update({ status: 'completed' })
          .eq('id', programAssignmentId)
        return error
      }
      let assignmentUpdateError = await doStatusUpdate()
      if (assignmentUpdateError) {
        assignmentUpdateError = await doStatusUpdate()
        if (assignmentUpdateError) {
          console.error(
            '[completeWorkoutService] Failed to mark assignment completed after retry. program_assignment_id=',
            programAssignmentId,
            assignmentUpdateError
          )
        }
      }
    }

    programProgression = {
      status: isAlreadyRecorded ? 'already_recorded' : (isComplete ? 'program_completed' : 'advanced'),
      currentWeekNumber: referenceSlot?.week_number,
      currentDayNumber: referenceSlot?.day_number,
      isCompleted: isComplete,
      programAssignmentId,
      programDayAssignmentId,
    }
  }

  // ========================================================================
  // STEP 8: Sync goals and achievements (non-blocking)
  // ========================================================================
  try {
    const { syncGoalsForClient } = await import('@/lib/goalSyncService')
    await syncGoalsForClient(clientId)
  } catch (syncError) {
    console.error('[completeWorkoutService] Failed to sync goals (non-blocking):', syncError)
  }

  const newAchievements: import('@/lib/achievementService').NewlyUnlockedAchievement[] = []
  try {
    const { AchievementService } = await import('@/lib/achievementService')
    const [workoutNew, streakNew, volumeNew] = await Promise.all([
      AchievementService.checkAndUnlockAchievements(clientId, 'workout_count', supabaseAdmin),
      AchievementService.checkAndUnlockAchievements(clientId, 'streak_weeks', supabaseAdmin),
      AchievementService.checkAndUnlockAchievements(clientId, 'total_volume', supabaseAdmin),
    ])
    const seen = new Set<string>()
    for (const a of [...workoutNew, ...streakNew, ...volumeNew]) {
      const key = `${a.templateId}:${a.tier ?? 'single'}`
      if (!seen.has(key)) {
        seen.add(key)
        newAchievements.push(a)
      }
    }
    if (programProgression?.status === 'program_completed' && programProgression?.programAssignmentId) {
      const programNew = await AchievementService.checkAndUnlockAchievements(clientId, 'program_completion', supabaseAdmin)
      for (const a of programNew) {
        const key = `${a.templateId}:${a.tier ?? 'single'}`
        if (!seen.has(key)) {
          seen.add(key)
          newAchievements.push(a)
        }
      }
    }
  } catch (achievementError) {
    console.error('[completeWorkoutService] Failed to check achievements (non-blocking):', achievementError)
  }

  let leaderboardRankChanges: import('@/lib/leaderboardPopulationService').LeaderboardRankChange[] = []
  try {
    const { updateLeaderboardForClient } = await import('@/lib/leaderboardPopulationService')
    const result = await updateLeaderboardForClient(clientId, undefined, supabaseAdmin)
    leaderboardRankChanges = result.rankChanges
  } catch (leaderboardError) {
    console.error('[completeWorkoutService] Failed to update leaderboard (non-blocking):', leaderboardError)
  }

  try {
    const { notifyCoachWorkoutCompleted } = await import('@/lib/inAppNotificationEvents')
    const { data: rawClientProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name')
      .eq('id', clientId)
      .maybeSingle()
    const clientProfile = rawClientProfile as { first_name: string | null } | null
    let workoutName: string | null = null
    if (workoutLog.workout_assignment_id) {
      const { data: wa } = await supabaseAdmin
        .from('workout_assignments')
        .select('name')
        .eq('id', workoutLog.workout_assignment_id)
        .maybeSingle()
      workoutName = (wa?.name as string | undefined) ?? null
    }
    await notifyCoachWorkoutCompleted({
      clientId,
      workoutLogId,
      workoutName,
      clientName: clientProfile?.first_name ?? undefined,
      admin: supabaseAdmin,
    })
  } catch (notifyErr) {
    console.error('[completeWorkoutService] In-app notification failed (non-blocking):', notifyErr)
  }

  // ========================================================================
  // RETURN
  // ========================================================================
  return {
    success: true,
    alreadyCompleted: false,
    workoutLog: updatedLog,
    totals: {
      sets: totalSetsCompleted,
      reps: totalRepsCompleted,
      weight: totalWeightLifted,
      duration_minutes: totalDurationMinutes,
    },
    programProgression,
    newAchievements,
    leaderboardRankChanges,
  }
}
