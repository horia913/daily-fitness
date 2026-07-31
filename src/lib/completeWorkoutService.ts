/**
 * Complete Workout Service (Unified Pipeline)
 * 
 * SINGLE entry point for completing a workout — used by BOTH:
 *   - Client flow: POST /api/complete-workout
 *   - Coach flow:  POST /api/coach/pickup/mark-complete
 * 
 * Steps:
 * 1. Fetch workout_log, verify ownership
 * 2. Idempotency guard (already completed → no-op 200)
 * 3. Compute totals from workout_set_logs
 * 4. Update workout_logs (completed_at, totals)
 * 5. Update workout_sessions status if session_id provided
 * 6. Program completion (if program_assignment_id + program_day_assignment_id on log):
 *    a. INSERT INTO program_day_completions (ON CONFLICT DO NOTHING — idempotent)
 *    b. Find next uncompleted slot via programStateService
 * 7. Sync goals/achievements (non-blocking, unchanged)
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
  getCompletedSlots,
  getNextSlot,
  assertWeekUnlocked,
} from './programStateService'
import { resolveInstanceWeekForAssignment } from './programInstanceResolver'

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

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export async function completeWorkout(params: CompleteWorkoutParams): Promise<CompleteWorkoutResult> {
  const {
    supabaseAdmin,
    supabaseAuth,
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
  // STEP 2: Idempotency guard — if already completed, return no-op
  // ========================================================================
  if (workoutLog.completed_at) {
    console.log('[completeWorkoutService] Already completed, returning no-op:', workoutLogId)
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

  // ========================================================================
  // STEP 4: Calculate duration and update workout_logs
  // ========================================================================
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

  const { data: updatedLog, error: updateError } = await supabaseAdmin
    .from('workout_logs')
    .update({
      completed_at: completedAt.toISOString(),
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

  // ========================================================================
  // STEP 5: Update workout_sessions status if session_id provided
  // ========================================================================
  const isValidUuid = (value: string | null | undefined): boolean => {
    if (!value) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  }

  if (isValidUuid(sessionId)) {
    const { error: sessionUpdateError } = await supabaseAdmin
      .from('workout_sessions')
      .update({
        status: 'completed',
        completed_at: completedAt.toISOString(),
      })
      .eq('id', sessionId!)
      .eq('client_id', clientId)

    if (sessionUpdateError) {
      console.warn('[completeWorkoutService] Failed to update session (non-blocking):', sessionUpdateError)
    }
  }

  // ========================================================================
  // STEP 6: Program completion (if workout is part of a program)
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

  if (programAssignmentId && programDayAssignmentId) {

    // 6-pre. Get program_id, slots, and completions for week lock check + progression
    const { data: assignment } = await supabaseAdmin
      .from('program_assignments')
      .select(
        'id, client_id, program_id, start_date, status, progression_mode, pause_status, paused_at, pause_accumulated_days, timezone_snapshot'
      )
      .eq('id', programAssignmentId)
      .single()

    if (!assignment) {
      console.error('[completeWorkoutService] Program assignment not found:', programAssignmentId)
      programProgression = { status: 'no_program' }
    } else {
      const [allSlots, completedSlots, weekRes] = await Promise.all([
        getProgramScheduleSlotsForAssignment(
          supabaseAdmin,
          assignment.program_id,
          programAssignmentId
        ),
        getCompletedSlots(supabaseAdmin, programAssignmentId),
        resolveInstanceWeekForAssignment(supabaseAdmin, programAssignmentId),
      ])
      const totalWeeksCap = weekRes?.totalWeeks ?? null

      // 6-lock. WEEK LOCK: find the target slot's week and enforce sequential week order
      const targetSlot = allSlots.find(s => s.id === programDayAssignmentId)
      if (targetSlot) {
        try {
          assertWeekUnlocked(
            targetSlot.week_number,
            allSlots,
            completedSlots,
            {
              progression_mode:
                assignment.progression_mode === 'coach_managed' ? 'coach_managed' : 'auto',
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

      // 6a. INSERT into ledger (idempotent via ON CONFLICT DO NOTHING)
      const { error: ledgerError } = await supabaseAdmin
        .from('program_day_completions')
        .insert({
          program_assignment_id: programAssignmentId,
          program_day_assignment_id: programDayAssignmentId,
          completed_at: completedAt.toISOString(),
          completed_by: completedBy,
          notes: notes || null,
        })
        .select('id')
        .maybeSingle()

      const isAlreadyRecorded = ledgerError?.code === '23505'
      if (ledgerError && !isAlreadyRecorded) {
        console.error('[completeWorkoutService] Error writing to ledger:', ledgerError)
      }
      if (isAlreadyRecorded) {
        console.log('[completeWorkoutService] Day already recorded in ledger (idempotent)')
      }

      // 6b. ALWAYS run completion check — even on already_recorded (Fix A)
      // Refetch so we have current ledger state (getNextSlot does this internally)
      const nextSlotResult = await getNextSlot(supabaseAdmin, programAssignmentId, assignment.program_id)
      const lastSlot = allSlots[allSlots.length - 1]

      const isComplete = nextSlotResult === null && allSlots.length > 0
      const referenceSlot = nextSlotResult ?? lastSlot

      // 6d. If program fully completed, update assignment status (Fix B: non-blocking + 1 retry)
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
  } else {
    programProgression = { status: 'no_program' }
  }

  // ========================================================================
  // STEP 7: Sync goals and achievements (non-blocking)
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
