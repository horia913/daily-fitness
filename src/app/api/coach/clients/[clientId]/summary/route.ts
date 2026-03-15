/**
 * GET /api/coach/clients/[clientId]/summary
 *
 * Returns profile, streak, weekly progress, and status for the coach client detail page
 * in one server round-trip. Coach must own the client (clients.coach_id = coach, client_id = clientId).
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/apiAuth';
import { handleApiError } from '@/lib/apiErrorHandler';
import {
  calculateStreakWithClient,
  calculateWeeklyProgressWithClient,
} from '@/lib/clientDashboardService';

async function assertCoachHasClient(
  coachId: string,
  clientId: string,
  supabaseAdmin: any
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('Failed to verify client access');
  if (!data) throw new Error('Forbidden - Client not found or access denied');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { user, supabaseAuth, supabaseAdmin } = await validateApiAuth(_req);
    const coachId = user.id;
    const { clientId } = await params;
    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    }

    await assertCoachHasClient(coachId, clientId, supabaseAdmin);

    const [profileResult, streak, weeklyProgress] = await Promise.all([
      supabaseAuth
        .from('profiles')
        .select('id, email, first_name, last_name, phone, created_at')
        .eq('id', clientId)
        .single(),
      calculateStreakWithClient(supabaseAuth, clientId),
      calculateWeeklyProgressWithClient(supabaseAuth, clientId),
    ]);

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json(
        { error: profileResult.error?.message ?? 'Failed to load client profile' },
        { status: 500 }
      );
    }

    const profile = profileResult.data;
    const compliance =
      weeklyProgress.goal > 0
        ? Math.round((weeklyProgress.current / weeklyProgress.goal) * 100)
        : 0;
    let status: 'active' | 'inactive' | 'at-risk' = 'active';
    if (compliance < 50) status = 'at-risk';
    else if (compliance === 0 && weeklyProgress.goal > 0) status = 'inactive';

    const name =
      `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Client';
    const joinedDate = profile.created_at
      ? new Date(profile.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

    return NextResponse.json({
      profile: {
        id: profile.id,
        email: profile.email ?? '',
        first_name: profile.first_name ?? undefined,
        last_name: profile.last_name ?? undefined,
        phone: profile.phone ?? undefined,
        created_at: profile.created_at,
      },
      name,
      email: profile.email ?? '',
      phone: profile.phone ?? undefined,
      joinedDate,
      streak,
      weeklyProgress: { current: weeklyProgress.current, goal: weeklyProgress.goal },
      status,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'User not authenticated') {
      return createUnauthorizedResponse(error.message);
    }
    if (error instanceof Error && error.message?.includes('Forbidden')) {
      return createForbiddenResponse(error.message);
    }
    return handleApiError(error, 'Failed to load client summary');
  }
}
