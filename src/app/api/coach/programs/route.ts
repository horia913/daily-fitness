/**
 * GET /api/coach/programs
 *
 * Returns programs and assignment counts for the authenticated coach.
 * Query param: filter=active | all (default active).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Coach programs + assignment counts must never be statically cached. */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') ?? 'active'
    const includeInactive = filter === 'all'

    let query = supabase
      .from('workout_programs')
      .select('*')
      .eq('coach_id', user.id)

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const [{ data: programsData, error: programsError }, { data: assignmentsData, error: assignmentsError }] = await Promise.all([
      query.order('created_at', { ascending: false }),
      supabase
        .from('program_assignments')
        .select('program_id')
        .eq('coach_id', user.id),
    ])

    if (programsError) {
      console.error('[coach/programs] Error fetching programs:', programsError)
      return NextResponse.json(
        { error: programsError.message },
        { status: 500 }
      )
    }

    const programs = (programsData ?? []).map((p: any) => ({
      ...p,
      target_audience: p.target_audience ?? 'general_fitness',
    }))

    const assignmentCountByProgram: Record<string, number> = {}
    if (assignmentsError) {
      console.error(
        '[coach/programs] Error fetching program_assignments (counts will be empty):',
        assignmentsError.message,
        assignmentsError
      )
    } else if (assignmentsData) {
      assignmentsData.forEach((row: { program_id: string }) => {
        const id = row.program_id
        if (id) assignmentCountByProgram[id] = (assignmentCountByProgram[id] || 0) + 1
      })
    }

    console.log('[Coach programs] network calls done')

    return NextResponse.json({ programs, assignmentCountByProgram })
  } catch (err: unknown) {
    console.error('[coach/programs] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
