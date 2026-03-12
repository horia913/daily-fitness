/**
 * POST /api/coach/challenges/notify-created
 * Sends "new challenge" push to all coach's active clients. Call after creating a public challenge.
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
      .select('id, name, start_date, created_by')
      .eq('id', challengeId)
      .single()
    if (chError || !challenge || challenge.created_by !== user.id) {
      return NextResponse.json({ error: 'Challenge not found or access denied' }, { status: 404 })
    }
    const { data: clients } = await supabase
      .from('clients')
      .select('client_id')
      .eq('coach_id', user.id)
      .eq('status', 'active')
    const userIds = (clients || []).map((c: { client_id: string }) => c.client_id).filter(Boolean)
    if (!userIds.length) {
      return NextResponse.json({ success: true, sent: 0 })
    }
    const startDate = challenge.start_date ? new Date(challenge.start_date).toLocaleDateString() : 'soon'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    await sendPushNotification({
      userIds,
      title: 'New challenge',
      message: `New challenge: ${challenge.name} starts ${startDate}. Join now.`,
      url: `${appUrl}/client/challenges`
    })
    return NextResponse.json({ success: true, sent: userIds.length })
  } catch (err) {
    console.error('[notify-created]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
