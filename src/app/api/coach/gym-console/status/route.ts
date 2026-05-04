/**
 * POST /api/coach/gym-console/status
 *
 * Returns status for up to 6 clients in one call for the gym console grid.
 * Uses single RPC get_gym_console_status to replace per-client getProgramState and session/log queries.
 * Auth: coach (or admin) only; all clientIds must belong to the coach.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'
import { SupabaseClient } from '@supabase/supabase-js'

const MAX_CLIENTS = 6
const IDLE_MINUTES = 15

type GymConsoleRow = {
  client_id: string
  first_name?: string | null
  last_name?: string | null
  active_session?: {
    session_id: string
    status: string
    started_at: string
    workout_assignment_id?: string
    workout_log_id?: string
    template_name?: string | null
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
}

async function getGymConsoleStatusFallback(
  supabaseAdmin: SupabaseClient,
  coachId: string,
  clientIds: string[]
): Promise<GymConsoleRow[]> {
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', clientIds)

  const { data: activeAssignments } = await supabaseAdmin
    .from('program_assignments')
    .select('id, client_id, program_id, updated_at, created_at')
    .in('client_id', clientIds)
    .eq('status', 'active')

  const programIds = Array.from(new Set((activeAssignments ?? []).map((a: { program_id: string }) => a.program_id).filter(Boolean)))

  const [{ data: programs }, { data: scheduleSlots }] = await Promise.all([
    programIds.length > 0
      ? supabaseAdmin.from('workout_programs').select('id, name').in('id', programIds)
      : Promise.resolve({ data: [] }),
    programIds.length > 0
      ? supabaseAdmin
          .from('program_schedule')
          .select('id, program_id, template_id, week_number, day_of_week')
          .in('program_id', programIds)
          .order('week_number', { ascending: true })
          .order('day_of_week', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const assignmentIds = (activeAssignments ?? []).map((a: { id: string }) => a.id)

  const [{ data: dayCompletions }, { data: progressRows }] = await Promise.all([
    assignmentIds.length > 0
      ? supabaseAdmin
          .from('program_day_completions')
          .select('program_assignment_id, program_schedule_id')
          .in('program_assignment_id', assignmentIds)
      : Promise.resolve({ data: [] }),
    assignmentIds.length > 0
      ? supabaseAdmin
          .from('program_progress')
          .select('program_assignment_id, current_week_number, current_day_number')
          .in('program_assignment_id', assignmentIds)
      : Promise.resolve({ data: [] }),
  ])

  const { data: sessions } = await supabaseAdmin
    .from('workout_sessions')
    .select('id, client_id, status, started_at, assignment_id')
    .in('client_id', clientIds)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })

  const sessionByClient = new Map<string, { id: string; assignment_id?: string; started_at: string }>()
  for (const session of sessions ?? []) {
    if (!sessionByClient.has(session.client_id)) {
      sessionByClient.set(session.client_id, session)
    }
  }

  const sessionIds = Array.from(sessionByClient.values()).map((s) => s.id)
  const assignmentIdsFromSessions = Array.from(
    new Set(Array.from(sessionByClient.values()).map((s) => s.assignment_id).filter(Boolean))
  )

  const [{ data: workoutLogs }, { data: workoutAssignments }] = await Promise.all([
    sessionIds.length > 0
      ? supabaseAdmin
          .from('workout_logs')
          .select('id, workout_session_id, completed_at')
          .in('workout_session_id', sessionIds)
          .is('completed_at', null)
      : Promise.resolve({ data: [] }),
    assignmentIdsFromSessions.length > 0
      ? supabaseAdmin
          .from('workout_assignments')
          .select('id, workout_template_id')
          .in('id', assignmentIdsFromSessions)
      : Promise.resolve({ data: [] }),
  ])

  const logBySessionId = new Map((workoutLogs ?? []).map((l: { id: string; workout_session_id: string }) => [l.workout_session_id, l]))
  const workoutLogIds = (workoutLogs ?? []).map((l: { id: string }) => l.id)

  const [{ data: setLogs }, { data: assignmentsForTemplates }] = await Promise.all([
    workoutLogIds.length > 0
      ? supabaseAdmin
          .from('workout_set_logs')
          .select('workout_log_id, completed_at')
          .in('workout_log_id', workoutLogIds)
      : Promise.resolve({ data: [] }),
    (scheduleSlots ?? []).length > 0
      ? supabaseAdmin
          .from('workout_templates')
          .select('id, name')
          .in(
            'id',
            Array.from(new Set((scheduleSlots ?? []).map((s: { template_id: string }) => s.template_id).filter(Boolean)))
          )
      : Promise.resolve({ data: [] }),
  ])

  const setEntryTemplateIds = Array.from(
    new Set((scheduleSlots ?? []).map((s: { template_id: string }) => s.template_id).filter(Boolean))
  )

  const { data: setEntries } =
    setEntryTemplateIds.length > 0
      ? await supabaseAdmin
          .from('workout_set_entries')
          .select('id, template_id')
          .in('template_id', setEntryTemplateIds)
      : { data: [] as { id: string; template_id: string }[] }

  const setEntryIds = (setEntries ?? []).map((s: { id: string }) => s.id)
  const { data: setEntryExercises } =
    setEntryIds.length > 0
      ? await supabaseAdmin
          .from('workout_set_entry_exercises')
          .select('id, set_entry_id')
          .in('set_entry_id', setEntryIds)
      : { data: [] as { id: string; set_entry_id: string }[] }

  const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]))
  const programNameMap = new Map((programs ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))
  const templateNameMap = new Map((assignmentsForTemplates ?? []).map((t: { id: string; name: string }) => [t.id, t.name]))
  const assignmentTemplateMap = new Map((workoutAssignments ?? []).map((wa: { id: string; workout_template_id: string }) => [wa.id, wa.workout_template_id]))

  const completionsByAssignment = new Map<string, Set<string>>()
  for (const row of dayCompletions ?? []) {
    const key = row.program_assignment_id
    if (!completionsByAssignment.has(key)) completionsByAssignment.set(key, new Set())
    completionsByAssignment.get(key)!.add(row.program_schedule_id)
  }

  const slotsByProgram = new Map<string, { id: string; template_id: string; week_number: number; day_of_week: number }[]>()
  for (const slot of scheduleSlots ?? []) {
    if (!slotsByProgram.has(slot.program_id)) slotsByProgram.set(slot.program_id, [])
    slotsByProgram.get(slot.program_id)!.push(slot)
  }

  const progressByAssignment = new Map((progressRows ?? []).map((p: { program_assignment_id: string }) => [p.program_assignment_id, p]))

  const setEntriesByTemplate = new Map<string, number>()
  for (const se of setEntries ?? []) {
    setEntriesByTemplate.set(se.template_id, (setEntriesByTemplate.get(se.template_id) ?? 0) + 1)
  }

  const templateBySetEntry = new Map((setEntries ?? []).map((se: { id: string; template_id: string }) => [se.id, se.template_id]))
  const exerciseCountByTemplate = new Map<string, number>()
  for (const ex of setEntryExercises ?? []) {
    const templateId = templateBySetEntry.get(ex.set_entry_id)
    if (!templateId) continue
    exerciseCountByTemplate.set(templateId, (exerciseCountByTemplate.get(templateId) ?? 0) + 1)
  }

  const setLogStatsByLogId = new Map<string, { sets_logged: number; last_set_logged_at: string | null }>()
  for (const row of setLogs ?? []) {
    const current = setLogStatsByLogId.get(row.workout_log_id) ?? { sets_logged: 0, last_set_logged_at: null }
    current.sets_logged += 1
    if (!current.last_set_logged_at || (row.completed_at && row.completed_at > current.last_set_logged_at)) {
      current.last_set_logged_at = row.completed_at
    }
    setLogStatsByLogId.set(row.workout_log_id, current)
  }

  const assignmentsByClient = new Map<string, { id: string; program_id: string; updated_at: string | null; created_at: string }[]>()
  for (const assignment of activeAssignments ?? []) {
    if (!assignmentsByClient.has(assignment.client_id)) assignmentsByClient.set(assignment.client_id, [])
    assignmentsByClient.get(assignment.client_id)!.push(assignment)
  }
  for (const [, list] of assignmentsByClient) {
    list.sort((a, b) => (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at))
  }

  return clientIds.map((clientId) => {
    const profile = profileMap.get(clientId) as { first_name?: string; last_name?: string } | undefined
    const assignment = assignmentsByClient.get(clientId)?.[0]
    const slots = assignment ? slotsByProgram.get(assignment.program_id) ?? [] : []
    const completedSet = assignment ? completionsByAssignment.get(assignment.id) ?? new Set<string>() : new Set<string>()
    const nextSlot = slots.find((s) => !completedSet.has(s.id)) ?? null
    const hasProgram = Boolean(assignment)
    const isProgramCompleted = hasProgram && !nextSlot

    const session = sessionByClient.get(clientId)
    const log = session ? logBySessionId.get(session.id) as { id: string } | undefined : undefined
    const templateId = session?.assignment_id ? assignmentTemplateMap.get(session.assignment_id) : undefined
    const templateName = templateId ? templateNameMap.get(templateId) : undefined
    const setLogStats = log ? setLogStatsByLogId.get(log.id) : undefined

    const activeSession = session
      ? {
          session_id: session.id,
          status: 'in_progress',
          started_at: session.started_at,
          workout_assignment_id: session.assignment_id ?? '',
          workout_log_id: log?.id ?? '',
          template_name: templateName ?? null,
          sets_logged: setLogStats?.sets_logged ?? 0,
          last_set_logged_at: setLogStats?.last_set_logged_at ?? session.started_at,
        }
      : null

    const nextWorkout = nextSlot
      ? {
          schedule_id: nextSlot.id,
          template_id: nextSlot.template_id,
          template_name: templateNameMap.get(nextSlot.template_id) ?? 'Workout',
          program_assignment_id: assignment!.id,
          block_count: setEntriesByTemplate.get(nextSlot.template_id) ?? 0,
          exercise_count: exerciseCountByTemplate.get(nextSlot.template_id) ?? 0,
        }
      : null

    const progress = assignment ? (progressByAssignment.get(assignment.id) as { current_week_number?: number; current_day_number?: number } | undefined) : undefined

    let status = 'no_session'
    if (!hasProgram) status = 'no_program'
    else if (isProgramCompleted) status = 'program_completed'
    else if (activeSession) status = 'active_session'

    return {
      client_id: clientId,
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      active_session: activeSession,
      program_name: assignment ? programNameMap.get(assignment.program_id) ?? null : null,
      program_assignment_id: assignment?.id ?? null,
      next_workout: nextWorkout,
      current_week: progress?.current_week_number ?? null,
      current_day: progress?.current_day_number ?? null,
      status,
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(request)

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

    const { data: rpcRows, error: rpcError } = await supabaseAuth.rpc('get_gym_console_status', {
      p_coach_id: user.id,
      p_client_ids: validClientIds,
    })

    if (rpcError) {
      console.error('[gym-console/status] RPC error:', rpcError)
      if (rpcError.message === 'Not authenticated') {
        return createUnauthorizedResponse('Not authenticated')
      }
      if (rpcError.code === '42P01' && rpcError.message.includes('workout_blocks')) {
        const fallbackRows = await getGymConsoleStatusFallback(supabaseAdmin, user.id, validClientIds)
        return NextResponse.json({ clients: fallbackRows.map((row) => {
          const clientName = [row.first_name ?? '', row.last_name ?? ''].join(' ').trim() || 'Client'
          const session = row.active_session
          const now = Date.now()
          const idleMs = IDLE_MINUTES * 60 * 1000
          const lastSetLoggedAt = session?.last_set_logged_at ?? null
          const isIdle = lastSetLoggedAt ? now - new Date(lastSetLoggedAt).getTime() > idleMs : true

          let status: 'active_session' | 'idle_session' | 'no_session' | 'no_program' | 'program_completed' = (row.status as any) ?? 'no_session'
          if (session && status === 'active_session' && isIdle) {
            status = 'idle_session'
          }

          return {
            clientId: row.client_id,
            clientName,
            programName: row.program_name ?? null,
            programAssignmentId: row.program_assignment_id ?? null,
            currentWeek: row.current_week ?? null,
            currentDay: row.current_day ?? null,
            nextWorkout: row.next_workout
              ? {
                  workoutName: row.next_workout.template_name ?? 'Workout',
                  templateId: row.next_workout.template_id,
                  scheduleId: row.next_workout.schedule_id,
                  programAssignmentId: row.next_workout.program_assignment_id,
                  blockCount: row.next_workout.block_count ?? 0,
                  exerciseCount: row.next_workout.exercise_count ?? 0,
                }
              : null,
            activeSession: session
              ? {
                  sessionId: session.session_id,
                  workoutLogId: session.workout_log_id ?? '',
                  workoutAssignmentId: session.workout_assignment_id ?? '',
                  templateName: session.template_name ?? null,
                  setsLogged: session.sets_logged ?? 0,
                  startedAt: session.started_at,
                  currentBlock: 0,
                  currentExercise: '—',
                  currentSet: '—',
                  lastSetLoggedAt: session.last_set_logged_at ?? session.started_at,
                  isIdle,
                }
              : null,
            status,
          }
        }) })
      }
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
        templateName: string | null
        setsLogged: number
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
          templateName: session.template_name ?? null,
          setsLogged: session.sets_logged ?? 0,
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
