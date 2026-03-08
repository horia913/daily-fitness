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

    console.log('[Coach exercises] network calls done')

    return NextResponse.json({
      exercises: exercisesData ?? [],
      categories: categoriesData ?? [],
    })
  } catch (err: unknown) {
    console.error('[coach/exercises] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
