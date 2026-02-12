/**
 * GET /api/client/program-week
 *
 * Returns the current unlocked week's day slots with completion status,
 * template names, and week unlock state for the authenticated client.
 *
 * Used by the client dashboard to render swipeable day cards.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getProgramState,
  computeUnlockedWeekMax,
} from '@/lib/programStateService'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get full program state
    const state = await getProgramState(supabase, user.id)

    if (!state.assignment) {
      return NextResponse.json({
        hasProgram: false,
        programName: null,
        programAssignmentId: null,
        currentUnlockedWeek: 0,
        totalWeeks: 0,
        unlockedWeekMax: 0,
        isCompleted: false,
        days: [],
      })
    }

    const unlockedWeekMax = computeUnlockedWeekMax(state.slots, state.completedSlots)

    // Distinct week numbers for totalWeeks count
    const weekNumbers = [...new Set(state.slots.map(s => s.week_number))].sort((a, b) => a - b)
    const totalWeeks = weekNumbers.length

    // Get slots for the current unlocked week only
    const currentWeekSlots = state.slots.filter(s => s.week_number === unlockedWeekMax)
    const completedScheduleIds = new Set(state.completedSlots.map(c => c.program_schedule_id))

    // Batch-fetch template names for all slots in this week
    const templateIds = [...new Set(currentWeekSlots.map(s => s.template_id).filter(Boolean))]
    let templateMap = new Map<string, { name: string; estimated_duration: number }>()

    if (templateIds.length > 0) {
      const { data: templates } = await supabase
        .from('workout_templates')
        .select('id, name, estimated_duration')
        .in('id', templateIds)

      if (templates) {
        templateMap = new Map(templates.map(t => [t.id, { name: t.name, estimated_duration: t.estimated_duration || 0 }]))
      }
    }

    // Get program name from assignment
    const programName = state.assignment.name || 'Training Program'

    // Build day cards — day labels sourced from day_number (1-based, never 0)
    const days = currentWeekSlots.map(slot => {
      const template = templateMap.get(slot.template_id)
      return {
        scheduleId: slot.id,
        dayNumber: slot.day_number,           // 1-based from program_schedule.day_number
        dayLabel: `Day ${slot.day_number}`,   // Always 1-based
        templateId: slot.template_id,
        workoutName: template?.name || 'Workout',
        estimatedDuration: template?.estimated_duration || 0,
        isCompleted: completedScheduleIds.has(slot.id),
      }
    })

    return NextResponse.json({
      hasProgram: true,
      programName,
      programAssignmentId: state.assignment.id,
      currentUnlockedWeek: unlockedWeekMax,
      totalWeeks,
      unlockedWeekMax,
      isCompleted: state.isCompleted,
      days,
    })
  } catch (error: any) {
    console.error('[program-week] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
