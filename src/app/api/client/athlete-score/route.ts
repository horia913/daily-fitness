/**
 * GET /api/client/athlete-score
 * 
 * Returns the latest athlete score for the authenticated client.
 * If no recent score exists (within last hour), recalculates it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth } from '@/lib/apiAuth'
import { calculateAthleteScore, getLatestAthleteScore } from '@/lib/athleteScoreService'

export async function GET(request: NextRequest) {
  try {
    // Validate authentication and get clients
    const { user, supabaseAdmin } = await validateApiAuth(request)

    // Check if a recent score exists (calculated within last hour)
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const latestScore = await getLatestAthleteScore(user.id, supabaseAdmin)

    // If score exists and was calculated within last hour, return it
    if (latestScore && new Date(latestScore.calculated_at) >= oneHourAgo) {
      return NextResponse.json({ score: latestScore })
    }

    // Otherwise, recalculate
    const newScore = await calculateAthleteScore(user.id, supabaseAdmin)

    return NextResponse.json({ score: newScore })
  } catch (error: any) {
    console.error('[athlete-score API] Error:', error)
    
    if (error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch athlete score' },
      { status: 500 }
    )
  }
}
