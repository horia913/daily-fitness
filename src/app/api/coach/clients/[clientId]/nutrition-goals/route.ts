/**
 * Coach API: Set / remove client nutrition goals (macro targets)
 * POST: upsert goals for client
 * DELETE: remove all nutrition goals for client
 * Requires: coach is authenticated and client belongs to coach
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'
import { createErrorResponse, handleApiError } from '@/lib/apiErrorHandler'

async function assertCoachHasClient(coachId: string, clientId: string, supabaseAdmin: any): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error('Failed to verify client access')
  if (!data) throw new Error('Forbidden - Client not found or access denied')
}

interface NutritionGoalsBody {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  water_ml?: number
}

const PILLARS: { key: keyof NutritionGoalsBody; title: string; unit: string }[] = [
  { key: 'calories', title: 'Daily Calories', unit: 'kcal' },
  { key: 'protein', title: 'Daily Protein', unit: 'g' },
  { key: 'carbs', title: 'Daily Carbs', unit: 'g' },
  { key: 'fat', title: 'Daily Fat', unit: 'g' },
  { key: 'water_ml', title: 'Daily Water Intake', unit: 'ml' },
]

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(req)
    const coachId = user.id
    const { clientId } = await params
    if (!clientId) {
      return createErrorResponse('Missing clientId', undefined, 'VALIDATION_ERROR', 400)
    }

    await assertCoachHasClient(coachId, clientId, supabaseAdmin)

    let body: NutritionGoalsBody = {}
    try {
      body = await req.json()
    } catch {
      return createErrorResponse('Invalid JSON body', undefined, 'VALIDATION_ERROR', 400)
    }

    const now = new Date().toISOString()

    for (const { key, title, unit } of PILLARS) {
      const value = body[key]
      const isSet = typeof value === 'number' && value > 0

      const { data: existing } = await supabaseAdmin
        .from('goals')
        .select('id')
        .eq('client_id', clientId)
        .eq('pillar', 'nutrition')
        .eq('status', 'active')
        .eq('title', title)
        .limit(1)
        .maybeSingle()

      if (isSet) {
        const payload = {
          client_id: clientId,
          coach_id: coachId,
          pillar: 'nutrition',
          goal_type: 'nutrition',
          title,
          target_value: value,
          target_unit: unit,
          status: 'active',
          category: 'other',
          start_date: now.slice(0, 10),
          updated_at: now,
        }
        if (existing) {
          const { error } = await supabaseAdmin
            .from('goals')
            .update({
              target_value: value,
              target_unit: unit,
              updated_at: now,
            })
            .eq('id', existing.id)
          if (error) throw error
        } else {
          const { error } = await supabaseAdmin.from('goals').insert({
            ...payload,
            current_value: 0,
            progress_percentage: 0,
            priority: 'medium',
          })
          if (error) throw error
        }
      } else if (existing) {
        const { error } = await supabaseAdmin
          .from('goals')
          .update({ status: 'completed', updated_at: now })
          .eq('id', existing.id)
        if (error) throw error
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'User not authenticated') {
      return createUnauthorizedResponse(error.message)
    }
    if (error.message?.includes('Forbidden')) {
      return createForbiddenResponse(error.message)
    }
    return handleApiError(error, 'Failed to save nutrition goals')
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(req)
    const coachId = user.id
    const { clientId } = await params
    if (!clientId) {
      return createErrorResponse('Missing clientId', undefined, 'VALIDATION_ERROR', 400)
    }

    await assertCoachHasClient(coachId, clientId, supabaseAdmin)

    const now = new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('goals')
      .update({ status: 'completed', updated_at: now })
      .eq('client_id', clientId)
      .eq('pillar', 'nutrition')
      .eq('goal_type', 'nutrition')
      .eq('status', 'active')

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'User not authenticated') {
      return createUnauthorizedResponse(error.message)
    }
    if (error.message?.includes('Forbidden')) {
      return createForbiddenResponse(error.message)
    }
    return handleApiError(error, 'Failed to remove nutrition goals')
  }
}
