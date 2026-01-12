import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/emailService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientEmail, clientName, inviteCode, expiryDays, inviteLink } = body

    // Validate required fields
    if (!clientEmail || !inviteCode) {
      return NextResponse.json(
        { error: 'Missing required fields: clientEmail and inviteCode are required' },
        { status: 400 }
      )
    }

    // Send the invite email
    const success = await emailService.sendInviteEmail(
      clientEmail,
      clientName || '',
      inviteCode,
      expiryDays || 30,
      inviteLink
    )

    if (success) {
      return NextResponse.json({ success: true, message: 'Invite email sent successfully' })
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send invite email' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in send-invite API route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
