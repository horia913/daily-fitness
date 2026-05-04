import { supabase } from '@/lib/supabase'

export type HabitTemplateRow = {
  id: string
  slug: string
  name: string
  description: string | null
  category: string
  source_type: string
  source_config: Record<string, unknown>
  default_target: Record<string, unknown>
  user_configurable_keys: string[]
  icon: string | null
  color: string | null
  sort_order: number
  is_active: boolean
}

export type ClientHabitWithTemplate = {
  id: string
  client_id: string
  template_id: string
  target: Record<string, unknown>
  is_active: boolean | null
  created_at: string
  template: HabitTemplateRow
}

function asTemplate(row: unknown): HabitTemplateRow | null {
  if (!row || typeof row !== 'object') return null
  const t = row as Record<string, unknown>
  if (typeof t.id !== 'string' || typeof t.slug !== 'string') return null
  return {
    id: t.id as string,
    slug: t.slug as string,
    name: t.name as string,
    description: (t.description as string | null) ?? null,
    category: t.category as string,
    source_type: t.source_type as string,
    source_config: (t.source_config as Record<string, unknown>) ?? {},
    default_target: (t.default_target as Record<string, unknown>) ?? {},
    user_configurable_keys: Array.isArray(t.user_configurable_keys)
      ? (t.user_configurable_keys as string[])
      : [],
    icon: (t.icon as string | null) ?? null,
    color: (t.color as string | null) ?? null,
    sort_order: Number(t.sort_order ?? 0),
    is_active: Boolean(t.is_active),
  }
}

/** Parse one `habits` row with embedded `habit_templates` (client or coach queries). */
export function normalizeHabitRow(raw: Record<string, unknown>): ClientHabitWithTemplate | null {
  const embedded = raw.habit_templates
  const tpl = Array.isArray(embedded) ? embedded[0] : embedded
  const template = asTemplate(tpl)
  if (!template) return null
  return {
    id: raw.id as string,
    client_id: raw.client_id as string,
    template_id: raw.template_id as string,
    target: (raw.target as Record<string, unknown>) ?? {},
    is_active: (raw.is_active as boolean | null) ?? true,
    created_at: raw.created_at as string,
    template,
  }
}

export async function fetchActiveTemplates(): Promise<HabitTemplateRow[]> {
  const { data, error } = await supabase
    .from('habit_templates')
    .select(
      'id, slug, name, description, category, source_type, source_config, default_target, user_configurable_keys, icon, color, sort_order, is_active'
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []).map((r) => asTemplate(r)).filter((r): r is HabitTemplateRow => r != null)
}

export async function fetchClientHabits(clientId: string): Promise<ClientHabitWithTemplate[]> {
  const { data, error } = await supabase
    .from('habits')
    .select(
      `
      id,
      client_id,
      template_id,
      target,
      is_active,
      created_at,
      habit_templates (
        id,
        slug,
        name,
        description,
        category,
        source_type,
        source_config,
        default_target,
        user_configurable_keys,
        icon,
        color,
        sort_order,
        is_active
      )
    `
    )
    .eq('client_id', clientId)
    .eq('is_active', true)

  if (error) throw error
  const rows = (data ?? [])
    .map((r) => normalizeHabitRow(r as Record<string, unknown>))
    .filter((r): r is ClientHabitWithTemplate => r != null)
  rows.sort((a, b) => a.template.sort_order - b.template.sort_order)
  return rows
}

export async function addHabitFromTemplate(
  clientId: string,
  templateId: string,
  target: Record<string, unknown>
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('habits').insert({
    client_id: clientId,
    template_id: templateId,
    target,
    is_active: true,
  })
  return { error: error ? new Error(error.message) : null }
}

export async function updateHabitTarget(
  habitId: string,
  target: Record<string, unknown>
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('habits').update({ target }).eq('id', habitId)
  return { error: error ? new Error(error.message) : null }
}

export async function deleteHabit(habitId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('habits').delete().eq('id', habitId)
  return { error: error ? new Error(error.message) : null }
}

export type ToggleLogResult = 'inserted' | 'deleted' | 'noop' | 'error'

export async function toggleManualLogToday(
  habitId: string,
  clientId: string,
  todayYmd: string
): Promise<{ result: ToggleLogResult; error?: Error }> {
  const { data: existing, error: selErr } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('habit_id', habitId)
    .eq('client_id', clientId)
    .eq('log_date', todayYmd)
    .maybeSingle()

  if (selErr) return { result: 'error', error: new Error(selErr.message) }

  if (existing?.id) {
    const { error: delErr } = await supabase
      .from('habit_logs')
      .delete()
      .eq('id', existing.id)
    if (delErr) return { result: 'error', error: new Error(delErr.message) }
    return { result: 'deleted' }
  }

  const { error: insErr } = await supabase.from('habit_logs').insert({
    habit_id: habitId,
    client_id: clientId,
    log_date: todayYmd,
    completed_at: new Date().toISOString(),
  })

  if (insErr) {
    if (insErr.code === '23505') return { result: 'noop' }
    return { result: 'error', error: new Error(insErr.message) }
  }
  return { result: 'inserted' }
}
