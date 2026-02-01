import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/set-rpe
 * 
 * Updates the RPE value for an existing workout set log.
 * This is called AFTER the set is already logged, making RPE capture non-blocking.
 * 
 * Request body:
 * - set_log_id: string (required) - The ID of the workout_set_logs row to update
 * - rpe: number (required) - RPE value between 1 and 10
 * 
 * Response:
 * - 200: Success
 * - 400: Invalid request (missing params or invalid RPE value)
 * - 401: Unauthorized
 * - 404: Set log not found or not owned by user
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { set_log_id, rpe } = body;
    
    // Validate required parameters
    if (!set_log_id) {
      return NextResponse.json(
        { success: false, error: 'set_log_id is required' },
        { status: 400 }
      );
    }
    
    if (rpe === undefined || rpe === null) {
      return NextResponse.json(
        { success: false, error: 'rpe is required' },
        { status: 400 }
      );
    }
    
    // Validate RPE range (1-10)
    const rpeNum = Number(rpe);
    if (isNaN(rpeNum) || rpeNum < 1 || rpeNum > 10 || !Number.isInteger(rpeNum)) {
      return NextResponse.json(
        { success: false, error: 'RPE must be an integer between 1 and 10' },
        { status: 400 }
      );
    }
    
    // Get the user's profile to verify ownership via workout_log chain
    // workout_set_logs -> workout_logs -> client_id must match current user
    const { data: setLog, error: fetchError } = await supabase
      .from('workout_set_logs')
      .select(`
        id,
        workout_log_id,
        workout_logs!inner (
          id,
          client_id
        )
      `)
      .eq('id', set_log_id)
      .single();
    
    if (fetchError || !setLog) {
      console.error('[set-rpe] Error fetching set log:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Set log not found' },
        { status: 404 }
      );
    }
    
    // Verify ownership - the workout_log must belong to the current user
    const workoutLog = setLog.workout_logs as unknown as { id: string; client_id: string };
    if (workoutLog.client_id !== user.id) {
      console.warn('[set-rpe] Ownership mismatch:', {
        set_log_id,
        workout_client_id: workoutLog.client_id,
        user_id: user.id
      });
      return NextResponse.json(
        { success: false, error: 'Not authorized to update this set' },
        { status: 403 }
      );
    }
    
    // Update the RPE value
    const { error: updateError } = await supabase
      .from('workout_set_logs')
      .update({ rpe: rpeNum })
      .eq('id', set_log_id);
    
    if (updateError) {
      console.error('[set-rpe] Error updating RPE:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update RPE' },
        { status: 500 }
      );
    }
    
    console.log('[set-rpe] Successfully updated RPE:', {
      set_log_id,
      rpe: rpeNum,
      user_id: user.id
    });
    
    return NextResponse.json({
      success: true,
      set_log_id,
      rpe: rpeNum
    });
    
  } catch (error) {
    console.error('[set-rpe] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
