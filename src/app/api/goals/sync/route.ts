import { NextRequest, NextResponse } from 'next/server'
import { syncAllClientGoals } from '@/lib/goalSyncService'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: NextRequest) {
  try {
    // Get auth from request
    const authHeader = req.headers.get('authorization')
    let userId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
      
      if (!authError && user) {
        userId = user.id
      }
    }

    // If no auth header, try to get from request body (for server-side calls)
    if (!userId) {
      try {
        const body = await req.json().catch(() => ({}))
        userId = body.client_id || body.userId || null
      } catch {
        // Body already consumed or invalid
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - client ID required' }, { status: 401 })
    }

    // Sync all goals for this client
    const results = await syncAllClientGoals(userId)

    return NextResponse.json({
      success: true,
      synced: results.filter(r => r.updated).length,
      total: results.length,
      results
    })
  } catch (error) {
    console.error('Goal sync error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync goals',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

