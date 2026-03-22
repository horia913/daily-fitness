/**
 * Per-assignment meal overrides (client_meal_overrides).
 * Does not modify master meal_plans / meals / meal_food_items.
 */

import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

export type MealOverrideType = 'swap_food' | 'adjust_portion' | 'add_food' | 'remove_food'

export interface ClientMealOverrideRow {
  id: string
  assignment_id: string
  meal_id: string
  override_type: MealOverrideType
  original_food_item_id: string | null
  replacement_food_id: string | null
  original_quantity: number | null
  new_quantity: number | null
  unit: string | null
  meal_option_id: string | null
  notes: string | null
  created_at: string
  created_by: string | null
}

export interface EffectiveFoodLine {
  key: string
  meal_id: string
  meal_option_id: string | null
  meal_food_item_id: string | null
  food_id: string
  food_name: string
  quantity: number | string | null
  unit: string | null
  isAddedByOverride: boolean
  overrideIds: string[]
}

const db = () => supabase

export async function getOverridesForAssignment(
  assignmentId: string,
  client?: SupabaseClient
): Promise<ClientMealOverrideRow[]> {
  const s = client ?? db()
  const { data, error } = await s
    .from('client_meal_overrides')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('[clientMealOverrideService] getOverridesForAssignment', error)
    return []
  }
  return (data || []) as ClientMealOverrideRow[]
}

export async function resetOverrides(assignmentId: string, client?: SupabaseClient): Promise<boolean> {
  const s = client ?? db()
  const { error } = await s.from('client_meal_overrides').delete().eq('assignment_id', assignmentId)
  if (error) {
    console.error('[clientMealOverrideService] resetOverrides', error)
    return false
  }
  return true
}

async function insertOverride(
  row: Omit<ClientMealOverrideRow, 'id' | 'created_at' | 'created_by'> & { created_by?: string | null },
  client?: SupabaseClient
): Promise<{ ok: boolean; error?: string }> {
  const s = client ?? db()
  const { error } = await s.from('client_meal_overrides').insert({
    assignment_id: row.assignment_id,
    meal_id: row.meal_id,
    override_type: row.override_type,
    original_food_item_id: row.original_food_item_id,
    replacement_food_id: row.replacement_food_id,
    original_quantity: row.original_quantity,
    new_quantity: row.new_quantity,
    unit: row.unit,
    meal_option_id: row.meal_option_id,
    notes: row.notes,
    created_by: row.created_by ?? null,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function swapFoodOverride(
  assignmentId: string,
  mealId: string,
  originalFoodItemId: string,
  replacementFoodId: string,
  mealOptionId?: string | null,
  coachProfileId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  return insertOverride(
    {
      assignment_id: assignmentId,
      meal_id: mealId,
      override_type: 'swap_food',
      original_food_item_id: originalFoodItemId,
      replacement_food_id: replacementFoodId,
      original_quantity: null,
      new_quantity: null,
      unit: null,
      meal_option_id: mealOptionId ?? null,
      notes: null,
      created_by: coachProfileId ?? null,
    },
    undefined
  )
}

export async function adjustPortionOverride(
  assignmentId: string,
  mealId: string,
  originalFoodItemId: string,
  newQuantity: number,
  unit: string | null,
  mealOptionId?: string | null,
  coachProfileId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  return insertOverride(
    {
      assignment_id: assignmentId,
      meal_id: mealId,
      override_type: 'adjust_portion',
      original_food_item_id: originalFoodItemId,
      replacement_food_id: null,
      original_quantity: null,
      new_quantity: newQuantity,
      unit,
      meal_option_id: mealOptionId ?? null,
      notes: null,
      created_by: coachProfileId ?? null,
    },
    undefined
  )
}

export async function removeFoodOverride(
  assignmentId: string,
  mealId: string,
  originalFoodItemId: string,
  mealOptionId?: string | null,
  coachProfileId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  return insertOverride(
    {
      assignment_id: assignmentId,
      meal_id: mealId,
      override_type: 'remove_food',
      original_food_item_id: originalFoodItemId,
      replacement_food_id: null,
      original_quantity: null,
      new_quantity: null,
      unit: null,
      meal_option_id: mealOptionId ?? null,
      notes: null,
      created_by: coachProfileId ?? null,
    },
    undefined
  )
}

export async function addFoodOverride(
  assignmentId: string,
  mealId: string,
  replacementFoodId: string,
  newQuantity: number,
  unit: string,
  mealOptionId?: string | null,
  coachProfileId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  return insertOverride(
    {
      assignment_id: assignmentId,
      meal_id: mealId,
      override_type: 'add_food',
      original_food_item_id: null,
      replacement_food_id: replacementFoodId,
      original_quantity: null,
      new_quantity: newQuantity,
      unit,
      meal_option_id: mealOptionId ?? null,
      notes: null,
      created_by: coachProfileId ?? null,
    },
    undefined
  )
}

/** Base lines from meal_food_items + food names; then apply overrides in order. */
export function applyOverridesToLines(
  baseLines: {
    meal_food_item_id: string
    meal_id: string
    meal_option_id: string | null
    food_id: string
    food_name: string
    quantity: number | string | null
    unit: string | null
  }[],
  overrides: ClientMealOverrideRow[]
): EffectiveFoodLine[] {
  const lines: EffectiveFoodLine[] = baseLines.map((b) => ({
    key: b.meal_food_item_id,
    meal_id: b.meal_id,
    meal_option_id: b.meal_option_id,
    meal_food_item_id: b.meal_food_item_id,
    food_id: b.food_id,
    food_name: b.food_name,
    quantity: b.quantity,
    unit: b.unit,
    isAddedByOverride: false,
    overrideIds: [],
  }))

  const removed = new Set<string>()

  for (const o of overrides) {
    if (o.override_type === 'remove_food' && o.original_food_item_id) {
      removed.add(o.original_food_item_id)
      const line = lines.find((l) => l.meal_food_item_id === o.original_food_item_id)
      if (line) line.overrideIds.push(o.id)
    }
  }

  const active = lines.filter((l) => l.meal_food_item_id && !removed.has(l.meal_food_item_id))

  for (const o of overrides) {
    if (o.override_type === 'swap_food' && o.original_food_item_id && o.replacement_food_id) {
      const line = active.find((l) => l.meal_food_item_id === o.original_food_item_id)
      if (line) {
        line.food_id = o.replacement_food_id
        line.food_name = `(swapped) #${o.replacement_food_id.slice(0, 8)}…`
        line.overrideIds.push(o.id)
      }
    }
    if (o.override_type === 'adjust_portion' && o.original_food_item_id && o.new_quantity != null) {
      const line = active.find((l) => l.meal_food_item_id === o.original_food_item_id)
      if (line) {
        line.quantity = o.new_quantity
        if (o.unit) line.unit = o.unit
        line.overrideIds.push(o.id)
      }
    }
    if (
      o.override_type === 'add_food' &&
      o.replacement_food_id &&
      o.new_quantity != null &&
      o.unit
    ) {
      active.push({
        key: `add-${o.id}`,
        meal_id: o.meal_id,
        meal_option_id: o.meal_option_id,
        meal_food_item_id: null,
        food_id: o.replacement_food_id,
        food_name: `(added) #${o.replacement_food_id.slice(0, 8)}…`,
        quantity: o.new_quantity,
        unit: o.unit,
        isAddedByOverride: true,
        overrideIds: [o.id],
      })
    }
  }

  return active
}

/** Resolve food names after applyOverrides (batch fetch). */
export async function resolveFoodNames(foodIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(foodIds.filter(Boolean))]
  const map = new Map<string, string>()
  if (unique.length === 0) return map
  const { data } = await supabase.from('foods').select('id, name').in('id', unique)
  ;(data || []).forEach((f: { id: string; name: string }) => map.set(f.id, f.name))
  return map
}
