import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(request)

    // Parse body first to get coach_id
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { coach_id, client_id, status } = body

    // Validate required fields
    if (!coach_id || !client_id) {
      return NextResponse.json(
        { error: 'Missing required fields: coach_id and client_id are required' },
        { status: 400 }
      )
    }

    // Verify user is a coach or admin
    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) {
      return createForbiddenResponse('Only coaches and admins can create client relationships')
    }

    // Verify coach_id matches authenticated user (unless admin)
    if (coach_id !== user.id && profile.role !== 'admin') {
      return createForbiddenResponse('Cannot create relationship for another coach')
    }

    // Create client-coach relationship
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert({
        coach_id,
        client_id,
        status: status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (clientError) {
      console.error('Error creating client-coach relationship:', clientError)
      return NextResponse.json(
        { error: 'Failed to create client-coach relationship', details: clientError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      client: clientData 
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
    console.error('Error in create-client API route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
