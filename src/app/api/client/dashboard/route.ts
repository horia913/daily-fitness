/**
 * GET /api/client/dashboard
 * 
 * Returns comprehensive dashboard data for the authenticated client.
 * 
 * OPTIMIZED: Uses single PostgreSQL RPC call (get_client_dashboard)
 * instead of 10+ individual queries.
 * 
 * For program clients: todaySlot and isRestDay come from buildProgramWeekState
 * (single authority — same function as program-week API). RPC todaysWorkout
 * is ignored for Today selection. Dashboard does NOT call programStateService directly.
 * 
 * Response includes:
 * - avatarUrl, firstName, clientType, nextSession, streak, weeklyProgress,
 *   weeklyStats, workoutDays, bodyWeight, todaysWorkout (from RPC)
 * - todaySlot, isRestDay (from buildProgramWeekState)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { PerfCollector } from '@/lib/perfUtils'
import { buildProgramWeekState } from '@/lib/programWeekStateBuilder'

export async function GET(request: NextRequest) {
  const perf = new PerfCollector('/api/client/dashboard')
  
  try {
    // 1. Create authenticated Supabase client
    const supabase = await createSupabaseServerClient()
    
    // 2. Verify authentication
    const { data: { user }, error: authError } = await perf.time('auth', () =>
      supabase.auth.getUser()
    )
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message || 'Unauthorized' },
        { status: 401 }
      )
    }

    // todayWeekday: 0=Mon..6=Sun (client timezone). Default if missing.
    const { searchParams } = new URL(request.url)
    const todayWeekdayParam = searchParams.get('todayWeekday')
    const todayWeekday = todayWeekdayParam !== null
      ? Math.min(6, Math.max(0, parseInt(todayWeekdayParam, 10) || 0))
      : (new Date().getDay() + 6) % 7
    
    // 3. Call the optimized RPC
    const rpcResult = await perf.time('rpc_get_client_dashboard', async () =>
      supabase.rpc('get_client_dashboard')
    )
    const { data, error } = rpcResult
    
    if (error) {
      console.error('[dashboard] RPC error:', error)
      
      // Check if function doesn't exist (migration not run)
      if (error.code === '42883' || (error.message?.includes('function') && error.message?.includes('does not exist'))) {
        console.error('[dashboard] RPC function not found. Run migration 20260202_client_dashboard_rpc.sql')
        return NextResponse.json(
          { 
            error: 'Database function not available',
            details: 'Please run the client dashboard RPC migration.',
            code: 'RPC_NOT_FOUND'
          },
          { status: 503 }
        )
      }
      
      if (error.message?.includes('Not authenticated')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to fetch dashboard data' },
        { status: 500 }
      )
    }
    
    // 4. For program clients: get todaySlot, isRestDay, overdueSlots from buildProgramWeekState (single authority)
    let todaySlot = null
    let isRestDay = false
    let overdueSlots: unknown[] = []
    let programProgress: { currentWeek: number; totalWeeks: number; completedCount: number; totalSlots: number; percent: number } | undefined
    try {
      const programWeekState = await buildProgramWeekState(supabase, user.id, todayWeekday)
      todaySlot = programWeekState.todaySlot
      isRestDay = programWeekState.isRestDay
      overdueSlots = programWeekState.overdueSlots
      if (programWeekState.hasProgram && programWeekState.totalSlots > 0) {
        programProgress = {
          currentWeek: programWeekState.currentWeekNumber,
          totalWeeks: programWeekState.totalWeeks,
          completedCount: programWeekState.completedCount,
          totalSlots: programWeekState.totalSlots,
          percent: Math.round((programWeekState.completedCount / programWeekState.totalSlots) * 100),
        }
      }
    } catch (e) {
      console.warn('[dashboard] Could not get program week state:', e)
    }

    // 4b. Highlights: PRs this month, latest achievement, best leaderboard rank
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const [prsThisMonthRes, latestAchievementRes, leaderboardEntriesRes] = await Promise.all([
      supabase
        .from('personal_records')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', user.id)
        .gte('achieved_date', firstDay)
        .lte('achieved_date', lastDay),
      supabase
        .from('user_achievements')
        .select('achievement_template_id, tier, achieved_date')
        .eq('client_id', user.id)
        .order('achieved_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('leaderboard_entries')
        .select('rank, leaderboard_type, exercise_id')
        .eq('client_id', user.id),
    ])

    const prsThisMonth = prsThisMonthRes.count ?? 0
    let latestAchievement: { name: string; icon: string | null; tier: string | null } | null = null
    if (latestAchievementRes.data?.achievement_template_id) {
      const { data: template } = await supabase
        .from('achievement_templates')
        .select('name, icon')
        .eq('id', latestAchievementRes.data.achievement_template_id)
        .maybeSingle()
      latestAchievement = {
        name: template?.name ?? 'Achievement',
        icon: template?.icon ?? null,
        tier: latestAchievementRes.data.tier ?? null,
      }
    }
    const entries = leaderboardEntriesRes.data ?? []
    const bestRankEntry = entries.length > 0
      ? entries.reduce((best, e) => (e.rank < best.rank ? e : best), entries[0])
      : null
    const bestLeaderboardRank =
      bestRankEntry && bestRankEntry.rank <= 10
        ? { rank: bestRankEntry.rank, exerciseName: null as string | null }
        : null
    // Optionally resolve exercise name for best rank
    if (bestLeaderboardRank && bestRankEntry?.exercise_id) {
      const { data: ex } = await supabase
        .from('exercises')
        .select('name')
        .eq('id', bestRankEntry.exercise_id)
        .maybeSingle()
      if (ex?.name) bestLeaderboardRank.exerciseName = ex.name
    }

    const highlights = {
      prsThisMonth,
      latestAchievement,
      bestLeaderboardRank,
    }

    // 5. Log performance summary
    perf.logSummary()
    
    // 6. Return response with Server-Timing headers (todaySlot, isRestDay, overdueSlots from builder)
    const payload = { ...data, todaySlot, isRestDay, overdueSlots, programProgress, highlights }
    const response = NextResponse.json(payload)
    const perfHeaders = perf.getHeaders()
    Object.entries(perfHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
    
  } catch (error: any) {
    console.error('[dashboard] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
