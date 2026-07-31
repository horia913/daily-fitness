/**
 * Shared React Query fetch for coach programs list.
 * Key: ['coach-programs-list'] — used by programs dashboard + gym ProgramTemplatePicker.
 * Fetches filter=all so Active/All can be applied client-side from one cache entry.
 */

import { fetchApi } from '@/lib/apiClient'
import type { MasterProgramBlockRow } from '@/lib/programs/masterProgramBlocksBatch'

export const COACH_PROGRAMS_LIST_QUERY_KEY = ['coach-programs-list'] as const

export type CoachProgramListRow = {
  id: string
  name: string
  description?: string
  coach_id?: string
  difficulty_level?: string
  totalWeeks?: number
  target_audience?: string
  periodization_style?: string | null
  is_public?: boolean
  is_active?: boolean
  created_at?: string
  updated_at?: string
  blocks?: MasterProgramBlockRow[]
  assignedPreview?: {
    count: number
    initials: string[]
  }
}

export type CoachProgramsListPayload = {
  programs: CoachProgramListRow[]
  assignmentCountByProgram: Record<string, number>
}

export async function fetchCoachProgramsList(
  signal?: AbortSignal | null,
): Promise<CoachProgramsListPayload> {
  const res = await fetchApi('/api/coach/programs?filter=all', {
    signal: signal ?? null,
  })
  const body = (await res.json().catch(() => ({}))) as {
    programs?: CoachProgramListRow[]
    assignmentCountByProgram?: Record<string, number>
    error?: string
  }
  if (!res.ok) {
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return {
    programs: Array.isArray(body.programs) ? body.programs : [],
    assignmentCountByProgram:
      body.assignmentCountByProgram && typeof body.assignmentCountByProgram === 'object'
        ? body.assignmentCountByProgram
        : {},
  }
}
