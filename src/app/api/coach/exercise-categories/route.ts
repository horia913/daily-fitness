/**
 * GET /api/coach/exercise-categories
 *
 * Returns exercise categories with exercise counts in one response.
 * Batches categories + count aggregation on the server (no N+1).
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

    const [{ data: categoriesData, error: catError }, { data: exercisesData, error: exError }] = await Promise.all([
      supabase
        .from('exercise_categories')
        .select('*')
        .order('name'),
      supabase
        .from('exercises')
        .select('category')
        .eq('coach_id', user.id),
    ])

    if (catError) {
      console.error('[coach/exercise-categories] Error fetching categories:', catError)
      return NextResponse.json(
        { error: catError.message },
        { status: 500 }
      )
    }

    const categories = categoriesData ?? []
    const countByCategory: Record<string, number> = {}
    if (!exError && exercisesData) {
      exercisesData.forEach((row: { category?: string }) => {
        const name = row.category ?? ''
        if (name) countByCategory[name] = (countByCategory[name] ?? 0) + 1
      })
    }

    const categoriesWithCount = categories.map((c: { name: string; [k: string]: unknown }) => ({
      ...c,
      exercise_count: countByCategory[c.name] ?? 0,
    }))

    console.log('[Coach exercise-categories] network calls done')

    return NextResponse.json({ categories: categoriesWithCount })
  } catch (err: unknown) {
    console.error('[coach/exercise-categories] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
