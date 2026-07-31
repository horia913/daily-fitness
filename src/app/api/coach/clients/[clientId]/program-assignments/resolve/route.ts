/**
 * GET /api/coach/clients/[clientId]/program-assignments/resolve
 *
 * Resolve the active program assignment for the client-instance Station editor.
 * Uses supabaseAdmin (coach verified via clients table) — avoids RLS gaps and
 * maybeSingle() failures when multiple historical rows share client_id + program_id.
 *
 * Query: programId (required), assignmentId (optional — preferred when known)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  validateApiAuth,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/apiAuth'

type RouteCtx = { params: Promise<{ clientId: string }> }

async function verifyCoachClient(
  supabaseAdmin: Awaited<ReturnType<typeof validateApiAuth>>['supabaseAdmin'],
  coachId: string,
  clientId: string,
): Promise<boolean> {
  const { data: link } = await supabaseAdmin
    .from('clients')
    .select('client_id')
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .limit(1)
    .maybeSingle()
  return Boolean(link?.client_id)
}

export async function GET(request: NextRequest, ctx: RouteCtx) {
  try {
    const { user, supabaseAdmin } = await validateApiAuth(request)
    const { clientId } = await ctx.params

    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
    }

    const programId = request.nextUrl.searchParams.get('programId')?.trim()
    const assignmentIdParam = request.nextUrl.searchParams.get('assignmentId')?.trim()

    if (!programId && !assignmentIdParam) {
      return NextResponse.json(
        { error: 'Missing programId or assignmentId' },
        { status: 400 },
      )
    }

    if (!(await verifyCoachClient(supabaseAdmin, user.id, clientId))) {
      return createForbiddenResponse('Client not found or access denied')
    }

    if (assignmentIdParam) {
      let query = supabaseAdmin
        .from('program_assignments')
        .select('id, client_id, program_id, status')
        .eq('id', assignmentIdParam)
        .eq('client_id', clientId)

      if (programId) {
        query = query.eq('program_id', programId)
      }

      const { data: row, error } = await query.maybeSingle()

      if (error) {
        console.error('[resolve program assignment] by id:', error)
        return NextResponse.json({ error: 'Failed to load assignment' }, { status: 500 })
      }

      if (!row?.id) {
        return NextResponse.json(
          { error: 'Assignment not found for this client' },
          { status: 404 },
        )
      }

      if (row.status !== 'active') {
        return NextResponse.json(
          { error: 'Program assignment is not active', status: row.status },
          { status: 409 },
        )
      }

      return NextResponse.json({
        assignmentId: row.id,
        programId: row.program_id,
        clientId: row.client_id,
        status: row.status,
      })
    }

    const { data: rows, error } = await supabaseAdmin
      .from('program_assignments')
      .select('id, client_id, program_id, status')
      .eq('client_id', clientId)
      .eq('program_id', programId!)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('[resolve program assignment] by program:', error)
      return NextResponse.json({ error: 'Failed to load assignment' }, { status: 500 })
    }

    const row = rows?.[0]
    if (!row?.id) {
      return NextResponse.json(
        { error: 'No active program assignment found for this client' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      assignmentId: row.id,
      programId: row.program_id,
      clientId: row.client_id,
      status: row.status,
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'User not authenticated') {
      return createUnauthorizedResponse('Not authenticated')
    }
    console.error('[resolve program assignment]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
