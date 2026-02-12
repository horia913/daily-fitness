/**
 * PATCH /api/user/timezone
 *
 * Updates the authenticated user's profiles.timezone (IANA string).
 * Called by client on login/boot when Intl.DateTimeFormat().resolvedOptions().timeZone
 * differs from stored value. No manual user setup required.
 *
 * Security: Only the profile row for the authenticated user is updated.
 * - User ID from supabase.auth.getUser() (session; equivalent to auth.uid() in DB).
 * - Update is explicitly scoped with .eq('id', user.id). RLS profiles_update_own
 *   (id = auth.uid()) also enforces this at the database level.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const MAX_TZ_LENGTH = 64
const IANA_PATTERN = /^[A-Za-z0-9_+/_-]+(\/[A-Za-z0-9_+/_-]+)*$/

function isValidIANA(tz: string): boolean {
  if (!tz || tz.length > MAX_TZ_LENGTH) return false
  return IANA_PATTERN.test(tz)
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const timezone = typeof body.timezone === 'string' ? body.timezone.trim() : ''
    if (!isValidIANA(timezone)) {
      return NextResponse.json(
        { error: 'Invalid timezone: must be a non-empty IANA string (e.g. UTC, Europe/Bucharest)' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ timezone, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      console.error('[timezone] Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, timezone })
  } catch (e: any) {
    console.error('[timezone] Error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
