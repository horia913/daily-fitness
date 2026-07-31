/**
 * GET /api/coach/programs
 *
 * Returns programs and assignment counts for the authenticated coach.
 * Query param: filter=active | all (default active).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getMasterProgramTotalWeeksBatch } from '@/lib/programs/masterProgramWeeks'
import { getMasterProgramBlocksBatch } from '@/lib/programs/masterProgramBlocksBatch'
import { clientInitialsFromProfile } from '@/lib/programs/programListDisplayUtils'

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
        .select('program_id, client_id, created_at')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    if (programsError) {
      console.error('[coach/programs] Error fetching programs:', programsError)
      return NextResponse.json(
        { error: programsError.message },
        { status: 500 }
      )
    }

    const programIds = (programsData ?? []).map((p: { id: string }) => p.id)
    const [totalWeeksByProgram, blocksByProgram] = await Promise.all([
      getMasterProgramTotalWeeksBatch(supabase, programIds),
      getMasterProgramBlocksBatch(supabase, programIds),
    ])

    const assignmentCountByProgram: Record<string, number> = {}
    const previewClientIdsByProgram = new Map<string, string[]>()

    if (assignmentsError) {
      console.error(
        '[coach/programs] Error fetching program_assignments (counts will be empty):',
        assignmentsError.message,
        assignmentsError
      )
    } else if (assignmentsData) {
      assignmentsData.forEach((row: { program_id: string; client_id: string }) => {
        const id = row.program_id
        const clientId = row.client_id
        if (!id) return

        assignmentCountByProgram[id] = (assignmentCountByProgram[id] || 0) + 1

        if (clientId) {
          const existing = previewClientIdsByProgram.get(id) ?? []
          if (existing.length < 3 && !existing.includes(clientId)) {
            previewClientIdsByProgram.set(id, [...existing, clientId])
          }
        }
      })
    }

    const allPreviewClientIds = [
      ...new Set([...previewClientIdsByProgram.values()].flat()),
    ]

    const profileById = new Map<
      string,
      { first_name?: string | null; last_name?: string | null; email?: string | null }
    >()

    if (allPreviewClientIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', allPreviewClientIds)

      if (profilesError) {
        console.error(
          '[coach/programs] Error fetching profiles for assignment preview:',
          profilesError.message,
        )
      } else {
        for (const profile of profilesData ?? []) {
          profileById.set(profile.id, profile)
        }
      }
    }

    const programs = (programsData ?? []).map((p: {
      id: string
      target_audience?: string | null
      periodization_style?: string | null
    }) => {
      const previewIds = previewClientIdsByProgram.get(p.id) ?? []
      const count = assignmentCountByProgram[p.id] ?? 0

      return {
        ...p,
        totalWeeks: totalWeeksByProgram.get(p.id) ?? 0,
        target_audience: p.target_audience ?? 'general_fitness',
        blocks: blocksByProgram.get(p.id) ?? [],
        assignedPreview: {
          count,
          initials: previewIds.map((clientId) =>
            clientInitialsFromProfile(profileById.get(clientId)),
          ),
        },
      }
    })

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
