/**
 * POST /api/coach/gym-console/status
 *
 * Returns status for up to 6 clients in one call for the gym console grid.
 * Auth: coach (or admin) only; all clientIds must belong to the coach.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'
import { getProgramState } from '@/lib/programStateService'

const MAX_CLIENTS = 6
const IDLE_MINUTES = 15

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

    // Verify coach role
    const { data: coachProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!coachProfile || (coachProfile.role !== 'coach' && coachProfile.role !== 'admin')) {
      return createForbiddenResponse('Only coaches can access gym console')
    }

    // Verify all clientIds belong to this coach
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

    // Batch: profiles for display names
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', validClientIds)

    const profileMap = new Map((profiles ?? []).map((p: { id: string; first_name?: string; last_name?: string }) => [p.id, p]))

    // Program state per client (parallel)
    const states = await Promise.all(
      validClientIds.map((cid) => getProgramState(supabaseAdmin, cid))
    )

    // In-progress sessions for these clients
    const { data: sessions } = await supabaseAdmin
      .from('workout_sessions')
      .select('id, client_id, assignment_id, started_at, program_assignment_id, program_schedule_id')
      .in('client_id', validClientIds)
      .eq('status', 'in_progress')

    const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id)
    const sessionByClient = new Map(
      (sessions ?? []).map((s: { client_id: string; id: string; started_at: string; assignment_id?: string }) => [s.client_id, s])
    )

    // Workout logs for these sessions
    let logs: { id: string; workout_session_id: string; client_id: string }[] = []
    if (sessionIds.length > 0) {
      const { data: logsData } = await supabaseAdmin
        .from('workout_logs')
        .select('id, workout_session_id, client_id')
        .in('workout_session_id', sessionIds)
      logs = logsData ?? []
    }

    const logIds = logs.map((l) => l.id)
    const logBySession = new Map(logs.map((l) => [l.workout_session_id, l]))

    // Latest set log per log (for lastSetLoggedAt and current set info)
    let setLogs: { workout_log_id: string; block_id: string; exercise_id: string; set_number: number; completed_at: string }[] = []
    if (logIds.length > 0) {
      const { data: setLogsData } = await supabaseAdmin
        .from('workout_set_logs')
        .select('workout_log_id, block_id, exercise_id, set_number, completed_at')
        .in('workout_log_id', logIds)
        .order('completed_at', { ascending: false })
      setLogs = setLogsData ?? []
    }

    // Latest set log per workout_log_id
    const latestSetByLog = new Map<string, (typeof setLogs)[0]>()
    for (const row of setLogs) {
      if (!latestSetByLog.has(row.workout_log_id)) {
        latestSetByLog.set(row.workout_log_id, row)
      }
    }

    // Resolve block index and exercise name for sessions that have set logs
    const blockIds = [...new Set(setLogs.map((s) => s.block_id))]
    const exerciseIds = [...new Set(setLogs.map((s) => s.exercise_id).filter(Boolean))]
    let blocks: { id: string; template_id: string; block_order: number }[] = []
    let blockExercises: { block_id: string; exercise_id: string; sets: number | null }[] = []
    let exercises: { id: string; name: string }[] = []

    if (blockIds.length > 0) {
      const [{ data: blocksData }, { data: beData }, { data: exData }] = await Promise.all([
        supabaseAdmin.from('workout_blocks').select('id, template_id, block_order').in('id', blockIds),
        supabaseAdmin.from('workout_block_exercises').select('block_id, exercise_id, sets').in('block_id', blockIds),
        exerciseIds.length > 0 ? supabaseAdmin.from('exercises').select('id, name').in('id', exerciseIds) : Promise.resolve({ data: [] }),
      ])
      blocks = blocksData ?? []
      blockExercises = beData ?? []
      exercises = exData ?? []
    }

    const blockMap = new Map(blocks.map((b) => [b.id, b]))
    const exerciseMap = new Map(exercises.map((e) => [e.id, e]))
    const setsForBlockExercise = new Map(
      blockExercises.map((be) => [`${be.block_id}:${be.exercise_id}`, be.sets ?? 0])
    )

    // Build template block order for "Block X of Y"
    const templateIds = [...new Set(blocks.map((b) => b.template_id))]
    let templateBlockCounts: Record<string, number> = {}
    if (templateIds.length > 0) {
      const { data: blockCounts } = await supabaseAdmin
        .from('workout_blocks')
        .select('template_id')
        .in('template_id', templateIds)
      const countByTemplate: Record<string, number> = {}
      for (const row of blockCounts ?? []) {
        countByTemplate[row.template_id] = (countByTemplate[row.template_id] ?? 0) + 1
      }
      templateBlockCounts = countByTemplate
    }

    const now = Date.now()
    const idleMs = IDLE_MINUTES * 60 * 1000

    const clients = validClientIds.map((clientId, idx) => {
      const state = states[idx]
      const profile = profileMap.get(clientId)
      const clientName = profile
        ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Client'
        : 'Client'

      const session = sessionByClient.get(clientId)
      const log = session ? logBySession.get(session.id) : null
      const latestSet = log ? latestSetByLog.get(log.id) : null
      const lastSetLoggedAt = latestSet?.completed_at ?? null
      const isIdle = lastSetLoggedAt ? now - new Date(lastSetLoggedAt).getTime() > idleMs : true

      let status: 'active_session' | 'idle_session' | 'no_session' | 'no_program' | 'program_completed' = 'no_session'
      let nextWorkout: {
        workoutName: string
        templateId: string
        scheduleId: string
        programAssignmentId: string
        blockCount: number
        exerciseCount: number
      } | null = null
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

      if (!state.assignment) {
        status = 'no_program'
      } else if (state.isCompleted) {
        status = 'program_completed'
      } else if (state.nextSlot && state.assignment) {
        const slot = state.nextSlot
        const slotsInWeek = state.slots.filter((s) => s.week_number === slot.week_number)
        const dayPosition = slotsInWeek.findIndex((s) => s.id === slot.id) + 1
        nextWorkout = {
          workoutName: '', // will resolve from template below
          templateId: slot.template_id,
          scheduleId: slot.id,
          programAssignmentId: state.assignment.id,
          blockCount: 0,
          exerciseCount: 0,
        }
      }

      if (session) {
        status = isIdle ? 'idle_session' : 'active_session'
        let currentBlock = 0
        let currentExercise = '—'
        let currentSet = '—'
        if (latestSet) {
          const block = blockMap.get(latestSet.block_id)
          if (block) {
            currentBlock = block.block_order + 1
            const totalBlocks = templateBlockCounts[block.template_id] ?? 0
            currentBlock = Math.min(currentBlock, totalBlocks || 1)
          }
          const ex = exerciseMap.get(latestSet.exercise_id)
          if (ex) currentExercise = ex.name
          const totalSets = setsForBlockExercise.get(`${latestSet.block_id}:${latestSet.exercise_id}`) ?? 0
          const sn = latestSet.set_number ?? 0
          currentSet = totalSets > 0 ? `${sn} of ${totalSets}` : `${sn}`
        }
        activeSession = {
          sessionId: session.id,
          workoutLogId: log?.id ?? '',
          workoutAssignmentId: session.assignment_id ?? '',
          startedAt: session.started_at,
          currentBlock,
          currentExercise,
          currentSet,
          lastSetLoggedAt: lastSetLoggedAt ?? session.started_at,
          isIdle,
        }
      }

      return {
        clientId,
        clientName,
        programName: state.assignment?.name ?? null,
        programAssignmentId: state.assignment?.id ?? null,
        currentWeek: state.assignment ? state.currentWeekNumber : null,
        currentDay: state.assignment ? state.currentDayNumber : null,
        nextWorkout,
        activeSession,
        status,
      }
    })

    // Resolve workout names and block/exercise counts for nextWorkout
    const templateIdsNeeded = [...new Set(clients.map((c) => c.nextWorkout?.templateId).filter(Boolean))] as string[]
    if (templateIdsNeeded.length > 0) {
      const [{ data: templates }, { data: blockCountData }, { data: nextBlocks }] = await Promise.all([
        supabaseAdmin.from('workout_templates').select('id, name').in('id', templateIdsNeeded),
        supabaseAdmin.from('workout_blocks').select('template_id').in('template_id', templateIdsNeeded),
        supabaseAdmin.from('workout_blocks').select('id, template_id').in('template_id', templateIdsNeeded),
      ])
      const templateMap = new Map((templates ?? []).map((t: { id: string; name: string }) => [t.id, t.name]))
      const blockCountByTemplate: Record<string, number> = {}
      for (const r of blockCountData ?? []) {
        blockCountByTemplate[r.template_id] = (blockCountByTemplate[r.template_id] ?? 0) + 1
      }
      const nextBlockIds = (nextBlocks ?? []).map((b: { id: string }) => b.id)
      let exerciseCountByTemplate: Record<string, number> = {}
      if (nextBlockIds.length > 0) {
        const { data: exRows } = await supabaseAdmin
          .from('workout_block_exercises')
          .select('block_id')
          .in('block_id', nextBlockIds)
        const blockToTemplate = new Map((nextBlocks ?? []).map((b: { id: string; template_id: string }) => [b.id, b.template_id]))
        for (const row of exRows ?? []) {
          const tid = blockToTemplate.get(row.block_id)
          if (tid) exerciseCountByTemplate[tid] = (exerciseCountByTemplate[tid] ?? 0) + 1
        }
      }
      for (const c of clients) {
        if (c.nextWorkout) {
          c.nextWorkout.workoutName = templateMap.get(c.nextWorkout.templateId) ?? 'Workout'
          c.nextWorkout.blockCount = blockCountByTemplate[c.nextWorkout.templateId] ?? 0
          c.nextWorkout.exerciseCount = exerciseCountByTemplate[c.nextWorkout.templateId] ?? 0
        }
      }
    }

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
