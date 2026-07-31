/**
 * Performance tests — catalog + results (coach-tested and client self-logged).
 * Legacy `public.performance_tests` is unused.
 */

import { supabase } from './supabase'
import { resolveViewerCoachId } from './leaderboardService'

export type PerformanceDirection = 'higher_better' | 'lower_better'
export type PerformanceCategory =
  | 'jump'
  | 'sprint'
  | 'carry'
  | 'cardio'
  | 'other'

export interface PerformanceTestCatalogItem {
  id: string
  test_key: string
  display_name: string
  category: PerformanceCategory
  result_unit: string
  secondary_unit: string | null
  secondary_label: string | null
  direction: PerformanceDirection
  description: string | null
  sort_order: number
  is_active: boolean
}

export interface PerformanceTestResult {
  id: string
  client_id: string
  test_id: string
  tested_at: string
  tested_by: string | null
  result_value: number
  secondary_value: number | null
  details: Record<string, unknown> | null
  conditions: string | null
  perceived_effort: number | null
  notes: string | null
  created_at?: string
  test?: PerformanceTestCatalogItem | null
}

export type PerformanceResultInput = {
  client_id: string
  test_id: string
  tested_at: string
  tested_by: string | null
  result_value: number
  secondary_value?: number | null
  conditions?: string | null
  perceived_effort?: number | null
  notes?: string | null
}

export type RosterPerformanceRank =
  | { kind: 'ranked'; rank: number; total: number }
  | { kind: 'solo' }
  | { kind: 'unavailable' }

export interface PerformanceCategoryGroup {
  category: PerformanceCategory
  items: PerformanceTestCatalogItem[]
}

const CATALOG_SELECT =
  'id, test_key, display_name, category, result_unit, secondary_unit, secondary_label, direction, description, sort_order, is_active'

const RESULT_SELECT =
  'id, client_id, test_id, tested_at, tested_by, result_value, secondary_value, details, conditions, perceived_effort, notes, created_at'

const CATEGORY_ORDER: PerformanceCategory[] = [
  'jump',
  'sprint',
  'carry',
  'cardio',
  'other',
]

export function formatCategoryLabel(category: string): string {
  if (!category) return ''
  return category.charAt(0).toUpperCase() + category.slice(1)
}

/**
 * tested_by = coach id → coach-tested
 * tested_by null or = client_id → self-logged
 */
export function isSelfLogged(
  result: Pick<PerformanceTestResult, 'tested_by' | 'client_id'>,
): boolean {
  return result.tested_by == null || result.tested_by === result.client_id
}

export function isCoachTested(
  result: Pick<PerformanceTestResult, 'tested_by' | 'client_id'>,
): boolean {
  return !isSelfLogged(result)
}

export function groupCatalogByCategory(
  tests: PerformanceTestCatalogItem[],
): PerformanceCategoryGroup[] {
  const map = new Map<PerformanceCategory, PerformanceTestCatalogItem[]>()
  for (const t of tests) {
    const list = map.get(t.category) ?? []
    list.push(t)
    map.set(t.category, list)
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((category) => ({
    category,
    items: [...(map.get(category) ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  }))
}

/** Format a result for display; times in seconds use MM:SS when ≥ 60. */
export function formatResultValue(
  value: number | null | undefined,
  unit: string,
): string {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const n = Number(value)
  if (unit === 's') {
    if (n >= 60) return formatRunTime(n)
    // Keep one decimal for short sprints when not integer
    return Number.isInteger(n) ? `${n}s` : `${n.toFixed(2)}s`
  }
  if (unit === 'cm') return `${n} cm`
  if (unit === 'kg') return `${n} kg`
  if (unit === 'm') return `${n} m`
  if (unit === 'rsi') return String(n)
  if (unit === 'score') return String(n)
  return `${n} ${unit}`
}

export function formatRunTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function parseTimeOrNumber(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((p) => parseFloat(p))
    if (parts.some((n) => Number.isNaN(n))) return null
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return null
  }
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

/**
 * Positive = improvement (direction-aware).
 * lower_better: a drop is improvement; higher_better: a rise is improvement.
 */
export function improvementPercent(
  latest: number,
  previous: number,
  direction: PerformanceDirection,
): number | null {
  if (!Number.isFinite(latest) || !Number.isFinite(previous) || previous === 0) {
    return null
  }
  if (direction === 'lower_better') {
    return Math.round(((previous - latest) / Math.abs(previous)) * 1000) / 10
  }
  return Math.round(((latest - previous) / Math.abs(previous)) * 1000) / 10
}

export function isImprovement(
  latest: number,
  previous: number,
  direction: PerformanceDirection,
): boolean {
  if (direction === 'lower_better') return latest < previous
  return latest > previous
}

/** Sparkline bar height 0.25–1; taller = better per catalog direction. */
export function sparkBarFraction(
  value: number,
  min: number,
  max: number,
  direction: PerformanceDirection,
): number {
  const range = max - min || 1
  const normalized = (value - min) / range
  const quality = direction === 'lower_better' ? 1 - normalized : normalized
  return 0.25 + quality * 0.75
}

export function compareScores(
  a: number,
  b: number,
  direction: PerformanceDirection,
): number {
  // Ascending sort: better first when used with rank (index 0 = best)
  if (direction === 'lower_better') return a - b
  return b - a
}

export async function fetchActivePerformanceCatalog(): Promise<
  PerformanceTestCatalogItem[]
> {
  const { data, error } = await supabase
    .from('performance_test_catalog')
    .select(CATALOG_SELECT)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as PerformanceTestCatalogItem[]
}

function attachCatalog(
  rows: PerformanceTestResult[],
  catalogById: Map<string, PerformanceTestCatalogItem>,
): PerformanceTestResult[] {
  return rows.map((r) => ({
    ...r,
    test: catalogById.get(r.test_id) ?? null,
  }))
}

export async function fetchClientPerformanceResults(
  clientId: string,
  opts?: { testId?: string; limit?: number },
): Promise<PerformanceTestResult[]> {
  let query = supabase
    .from('performance_test_results')
    .select(RESULT_SELECT)
    .eq('client_id', clientId)
    .order('tested_at', { ascending: false })

  if (opts?.testId) query = query.eq('test_id', opts.testId)
  if (opts?.limit) query = query.limit(opts.limit)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as PerformanceTestResult[]
  if (rows.length === 0) return []

  const catalog = await fetchActivePerformanceCatalog()
  // Also fetch any inactive tests referenced by history
  const missingIds = [
    ...new Set(
      rows
        .map((r) => r.test_id)
        .filter((id) => !catalog.some((c) => c.id === id)),
    ),
  ]
  let extra: PerformanceTestCatalogItem[] = []
  if (missingIds.length > 0) {
    const { data: extraRows } = await supabase
      .from('performance_test_catalog')
      .select(CATALOG_SELECT)
      .in('id', missingIds)
    extra = (extraRows ?? []) as PerformanceTestCatalogItem[]
  }
  const catalogById = new Map(
    [...catalog, ...extra].map((c) => [c.id, c]),
  )
  return attachCatalog(rows, catalogById)
}

/** Alias for progress hub batching */
export async function getClientPerformanceTests(
  clientId: string,
): Promise<PerformanceTestResult[]> {
  return fetchClientPerformanceResults(clientId)
}

export async function fetchPerformanceResult(
  resultId: string,
): Promise<PerformanceTestResult | null> {
  const { data, error } = await supabase
    .from('performance_test_results')
    .select(RESULT_SELECT)
    .eq('id', resultId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as PerformanceTestResult
  const { data: test } = await supabase
    .from('performance_test_catalog')
    .select(CATALOG_SELECT)
    .eq('id', row.test_id)
    .maybeSingle()

  return {
    ...row,
    test: (test as PerformanceTestCatalogItem | null) ?? null,
  }
}

export async function createPerformanceResult(
  input: PerformanceResultInput,
): Promise<PerformanceTestResult> {
  const { data, error } = await supabase
    .from('performance_test_results')
    .insert({
      client_id: input.client_id,
      test_id: input.test_id,
      tested_at: input.tested_at,
      tested_by: input.tested_by,
      result_value: input.result_value,
      secondary_value: input.secondary_value ?? null,
      conditions: input.conditions?.trim() || null,
      perceived_effort: input.perceived_effort ?? null,
      notes: input.notes?.trim() || null,
      details: null,
    })
    .select(RESULT_SELECT)
    .single()

  if (error) throw error
  const full = await fetchPerformanceResult(data.id)
  if (!full) throw new Error('Result created but could not be reloaded')
  try {
    const { emitInAppNotification } = await import('@/lib/inAppNotificationEvents')
    void emitInAppNotification({
      event: 'client_test_recorded',
      clientId: input.client_id,
      testKind: 'performance',
      testId: data.id,
    })
  } catch {
    /* non-blocking */
  }
  return full
}

export async function updatePerformanceResult(
  resultId: string,
  updates: Partial<
    Omit<PerformanceResultInput, 'client_id' | 'tested_by'>
  > & { tested_by?: string | null },
): Promise<PerformanceTestResult> {
  const payload: Record<string, unknown> = {}
  if (updates.test_id != null) payload.test_id = updates.test_id
  if (updates.tested_at != null) payload.tested_at = updates.tested_at
  if (updates.result_value != null) payload.result_value = updates.result_value
  if (updates.secondary_value !== undefined) {
    payload.secondary_value = updates.secondary_value
  }
  if (updates.conditions !== undefined) {
    payload.conditions = updates.conditions?.trim() || null
  }
  if (updates.perceived_effort !== undefined) {
    payload.perceived_effort = updates.perceived_effort
  }
  if (updates.notes !== undefined) {
    payload.notes = updates.notes?.trim() || null
  }

  const { error } = await supabase
    .from('performance_test_results')
    .update(payload)
    .eq('id', resultId)

  if (error) throw error
  const full = await fetchPerformanceResult(resultId)
  if (!full) throw new Error('Result updated but could not be reloaded')
  return full
}

export async function deletePerformanceResult(
  resultId: string,
): Promise<void> {
  const { error } = await supabase
    .from('performance_test_results')
    .delete()
    .eq('id', resultId)
  if (error) throw error
}

/**
 * Rank client's latest result for a catalog test among the coach's roster.
 * Direction-aware. Honest "solo" when only one roster member has a result.
 */
export async function getRosterPerformanceRank(
  clientId: string,
  testId: string,
): Promise<RosterPerformanceRank> {
  try {
    const coachId = await resolveViewerCoachId(clientId)
    if (!coachId) return { kind: 'unavailable' }

    const { data: catalogRow } = await supabase
      .from('performance_test_catalog')
      .select('direction')
      .eq('id', testId)
      .maybeSingle()

    const direction = (catalogRow?.direction ??
      'higher_better') as PerformanceDirection

    const { data: roster, error: rosterError } = await supabase
      .from('clients')
      .select('client_id')
      .eq('coach_id', coachId)

    if (rosterError || !roster?.length) return { kind: 'unavailable' }

    const rosterIds = roster
      .map((r) => r.client_id as string | null)
      .filter((id): id is string => Boolean(id))

    if (rosterIds.length === 0) return { kind: 'unavailable' }

    const { data: tests, error: testsError } = await supabase
      .from('performance_test_results')
      .select('client_id, tested_at, result_value')
      .eq('test_id', testId)
      .in('client_id', rosterIds)
      .order('tested_at', { ascending: false })

    if (testsError) {
      console.error('Error fetching roster performance results:', testsError)
      return { kind: 'unavailable' }
    }

    const latestByClient = new Map<string, number>()
    for (const row of tests ?? []) {
      const cid = row.client_id as string
      if (latestByClient.has(cid)) continue
      const score = Number(row.result_value)
      if (!Number.isFinite(score)) continue
      latestByClient.set(cid, score)
    }

    if (!latestByClient.has(clientId)) return { kind: 'unavailable' }
    if (latestByClient.size === 1) return { kind: 'solo' }

    const sorted = Array.from(latestByClient.entries()).sort((a, b) =>
      compareScores(a[1], b[1], direction),
    )
    const rank = sorted.findIndex(([id]) => id === clientId) + 1
    if (rank < 1) return { kind: 'unavailable' }
    return { kind: 'ranked', rank, total: sorted.length }
  } catch (error) {
    console.error('Error in getRosterPerformanceRank:', error)
    return { kind: 'unavailable' }
  }
}
