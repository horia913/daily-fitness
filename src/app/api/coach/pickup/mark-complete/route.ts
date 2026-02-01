/**
 * POST /api/coach/pickup/mark-complete
 * 
 * Marks the current training day as complete and advances the client's program progression.
 * 
 * Body: { clientId: UUID, notes?: string }
 * 
 * Uses the shared advance_program_progress RPC function for:
 * - DB-level idempotency (INSERT ON CONFLICT DO NOTHING)
 * - Consistent advancement logic for both coach and client flows
 * 
 * RPC returns status:
 * - 'advanced': Successfully advanced to next day/week
 * - 'already_completed': Day was already marked complete (returns 409)
 * - 'completed': Program was already fully completed (returns 409)
 * - 'error': An error occurred (returns 500)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    // supabaseAuth = session-based client (runs as authenticated user with RLS)
    // supabaseAdmin = service role client (bypasses RLS - use for access control checks)
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(request)
    
    // 2. Parse request body
    let body: { clientId?: string; notes?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }
    
    const { clientId, notes } = body
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required field: clientId' },
        { status: 400 }
      )
    }
    
    // 3. Verify coach role
    const { data: coachProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
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
      .select('client_id')
      .eq('coach_id', user.id)
      .eq('client_id', clientId)
      .single()
    
    if (clientError || !clientRelation) {
      return createForbiddenResponse('Client not found or does not belong to this coach')
    }

    // ========================================================================
    // 5. Call the shared RPC function for program progression
    //    This handles: finding assignment, idempotency, advancement
    //    Uses supabaseAuth (session client) so RLS is enforced and auth.uid() works
    // ========================================================================
    console.log(`[pickup/mark-complete] Calling advance_program_progress RPC for client: ${clientId}`);
    
    const { data: rpcResult, error: rpcError } = await supabaseAuth.rpc(
      'advance_program_progress',
      {
        p_client_id: clientId,
        p_completed_by: user.id, // Coach is completing on behalf of client
        p_notes: notes || null
      }
    );

    if (rpcError) {
      console.error('[pickup/mark-complete] RPC error:', rpcError);
      return NextResponse.json(
        { 
          error: 'Failed to advance program progress',
          details: rpcError.message,
        },
        { status: 500 }
      )
    }

    console.log('[pickup/mark-complete] RPC result:', JSON.stringify(rpcResult, null, 2));

    // ========================================================================
    // 6. Handle RPC response statuses
    // ========================================================================
    
    // Handle error status from RPC
    if (rpcResult?.status === 'error') {
      const statusCode = rpcResult.error === 'no_active_assignment' ? 404 : 500;
      return NextResponse.json(
        { 
          error: rpcResult.error,
          message: rpcResult.message,
        },
        { status: statusCode }
      )
    }

    // Handle already_completed (day was already marked complete)
    if (rpcResult?.status === 'already_completed') {
      return NextResponse.json(
        { 
          error: 'Day already completed',
          message: rpcResult.message,
          current_week_index: rpcResult.current_week_index,
          current_day_index: rpcResult.current_day_index,
        },
        { status: 409 }
      )
    }

    // Handle completed (program was already fully finished)
    if (rpcResult?.status === 'completed') {
      return NextResponse.json(
        { 
          error: 'Program already completed',
          message: rpcResult.message,
          is_completed: true,
          current_week_index: rpcResult.current_week_index,
          current_day_index: rpcResult.current_day_index,
        },
        { status: 409 }
      )
    }

    // ========================================================================
    // 7. Build success response for 'advanced' status
    // ========================================================================
    const response: any = {
      success: true,
      message: rpcResult.message,
      
      // What was just completed
      completed: {
        week_index: rpcResult.completed_week_index,
        day_index: rpcResult.completed_day_index,
      },
      
      // New state
      program_assignment_id: rpcResult.program_assignment_id,
      program_id: rpcResult.program_id,
      program_name: rpcResult.program_name || 'Program',
      
      current_week_index: rpcResult.current_week_index,
      current_day_index: rpcResult.current_day_index,
      is_completed: rpcResult.is_completed,
      
      // Debug info from RPC
      week_numbers: rpcResult.week_numbers,
      days_in_week_count: rpcResult.days_in_week_count,
      next_week_number: rpcResult.next_week_number,
      next_day_of_week: rpcResult.next_day_of_week,
    };

    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('[pickup/mark-complete] Error:', error)
    
    if (error.message === 'User not authenticated') {
      return createUnauthorizedResponse('Not authenticated')
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
