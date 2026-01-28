import { NextRequest, NextResponse } from 'next/server'
import { syncAllClientGoals } from '@/lib/goalSyncService'
import { createErrorResponse, handleApiError, createSuccessResponse } from '@/lib/apiErrorHandler'
import { validateApiAuth, validateOwnership, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth'

export async function POST(req: NextRequest) {
  try {
    // Validate authentication
    const { user } = await validateApiAuth(req)
    // Get client_id from request body
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // Body already consumed or invalid
    }

    const clientId = body.client_id || body.userId || null

    if (!clientId) {
      return createErrorResponse('Missing client_id in request body', undefined, 'VALIDATION_ERROR', 400)
    }

    // SECURITY: Validate that client_id matches authenticated user
    try {
      validateOwnership(user.id, clientId)
    } catch (error: any) {
      return createForbiddenResponse('Cannot sync goals for another user')
    }

    const userId = user.id

    // Sync all goals for this client
    const results = await syncAllClientGoals(userId)

    return createSuccessResponse({
      synced: results.filter(r => r.updated).length,
      total: results.length,
      results
    })
  } catch (error: any) {
    // Handle auth errors specifically
    if (error.message === 'Missing authorization header' || error.message === 'Invalid or expired token' || error.message === 'User not authenticated') {
      return createUnauthorizedResponse(error.message)
    }
    if (error.message === 'Forbidden - Cannot access another user\'s resource') {
      return createForbiddenResponse(error.message)
    }
    return handleApiError(error, 'Failed to sync goals')
  }
}

