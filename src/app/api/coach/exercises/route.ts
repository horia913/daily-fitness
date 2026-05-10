/**
 * GET /api/coach/exercises
 *
 * Returns exercises and exercise categories for the authenticated coach in one response.
 * Uses server Supabase client; no client-side Supabase calls.
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

    const [{ data: exercisesData, error: exError }, { data: categoriesData, error: catError }] = await Promise.all([
      supabase
        .from('exercises')
        .select('*')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('exercise_categories')
        .select('*')
        .order('name'),
    ])

    if (exError) {
      console.error('[coach/exercises] Error fetching exercises:', exError)
      return NextResponse.json(
        { error: exError.message },
        { status: 500 }
      )
    }

    if (catError) {
      console.error('[coach/exercises] Error fetching categories:', catError)
    }

    const exerciseRows = exercisesData ?? []
    const exerciseIds = exerciseRows.map((e: { id: string }) => e.id).filter(Boolean)

    let usedLast7d = 0
    if (exerciseIds.length > 0) {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { count, error: usageErr } = await supabase
        .from('workout_set_logs')
        .select('id', { count: 'exact', head: true })
        .in('exercise_id', exerciseIds)
        .gte('completed_at', since)

      if (!usageErr && typeof count === 'number') {
        usedLast7d = count
      }
    }

    return NextResponse.json({
      exercises: exerciseRows,
      categories: categoriesData ?? [],
      meta: { used_last_7d: usedLast7d },
    })
  } catch (err: unknown) {
    console.error('[coach/exercises] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
