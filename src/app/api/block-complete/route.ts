import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTrackedFetch } from '@/lib/supabaseQueryLogger'
import { createErrorResponse, handleApiError } from '@/lib/apiErrorHandler'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

/**
 * POST /api/block-complete
 *
 * Payload:
 * - workout_log_id (optional): use this log for the block completion record
 * - workout_assignment_id (required when workout_log_id is missing): used with auth.uid() to resolve or create today's active workout_log
 * - workout_block_id (required): block that was completed
 *
 * When workout_log_id is missing, the API resolves or creates today's active workout_log.
 * Always returns { workout_log_id } so the client can persist it (e.g. timer-only workouts).
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.id

    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      global: { fetch: getTrackedFetch() },
    })

    let body: { workout_log_id?: string; workout_assignment_id?: string; workout_block_id?: string }
    try {
      body = await req.json()
    } catch {
      return createErrorResponse('Invalid JSON in request body', undefined, 'PARSE_ERROR', 400)
    }

    const { workout_log_id: providedLogId, workout_assignment_id: assignmentId, workout_block_id: blockId } = body

    if (!blockId) {
      return createErrorResponse(
        'Missing required field: workout_block_id',
        undefined,
        'MISSING_FIELD',
        400
      )
    }

    let workoutLogId: string

    if (providedLogId) {
      // Validate ownership
      const { data: log, error: logError } = await supabaseAdmin
        .from('workout_logs')
        .select('id, client_id')
        .eq('id', providedLogId)
        .eq('client_id', userId)
        .maybeSingle()

      if (logError) {
        console.error('block-complete: error fetching workout_log', logError)
        return createErrorResponse('Failed to validate workout log', logError.message, undefined, 400)
      }
      if (!log) {
        return NextResponse.json({ error: 'Forbidden', details: 'Workout log not found or access denied' }, { status: 403 })
      }
      workoutLogId = log.id
    } else {
      // Resolve or create today's active workout_log
      if (!assignmentId) {
        return createErrorResponse(
          'Missing required field: workout_assignment_id (required when workout_log_id is missing)',
          undefined,
          'MISSING_FIELD',
          400
        )
      }

      // Verify assignment exists and belongs to user
      const { data: assignment, error: assignmentError } = await supabaseAdmin
        .from('workout_assignments')
        .select('id, client_id')
        .eq('id', assignmentId)
        .eq('client_id', userId)
        .maybeSingle()

      if (assignmentError || !assignment) {
        return NextResponse.json(
          { error: 'Workout assignment not found or access denied' },
          { status: 403 }
        )
      }

      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayStartISO = todayStart.toISOString()
      const todayEnd = new Date(todayStart)
      todayEnd.setDate(todayEnd.getDate() + 1)
      const todayEndISO = todayEnd.toISOString()

      const { data: existingLog, error: existingError } = await supabaseAdmin
        .from('workout_logs')
        .select('id')
        .eq('workout_assignment_id', assignmentId)
        .eq('client_id', userId)
        .is('completed_at', null)
        .gte('started_at', todayStartISO)
        .lt('started_at', todayEndISO)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingError) {
        console.error('block-complete: error finding existing workout_log', existingError)
        return createErrorResponse('Failed to resolve workout log', existingError.message, undefined, 400)
      }

      if (existingLog) {
        workoutLogId = existingLog.id
      } else {
        const { data: newLog, error: createError } = await supabaseAdmin
          .from('workout_logs')
          .insert([
            {
              client_id: userId,
              workout_assignment_id: assignmentId,
              started_at: new Date().toISOString(),
              completed_at: null,
            },
          ])
          .select('id')
          .single()

        if (createError || !newLog) {
          console.error('block-complete: error creating workout_log', createError)
          return createErrorResponse(
            'Failed to create workout log',
            createError?.message,
            undefined,
            400
          )
        }
        workoutLogId = newLog.id
      }
    }

    // Upsert block completion (one row per workout_log + block)
    const { error: upsertError } = await supabaseAdmin
      .from('workout_block_completions')
      .upsert(
        {
          workout_log_id: workoutLogId,
          workout_block_id: blockId,
          completed_at: new Date().toISOString(),
          completion_type: 'block_complete',
        },
        {
          onConflict: 'workout_log_id,workout_block_id',
          ignoreDuplicates: false,
        }
      )

    if (upsertError) {
      console.error('block-complete: upsert error', upsertError)
      return createErrorResponse('Failed to save block completion', upsertError.message, undefined, 400)
    }

    return NextResponse.json({ workout_log_id: workoutLogId })
  } catch (error) {
    return handleApiError(error, 'block-complete')
  }
}
