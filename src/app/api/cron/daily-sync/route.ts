import { NextRequest, NextResponse } from 'next/server'
import { runDailyGoalSync } from '@/lib/scheduledJobs'
import { runScheduledAthleteScoreJob } from '@/lib/scheduledAthleteScoreJob'

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
  // Verify cron secret (required)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[cron][daily-sync] CRON_SECRET not configured. Refusing to run.')
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Run daily goal sync first
    await runDailyGoalSync()

    // Then calculate athlete scores for active roster clients (idempotent per UTC day)
    const scoreResult = await runScheduledAthleteScoreJob()
    console.log('[daily-sync] Athlete score job done', scoreResult)

    return NextResponse.json({ 
      success: true, 
      message: 'Daily goal sync and athlete score calculation completed',
      scoreResult,
    })
  } catch (error) {
    console.error('Daily sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync goals', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

