import { supabase } from '@/lib/supabase/client'

export type MobilityMeasureType = 'degrees' | 'cm' | 'grade' | 'passfail'
export type MobilityTestKind = 'rom' | 'strength'
export type MobilitySide = 'left' | 'right' | 'bilateral'

export interface MobilityTestCatalogItem {
  id: string
  joint: string
  movement: string
  display_name: string
  test_kind: MobilityTestKind
  measure_type: MobilityMeasureType
  bilateral: boolean
  norm_min: number | null
  norm_max: number | null
  sort_order: number
  is_active: boolean
}

export interface MobilityAssessmentItemRow {
  id: string
  assessment_id: string
  test_id: string
  side: MobilitySide
  value: number
  notes: string | null
  created_at?: string
}

export interface MobilityAssessmentItemInput {
  test_id: string
  side: MobilitySide
  value: number
  notes?: string | null
}

export interface MobilityAssessorProfile {
  id: string
  first_name: string | null
  last_name: string | null
}

export interface MobilityAssessment {
  id: string
  client_id: string
  assessed_at: string
  assessed_by: string
  notes: string | null
  created_at?: string
  items: MobilityAssessmentItemRow[]
  assessor: MobilityAssessorProfile | null
}

export interface MobilityJointGroup {
  joint: string
  items: MobilityTestCatalogItem[]
}

const CATALOG_SELECT =
  'id, joint, movement, display_name, test_kind, measure_type, bilateral, norm_min, norm_max, sort_order, is_active'

export function formatJointLabel(joint: string): string {
  if (!joint) return ''
  return joint.charAt(0).toUpperCase() + joint.slice(1)
}

export function measureUnit(type: MobilityMeasureType): string | null {
  if (type === 'degrees') return '°'
  if (type === 'cm') return 'cm'
  return null
}

export function formatMeasureValue(
  type: MobilityMeasureType,
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const n = Number(value)
  if (type === 'passfail') return n >= 1 ? 'Pass' : 'Fail'
  if (type === 'grade') return String(n)
  if (type === 'degrees') return `${n}°`
  if (type === 'cm') return `${n} cm`
  return String(n)
}

/**
 * Asymmetry is the useful signal. Flag when L/R differ meaningfully:
 * degrees ≥5° or ≥10% of the larger side; cm ≥1; grade ≥1.
 */
export function isMeaningfullyAsymmetric(
  measureType: MobilityMeasureType,
  left: number | null | undefined,
  right: number | null | undefined,
): boolean {
  if (left == null || right == null) return false
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false
  const diff = Math.abs(left - right)
  if (measureType === 'grade' || measureType === 'passfail') return diff >= 1
  if (measureType === 'cm') return diff >= 1
  const max = Math.max(Math.abs(left), Math.abs(right))
  return diff >= 5 || (max > 0 && diff / max >= 0.1)
}

export function groupCatalogByJoint(
  tests: MobilityTestCatalogItem[],
): MobilityJointGroup[] {
  const map = new Map<string, MobilityTestCatalogItem[]>()
  for (const t of tests) {
    const list = map.get(t.joint) ?? []
    list.push(t)
    map.set(t.joint, list)
  }
  return [...map.entries()]
    .map(([joint, items]) => ({
      joint,
      items: [...items].sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort(
      (a, b) => (a.items[0]?.sort_order ?? 0) - (b.items[0]?.sort_order ?? 0),
    )
}

function assessorName(p: MobilityAssessorProfile | null): string {
  if (!p) return 'your coach'
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
  return name || 'your coach'
}

export function formatAssessorAttribution(
  assessment: Pick<MobilityAssessment, 'assessed_at' | 'assessor'>,
  opts?: { preferGenericCoach?: boolean },
): string {
  const date = new Date(assessment.assessed_at)
  const dateLabel = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      })
  const who = opts?.preferGenericCoach
    ? 'your coach'
    : assessorName(assessment.assessor)
  return dateLabel
    ? `Assessed by ${who} · ${dateLabel}`
    : `Assessed by ${who}`
}

async function attachAssessors(
  rows: Array<{
    id: string
    client_id: string
    assessed_at: string
    assessed_by: string
    notes: string | null
    created_at?: string
  }>,
  itemsByAssessment: Map<string, MobilityAssessmentItemRow[]>,
): Promise<MobilityAssessment[]> {
  const assessorIds = [...new Set(rows.map((r) => r.assessed_by).filter(Boolean))]
  const assessorMap = new Map<string, MobilityAssessorProfile>()
  if (assessorIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', assessorIds)
    for (const p of data ?? []) {
      assessorMap.set(p.id, p as MobilityAssessorProfile)
    }
  }
  return rows.map((r) => ({
    ...r,
    items: itemsByAssessment.get(r.id) ?? [],
    assessor: assessorMap.get(r.assessed_by) ?? null,
  }))
}

export async function fetchActiveMobilityCatalog(): Promise<
  MobilityTestCatalogItem[]
> {
  const { data, error } = await supabase
    .from('mobility_test_catalog')
    .select(CATALOG_SELECT)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as MobilityTestCatalogItem[]
}

export async function fetchClientMobilityAssessments(
  clientId: string,
): Promise<MobilityAssessment[]> {
  const { data: assessments, error } = await supabase
    .from('mobility_assessments')
    .select('id, client_id, assessed_at, assessed_by, notes, created_at')
    .eq('client_id', clientId)
    .order('assessed_at', { ascending: false })

  if (error) throw error
  const rows = assessments ?? []
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)
  const { data: items, error: itemsError } = await supabase
    .from('mobility_assessment_items')
    .select('id, assessment_id, test_id, side, value, notes, created_at')
    .in('assessment_id', ids)

  if (itemsError) throw itemsError

  const itemsByAssessment = new Map<string, MobilityAssessmentItemRow[]>()
  for (const item of (items ?? []) as MobilityAssessmentItemRow[]) {
    const list = itemsByAssessment.get(item.assessment_id) ?? []
    list.push(item)
    itemsByAssessment.set(item.assessment_id, list)
  }

  return attachAssessors(rows, itemsByAssessment)
}

export async function fetchMobilityAssessment(
  assessmentId: string,
): Promise<MobilityAssessment | null> {
  const { data, error } = await supabase
    .from('mobility_assessments')
    .select('id, client_id, assessed_at, assessed_by, notes, created_at')
    .eq('id', assessmentId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const { data: items, error: itemsError } = await supabase
    .from('mobility_assessment_items')
    .select('id, assessment_id, test_id, side, value, notes, created_at')
    .eq('assessment_id', assessmentId)

  if (itemsError) throw itemsError

  const itemsByAssessment = new Map<string, MobilityAssessmentItemRow[]>()
  itemsByAssessment.set(
    assessmentId,
    (items ?? []) as MobilityAssessmentItemRow[],
  )
  const [full] = await attachAssessors([data], itemsByAssessment)
  return full ?? null
}

export async function createMobilityAssessment(params: {
  clientId: string
  assessedBy: string
  assessedAt?: string
  notes?: string | null
  items: MobilityAssessmentItemInput[]
}): Promise<MobilityAssessment> {
  const { data: assessment, error } = await supabase
    .from('mobility_assessments')
    .insert({
      client_id: params.clientId,
      assessed_by: params.assessedBy,
      assessed_at: params.assessedAt ?? new Date().toISOString(),
      notes: params.notes?.trim() || null,
    })
    .select('id, client_id, assessed_at, assessed_by, notes, created_at')
    .single()

  if (error) throw error

  if (params.items.length > 0) {
    const { error: itemsError } = await supabase
      .from('mobility_assessment_items')
      .insert(
        params.items.map((item) => ({
          assessment_id: assessment.id,
          test_id: item.test_id,
          side: item.side,
          value: item.value,
          notes: item.notes?.trim() || null,
        })),
      )
    if (itemsError) {
      await supabase.from('mobility_assessments').delete().eq('id', assessment.id)
      throw itemsError
    }
  }

  const full = await fetchMobilityAssessment(assessment.id)
  if (!full) throw new Error('Assessment created but could not be reloaded')
  try {
    const { emitInAppNotification } = await import('@/lib/inAppNotificationEvents')
    void emitInAppNotification({
      event: 'client_test_recorded',
      clientId: params.clientId,
      testKind: 'mobility',
      testId: assessment.id,
    })
  } catch {
    /* non-blocking */
  }
  return full
}

export async function updateMobilityAssessment(params: {
  assessmentId: string
  assessedAt?: string
  notes?: string | null
  items: MobilityAssessmentItemInput[]
}): Promise<MobilityAssessment> {
  const { error } = await supabase
    .from('mobility_assessments')
    .update({
      ...(params.assessedAt ? { assessed_at: params.assessedAt } : {}),
      notes: params.notes?.trim() || null,
    })
    .eq('id', params.assessmentId)

  if (error) throw error

  const { error: deleteError } = await supabase
    .from('mobility_assessment_items')
    .delete()
    .eq('assessment_id', params.assessmentId)

  if (deleteError) throw deleteError

  if (params.items.length > 0) {
    const { error: itemsError } = await supabase
      .from('mobility_assessment_items')
      .insert(
        params.items.map((item) => ({
          assessment_id: params.assessmentId,
          test_id: item.test_id,
          side: item.side,
          value: item.value,
          notes: item.notes?.trim() || null,
        })),
      )
    if (itemsError) throw itemsError
  }

  const full = await fetchMobilityAssessment(params.assessmentId)
  if (!full) throw new Error('Assessment updated but could not be reloaded')
  return full
}

export async function deleteMobilityAssessment(
  assessmentId: string,
): Promise<void> {
  const { error } = await supabase
    .from('mobility_assessments')
    .delete()
    .eq('id', assessmentId)
  if (error) throw error
}
