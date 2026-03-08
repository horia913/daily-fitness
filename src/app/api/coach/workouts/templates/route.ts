/**
 * GET /api/coach/workouts/templates
 *
 * Returns workout templates and assignment counts for the authenticated coach.
 * Uses server Supabase client; single batched response.
 */

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Unauthorized' },
        { status: 401 }
      )
    }

    const [{ data: templatesData, error: templatesError }, { data: assignmentsData, error: assignmentsError }] = await Promise.all([
      supabase
        .from('workout_templates')
        .select('*')
        .eq('coach_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('workout_assignments')
        .select('workout_template_id')
        .eq('coach_id', user.id),
    ])

    if (templatesError) {
      console.error('[coach/workouts/templates] Error fetching templates:', templatesError)
      return NextResponse.json(
        { error: templatesError.message },
        { status: 500 }
      )
    }

    const templates = (templatesData ?? []).map((t: Record<string, unknown>) => ({
      ...t,
      exercise_count: (t.exercise_count as number) ?? 0,
    }))

    const assignmentCountByTemplate: Record<string, number> = {}
    if (!assignmentsError && assignmentsData) {
      assignmentsData.forEach((row: { workout_template_id?: string }) => {
        const id = row.workout_template_id
        if (id) assignmentCountByTemplate[id] = (assignmentCountByTemplate[id] || 0) + 1
      })
    }

    console.log('[Coach workout templates] network calls done')

    return NextResponse.json({ templates, assignmentCountByTemplate })
  } catch (err: unknown) {
    console.error('[coach/workouts/templates] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
