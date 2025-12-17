import { NextRequest, NextResponse } from 'next/server'
import { runDailyGoalSync } from '@/lib/scheduledJobs'

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
    await runDailyGoalSync()
    return NextResponse.json({ success: true, message: 'Daily goal sync completed' })
  } catch (error) {
    console.error('Daily sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync goals', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

