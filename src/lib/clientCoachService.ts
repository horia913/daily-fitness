/**
 * Client → own coach resolution (scoped by clients.coach_id).
 * Does not list all coach profiles — fetches only the linked coach id.
 */

import { supabase } from '@/lib/supabase'
import type { CoachingPillState } from '@/components/client-profile/CoachingStatusPill'

export type MyCoachProfile = {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  bio: string | null
  email: string | null
  phone: string | null
}

export type MyCoachResult = {
  /** False when no clients row or coach_id is null */
  hasCoach: boolean
  relationshipStatus: string | null
  coachingState: CoachingPillState | null
  coach: MyCoachProfile | null
}

/**
 * Map clients.status + active program pause → ProfileHero coaching pill.
 * - inactive → ended
 * - program paused → paused (wins over active/pending)
 * - active | pending → active
 */
export function deriveCoachingState(
  clientsStatus: string | null | undefined,
  pauseStatus: string | null | undefined,
): CoachingPillState | null {
  if (!clientsStatus) return null
  const s = clientsStatus.toLowerCase().trim()
  if (s === 'inactive') return 'ended'
  if ((pauseStatus ?? '').toLowerCase() === 'paused') return 'paused'
  if (s === 'active' || s === 'pending') return 'active'
  return 'ended'
}

/**
 * Resolve the signed-in client's coach via their own `clients` row, then
 * load that single profile by id (scoped — not a broad coach listing).
 */
export async function fetchMyCoach(clientId: string): Promise<MyCoachResult> {
  const empty: MyCoachResult = {
    hasCoach: false,
    relationshipStatus: null,
    coachingState: null,
    coach: null,
  }

  const { data: link, error: linkErr } = await supabase
    .from('clients')
    .select('coach_id, status')
    .eq('client_id', clientId)
    .maybeSingle()

  if (linkErr || !link?.coach_id) {
    return empty
  }

  const coachId = link.coach_id as string
  const relationshipStatus =
    typeof link.status === 'string' ? link.status : null

  const [{ data: coachRow }, { data: assignment }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, bio, email, phone')
      .eq('id', coachId)
      .maybeSingle(),
    supabase
      .from('program_assignments')
      .select('pause_status')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const pauseStatus =
    typeof assignment?.pause_status === 'string'
      ? assignment.pause_status
      : null

  const coachingState = deriveCoachingState(relationshipStatus, pauseStatus)

  if (!coachRow) {
    return {
      hasCoach: true,
      relationshipStatus,
      coachingState,
      coach: null,
    }
  }

  return {
    hasCoach: true,
    relationshipStatus,
    coachingState,
    coach: {
      id: coachRow.id as string,
      first_name: (coachRow.first_name as string | null) ?? null,
      last_name: (coachRow.last_name as string | null) ?? null,
      avatar_url: (coachRow.avatar_url as string | null) ?? null,
      bio: (coachRow.bio as string | null) ?? null,
      email: (coachRow.email as string | null) ?? null,
      phone: (coachRow.phone as string | null) ?? null,
    },
  }
}
