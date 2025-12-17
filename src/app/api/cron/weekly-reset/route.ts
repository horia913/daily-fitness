import { NextRequest, NextResponse } from 'next/server'
import { runWeeklyGoalReset } from '@/lib/scheduledJobs'

/**
 * Weekly Goal Reset Cron Job
 * Call this endpoint every Sunday at 11:59 PM
 * 
 * Setup:
 * - Vercel Cron: Add to vercel.json
 * - External Cron: Configure cron-job.org or similar
 * - Cron expression: 59 23 * * 0 (Sunday 11:59 PM)
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await runWeeklyGoalReset()
    return NextResponse.json({ success: true, message: 'Weekly goal reset completed' })
  } catch (error) {
    console.error('Weekly reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset weekly goals', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

