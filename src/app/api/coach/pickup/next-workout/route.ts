/**
 * GET /api/coach/pickup/next-workout?clientId=UUID
 * 
 * Fetches the next workout for a client in Pickup Mode (Coach Gym Console).
 * This is NOT calendar-based. Programs are sequence-based (Week → Day).
 * 
 * OPTIMIZED: Uses single PostgreSQL RPC call (get_coach_pickup_workout)
 * instead of 15-20 individual queries.
 * 
 * Returns:
 * - Client info
 * - Program info
 * - Current week/day indices
 * - Workout template with blocks preview
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { PerfCollector } from '@/lib/perfUtils'
import { getProgramState } from '@/lib/programStateService'

type PickupBlock = {
  id: string
  set_type: string
  set_order: number
  block_name?: string
  exercises: Array<{
    id: string
    exercise_id: string
    exercise_name: string
    sets?: number
    reps?: string
    weight_kg?: number
    rest_seconds?: number
    load_percentage?: number
    rpe?: number
    tempo?: string
    notes?: string
  }>
}

function numOrUndef(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function strOrUndef(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

async function buildPickupFallbackFromProgramState(clientId: string) {
  const supabase = await createSupabaseServerClient()
  const state = await getProgramState(supabase, clientId)
  if (!state.assignment || !state.nextSlot || !state.nextSlot.template_id) {
    return {
      status: 'no_program',
      workout_name: 'No workout configured',
      blocks: [],
    }
  }

  const templateId = state.nextSlot.template_id
  const { data: templateRow } = await supabase
    .from('workout_templates')
    .select('name')
    .eq('id', templateId)
    .maybeSingle()

  const { data: rpcBlocks, error: rpcBlocksError } = await supabase.rpc('get_workout_blocks', {
    p_template_id: templateId,
  })

  if (rpcBlocksError) {
    console.error('[pickup/next-workout] fallback get_workout_blocks error:', rpcBlocksError)
    return {
      status: 'active',
      workout_name: templateRow?.name ?? 'Workout',
      template_id: templateId,
      current_week: state.currentWeekNumber,
      current_day: state.currentDayNumber,
      program_assignment_id: state.assignment.id,
      blocks: [],
    }
  }

  const rawBlocks = Array.isArray(rpcBlocks) ? (rpcBlocks as Array<Record<string, unknown>>) : []
  const allExerciseIds = new Set<string>()
  for (const block of rawBlocks) {
    const exercises = Array.isArray(block.exercises) ? (block.exercises as Array<Record<string, unknown>>) : []
    for (const ex of exercises) {
      const id = typeof ex.exercise_id === 'string' ? ex.exercise_id : null
      if (id) allExerciseIds.add(id)
    }
  }

  const exerciseNameById = new Map<string, string>()
  if (allExerciseIds.size > 0) {
    const { data: exerciseRows } = await supabase
      .from('exercises')
      .select('id, name')
      .in('id', [...allExerciseIds])
    for (const row of exerciseRows ?? []) {
      if (row?.id && row?.name) exerciseNameById.set(row.id, row.name)
    }
  }

  const blocks: PickupBlock[] = rawBlocks.map((block) => {
    const exercises = Array.isArray(block.exercises) ? (block.exercises as Array<Record<string, unknown>>) : []
    const mappedExercises: PickupBlock['exercises'] = []
    for (const ex of exercises) {
      const exerciseId = typeof ex.exercise_id === 'string' ? ex.exercise_id : null
      if (!exerciseId) continue
      const nestedName =
        ex.exercise && typeof ex.exercise === 'object' && ex.exercise != null && 'name' in ex.exercise
          ? (ex.exercise as { name?: unknown }).name
          : null
      const exerciseName =
        (typeof ex.exercise_name === 'string' && ex.exercise_name) ||
        (typeof nestedName === 'string' && nestedName) ||
        exerciseNameById.get(exerciseId) ||
        'Exercise'
      mappedExercises.push({
        id: typeof ex.id === 'string' ? ex.id : `${String(block.id ?? 'block')}-${exerciseId}`,
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        sets: numOrUndef(ex.sets),
        reps: typeof ex.reps === 'string' ? ex.reps : ex.reps != null ? String(ex.reps) : undefined,
        weight_kg: numOrUndef(ex.weight_kg),
        rest_seconds: numOrUndef(ex.rest_seconds),
        load_percentage: numOrUndef(ex.load_percentage),
        rpe: numOrUndef(ex.rpe),
        tempo: strOrUndef(ex.tempo),
        notes: strOrUndef(ex.notes),
      })
    }

    return {
      id: String(block.id ?? `block-${Math.random().toString(36).slice(2)}`),
      set_type: String(block.set_type ?? block.block_type ?? 'straight_set'),
      set_order: Number(block.set_order ?? block.block_order ?? 0),
      block_name: typeof block.set_name === 'string' ? block.set_name : typeof block.block_name === 'string' ? block.block_name : undefined,
      exercises: mappedExercises,
    }
  })

  return {
    status: 'active',
    workout_name: templateRow?.name ?? 'Workout',
    position_label: state.positionLabel,
    template_id: templateId,
    current_week: state.currentWeekNumber,
    current_day: state.currentDayNumber,
    program_assignment_id: state.assignment.id,
    blocks,
  }
}

export async function GET(request: NextRequest) {
  const perf = new PerfCollector('/api/coach/pickup/next-workout')
  
  try {
    // 1. Get clientId from query params
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required parameter: clientId' },
        { status: 400 }
      )
    }
    
    // 2. Create authenticated Supabase client
    const supabase = await createSupabaseServerClient()
    
    // 3. Verify authentication
    const { data: { user }, error: authError } = await perf.time('auth', () =>
      supabase.auth.getUser()
    )
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // 4. Call the optimized RPC
    // The RPC validates:
    // - auth.uid() is a coach/admin
    // - The client belongs to this coach
    const rpcResult = await perf.time('rpc_get_coach_pickup_workout', async () =>
      supabase.rpc('get_coach_pickup_workout', { p_client_id: clientId })
    )
    const { data, error } = rpcResult
    
    if (error) {
      console.error('[pickup/next-workout] RPC error:', error)
      
      // Check if function doesn't exist (migration not run)
      if (error.code === '42883' || (error.message?.includes('function') && error.message?.includes('does not exist'))) {
        console.error('[pickup/next-workout] RPC function not found. Run migration 20260202_coach_pickup_rpc.sql')
        return NextResponse.json(
          { 
            error: 'Database function not available',
            details: 'Please run the coach pickup RPC migration.',
            code: 'RPC_NOT_FOUND'
          },
          { status: 503 }
        )
      }
      
      // Handle specific errors from RPC
      if (error.message?.includes('Not authenticated')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      if (error.message?.includes('must be coach or admin')) {
        return NextResponse.json(
          { error: 'Forbidden - Only coaches can access this endpoint' },
          { status: 403 }
        )
      }
      
      if (error.message?.includes('Client not found') || error.message?.includes('does not belong to this coach')) {
        return NextResponse.json(
          { error: 'Client not found or does not belong to this coach' },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to fetch workout' },
        { status: 500 }
      )
    }
    
    // 5. Check for error responses from RPC (returned as data, not thrown)
    if (data?.error) {
      const message = String(data.error)
      const isConfigurationGap =
        message.includes('not configured') || message.includes('Invalid progress')

      // Program progress cache can drift out of sync. Recover by deriving next slot
      // from canonical ledger state instead of returning a hard failure.
      if (isConfigurationGap) {
        const fallback = await buildPickupFallbackFromProgramState(clientId)
        return NextResponse.json({
          ...fallback,
          warning: message,
          details: data?.message ?? null,
        })
      }

      return NextResponse.json(data, { status: 500 })
    }
    
    // 6. Log performance summary
    perf.logSummary()
    
    // 7. Return response with Server-Timing headers
    const response = NextResponse.json(data)
    const perfHeaders = perf.getHeaders()
    Object.entries(perfHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
    
  } catch (error: any) {
    console.error('[pickup/next-workout] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
