/**
 * POST /api/coach/challenges/notify-video-reviewed
 * Sends push to participant when their video is approved or rejected.
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
    const { submissionId, status, categoryName } = body
    if (!submissionId || !status || !categoryName) {
      return NextResponse.json({ error: 'submissionId, status, categoryName required' }, { status: 400 })
    }
    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
    }
    const { data: sub } = await supabase
      .from('challenge_video_submissions')
      .select('participant_id, claimed_weight, claimed_reps')
      .eq('id', submissionId)
      .single()
    if (!sub?.participant_id) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }
    const { data: participant } = await supabase
      .from('challenge_participants')
      .select('client_id, challenge_id')
      .eq('id', sub.participant_id)
      .single()
    if (!participant?.client_id) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }
    const { data: challenge } = await supabase
      .from('challenges')
      .select('created_by')
      .eq('id', participant.challenge_id)
      .single()
    if (!challenge || challenge.created_by !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    if (status === 'approved') {
      const score = [sub.claimed_weight != null && sub.claimed_reps != null
        ? `${sub.claimed_weight} kg × ${sub.claimed_reps} reps`
        : sub.claimed_weight != null
        ? `${sub.claimed_weight} kg`
        : sub.claimed_reps != null
        ? `${sub.claimed_reps} reps`
        : '—'].join('')
      await sendPushNotification({
        userIds: [participant.client_id],
        title: 'Submission approved',
        message: `Your ${categoryName} submission was approved! Score: ${score}`,
        url: `${appUrl}/client/challenges`
      })
    } else {
      await sendPushNotification({
        userIds: [participant.client_id],
        title: 'Submission needs revision',
        message: `Your ${categoryName} submission needs revision. Check coach feedback.`,
        url: `${appUrl}/client/challenges`
      })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[notify-video-reviewed]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
