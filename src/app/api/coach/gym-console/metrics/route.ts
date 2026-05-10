/**
 * POST /api/coach/gym-console/metrics
 * Body: { clientIds: string[] }
 * Returns PR count today for those clients (coach-owned only).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTrackedFetch } from '@/lib/supabaseQueryLogger'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { clientIds?: string[] }
    try {
      body = (await req.json()) as { clientIds?: string[] }
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const rawIds = Array.isArray(body.clientIds) ? body.clientIds : []
    const clientIds = rawIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    if (clientIds.length === 0) {
      return NextResponse.json({ prsToday: 0 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceKey || !url) {
      return NextResponse.json({ error: 'Server configuration' }, { status: 503 })
    }

    const admin = createClient(url, serviceKey, { global: { fetch: getTrackedFetch() } })

    const { data: allowedRows, error: allowErr } = await admin
      .from('clients')
      .select('client_id')
      .eq('coach_id', user.id)
      .eq('status', 'active')
      .in('client_id', clientIds)

    if (allowErr) {
      console.error('[gym-console/metrics] clients filter:', allowErr)
      return NextResponse.json({ error: allowErr.message }, { status: 500 })
    }

    const allowed = new Set((allowedRows ?? []).map((r) => r.client_id as string))
    const filtered = clientIds.filter((id) => allowed.has(id))
    if (filtered.length === 0) {
      return NextResponse.json({ prsToday: 0 })
    }

    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    const { count, error: prErr } = await admin
      .from('personal_records')
      .select('id', { count: 'exact', head: true })
      .in('client_id', filtered)
      .gte('achieved_date', start.toISOString())
      .lt('achieved_date', end.toISOString())

    if (prErr) {
      console.error('[gym-console/metrics] pr count:', prErr)
      return NextResponse.json({ prsToday: 0 })
    }

    return NextResponse.json({ prsToday: typeof count === 'number' ? count : 0 })
  } catch (e) {
    console.error('[gym-console/metrics]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
