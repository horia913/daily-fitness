import { NextRequest, NextResponse } from 'next/server'
import { sendPushNotification, sendEmail } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
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

    const results: any = {}

    // Send push notification
    if (sendPush) {
      results.push = await sendPushNotification({
        userIds,
        title,
        message,
        url
      })
    }

    // Send email notification
    if (sendEmailNotification && emailSubject && emailHtml) {
      results.email = await sendEmail({
        userIds,
        subject: emailSubject,
        htmlContent: emailHtml
      })
    }

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Notification API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

