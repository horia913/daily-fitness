import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isDebugHarnessEnabled } from '@/lib/debugHarness'
import { getCurrentWorkoutFromProgress } from '@/lib/programProgressService'
import { getProgramMetrics } from '@/lib/programMetricsService'

type ClientBlockExerciseRecord = {
  id: string
  exercise_id: string | null
  exercise_order: number | null
  exercise_letter: string | null
  sets: number | null
  reps: string | null
  weight_kg: number | null
  rir: number | null
  tempo: string | null
  rest_seconds: number | null
  notes: string | null
  load_percentage?: number | null
  drop_sets?: any[]
  cluster_sets?: any[]
  rest_pause_sets?: any[]
  time_protocols?: any[]
  hr_sets?: any[]
}

type ClientBlockRecord = {
  id: string
  block_order: number | null
  block_type: string | null
  block_name: string | null
  block_notes: string | null
  total_sets: number | null
  reps_per_set: string | null
  rest_seconds: number | null
  duration_seconds?: number | null
  exercises?: ClientBlockExerciseRecord[]
}

const getStartOfWeek = (now: Date) => {
  const dayOfWeek = now.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

type TimingEntry = {
  name: string
  start: number
  end: number
  durationMs: number
  rowCount: number
  error?: string | null
}

type QueryPattern = {
  step: string
  table: string
  select: string
  filters: string
  order: string
  limit: string
  joins: string
}

const countRows = (data: any) => {
  if (Array.isArray(data)) return data.length
  if (data) return 1
  return 0
}

const formatExecSqlResult = (data: any) => {
  if (!data) return [] as string[]
  if (!Array.isArray(data)) return [JSON.stringify(data, null, 2)]
  if (data.length === 0) return [] as string[]
  return data
    .map((row) => {
      if (!row || typeof row !== 'object') return String(row)
      const plan =
        (row as any)['QUERY PLAN'] ||
        (row as any).query_plan ||
        (row as any).plan ||
        Object.values(row).join(' | ')
      return String(plan)
    })
    .filter((line) => line.length > 0)
}

const escapeLiteral = (value: string) => value.replace(/'/g, "''")

const getTemplateExerciseSummary = async (
  supabase: any,
  templateId: string,
  timedQuery: (name: string, query: () => any) => Promise<any>
) => {
  const { data: blocks, error: blocksError } = await timedQuery(
    'template_blocks',
    () =>
      supabase
        .from('workout_blocks')
        .select('id, block_type, total_sets')
        .eq('template_id', templateId)
  )

  if (blocksError || !blocks || blocks.length === 0) {
    return { exerciseCount: 0, totalSets: 0 }
  }

  const blockIds = blocks.map((block: any) => block.id).filter(Boolean)
  if (blockIds.length === 0) return { exerciseCount: 0, totalSets: 0 }

  const blockById = new Map<string, { block_type: string | null; total_sets: number | null }>()
  blocks.forEach((block: any) => {
    blockById.set(block.id, {
      block_type: block.block_type ?? null,
      total_sets: block.total_sets ?? null,
    })
  })

  const blockTypes = new Set<string>(blocks.map((b: any) => b.block_type))
  const usesBlockExercises = ['straight_set', 'superset', 'giant_set', 'pre_exhaustion']
  const usesDropSets = blockTypes.has('drop_set')
  const usesClusterSets = blockTypes.has('cluster_set')
  const usesRestPause = blockTypes.has('rest_pause')
  const usesTimeProtocols =
    blockTypes.has('amrap') ||
    blockTypes.has('emom') ||
    blockTypes.has('for_time') ||
    blockTypes.has('tabata') ||
    blockTypes.has('circuit')
  const usesHRSets = blockTypes.has('hr_sets')

  const blockExerciseBlockIds = blocks
    .filter((block: any) => usesBlockExercises.includes(block.block_type))
    .map((block: any) => block.id)
    .filter(Boolean)

  const [
    blockExercisesRes,
    dropSetsRes,
    clusterSetsRes,
    restPauseSetsRes,
    timeProtocolsRes,
    hrSetsRes,
  ] = await Promise.all([
    blockExerciseBlockIds.length > 0
      ? timedQuery('template_block_exercises', () =>
          supabase
            .from('workout_block_exercises')
            .select('block_id, exercise_id, exercise_order, sets')
            .in('block_id', blockExerciseBlockIds)
        )
      : Promise.resolve({ data: [] }),
    usesDropSets
      ? timedQuery('template_drop_sets', () =>
          supabase
            .from('workout_drop_sets')
            .select('block_id, exercise_id, exercise_order')
            .in('block_id', blockIds)
        )
      : Promise.resolve({ data: [] }),
    usesClusterSets
      ? timedQuery('template_cluster_sets', () =>
          supabase
            .from('workout_cluster_sets')
            .select('block_id, exercise_id, exercise_order')
            .in('block_id', blockIds)
        )
      : Promise.resolve({ data: [] }),
    usesRestPause
      ? timedQuery('template_rest_pause_sets', () =>
          supabase
            .from('workout_rest_pause_sets')
            .select('block_id, exercise_id, exercise_order')
            .in('block_id', blockIds)
        )
      : Promise.resolve({ data: [] }),
    usesTimeProtocols
      ? timedQuery('template_time_protocols', () =>
          supabase
            .from('workout_time_protocols')
            .select('block_id, exercise_id, exercise_order')
            .in('block_id', blockIds)
        )
      : Promise.resolve({ data: [] }),
    usesHRSets
      ? timedQuery('template_hr_sets', () =>
          supabase
            .from('workout_hr_sets')
            .select('block_id, exercise_id, exercise_order')
            .in('block_id', blockIds)
        )
      : Promise.resolve({ data: [] }),
  ])

  let exerciseCount = 0
  let totalSets = 0

  const blockExercises = (blockExercisesRes as any)?.data || []
  blockExercises.forEach((row: any) => {
    exerciseCount += 1
    const block = blockById.get(row.block_id)
    totalSets += (row.sets ?? block?.total_sets ?? 0) || 0
  })

  const countUniqueExercises = (rows: any[]) => {
    const unique = new Set<string>()
    rows.forEach((row) => {
      unique.add(`${row.block_id}:${row.exercise_id}:${row.exercise_order}`)
    })
    return unique
  }

  const addFromSpecialTable = (rows: any[]) => {
    const unique = countUniqueExercises(rows)
    unique.forEach((key) => {
      const [blockId] = key.split(':')
      const block = blockById.get(blockId)
      exerciseCount += 1
      totalSets += block?.total_sets ?? 0
    })
  }

  addFromSpecialTable((dropSetsRes as any)?.data || [])
  addFromSpecialTable((clusterSetsRes as any)?.data || [])
  addFromSpecialTable((restPauseSetsRes as any)?.data || [])
  addFromSpecialTable((timeProtocolsRes as any)?.data || [])
  addFromSpecialTable((hrSetsRes as any)?.data || [])

  return { exerciseCount, totalSets }
}

export async function GET(request: NextRequest) {
  try {
    const routeStart = Date.now()
    const timings: TimingEntry[] = []
    const queryPatterns: QueryPattern[] = []
    const logTiming = (entry: TimingEntry) => {
      timings.push(entry)
      if (isDebugHarnessEnabled()) {
        console.log('[summary timing]', entry)
      }
    }
    const addQueryPattern = (pattern: QueryPattern) => {
      queryPatterns.push(pattern)
    }
    const timedQuery = async (name: string, query: () => any) => {
      const start = Date.now()
      const result = await query()
      const end = Date.now()
      logTiming({
        name,
        start,
        end,
        durationMs: end - start,
        rowCount: countRows(result?.data),
        error: result?.error?.message ?? null,
      })
      return result
    }

    const supabaseAuth = await createSupabaseServerClient()
    const authStart = Date.now()
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()
    const authEnd = Date.now()
    logTiming({
      name: 'auth_user',
      start: authStart,
      end: authEnd,
      durationMs: authEnd - authStart,
      rowCount: user ? 1 : 0,
      error: authError?.message ?? null,
    })

    if (authError || !user) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AuthMissing]', {
          route: '/api/client/workouts/summary',
          reason: authError?.message || 'no_user',
        })
      }
      return NextResponse.json(
        { error: authError?.message || 'Unauthorized' },
        { status: 401 }
      )
    }

    const clientId = user.id

    const today = new Date().toISOString().split('T')[0]
    const runExecSql = async (label: string, sql: string) => {
      try {
        const { data, error } = await supabaseAuth.rpc('exec_sql', { sql })
        if (error) {
          console.log(`EXPLAIN_${label}: ERROR: ${error.message}`)
          return null
        }
        const formatted = formatExecSqlResult(data).slice(0, 6)
        console.log(`EXPLAIN_${label}: ${formatted.join(' | ') || '[no plan output]'}`)
        return data
      } catch (err: any) {
        console.log(
          `EXPLAIN_${label}: ERROR: ${err?.message || String(err)}`
        )
        return null
      }
    }

    if (isDebugHarnessEnabled() && process.env.NODE_ENV !== 'production') {
      console.log('EXPLAIN_SUMMARY_START: debug harness enabled')
      const escapedClientId = escapeLiteral(clientId)

      await runExecSql(
        'workout_assignments',
        `EXPLAIN SELECT id, workout_template_id, assigned_date, scheduled_date, status, name, description, coach_id, created_at
         FROM public.workout_assignments
         WHERE client_id = '${escapedClientId}'
         ORDER BY scheduled_date DESC`
      )

      await runExecSql(
        'program_assignment_progress',
        `EXPLAIN SELECT id, assignment_id, program_id, current_week, current_day
         FROM public.program_assignment_progress
         WHERE client_id = '${escapedClientId}'
           AND is_program_completed = false
         ORDER BY created_at DESC
         LIMIT 1`
      )

      await runExecSql(
        'program_assignments',
        `EXPLAIN SELECT id, start_date, status, program_id, coach_id, name, description, duration_weeks
         FROM public.program_assignments
         WHERE client_id = '${escapedClientId}'
         ORDER BY created_at DESC`
      )

      await runExecSql(
        'workout_logs',
        `EXPLAIN SELECT id, workout_assignment_id, completed_at, total_duration_minutes, total_weight_lifted
         FROM public.workout_logs
         WHERE client_id = '${escapedClientId}'
           AND completed_at IS NOT NULL
         ORDER BY completed_at DESC
         LIMIT 100`
      )
      await runExecSql(
        'workout_logs_all_time',
        `EXPLAIN SELECT total_weight_lifted
         FROM public.workout_logs
         WHERE client_id = '${escapedClientId}'
           AND completed_at IS NOT NULL`
      )

      console.log(`RPC_completed_programs: get_completed_programs(p_client_id=${clientId})`)
    }
    addQueryPattern({
      step: 'workout_assignments',
      table: 'workout_assignments',
      select:
        'id, workout_template_id, assigned_date, scheduled_date, status, name, description, coach_id, created_at',
      filters: 'eq(client_id)',
      order: 'scheduled_date desc',
      limit: 'none',
      joins: 'none',
    })
    addQueryPattern({
      step: 'program_assignment_progress',
      table: 'program_assignment_progress',
      select: 'id, assignment_id, program_id, current_week, current_day',
      filters: 'eq(client_id), eq(is_program_completed)',
      order: 'created_at desc',
      limit: 'limit 1, maybeSingle',
      joins: 'none',
    })
    addQueryPattern({
      step: 'program_assignments',
      table: 'program_assignments',
      select:
        'id, start_date, status, program_id, coach_id, name, description, duration_weeks',
      filters: 'eq(client_id)',
      order: 'created_at desc',
      limit: 'none',
      joins: 'none',
    })
    addQueryPattern({
      step: 'workout_logs',
      table: 'workout_logs',
      select:
        'id, workout_assignment_id, completed_at, total_duration_minutes, total_weight_lifted',
      filters: 'eq(client_id), not(completed_at is null)',
      order: 'completed_at desc',
      limit: 'limit 100',
      joins: 'none',
    })
    addQueryPattern({
      step: 'workout_logs_all_time',
      table: 'workout_logs',
      select: 'total_weight_lifted',
      filters: 'eq(client_id), not(completed_at is null)',
      order: 'none',
      limit: 'none',
      joins: 'none',
    })
    addQueryPattern({
      step: 'completed_programs',
      table: 'rpc:get_completed_programs',
      select: 'rpc result',
      filters: 'p_client_id',
      order: 'none',
      limit: 'none',
      joins: 'none',
    })
    const [
      assignmentsResult,
      _programProgressPlaceholder, // Moved to separate query after programAssignment
      programAssignmentsResult,
      logsResult,
      allTimeLogsResult,
      completedProgramsResult,
    ] = await Promise.all([
      timedQuery('workout_assignments', () =>
        supabaseAuth
          .from('workout_assignments')
          .select(
            'id, workout_template_id, assigned_date, scheduled_date, status, name, description, coach_id, created_at'
          )
          .eq('client_id', clientId)
          .order('scheduled_date', { ascending: false })
      ),
      // NOTE: program_progress query moved below - needs program_assignment_id first
      Promise.resolve({ data: null, error: null }),
      timedQuery('program_assignments', () =>
        supabaseAuth
          .from('program_assignments')
          .select(
            'id, start_date, status, program_id, coach_id, name, description, duration_weeks'
          )
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
      ),
      timedQuery('workout_logs', () =>
        supabaseAuth
          .from('workout_logs')
          .select(
            'id, workout_assignment_id, completed_at, total_duration_minutes, total_weight_lifted'
          )
          .eq('client_id', clientId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(100)
      ),
      timedQuery('workout_logs_all_time', () =>
        supabaseAuth
          .from('workout_logs')
          .select('total_weight_lifted')
          .eq('client_id', clientId)
          .not('completed_at', 'is', null)
      ),
      timedQuery('completed_programs', () =>
        supabaseAuth.rpc('get_completed_programs', {
          p_client_id: clientId,
        })
      ),
    ])

    const assignments = assignmentsResult.data || []

    const assignmentList = assignments || []
    // programProgress is now queried separately after we have programAssignment.id
    const programAssignmentsData = programAssignmentsResult.data || []
    const allProgramAssignments = programAssignmentsData || []
    const programAssignment =
      allProgramAssignments.length > 0 ? allProgramAssignments[0] : null
    
    // Query program_progress for the active program assignment
    let programProgress: any = null
    if (programAssignment?.id) {
      const { data: progressData, error: progressError } = await timedQuery('program_progress', () =>
        supabaseAuth
          .from('program_progress')
          .select('id, program_assignment_id, current_week_index, current_day_index, is_completed')
          .eq('program_assignment_id', programAssignment.id)
          .maybeSingle()
      )
      programProgress = progressData
      console.log('[summary] program_progress query:', { 
        programAssignmentId: programAssignment.id,
        progressData,
        progressError 
      })
    }
    
    const logs = logsResult.data || []
    const allTimeLogs = allTimeLogsResult.data || []
    const completedPrograms =
      completedProgramsResult?.error ? [] : completedProgramsResult?.data || []
    const activeAssignments = assignmentList.filter((assignment: any) =>
      ['assigned', 'active'].includes(assignment.status)
    )

    const todaysAssignment = activeAssignments.find(
      (assignment: any) => assignment.scheduled_date === today
    )

    const assignmentToUse =
      todaysAssignment ||
      activeAssignments.sort((a: any, b: any) => {
        const dateA = a.scheduled_date || a.assigned_date || a.created_at
        const dateB = b.scheduled_date || b.assigned_date || b.created_at
        return new Date(dateB).getTime() - new Date(dateA).getTime()
      })[0] ||
      null

    let todaysWorkout: any = null
    if (assignmentToUse?.id && assignmentToUse?.workout_template_id) {
      addQueryPattern({
        step: 'template_blocks',
        table: 'workout_blocks',
        select: 'id, block_type, total_sets',
        filters: 'eq(template_id)',
        order: 'none',
        limit: 'none',
        joins: 'none',
      })
      addQueryPattern({
        step: 'template_block_exercises',
        table: 'workout_block_exercises',
        select: 'block_id, exercise_id, exercise_order, sets',
        filters: 'in(block_id)',
        order: 'none',
        limit: 'none',
        joins: 'none',
      })
      addQueryPattern({
        step: 'template_drop_sets',
        table: 'workout_drop_sets',
        select: 'block_id, exercise_id, exercise_order',
        filters: 'in(block_id)',
        order: 'none',
        limit: 'none',
        joins: 'none',
      })
      addQueryPattern({
        step: 'template_cluster_sets',
        table: 'workout_cluster_sets',
        select: 'block_id, exercise_id, exercise_order',
        filters: 'in(block_id)',
        order: 'none',
        limit: 'none',
        joins: 'none',
      })
      addQueryPattern({
        step: 'template_rest_pause_sets',
        table: 'workout_rest_pause_sets',
        select: 'block_id, exercise_id, exercise_order',
        filters: 'in(block_id)',
        order: 'none',
        limit: 'none',
        joins: 'none',
      })
      addQueryPattern({
        step: 'template_time_protocols',
        table: 'workout_time_protocols',
        select: 'block_id, exercise_id, exercise_order',
        filters: 'in(block_id)',
        order: 'none',
        limit: 'none',
        joins: 'none',
      })
      addQueryPattern({
        step: 'template_hr_sets',
        table: 'workout_hr_sets',
        select: 'block_id, exercise_id, exercise_order',
        filters: 'in(block_id)',
        order: 'none',
        limit: 'none',
        joins: 'none',
      })
      const { exerciseCount, totalSets } = await getTemplateExerciseSummary(
        supabaseAuth,
        assignmentToUse.workout_template_id,
        timedQuery
      )

      const assignmentName =
        assignmentToUse.name && assignmentToUse.name.trim().length > 0
          ? assignmentToUse.name
          : 'Workout'
      const assignmentDescription =
        assignmentToUse.description &&
        assignmentToUse.description.trim().length > 0
          ? assignmentToUse.description
          : ''

      todaysWorkout = {
        hasWorkout: true,
        templateId: assignmentToUse.workout_template_id || undefined,
        templateName: assignmentName,
        templateDescription: assignmentDescription,
        weekNumber: 1,
        programDay: 1,
        exercises: [],
        exerciseCount,
        totalSets,
        generatedAt: assignmentToUse.scheduled_date || assignmentToUse.assigned_date,
        message: 'Workout ready!',
      }
    }

    if (!todaysWorkout) {
      todaysWorkout = {
        hasWorkout: false,
        message: 'No active workout assigned. Contact your coach to get started!',
      }
    }

    let scheduleIdByTemplate: Record<string, string> = {}

    // ========================================================================
    // NEW: Use program_progress as SOURCE OF TRUTH for next program workout
    // This replaces the legacy program_day_assignments logic
    // ALWAYS use program workout path if there's an active program assignment
    // ========================================================================
    if (programAssignment) {
      let programExerciseCount = 0
      let programTotalSets = 0

      // Get current workout from program_progress + program_schedule
      const workoutInfo = await getCurrentWorkoutFromProgress(supabaseAuth, clientId)
      
      console.log('[summary] getCurrentWorkoutFromProgress result:', workoutInfo)

      if (workoutInfo.status === 'active' && workoutInfo.template_id) {
        const scheduleTemplateId = workoutInfo.template_id

        // Load client progression rules for exercise counts
        let clientRules: any[] = []
        if (scheduleTemplateId) {
          addQueryPattern({
            step: 'program_template_blocks',
            table: 'workout_blocks',
            select: 'id',
            filters: 'eq(template_id)',
            order: 'none',
            limit: 'none',
            joins: 'none',
          })
          const { data: templateBlocks } = await timedQuery(
            'program_template_blocks',
            () =>
              supabaseAuth
                .from('workout_blocks')
                .select('id')
                .eq('template_id', scheduleTemplateId)
          )

          const blockIds = (templateBlocks || [])
            .map((block: any) => block.id)
            .filter(Boolean)

          if (blockIds.length > 0) {
            // Use actual week_number from program_schedule (via workoutInfo)
            const actualWeekNumber = workoutInfo.actual_week_number || 1

            addQueryPattern({
              step: 'client_program_rules',
              table: 'client_program_progression_rules',
              select:
                'id, week_number, block_order, exercise_id, exercise_order, exercise_letter, sets, reps, rest_seconds, notes, block_id',
              filters: 'eq(program_assignment_id), eq(week_number), in(block_id)',
              order: 'block_order asc, exercise_order asc',
              limit: 'none',
              joins: 'none',
            })
            const { data: clientRulesData } = await timedQuery(
              'client_program_rules',
              () =>
                supabaseAuth
                  .from('client_program_progression_rules')
                  .select(
                    'id, week_number, block_order, exercise_id, exercise_order, exercise_letter, sets, reps, rest_seconds, notes, block_id'
                  )
                  .eq('program_assignment_id', programAssignment.id)
                  .eq('week_number', actualWeekNumber)
                  .in('block_id', blockIds)
                  .order('block_order', { ascending: true })
                  .order('exercise_order', { ascending: true })
            )

            clientRules = (clientRulesData as any[]) || []
          }
        }

        if (clientRules.length > 0) {
          const uniqueExercises = new Set<string>()
          clientRules.forEach((rule) => {
            uniqueExercises.add(
              `${rule.block_id}:${rule.exercise_id}:${rule.exercise_order}`
            )
            programTotalSets += rule.sets ?? 0
          })
          programExerciseCount = uniqueExercises.size
        }

        // Store schedule_row_id in scheduleIdByTemplate (for routing)
        // NOTE: Using template_id as key since that's what the UI routes with
        if (workoutInfo.schedule_row_id && workoutInfo.template_id) {
          scheduleIdByTemplate[workoutInfo.template_id] = workoutInfo.schedule_row_id
        }

        // Estimate duration: ~3 min per exercise (minimum 15), or fetch from template
        let estimatedDuration = Math.max(15, programExerciseCount * 3)
        try {
          const { data: templateData } = await timedQuery('template_duration', () =>
            supabaseAuth.from('workout_templates').select('estimated_duration').eq('id', workoutInfo.template_id).maybeSingle()
          )
          if (templateData?.estimated_duration) {
            estimatedDuration = templateData.estimated_duration
          }
        } catch {
          // Ignore - use calculated estimate
        }

        todaysWorkout = {
          hasWorkout: true,
          templateId: workoutInfo.template_id,
          scheduleId: workoutInfo.schedule_row_id, // program_schedule.id for routing
          templateName: workoutInfo.program_name || 'Program',
          templateDescription: '',
          weekNumber: workoutInfo.actual_week_number || 1,
          programDay: (workoutInfo.current_day_index || 0) + 1, // 1-based for display
          exercises: [],
          exerciseCount: programExerciseCount,
          totalSets: programTotalSets,
          estimatedDuration: estimatedDuration,
          generatedAt: programAssignment.start_date,
          message: workoutInfo.position_label ? `${workoutInfo.position_label} ready!` : 'Program workout ready!',
          // Additional progress info for UI
          weekLabel: workoutInfo.week_label,
          dayLabel: workoutInfo.day_label,
          positionLabel: workoutInfo.position_label,
          currentWeekIndex: workoutInfo.current_week_index,
          currentDayIndex: workoutInfo.current_day_index,
        }
      } else if (workoutInfo.status === 'completed') {
        todaysWorkout = {
          hasWorkout: false,
          message: 'Congratulations! Program completed!',
          templateName: workoutInfo.program_name || 'Program',
        }
      }
    }

    let currentProgram: any = null

    let programData: any = null
    let programCoachId: string | null = null

    // Use programAssignment.program_id (not programProgress which doesn't have program_id)
    if (programAssignment?.program_id) {
      addQueryPattern({
        step: 'program_assignment_with_program',
        table: 'program_assignments -> workout_programs',
        select:
          'program:workout_programs(id, name, description, duration_weeks, difficulty_level, coach_id)',
        filters: 'eq(id), eq(client_id)',
        order: 'none',
        limit: 'maybeSingle',
        joins: 'foreign select program:workout_programs',
      })
      const { data: assignmentWithProgram } = await timedQuery(
        'program_assignment_with_program',
        () =>
          supabaseAuth
            .from('program_assignments')
            .select(
              `
              program:workout_programs(
                id, name, description, duration_weeks, difficulty_level, coach_id
              )
            `
            )
            .eq('id', programAssignment.id)
            .eq('client_id', clientId)
            .maybeSingle()
      )

      programData = assignmentWithProgram?.program || null
      programCoachId = programData?.coach_id || null
    }

    const workoutHistory = (logs || [])
      .slice(0, 7)
      .map((log: any) => {
        const assignment = assignmentList.find(
          (row: any) => row.id === log.workout_assignment_id
        )
        return {
          id: log.id,
          template_id: assignment?.workout_template_id || '',
          completed_at: log.completed_at || '',
          duration_minutes: log.total_duration_minutes,
          template: assignment
            ? {
                id: assignment.workout_template_id,
                name: assignment.name || 'Completed Workout',
                difficulty_level: 'intermediate',
              }
            : null,
          week_number: 0,
          program_day: 0,
        }
      })

    const workoutHistoryMapped = workoutHistory.map((completion: any) => ({
      hasWorkout: true,
      templateId: completion.template_id || completion.template?.id,
      templateName: completion.template?.name || 'Completed Workout',
      templateDescription: '',
      weekNumber: completion.week_number || 0,
      programDay: completion.program_day || 0,
      estimatedDuration: completion.duration_minutes || 0,
      difficultyLevel: completion.template?.difficulty_level || 'intermediate',
      exercises: [],
      generatedAt: completion.completed_at,
      message: 'Workout completed',
      completed: true,
      completedAt: completion.completed_at,
    }))

    const assignedWorkouts = assignmentList.filter((assignment: any) =>
      ['assigned', 'active', 'in_progress'].includes(assignment.status)
    )
    const assignedPrograms = allProgramAssignments || []
    const allCoachIds = new Set<string>()
    assignedWorkouts?.forEach((assignment: any) => {
      if (assignment.coach_id) allCoachIds.add(assignment.coach_id)
    })
    assignedPrograms?.forEach((assignment: any) => {
      if (assignment.coach_id) allCoachIds.add(assignment.coach_id)
    })
    allCoachIds.add(clientId)
    if (programCoachId) {
      allCoachIds.add(programCoachId)
    }

    const coachProfilesMap = new Map<string, any>()
    if (allCoachIds.size > 0) {
      addQueryPattern({
        step: 'coach_profiles',
        table: 'profiles',
        select: 'id, first_name, last_name, avatar_url',
        filters: 'in(id)',
        order: 'none',
        limit: 'none',
        joins: 'none',
      })
      const { data: coaches } = await timedQuery('coach_profiles', () =>
        supabaseAuth
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', Array.from(allCoachIds))
      )
      coaches?.forEach((coach: any) => {
        coachProfilesMap.set(coach.id, coach)
      })
    }

    const allAssignedWorkouts: any[] = []
    if (assignedWorkouts) {
      const workoutsWithDetails = assignedWorkouts.map((assignment: any) => {
        const templateSnapshot =
          assignment.name || assignment.description
            ? {
                id: assignment.workout_template_id,
                name: assignment.name,
                description: assignment.description,
              }
            : {
                id: assignment.workout_template_id,
                name: 'Workout',
                description: null,
              }
        const coach = coachProfilesMap.get(assignment.coach_id) || null
        return {
          ...assignment,
          type: 'workout',
          workout_templates: templateSnapshot,
          profiles: coach,
        }
      })
      allAssignedWorkouts.push(...workoutsWithDetails)
    }

    if (assignedPrograms) {
      const programsWithDetails = assignedPrograms.map((assignment: any) => {
        const programSnapshot =
          assignment.name || assignment.description
            ? {
                id: assignment.program_id,
                name: assignment.name,
                description: assignment.description,
                duration_weeks: assignment.duration_weeks,
              }
            : {
                id: assignment.program_id,
                name: 'Program',
                description: null,
                duration_weeks: assignment.duration_weeks,
              }
        const coach = coachProfilesMap.get(assignment.coach_id) || null
        return {
          ...assignment,
          type: 'program',
          workout_templates: programSnapshot
            ? {
                id: programSnapshot.id,
                name: programSnapshot.name,
                description: programSnapshot.description,
                duration_weeks: programSnapshot.duration_weeks,
              }
            : null,
          profiles: coach,
        }
      })
      allAssignedWorkouts.push(...programsWithDetails)
    }

    if (programData && programAssignment) {
      const coachInfo = programCoachId
        ? coachProfilesMap.get(programCoachId)
        : null

      // Get accurate completion percentage from program_day_completions
      let progressPercentage = 0
      let currentWeek = 1
      try {
        // Pass authenticated client to respect RLS
        const metrics = await getProgramMetrics(programAssignment.id, supabaseAuth)
        console.log('[summary] getProgramMetrics result:', metrics)
        if (metrics) {
          progressPercentage = metrics.completion_percentage
          // Estimate current week from current_day_number
          currentWeek = metrics.current_day_number
            ? Math.ceil(metrics.current_day_number / 7)
            : (programProgress?.current_week_index ?? 0) + 1
        }
      } catch (err) {
        console.error('[summary] getProgramMetrics error:', err)
        // Fallback to index-based estimate
        if (programProgress?.current_week_index !== undefined) {
          currentWeek = programProgress.current_week_index + 1
        }
      }
      console.log('[summary] currentProgram will be:', { progressPercentage, currentWeek, programData })

      currentProgram = {
        id: programData.id,
        name: programData.name,
        description: programData.description,
        current_week: currentWeek,
        total_weeks: programData.duration_weeks,
        progress_percentage: progressPercentage,
        difficulty_level: programData.difficulty_level,
        coach_name:
          `${coachInfo?.first_name || ''} ${coachInfo?.last_name || ''}`.trim() ||
          'Your Coach',
      }
    }

    const { monday, sunday } = getStartOfWeek(new Date())
    const mondayStr = monday.toISOString().split('T')[0]
    const sundayStr = sunday.toISOString().split('T')[0]

    const weeklyAssignments = assignmentList.filter((assignment: any) => {
      if (!assignment.scheduled_date) return false
      return assignment.scheduled_date >= mondayStr && assignment.scheduled_date <= sundayStr
    })

    let goal = weeklyAssignments.length || 0
    const completedLogs = (logs || []).filter((log: any) => {
      if (!log.completed_at) return false
      const completedAt = new Date(log.completed_at)
      return completedAt >= monday && completedAt <= sunday
    })
    const current = completedLogs?.length || 0

    // For program users: calculate expected weekly workouts from program_schedule
    // Use the current week in program_progress to get accurate count
    if (programAssignment?.program_id) {
      try {
        // Get current week from program_progress (0-indexed)
        const currentWeekIndex = programProgress?.current_week_index ?? 0
        
        // Get the actual week_number from program_schedule for this week index
        const { data: weekNumbers } = await supabaseAuth
          .from('program_schedule')
          .select('week_number')
          .eq('program_id', programAssignment.program_id)
          .order('week_number', { ascending: true })
        
        if (weekNumbers && weekNumbers.length > 0) {
          // Get unique week numbers
          const uniqueWeeks = [...new Set(weekNumbers.map((w: any) => w.week_number))].sort((a: any, b: any) => a - b)
          const actualWeekNumber = uniqueWeeks[currentWeekIndex] || uniqueWeeks[0] || 1
          
          // Count workouts scheduled for this week
          const { data: weekDays } = await supabaseAuth
            .from('program_schedule')
            .select('id')
            .eq('program_id', programAssignment.program_id)
            .eq('week_number', actualWeekNumber)
          
          goal = weekDays?.length || goal
          console.log('[summary] weeklyProgress for program:', { currentWeekIndex, actualWeekNumber, goal, current })
        }
      } catch (err) {
        console.error('[summary] Error calculating weekly goal:', err)
        // Keep existing goal from workout_assignments
      }
    }

    const weeklyProgress = {
      current,
      goal,
    }

    const activeTime =
      completedLogs.reduce(
        (sum: number, log: any) => sum + (log.total_duration_minutes || 0),
        0
      ) || 0

    const totalVolume =
      completedLogs.reduce(
        (sum: number, log: any) => sum + (log.total_weight_lifted || 0),
        0
      ) || 0

    const weeklyStats = {
      totalVolume: Math.round(totalVolume),
      activeTime,
    }

    const allTimeVolume =
      allTimeLogs.reduce(
        (sum: number, log: any) => sum + (log.total_weight_lifted || 0),
        0
      ) || 0

    const thisWeekAssignments = weeklyAssignments.map((assignment: any) => {
      const log = completedLogs.find(
        (row: any) => row.workout_assignment_id === assignment.id
      )
      return {
        ...assignment,
        completed: !!log?.completed_at,
        completed_at: log?.completed_at,
        duration_minutes: log?.total_duration_minutes,
      }
    })

    const assignmentIdByTemplate: Record<string, string> = {}
    assignedWorkouts?.forEach((assignment: any) => {
      if (assignment.workout_template_id) {
        assignmentIdByTemplate[assignment.workout_template_id] = assignment.id
      }
    })

    const routeEnd = Date.now()
    logTiming({
      name: 'total',
      start: routeStart,
      end: routeEnd,
      durationMs: routeEnd - routeStart,
      rowCount: 0,
    })

    if (isDebugHarnessEnabled()) {
      const summaryLine = queryPatterns
        .map((pattern) => {
          const parts = [
            `filters=${pattern.filters}`,
            `order=${pattern.order}`,
            `limit=${pattern.limit}`,
          ]
          return `${pattern.step}=${pattern.table}(${parts.join(', ')})`
        })
        .join(' | ')
      console.log(`SUMMARY_ROUTE_QUERY_PATTERNS: ${summaryLine}`)
    }

    const serverTiming = timings
      .map((entry) => `${entry.name};dur=${entry.durationMs.toFixed(1)}`)
      .join(', ')

    const response = NextResponse.json({
      avatarUrl: coachProfilesMap.get(clientId)?.avatar_url ?? null,
      todaysWorkout,
      currentProgram,
      workoutHistory: workoutHistoryMapped,
      completedPrograms,
      upcomingWorkouts: [],
      allAssignedWorkouts,
      weeklyProgress,
      weeklyStats,
      allTimeVolume: Math.round(allTimeVolume),
      thisWeekAssignments,
      assignmentIdByTemplate,
      scheduleIdByTemplate,
    })

    response.headers.set('Server-Timing', serverTiming)

    if (isDebugHarnessEnabled()) {
      const timingByName = new Map(
        timings.map((entry) => [entry.name, entry.durationMs])
      )
      const getMs = (name: string) => timingByName.get(name) ?? 0
      console.log(
        `SUMMARY_BREAKDOWN totalMs=${getMs('total')} | auth_user=${getMs('auth_user')} | program_assignment_progress=${getMs('program_assignment_progress')} | program_assignments=${getMs('program_assignments')} | workout_logs=${getMs('workout_logs')} | workout_assignments=${getMs('workout_assignments')} | completed_programs=${getMs('completed_programs')} | program_schedule_week=${getMs('program_schedule_week')} | program_workout_completions=${getMs('program_workout_completions')} | program_template_blocks=${getMs('program_template_blocks')} | client_program_rules=${getMs('client_program_rules')} | program_assignment_with_program=${getMs('program_assignment_with_program')} | coach_profiles=${getMs('coach_profiles')}`
      )
    }

    return response
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
