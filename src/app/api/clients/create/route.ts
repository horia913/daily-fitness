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

    // Verify user is authorized to create this relationship
    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return createForbiddenResponse('User profile not found')
    }

    // Authorization logic:
    // 1. Admin can create any relationship
    // 2. Coach can create relationships where they are the coach
    // 3. Client can create their own relationship (during signup flow)
    const isAdmin = profile.role === 'admin'
    const isCoachCreatingOwnRelation = (profile.role === 'coach' || profile.role === 'admin') && coach_id === user.id
    const isClientCreatingOwnRelation = profile.role === 'client' && client_id === user.id

    if (!isAdmin && !isCoachCreatingOwnRelation && !isClientCreatingOwnRelation) {
      return createForbiddenResponse('Not authorized to create this client-coach relationship')
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
