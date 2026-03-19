/**
 * POST /api/coach/challenges/notify-progress
 * Sends mid-challenge progress/rank-change push to participants.
 * Called after score recalculation or on a schedule.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { challengeId, type } = body
    if (!challengeId) {
      return NextResponse.json({ error: 'challengeId required' }, { status: 400 })
    }

    const { data: challenge, error: chError } = await supabase
      .from('challenges')
      .select('id, name, start_date, end_date, created_by, status')
      .eq('id', challengeId)
      .single()

    if (chError || !challenge || challenge.created_by !== user.id) {
      return NextResponse.json({ error: 'Challenge not found or access denied' }, { status: 404 })
    }

    if (challenge.status !== 'active') {
      return NextResponse.json({ error: 'Challenge is not active' }, { status: 400 })
    }

    const { data: participants } = await supabase
      .from('challenge_participants')
      .select('client_id, total_score')
      .eq('challenge_id', challengeId)
      .order('total_score', { ascending: false })

    const userIds = (participants ?? []).map(p => p.client_id).filter(Boolean)
    if (!userIds.length) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const daysLeft = Math.max(0, Math.ceil(
      (new Date(challenge.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ))

    let title = ''
    let message = ''

    switch (type) {
      case 'halfway':
        title = 'Halfway there!'
        message = `${challenge.name} is halfway done. Check the leaderboard!`
        break
      case 'final_day':
        title = 'Last day!'
        message = `${challenge.name} ends today. Give it everything!`
        break
      case 'reminder':
        title = `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
        message = `${challenge.name} is ending soon. Check your ranking!`
        break
      default:
        title = 'Challenge update'
        message = `${challenge.name}: ${daysLeft} days remaining. Keep pushing!`
    }

    await sendPushNotification({
      userIds,
      title,
      message,
      url: `${appUrl}/client/challenges/${challenge.id}`,
    })

    return NextResponse.json({ success: true, sent: userIds.length })
  } catch (err) {
    console.error('[notify-progress]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
