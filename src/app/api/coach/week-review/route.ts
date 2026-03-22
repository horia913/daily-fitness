/**
 * POST /api/coach/week-review
 *
 * Coach reviews a client's completed week and takes an action:
 * - advance: unlock the next week
 * - repeat: keep the client on the same week
 * - adjust_and_advance: apply rule adjustments for next week, then advance
 *
 * Body: {
 *   programAssignmentId: string,
 *   weekNumber: number,
 *   action: 'advance' | 'repeat' | 'adjust_and_advance',
 *   coachNotes?: string,
 *   adjustments?: { ruleId: string; patch: Record<string, any> }[],
 *   performanceSummary?: any
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'
import { sendPushNotification } from '@/lib/notifications'

type ReviewAction = 'advance' | 'repeat' | 'adjust_and_advance'
const VALID_ACTIONS: ReviewAction[] = ['advance', 'repeat', 'adjust_and_advance']

export async function POST(request: NextRequest) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request)

    const body = await request.json()
    const {
      programAssignmentId,
      weekNumber,
      action,
      coachNotes,
      adjustments,
      performanceSummary,
    } = body as {
      programAssignmentId: string
      weekNumber: number
      action: ReviewAction
      coachNotes?: string
      adjustments?: { ruleId: string; patch: Record<string, any> }[]
      performanceSummary?: any
    }

    if (!programAssignmentId || !weekNumber || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: programAssignmentId, weekNumber, action' },
        { status: 400 },
      )
    }

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 },
      )
    }

    // Verify the coach owns this assignment
    const { data: assignment, error: assignErr } = await supabaseAdmin
      .from('program_assignments')
      .select('id, coach_id, client_id, progression_mode, coach_unlocked_week, duration_weeks')
      .eq('id', programAssignmentId)
      .single()

    if (assignErr || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    if (assignment.coach_id !== user.id) {
      return createForbiddenResponse('You are not the coach for this assignment')
    }

    // Apply adjustments to client_program_progression_rules (for next week)
    if (adjustments && adjustments.length > 0 && (action === 'advance' || action === 'adjust_and_advance')) {
      const allowedFields = [
        'sets', 'reps', 'rest_seconds', 'tempo', 'rir',
        'weight_kg', 'load_percentage', 'notes',
      ]

      for (const adj of adjustments) {
        if (!adj.ruleId || !adj.patch) continue
        const safePatch: Record<string, any> = {}
        for (const [key, val] of Object.entries(adj.patch)) {
          if (allowedFields.includes(key)) safePatch[key] = val
        }
        if (Object.keys(safePatch).length === 0) continue

        safePatch.updated_at = new Date().toISOString()
        await supabaseAdmin
          .from('client_program_progression_rules')
          .update(safePatch)
          .eq('id', adj.ruleId)
      }
    }

    // Determine the new coach_unlocked_week
    let newUnlockedWeek = assignment.coach_unlocked_week ?? weekNumber
    if (action === 'advance' || action === 'adjust_and_advance') {
      newUnlockedWeek = weekNumber + 1
    }
    // For 'repeat', coach_unlocked_week stays the same

    // Update program_assignments
    const { error: updateErr } = await supabaseAdmin
      .from('program_assignments')
      .update({
        coach_unlocked_week: newUnlockedWeek,
        progression_mode: 'coach_managed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', programAssignmentId)

    if (updateErr) {
      console.error('[week-review] Error updating assignment:', updateErr)
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
    }

    // Sync program_progress cache
    if (action === 'advance' || action === 'adjust_and_advance') {
      await supabaseAdmin
        .from('program_progress')
        .upsert({
          program_assignment_id: programAssignmentId,
          current_week_number: newUnlockedWeek,
          current_day_number: 1,
          is_completed: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'program_assignment_id' })
    }

    // Insert coach_week_reviews record
    const { error: reviewErr } = await supabaseAdmin
      .from('coach_week_reviews')
      .insert({
        program_assignment_id: programAssignmentId,
        week_number: weekNumber,
        coach_id: user.id,
        action,
        coach_notes: coachNotes || null,
        performance_summary: performanceSummary || null,
      })

    if (reviewErr) {
      console.error('[week-review] Error inserting review:', reviewErr)
      // Non-fatal: the assignment update succeeded
    }

    // Send push notification to client
    if (action === 'advance' || action === 'adjust_and_advance') {
      try {
        await sendPushNotification({
          userIds: [assignment.client_id],
          title: 'Week reviewed!',
          message: `Your coach advanced you to Week ${newUnlockedWeek}.${coachNotes ? ' They left feedback.' : ''}`,
          url: '/client/train',
        })
      } catch {
        // Push is best-effort
      }
    }

    return NextResponse.json({
      success: true,
      action,
      newUnlockedWeek,
      weekNumber,
    })
  } catch (error: any) {
    console.error('[week-review] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    )
  }
}
