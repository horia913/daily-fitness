/**
 * API Authentication Helper
 * Provides consistent authentication validation for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export interface AuthenticatedUser {
  id: string
  email?: string
}

export interface AuthValidationResult {
  user: AuthenticatedUser
  supabaseAuth: SupabaseClient
  supabaseAdmin: SupabaseClient
}

/**
 * Validates authentication from request headers
 * Returns authenticated user and Supabase clients
 * Throws error if authentication fails
 */
export async function validateApiAuth(request: NextRequest): Promise<AuthValidationResult> {
  const supabaseAuth = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) {
    throw new Error('User not authenticated')
  }

  // Create admin client for operations (only after validation)
  if (!supabaseServiceKey) {
    throw new Error('Service role key not configured')
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  return {
    user: {
      id: user.id,
      email: user.email
    },
    supabaseAuth,
    supabaseAdmin
  }
}

/**
 * Validates that the user owns the resource (client_id matches)
 */
export function validateOwnership(userId: string, resourceClientId: string): void {
  if (userId !== resourceClientId) {
    throw new Error('Forbidden - Cannot access another user\'s resource')
  }
}

/**
 * Creates a 401 Unauthorized response
 */
export function createUnauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  )
}

/**
 * Creates a 403 Forbidden response
 */
export function createForbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  )
}
