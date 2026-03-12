/**
 * GET /api/coach/achievements
 * Returns client achievements (user_achievements + templates) for the coach's clients.
 * Uses service role to bypass RLS (coaches cannot read user_achievements directly).
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(req)

    const { data: clientsData, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('client_id')
      .eq('coach_id', user.id)
      .eq('status', 'active')

    if (clientsError || !clientsData?.length) {
      return NextResponse.json({ clientAchievements: [] })
    }

    const clientIds = clientsData.map((c) => c.client_id)

    const { data: achievementsData, error: achievementsError } = await supabaseAdmin
      .from('user_achievements')
      .select(`
        id,
        client_id,
        achieved_date,
        tier,
        metric_value,
        achievement_templates (
          id,
          name,
          description,
          icon,
          category,
          achievement_type
        )
      `)
      .in('client_id', clientIds)
      .order('achieved_date', { ascending: false })

    if (achievementsError) {
      console.error('Error fetching coach client achievements:', achievementsError)
      return NextResponse.json({ clientAchievements: [] })
    }

    const { data: profilesData } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .in('id', clientIds)

    const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]))

    const clientAchievements = (achievementsData || []).map((r: any) => ({
      id: r.id,
      client_id: r.client_id,
      achievement_id: r.achievement_templates?.id,
      tier: r.tier ?? undefined,
      earned_at: r.achieved_date,
      client: profilesMap.get(r.client_id)
        ? {
            first_name: profilesMap.get(r.client_id)?.first_name,
            last_name: profilesMap.get(r.client_id)?.last_name,
            avatar_url: profilesMap.get(r.client_id)?.avatar_url,
          }
        : undefined,
      achievement: r.achievement_templates
        ? {
            id: r.achievement_templates.id,
            name: r.achievement_templates.name,
            description: r.achievement_templates.description,
            icon: r.achievement_templates.icon,
            category: r.achievement_templates.category,
            achievement_type: r.achievement_templates.achievement_type,
          }
        : undefined,
    }))

    return NextResponse.json({ clientAchievements })
  } catch (err) {
    if (err instanceof Error && err.message.includes('authenticated')) {
      return NextResponse.json({ error: err.message }, { status: 401 })
    }
    console.error('[coach/achievements] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
