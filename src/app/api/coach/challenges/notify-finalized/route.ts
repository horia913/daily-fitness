/**
 * POST /api/coach/challenges/notify-finalized
 * Sends "challenge ended" to each participant with their rank, and "you won" to winner(s).
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
    const { challengeId } = body
    if (!challengeId) {
      return NextResponse.json({ error: 'challengeId required' }, { status: 400 })
    }
    const { data: challenge, error: chError } = await supabase
      .from('challenges')
      .select('id, name, created_by')
      .eq('id', challengeId)
      .single()
    if (chError || !challenge || challenge.created_by !== user.id) {
      return NextResponse.json({ error: 'Challenge not found or access denied' }, { status: 404 })
    }
    const { data: participants } = await supabase
      .from('challenge_participants')
      .select('client_id, final_rank, is_winner')
      .eq('challenge_id', challengeId)
    if (!participants?.length) {
      return NextResponse.json({ success: true, sent: 0 })
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    for (const p of participants) {
      const rank = p.final_rank ?? 0
      await sendPushNotification({
        userIds: [p.client_id],
        title: 'Challenge ended',
        message: `${challenge.name} has ended! You finished #${rank}.`,
        url: `${appUrl}/client/challenges`
      })
      if (p.is_winner) {
        await sendPushNotification({
          userIds: [p.client_id],
          title: 'You won! 🏆',
          message: `Congratulations! You won ${challenge.name}!`,
          url: `${appUrl}/client/challenges`
        })
      }
    }
    return NextResponse.json({ success: true, sent: participants.length })
  } catch (err) {
    console.error('[notify-finalized]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
