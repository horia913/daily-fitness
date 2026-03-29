/**
 * GET /api/coach/workouts/templates
 *
 * Returns workout templates and assignment counts for the authenticated coach.
 * Uses server Supabase client; single batched response.
 */

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { computeExerciseCountsByTemplateIds } from '@/lib/workoutTemplateExerciseCounts'

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

    const rawList = templatesData ?? []
    const templateIds = rawList.map((t: { id: string }) => t.id).filter(Boolean)

    const zeroCounts = (): Record<string, number> =>
      Object.fromEntries(templateIds.map((id) => [id, 0]))

    let exerciseCounts: Record<string, number> = zeroCounts()

    if (templateIds.length > 0) {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'count_exercises_by_template_ids',
        { p_template_ids: templateIds }
      )

      if (!rpcError && Array.isArray(rpcData)) {
        exerciseCounts = zeroCounts()
        for (const row of rpcData as { template_id?: string; exercise_count?: number | string }[]) {
          const tid = row?.template_id
          if (tid) {
            exerciseCounts[tid] = Number(row.exercise_count) || 0
          }
        }
      } else {
        if (rpcError) {
          console.warn(
            '[coach/workouts/templates] count_exercises_by_template_ids RPC unavailable or failed; using parallel fallback:',
            rpcError.message
          )
        }
        const empty = zeroCounts()
        const fallback = await Promise.race([
          computeExerciseCountsByTemplateIds(supabase, templateIds),
          new Promise<Record<string, number>>((resolve) =>
            setTimeout(() => resolve(empty), 14_000)
          ),
        ])
        exerciseCounts = { ...empty, ...fallback }
      }
    }

    const templates = rawList.map((t: Record<string, unknown>) => ({
      ...t,
      exercise_count: exerciseCounts[t.id as string] ?? 0,
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
