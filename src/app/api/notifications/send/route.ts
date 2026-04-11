import { NextRequest, NextResponse } from 'next/server'
import { sendPushNotification, sendEmail } from '@/lib/notifications'
import { validateApiAuth, createUnauthorizedResponse } from '@/lib/apiAuth'

export async function POST(request: NextRequest) {
  try {
    // Validate authentication, then authorize target scope by role/ownership.
    const { user, supabaseAdmin } = await validateApiAuth(request)
    
    const body = await request.json()
    const { 
      userIds, 
      title, 
      message, 
      url,
      emailSubject,
      emailHtml,
      sendPush = true,
      sendEmailNotification = false
    } = body

    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'userIds array is required' },
        { status: 400 }
      )
    }

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'title and message are required' },
        { status: 400 }
      )
    }

    const normalizedUserIds = userIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    if (normalizedUserIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'userIds must contain valid IDs' },
        { status: 400 }
      )
    }

    const { data: senderProfile, error: senderProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (senderProfileError || !senderProfile) {
      return NextResponse.json(
        { success: false, error: 'Could not resolve sender profile' },
        { status: 403 }
      )
    }

    const senderRole = String((senderProfile as { role?: string | null }).role ?? '').toLowerCase()
    const adminRoles = new Set(['admin', 'super_admin', 'super_coach', 'supercoach'])
    const isAdmin = adminRoles.has(senderRole)
    const isCoach = senderRole === 'coach'

    if (!isAdmin) {
      if (!isCoach) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        )
      }

      const { data: ownedClients, error: ownedClientsError } = await supabaseAdmin
        .from('clients')
        .select('client_id')
        .eq('coach_id', user.id)
        .in('client_id', normalizedUserIds)

      if (ownedClientsError) {
        return NextResponse.json(
          { success: false, error: 'Failed to verify target users' },
          { status: 500 }
        )
      }

      const ownedClientIds = new Set((ownedClients ?? []).map((row) => row.client_id))
      const unauthorizedTargets = normalizedUserIds.filter((id) => !ownedClientIds.has(id))
      if (unauthorizedTargets.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    const results: any = {}

    // Send push notification
    if (sendPush) {
      results.push = await sendPushNotification({
        userIds: normalizedUserIds,
        title,
        message,
        url
      })
    }

    // Send email notification
    if (sendEmailNotification && emailSubject && emailHtml) {
      results.email = await sendEmail({
        userIds: normalizedUserIds,
        subject: emailSubject,
        htmlContent: emailHtml
      })
    }

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error: any) {
    if (error.message === 'Missing authorization header' || error.message === 'Invalid or expired token' || error.message === 'User not authenticated') {
      return createUnauthorizedResponse('Authentication required to send notifications')
    }
    console.error('Notification API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

