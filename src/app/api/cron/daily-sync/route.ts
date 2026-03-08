import { NextRequest, NextResponse } from 'next/server'
import { runDailyGoalSync } from '@/lib/scheduledJobs'
import { calculateAthleteScore } from '@/lib/athleteScoreService'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Daily Goal Sync Cron Job
 * Call this endpoint every day at 1:00 AM
 * 
 * Setup:
 * - Vercel Cron: Add to vercel.json
 * - External Cron: Configure cron-job.org or similar
 * - Cron expression: 0 1 * * * (Every day at 1 AM)
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Run daily goal sync first
    await runDailyGoalSync()

    // Then calculate athlete scores for all active clients
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'client')

    if (clientsError) {
      console.error('[daily-sync] Error fetching clients for athlete scores:', clientsError)
    } else if (clients && clients.length > 0) {
      let successCount = 0
      let errorCount = 0

      for (const client of clients) {
        try {
          await calculateAthleteScore(client.id, supabaseAdmin)
          successCount++
        } catch (error) {
          console.error(`[daily-sync] Error calculating athlete score for client ${client.id}:`, error)
          errorCount++
        }
      }

      console.log(`[daily-sync] Athlete scores calculated: ${successCount} successful, ${errorCount} errors`)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Daily goal sync and athlete score calculation completed' 
    })
  } catch (error) {
    console.error('Daily sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync goals', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

