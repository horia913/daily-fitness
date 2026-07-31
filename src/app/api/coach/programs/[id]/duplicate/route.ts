import { NextRequest, NextResponse } from 'next/server'
import {
  createForbiddenResponse,
  validateApiAuth,
} from '@/lib/apiAuth'
import { duplicateMasterProgram } from '@/lib/programs/duplicateMasterProgram'

type RouteCtx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: RouteCtx) {
  try {
    const { user, supabaseAuth } = await validateApiAuth(request)
    const { id: sourceProgramId } = await ctx.params

    const { data: coachProfile } = await supabaseAuth
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!coachProfile || (coachProfile.role !== 'coach' && coachProfile.role !== 'admin')) {
      return createForbiddenResponse('Only coaches can duplicate programs')
    }

    const newProgramId = await duplicateMasterProgram(supabaseAuth, sourceProgramId, user.id)

    return NextResponse.json({ programId: newProgramId })
  } catch (e) {
    console.error('[duplicate program]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Duplicate failed' },
      { status: 400 },
    )
  }
}
