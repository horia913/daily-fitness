/**
 * POST /api/coach/gym-console/status
 *
 * Returns status for up to 6 clients in one call for the gym console grid.
 * Uses single RPC get_gym_console_status to replace per-client getProgramState and session/log queries.
 * Auth: coach (or admin) only; all clientIds must belong to the coach.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'

const MAX_CLIENTS = 6
const IDLE_MINUTES = 15

export async function POST(request: NextRequest) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request)

    let body: { clientIds?: string[] }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const clientIds = Array.isArray(body.clientIds) ? body.clientIds : []
    if (clientIds.length === 0) {
      return NextResponse.json({ clients: [] })
    }
    if (clientIds.length > MAX_CLIENTS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_CLIENTS} client IDs allowed` },
        { status: 400 }
      )
    }

    const { data: coachProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!coachProfile || (coachProfile.role !== 'coach' && coachProfile.role !== 'admin')) {
      return createForbiddenResponse('Only coaches can access gym console')
    }

    const { data: relations } = await supabaseAdmin
      .from('clients')
      .select('client_id')
      .eq('coach_id', user.id)
      .in('client_id', clientIds)

    const allowedIds = new Set((relations ?? []).map((r: { client_id: string }) => r.client_id))
    const validClientIds = clientIds.filter((id) => allowedIds.has(id))
    if (validClientIds.length !== clientIds.length) {
      return createForbiddenResponse('One or more clients do not belong to this coach')
    }

    const { data: rpcRows, error: rpcError } = await supabaseAdmin.rpc('get_gym_console_status', {
      p_coach_id: user.id,
      p_client_ids: validClientIds,
    })

    if (rpcError) {
      console.error('[gym-console/status] RPC error:', rpcError)
      return NextResponse.json(
        { error: rpcError.message ?? 'Failed to load status' },
        { status: 500 }
      )
    }

    const rows = Array.isArray(rpcRows) ? rpcRows : []
    const now = Date.now()
    const idleMs = IDLE_MINUTES * 60 * 1000

    const clients = rows.map((row: {
      client_id: string
      first_name?: string
      last_name?: string
      active_session?: {
        session_id: string
        status: string
        started_at: string
        workout_assignment_id?: string
        workout_log_id?: string
        template_name?: string
        sets_logged?: number
        last_set_logged_at?: string
      } | null
      program_name?: string | null
      program_assignment_id?: string | null
      next_workout?: {
        schedule_id: string
        template_id: string
        template_name?: string
        program_assignment_id: string
        block_count?: number
        exercise_count?: number
      } | null
      current_week?: number | null
      current_day?: number | null
      status?: string
    }) => {
      const clientName = [row.first_name ?? '', row.last_name ?? ''].join(' ').trim() || 'Client'
      const session = row.active_session
      const lastSetLoggedAt = session?.last_set_logged_at ?? null
      const isIdle = lastSetLoggedAt ? now - new Date(lastSetLoggedAt).getTime() > idleMs : true

      let status: 'active_session' | 'idle_session' | 'no_session' | 'no_program' | 'program_completed' = (row.status as any) ?? 'no_session'
      if (session && status === 'active_session' && isIdle) {
        status = 'idle_session'
      }

      let activeSession: {
        sessionId: string
        workoutLogId: string
        workoutAssignmentId: string
        startedAt: string
        currentBlock: number
        currentExercise: string
        currentSet: string
        lastSetLoggedAt: string
        isIdle: boolean
      } | null = null

      if (session) {
        activeSession = {
          sessionId: session.session_id,
          workoutLogId: session.workout_log_id ?? '',
          workoutAssignmentId: session.workout_assignment_id ?? '',
          startedAt: session.started_at,
          currentBlock: 0,
          currentExercise: '—',
          currentSet: '—',
          lastSetLoggedAt: lastSetLoggedAt ?? session.started_at,
          isIdle,
        }
      }

      const nextWorkout = row.next_workout
        ? {
            workoutName: row.next_workout.template_name ?? 'Workout',
            templateId: row.next_workout.template_id,
            scheduleId: row.next_workout.schedule_id,
            programAssignmentId: row.next_workout.program_assignment_id,
            blockCount: row.next_workout.block_count ?? 0,
            exerciseCount: row.next_workout.exercise_count ?? 0,
          }
        : null

      return {
        clientId: row.client_id,
        clientName,
        programName: row.program_name ?? null,
        programAssignmentId: row.program_assignment_id ?? null,
        currentWeek: row.current_week ?? null,
        currentDay: row.current_day ?? null,
        nextWorkout,
        activeSession,
        status,
      }
    })

    return NextResponse.json({ clients })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'User not authenticated') {
      return createUnauthorizedResponse('Not authenticated')
    }
    console.error('[gym-console/status] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
