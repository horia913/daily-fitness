import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  // Create Supabase client inside function to avoid build-time initialization
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    )
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await request.json()
    const { coach_id, client_id, status } = body

    // Validate required fields
    if (!coach_id || !client_id) {
      return NextResponse.json(
        { error: 'Missing required fields: coach_id and client_id are required' },
        { status: 400 }
      )
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
    console.error('Error in create-client API route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
