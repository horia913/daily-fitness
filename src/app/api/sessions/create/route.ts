import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(request)
    const body = await request.json()
    const { coach_id, client_id, scheduled_at, duration_minutes, title, clipcard_id } = body

    // Validate required fields
    if (!coach_id || !client_id || !scheduled_at || !duration_minutes) {
      return NextResponse.json(
        { error: 'Missing required fields: coach_id, client_id, scheduled_at, and duration_minutes are required' },
        { status: 400 }
      )
    }

    // Verify ownership: user must be the client OR the coach
    if (user.id !== client_id && user.id !== coach_id) {
      // If user is coach, verify they have a relationship with this client
      if (user.id === coach_id) {
        const { data: relationship } = await supabaseAuth
          .from('clients')
          .select('id')
          .eq('coach_id', coach_id)
          .eq('client_id', client_id)
          .single()
        
        if (!relationship) {
          return createForbiddenResponse('Coach does not have relationship with this client')
        }
      } else {
        return createForbiddenResponse('Cannot create session for another user')
      }
    }

    // Check 1 session/day limit
    const dateStart = `${scheduled_at.split('T')[0]}T00:00:00.000Z`
    const dateEnd = `${scheduled_at.split('T')[0]}T23:59:59.999Z`
    
    const { data: existingSessions } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('client_id', client_id)
      .gte('scheduled_at', dateStart)
      .lte('scheduled_at', dateEnd)
      .in('status', ['scheduled', 'confirmed'])

    if (existingSessions && existingSessions.length > 0) {
      return NextResponse.json(
        { error: 'You already have a session booked for this date. Only 1 session per day is allowed.' },
        { status: 400 }
      )
    }

    // Create session
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .insert({
        coach_id,
        client_id,
        title: title || 'Training Session',
        scheduled_at,
        duration_minutes,
        status: 'scheduled'
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create session', details: sessionError.message },
        { status: 500 }
      )
    }

    // If clipcard is selected, use a session from it
    if (clipcard_id) {
      const { data: clipcardData } = await supabaseAdmin
        .from('clipcards')
        .select('sessions_used, sessions_remaining')
        .eq('id', clipcard_id)
        .single()

      if (clipcardData) {
        const { error: clipcardUpdateError } = await supabaseAdmin
          .from('clipcards')
          .update({
            sessions_used: (clipcardData.sessions_used || 0) + 1,
            sessions_remaining: (clipcardData.sessions_remaining || 0) - 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', clipcard_id)

        if (clipcardUpdateError) {
          console.error('Error updating clipcard:', clipcardUpdateError)
          // Don't fail the booking if clipcard update fails
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      session: sessionData 
    })
  } catch (error: any) {
    // Handle auth errors specifically
    if (error.message === 'Missing authorization header' || error.message === 'Invalid or expired token' || error.message === 'User not authenticated') {
      return createUnauthorizedResponse(error.message)
    }
    if (error.message === 'Service role key not configured') {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    console.error('Error in create-session API route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
