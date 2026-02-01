/**
 * GET /api/coach/pickup/next-workout?clientId=UUID
 * 
 * Fetches the next workout for a client in Pickup Mode (Coach Gym Console).
 * This is NOT calendar-based. Programs are sequence-based (Week → Day).
 * 
 * Returns:
 * - Client info
 * - Program info
 * - Current week/day indices
 * - Workout template with blocks preview
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'
import { SupabaseClient } from '@supabase/supabase-js'

interface ProgramScheduleRow {
  id: string
  program_id: string
  week_number: number
  day_of_week: number
  template_id: string
}

interface ScheduleStructure {
  weekNumbers: number[]  // Sorted distinct week numbers
  daysByWeek: Map<number, ProgramScheduleRow[]>  // week_number → ordered rows
}

/**
 * Fetches workout blocks with exercises for a template using admin client
 * This bypasses RLS since we're in an API route context
 * Handles ALL block types including special ones (drop_set, cluster_set, pyramid_set, etc.)
 */
async function fetchWorkoutBlocksWithAdmin(
  supabaseAdmin: SupabaseClient,
  templateId: string
): Promise<any[]> {
  // 1. Fetch blocks
  const { data: blocks, error: blocksError } = await supabaseAdmin
    .from('workout_blocks')
    .select('*')
    .eq('template_id', templateId)
    .order('block_order')

  if (blocksError || !blocks || blocks.length === 0) {
    console.warn('No blocks found for template:', templateId, blocksError)
    return []
  }

  const blockIds = blocks.map(b => b.id)
  
  // 2. Fetch exercises from workout_block_exercises (for straight_set, superset, etc.)
  const { data: blockExercises } = await supabaseAdmin
    .from('workout_block_exercises')
    .select(`
      id,
      block_id,
      exercise_id,
      exercise_order,
      sets,
      reps,
      weight_kg,
      rest_seconds,
      tempo,
      rir,
      notes,
      exercises:exercise_id (id, name, description)
    `)
    .in('block_id', blockIds)
    .order('exercise_order')

  // 3. Fetch time protocols (for amrap, emom, circuit, etc.)
  const { data: timeProtocols } = await supabaseAdmin
    .from('workout_time_protocols')
    .select(`
      id,
      block_id,
      exercise_id,
      exercise_order,
      rounds,
      work_seconds,
      rest_seconds,
      exercises:exercise_id (id, name, description)
    `)
    .in('block_id', blockIds)
    .order('exercise_order')

  // 4. Fetch drop sets
  const { data: dropSets } = await supabaseAdmin
    .from('workout_drop_sets')
    .select(`
      id,
      block_id,
      exercise_id,
      exercise_order,
      drop_order,
      reps,
      weight_kg,
      load_percentage,
      exercises:exercise_id (id, name, description)
    `)
    .in('block_id', blockIds)
    .order('exercise_order')
    .order('drop_order')

  // 5. Fetch cluster sets
  const { data: clusterSets } = await supabaseAdmin
    .from('workout_cluster_sets')
    .select(`
      id,
      block_id,
      exercise_id,
      exercise_order,
      reps_per_cluster,
      clusters_per_set,
      intra_cluster_rest,
      weight_kg,
      load_percentage,
      exercises:exercise_id (id, name, description)
    `)
    .in('block_id', blockIds)
    .order('exercise_order')

  // 6. Fetch rest pause sets
  const { data: restPauseSets } = await supabaseAdmin
    .from('workout_rest_pause_sets')
    .select(`
      id,
      block_id,
      exercise_id,
      exercise_order,
      rest_pause_duration,
      max_rest_pauses,
      weight_kg,
      load_percentage,
      exercises:exercise_id (id, name, description)
    `)
    .in('block_id', blockIds)
    .order('exercise_order')

  // 7. Fetch pyramid sets
  const { data: pyramidSets } = await supabaseAdmin
    .from('workout_pyramid_sets')
    .select(`
      id,
      block_id,
      exercise_id,
      exercise_order,
      pyramid_order,
      reps,
      weight_kg,
      load_percentage,
      exercises:exercise_id (id, name, description)
    `)
    .in('block_id', blockIds)
    .order('exercise_order')
    .order('pyramid_order')

  // 8. Fetch ladder sets
  const { data: ladderSets } = await supabaseAdmin
    .from('workout_ladder_sets')
    .select(`
      id,
      block_id,
      exercise_id,
      exercise_order,
      ladder_order,
      reps,
      exercises:exercise_id (id, name, description)
    `)
    .in('block_id', blockIds)
    .order('exercise_order')
    .order('ladder_order')

  // 9. Fetch HR sets
  const { data: hrSets } = await supabaseAdmin
    .from('workout_hr_sets')
    .select(`
      id,
      block_id,
      exercise_id,
      exercise_order,
      target_hr,
      duration_seconds,
      exercises:exercise_id (id, name, description)
    `)
    .in('block_id', blockIds)
    .order('exercise_order')

  // 10. Build enriched blocks
  const enrichedBlocks = blocks.map(block => {
    let exercises: any[] = []

    // Check block type and get appropriate exercises
    if (['straight_set', 'superset', 'giant_set', 'pre_exhaustion'].includes(block.block_type)) {
      exercises = (blockExercises || [])
        .filter(ex => ex.block_id === block.id)
        .map(ex => ({
          id: ex.id,
          exercise_id: ex.exercise_id,
          exercise_name: (ex.exercises as any)?.name || 'Exercise',
          exercise_order: ex.exercise_order,
          sets: ex.sets,
          reps: ex.reps,
          weight_kg: ex.weight_kg,
          rest_seconds: ex.rest_seconds,
          tempo: ex.tempo,
          rir: ex.rir,
          notes: ex.notes,
        }))
    } else if (['amrap', 'emom', 'for_time', 'tabata', 'circuit'].includes(block.block_type)) {
      exercises = (timeProtocols || [])
        .filter(tp => tp.block_id === block.id)
        .map(tp => ({
          id: tp.id,
          exercise_id: tp.exercise_id,
          exercise_name: (tp.exercises as any)?.name || 'Exercise',
          exercise_order: tp.exercise_order,
          rounds: tp.rounds,
          work_seconds: tp.work_seconds,
          rest_seconds: tp.rest_seconds,
        }))
    } else if (block.block_type === 'drop_set') {
      // Group drop sets by exercise
      const blockDropSets = (dropSets || []).filter(ds => ds.block_id === block.id)
      const exerciseMap = new Map<string, any>()
      blockDropSets.forEach(ds => {
        const key = `${ds.exercise_id}:${ds.exercise_order}`
        if (!exerciseMap.has(key)) {
          exerciseMap.set(key, {
            id: ds.id,
            exercise_id: ds.exercise_id,
            exercise_name: (ds.exercises as any)?.name || 'Exercise',
            exercise_order: ds.exercise_order,
            sets: block.total_sets || 1,
            reps: ds.reps,
            weight_kg: ds.weight_kg,
            notes: `Drop set (${blockDropSets.filter(d => d.exercise_id === ds.exercise_id).length} drops)`,
          })
        }
      })
      exercises = Array.from(exerciseMap.values()).sort((a, b) => a.exercise_order - b.exercise_order)
    } else if (block.block_type === 'cluster_set') {
      exercises = (clusterSets || [])
        .filter(cs => cs.block_id === block.id)
        .map(cs => ({
          id: cs.id,
          exercise_id: cs.exercise_id,
          exercise_name: (cs.exercises as any)?.name || 'Exercise',
          exercise_order: cs.exercise_order,
          sets: block.total_sets || 1,
          reps: `${cs.reps_per_cluster} × ${cs.clusters_per_set} clusters`,
          rest_seconds: cs.intra_cluster_rest,
          weight_kg: cs.weight_kg,
          notes: `Intra-cluster rest: ${cs.intra_cluster_rest}s`,
        }))
    } else if (block.block_type === 'rest_pause') {
      exercises = (restPauseSets || [])
        .filter(rp => rp.block_id === block.id)
        .map(rp => ({
          id: rp.id,
          exercise_id: rp.exercise_id,
          exercise_name: (rp.exercises as any)?.name || 'Exercise',
          exercise_order: rp.exercise_order,
          sets: block.total_sets || 1,
          reps: block.reps_per_set || 'AMRAP',
          weight_kg: rp.weight_kg,
          notes: `Rest-pause: ${rp.rest_pause_duration}s pause, max ${rp.max_rest_pauses} pauses`,
        }))
    } else if (block.block_type === 'pyramid_set') {
      // Group pyramid sets by exercise
      const blockPyramidSets = (pyramidSets || []).filter(ps => ps.block_id === block.id)
      const exerciseMap = new Map<string, any>()
      blockPyramidSets.forEach(ps => {
        const key = `${ps.exercise_id}:${ps.exercise_order}`
        if (!exerciseMap.has(key)) {
          const allReps = blockPyramidSets
            .filter(p => p.exercise_id === ps.exercise_id)
            .sort((a, b) => a.pyramid_order - b.pyramid_order)
            .map(p => p.reps)
          exerciseMap.set(key, {
            id: ps.id,
            exercise_id: ps.exercise_id,
            exercise_name: (ps.exercises as any)?.name || 'Exercise',
            exercise_order: ps.exercise_order,
            sets: allReps.length,
            reps: allReps.join(' → '),
            weight_kg: ps.weight_kg,
            notes: 'Pyramid set',
          })
        }
      })
      exercises = Array.from(exerciseMap.values()).sort((a, b) => a.exercise_order - b.exercise_order)
    } else if (block.block_type === 'ladder') {
      // Group ladder sets by exercise
      const blockLadderSets = (ladderSets || []).filter(ls => ls.block_id === block.id)
      const exerciseMap = new Map<string, any>()
      blockLadderSets.forEach(ls => {
        const key = `${ls.exercise_id}:${ls.exercise_order}`
        if (!exerciseMap.has(key)) {
          const allReps = blockLadderSets
            .filter(l => l.exercise_id === ls.exercise_id)
            .sort((a, b) => a.ladder_order - b.ladder_order)
            .map(l => l.reps)
          exerciseMap.set(key, {
            id: ls.id,
            exercise_id: ls.exercise_id,
            exercise_name: (ls.exercises as any)?.name || 'Exercise',
            exercise_order: ls.exercise_order,
            sets: allReps.length,
            reps: allReps.join(', '),
            notes: 'Ladder set',
          })
        }
      })
      exercises = Array.from(exerciseMap.values()).sort((a, b) => a.exercise_order - b.exercise_order)
    } else if (block.block_type === 'hr_sets') {
      exercises = (hrSets || [])
        .filter(hr => hr.block_id === block.id)
        .map(hr => ({
          id: hr.id,
          exercise_id: hr.exercise_id,
          exercise_name: (hr.exercises as any)?.name || 'Exercise',
          exercise_order: hr.exercise_order,
          notes: `Target HR: ${hr.target_hr} bpm, ${hr.duration_seconds}s`,
        }))
    }

    return {
      id: block.id,
      block_type: block.block_type,
      block_name: block.block_name,
      block_order: block.block_order,
      exercises,
    }
  })

  return enrichedBlocks
}

/**
 * Builds a structure from program_schedule rows that handles gaps
 */
function buildScheduleStructure(rows: ProgramScheduleRow[]): ScheduleStructure {
  // Get sorted distinct week numbers
  const weekNumbersSet = new Set(rows.map(r => r.week_number))
  const weekNumbers = Array.from(weekNumbersSet).sort((a, b) => a - b)
  
  // Group and sort days by week
  const daysByWeek = new Map<number, ProgramScheduleRow[]>()
  for (const weekNum of weekNumbers) {
    const daysInWeek = rows
      .filter(r => r.week_number === weekNum)
      .sort((a, b) => a.day_of_week - b.day_of_week)
    daysByWeek.set(weekNum, daysInWeek)
  }
  
  return { weekNumbers, daysByWeek }
}

/**
 * Gets the schedule row for a given (week_index, day_index) using the structure
 */
function getScheduleRow(
  structure: ScheduleStructure, 
  weekIndex: number, 
  dayIndex: number
): ProgramScheduleRow | null {
  if (weekIndex < 0 || weekIndex >= structure.weekNumbers.length) {
    return null
  }
  
  const weekNumber = structure.weekNumbers[weekIndex]
  const days = structure.daysByWeek.get(weekNumber)
  
  if (!days || dayIndex < 0 || dayIndex >= days.length) {
    return null
  }
  
  return days[dayIndex]
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const { user, supabaseAdmin } = await validateApiAuth(request)
    
    // 2. Get clientId from query params
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required parameter: clientId' },
        { status: 400 }
      )
    }
    
    // 3. Verify coach role
    const { data: coachProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, first_name, last_name')
      .eq('id', user.id)
      .single()
    
    if (profileError || !coachProfile) {
      return createUnauthorizedResponse('Profile not found')
    }
    
    if (coachProfile.role !== 'coach' && coachProfile.role !== 'admin') {
      return createForbiddenResponse('Only coaches can access this endpoint')
    }
    
    // 4. Verify client belongs to coach
    const { data: clientRelation, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('client_id, status')
      .eq('coach_id', user.id)
      .eq('client_id', clientId)
      .single()
    
    if (clientError || !clientRelation) {
      return createForbiddenResponse('Client not found or does not belong to this coach')
    }
    
    // 5. Get client profile info
    const { data: clientProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .eq('id', clientId)
      .single()
    
    const clientName = clientProfile 
      ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || 'Client'
      : 'Client'
    
    // 6. Find active program assignment (most recent if multiple)
    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from('program_assignments')
      .select(`
        id,
        program_id,
        client_id,
        coach_id,
        name,
        status,
        duration_weeks,
        total_days,
        created_at
      `)
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    
    if (assignmentError) {
      console.error('Error fetching program assignments:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to fetch program assignments' },
        { status: 500 }
      )
    }
    
    let warning: string | undefined
    
    if (!assignments || assignments.length === 0) {
      return NextResponse.json({
        status: 'no_program',
        message: 'Client has no active program assignment',
        client_id: clientId,
        client_name: clientName,
      })
    }
    
    // Warn if multiple active programs found
    if (assignments.length > 1) {
      warning = `Multiple active programs found (${assignments.length}). Using most recent.`
      console.warn(`[pickup/next-workout] ${warning} client_id=${clientId}`)
    }
    
    const assignment = assignments[0]
    
    // 7. Get or create program_progress
    let { data: progress, error: progressError } = await supabaseAdmin
      .from('program_progress')
      .select('*')
      .eq('program_assignment_id', assignment.id)
      .single()
    
    if (progressError && progressError.code === 'PGRST116') {
      // Row not found - create it
      const { data: newProgress, error: insertError } = await supabaseAdmin
        .from('program_progress')
        .insert({
          program_assignment_id: assignment.id,
          current_week_index: 0,
          current_day_index: 0,
          is_completed: false,
        })
        .select()
        .single()
      
      if (insertError) {
        console.error('Error creating program_progress:', insertError)
        return NextResponse.json(
          { error: 'Failed to initialize program progress' },
          { status: 500 }
        )
      }
      
      progress = newProgress
    } else if (progressError) {
      console.error('Error fetching program_progress:', progressError)
      return NextResponse.json(
        { error: 'Failed to fetch program progress' },
        { status: 500 }
      )
    }
    
    // 8. Check if program is completed
    if (progress.is_completed) {
      return NextResponse.json({
        status: 'completed',
        message: 'Program completed',
        client_id: clientId,
        client_name: clientName,
        program_assignment_id: assignment.id,
        program_id: assignment.program_id,
        program_name: assignment.name || 'Program',
        current_week_index: progress.current_week_index,
        current_day_index: progress.current_day_index,
        is_completed: true,
      })
    }
    
    // 9. Fetch program schedule
    const { data: scheduleRows, error: scheduleError } = await supabaseAdmin
      .from('program_schedule')
      .select('id, program_id, week_number, day_of_week, template_id')
      .eq('program_id', assignment.program_id)
    
    if (scheduleError) {
      console.error('Error fetching program_schedule:', scheduleError)
      return NextResponse.json(
        { error: 'Failed to fetch program schedule' },
        { status: 500 }
      )
    }
    
    if (!scheduleRows || scheduleRows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Program schedule not configured',
          message: 'No training days found in program_schedule for this program. Please configure the program schedule first.',
          program_id: assignment.program_id,
        },
        { status: 422 }
      )
    }
    
    // 10. Build schedule structure (handles gaps)
    const structure = buildScheduleStructure(scheduleRows as ProgramScheduleRow[])
    
    // 11. Get current day's schedule row
    const currentRow = getScheduleRow(
      structure, 
      progress.current_week_index, 
      progress.current_day_index
    )
    
    if (!currentRow) {
      // This shouldn't happen if progress is valid, but handle defensively
      return NextResponse.json(
        { 
          error: 'Invalid progress state',
          message: `week_index=${progress.current_week_index}, day_index=${progress.current_day_index} is out of bounds`,
          total_weeks: structure.weekNumbers.length,
        },
        { status: 422 }
      )
    }
    
    // 12. Get workout template info
    const { data: template } = await supabaseAdmin
      .from('workout_templates')
      .select('id, name, description, estimated_duration')
      .eq('id', currentRow.template_id)
      .single()
    
    // 13. Get workout blocks preview using admin client (bypasses RLS issues in API context)
    let blocks: any[] = []
    try {
      blocks = await fetchWorkoutBlocksWithAdmin(supabaseAdmin, currentRow.template_id)
    } catch (blockError) {
      console.warn('Failed to fetch workout blocks:', blockError)
      // Non-fatal - continue without blocks
    }
    
    // 14. Compute human-readable labels
    // week_label is based on the actual week_number in the schedule
    // day_label is 1-based position within the week
    const weekLabel = `Week ${currentRow.week_number}`
    const daysInWeek = structure.daysByWeek.get(currentRow.week_number) || []
    const dayPosition = daysInWeek.findIndex(d => d.id === currentRow.id) + 1
    const dayLabel = `Day ${dayPosition}`
    
    // 15. Build response
    const response: any = {
      status: 'active',
      client_id: clientId,
      client_name: clientName,
      client_avatar_url: clientProfile?.avatar_url || null,
      
      program_assignment_id: assignment.id,
      program_id: assignment.program_id,
      program_name: assignment.name || 'Program',
      
      current_week_index: progress.current_week_index,
      current_day_index: progress.current_day_index,
      is_completed: false,
      
      // Human labels
      week_label: weekLabel,
      day_label: dayLabel,
      position_label: `${weekLabel} • ${dayLabel}`,
      
      // Schedule structure info
      total_weeks: structure.weekNumbers.length,
      days_in_current_week: daysInWeek.length,
      
      // Workout info
      template_id: currentRow.template_id,
      workout_name: template?.name || 'Workout',
      workout_description: template?.description || null,
      estimated_duration: template?.estimated_duration || null,
      
      // Blocks preview (already formatted by fetchWorkoutBlocksWithAdmin)
      blocks: blocks,
    }
    
    if (warning) {
      response.warning = warning
    }
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('[pickup/next-workout] Error:', error)
    
    if (error.message === 'User not authenticated') {
      return createUnauthorizedResponse('Not authenticated')
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
