import { NextRequest, NextResponse } from 'next/server'
import { runDailyGoalReset } from '@/lib/scheduledJobs'

/**
 * Daily Goal Reset Cron Job
 * Call this endpoint every day at 12:00 AM (midnight)
 * 
 * Setup:
 * - Vercel Cron: Add to vercel.json
 * - External Cron: Configure cron-job.org or similar
 * - Cron expression: 0 0 * * * (Every day at midnight)
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (required)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[cron][daily-reset] CRON_SECRET not configured. Refusing to run.')
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await runDailyGoalReset()
    return NextResponse.json({ success: true, message: 'Daily goal reset completed' })
  } catch (error) {
    console.error('Daily reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset daily goals', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

