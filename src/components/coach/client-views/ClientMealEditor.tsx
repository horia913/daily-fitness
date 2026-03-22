'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  getOverridesForAssignment,
  applyOverridesToLines,
  resolveFoodNames,
  resetOverrides,
  swapFoodOverride,
  adjustPortionOverride,
  removeFoodOverride,
  addFoodOverride,
} from '@/lib/clientMealOverrideService'
import type { EffectiveFoodLine } from '@/lib/clientMealOverrideService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast-provider'
import { ChevronDown, ChevronUp, RefreshCw, Search } from 'lucide-react'

interface ClientMealEditorProps {
  assignmentId: string
  mealPlanId: string
  coachProfileId: string
  onChanged?: () => void
}

export default function ClientMealEditor({
  assignmentId,
  mealPlanId,
  coachProfileId,
  onChanged,
}: ClientMealEditorProps) {
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lines, setLines] = useState<EffectiveFoodLine[]>([])
  const [meals, setMeals] = useState<{ id: string; name: string }[]>([])
  const [foodQuery, setFoodQuery] = useState('')
  const [foodHits, setFoodHits] = useState<{ id: string; name: string }[]>([])
  const [addMealId, setAddMealId] = useState<string>('')
  const [addQty, setAddQty] = useState('100')
  const [addUnit, setAddUnit] = useState('g')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: mealRows }, overrides] = await Promise.all([
        supabase.from('meals').select('id, name').eq('meal_plan_id', mealPlanId).order('order_index'),
        getOverridesForAssignment(assignmentId),
      ])
      setMeals((mealRows || []) as { id: string; name: string }[])
      if (mealRows?.length) setAddMealId((mealRows[0] as { id: string }).id)

      const mealIds = (mealRows || []).map((m: { id: string }) => m.id)
      if (mealIds.length === 0) {
        setLines([])
        return
      }

      const { data: items, error: itemErr } = await supabase
        .from('meal_food_items')
        .select('id, meal_id, meal_option_id, food_id, quantity, unit')
        .in('meal_id', mealIds)
      if (itemErr) throw itemErr

      const foodIds = [...new Set((items || []).map((i: { food_id: string }) => i.food_id))]
      const { data: foods } = await supabase.from('foods').select('id, name').in('id', foodIds)
      const foodName = new Map((foods || []).map((f: { id: string; name: string }) => [f.id, f.name]))

      const baseLines = (items || []).map(
        (i: {
          id: string
          meal_id: string
          meal_option_id: string | null
          food_id: string
          quantity: number | string | null
          unit: string | null
        }) => ({
          meal_food_item_id: i.id,
          meal_id: i.meal_id,
          meal_option_id: i.meal_option_id,
          food_id: i.food_id,
          food_name: foodName.get(i.food_id) || 'Food',
          quantity: i.quantity,
          unit: i.unit,
        })
      )

      let effective = applyOverridesToLines(baseLines, overrides)
      const ids = [...new Set(effective.map((l) => l.food_id))]
      const names = await resolveFoodNames(ids)
      effective = effective.map((l) => ({
        ...l,
        food_name: names.get(l.food_id) || l.food_name,
      }))
      setLines(effective)
    } catch (e) {
      console.error(e)
      addToast({ title: 'Failed to load meal editor', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [assignmentId, mealPlanId, addToast])

  useEffect(() => {
    if (!open) return
    load()
  }, [open, load])

  useEffect(() => {
    if (!open || !foodQuery.trim()) {
      setFoodHits([])
      return
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('foods')
        .select('id, name')
        .ilike('name', `%${foodQuery.trim()}%`)
        .limit(20)
      setFoodHits((data as { id: string; name: string }[]) || [])
    }, 200)
    return () => clearTimeout(t)
  }, [foodQuery, open])

  const mealName = (mid: string) => meals.find((m) => m.id === mid)?.name ?? 'Meal'

  return (
    <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
      >
        <div>
          <h2 className="text-lg font-bold fc-text-primary">Customize client meals</h2>
          <p className="text-xs fc-text-dim mt-0.5">
            Swaps and portions apply only to this assignment — the master meal plan is unchanged.
          </p>
        </div>
        {open ? <ChevronUp className="w-5 h-5 fc-text-dim" /> : <ChevronDown className="w-5 h-5 fc-text-dim" />}
      </button>

      {open && (
        <div className="p-4 pt-0 border-t border-[color:var(--fc-glass-border)] space-y-4">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="fc-btn fc-btn-secondary gap-1" disabled={loading} onClick={() => load()}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="fc-btn fc-btn-secondary"
              disabled={loading}
              onClick={async () => {
                if (!confirm('Remove all customizations for this assignment?')) return
                const ok = await resetOverrides(assignmentId)
                if (!ok) {
                  addToast({ title: 'Reset failed', variant: 'destructive' })
                  return
                }
                addToast({ title: 'Reset to plan defaults', variant: 'default' })
                await load()
                onChanged?.()
              }}
            >
              Reset to plan defaults
            </Button>
          </div>

          {loading ? (
            <p className="text-sm fc-text-dim py-4 text-center">Loading…</p>
          ) : (
            <ul className="space-y-3">
              {lines.map((line) => (
                <li
                  key={line.key}
                  className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-3 text-sm"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <span className="font-medium fc-text-primary">{line.food_name}</span>
                      <span className="fc-text-dim ml-2">
                        {line.quantity ?? '—'} {line.unit ?? ''}
                      </span>
                      <div className="text-xs fc-text-dim mt-1">{mealName(line.meal_id)}</div>
                      {line.isAddedByOverride && <span className="fc-pill fc-pill-glass fc-text-info text-[10px] mt-1 inline-block">Added</span>}
                      {line.overrideIds.length > 0 && !line.isAddedByOverride && (
                        <span className="fc-pill fc-pill-glass fc-text-warning text-[10px] mt-1 inline-block ml-1">Modified</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {line.meal_food_item_id && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={async () => {
                              const mfi = line.meal_food_item_id
                              if (!mfi) return
                              const id = prompt('Paste replacement food UUID from Foods DB, or use search below and copy id')
                              if (!id?.trim()) return
                              const res = await swapFoodOverride(
                                assignmentId,
                                line.meal_id,
                                mfi,
                                id.trim(),
                                line.meal_option_id,
                                coachProfileId
                              )
                              if (!res.ok) {
                                addToast({ title: res.error || 'Swap failed', variant: 'destructive' })
                                return
                              }
                              addToast({ title: 'Food swapped', variant: 'default' })
                              await load()
                              onChanged?.()
                            }}
                          >
                            Swap (id)
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={async () => {
                              const mfi = line.meal_food_item_id
                              if (!mfi) return
                              const q = prompt('New quantity', String(line.quantity ?? ''))
                              if (q == null || q === '') return
                              const n = Number(q)
                              if (!Number.isFinite(n)) {
                                addToast({ title: 'Invalid quantity', variant: 'destructive' })
                                return
                              }
                              const res = await adjustPortionOverride(
                                assignmentId,
                                line.meal_id,
                                mfi,
                                n,
                                line.unit,
                                line.meal_option_id,
                                coachProfileId
                              )
                              if (!res.ok) {
                                addToast({ title: res.error || 'Update failed', variant: 'destructive' })
                                return
                              }
                              addToast({ title: 'Portion updated', variant: 'default' })
                              await load()
                              onChanged?.()
                            }}
                          >
                            Adjust
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 fc-text-error"
                            onClick={async () => {
                              const mfi = line.meal_food_item_id
                              if (!mfi) return
                              if (!confirm('Hide this food for the client?')) return
                              const res = await removeFoodOverride(
                                assignmentId,
                                line.meal_id,
                                mfi,
                                line.meal_option_id,
                                coachProfileId
                              )
                              if (!res.ok) {
                                addToast({ title: res.error || 'Remove failed', variant: 'destructive' })
                                return
                              }
                              addToast({ title: 'Removed for client', variant: 'default' })
                              await load()
                              onChanged?.()
                            }}
                          >
                            Remove
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-4 space-y-3">
            <h4 className="text-sm font-semibold fc-text-primary">Food search (copy ID for swap)</h4>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 fc-text-dim" />
              <Input className="pl-9" value={foodQuery} onChange={(e) => setFoodQuery(e.target.value)} placeholder="Search foods…" />
            </div>
            <ul className="max-h-40 overflow-y-auto space-y-1 text-xs">
              {foodHits.map((f) => (
                <li key={f.id} className="flex justify-between gap-2 fc-text-dim">
                  <span className="fc-text-primary truncate">{f.name}</span>
                  <code className="shrink-0 select-all">{f.id.slice(0, 8)}…</code>
                </li>
              ))}
            </ul>
          </div>

          <div className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-4 space-y-2">
            <h4 className="text-sm font-semibold fc-text-primary">Add food to a meal</h4>
            <select
              value={addMealId}
              onChange={(e) => setAddMealId(e.target.value)}
              className="w-full text-sm fc-glass rounded-lg px-3 py-2 border border-[color:var(--fc-glass-border)] fc-text-primary bg-transparent"
            >
              {meals.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input placeholder="Food UUID" className="flex-1 text-xs" id="add-food-id" />
              <Input value={addQty} onChange={(e) => setAddQty(e.target.value)} className="w-20" />
              <Input value={addUnit} onChange={(e) => setAddUnit(e.target.value)} className="w-16" />
            </div>
            <Button
              type="button"
              size="sm"
              className="fc-btn fc-btn-primary"
              onClick={async () => {
                const el = document.getElementById('add-food-id') as HTMLInputElement | null
                const fid = el?.value?.trim()
                if (!fid || !addMealId) return
                const n = Number(addQty)
                if (!Number.isFinite(n)) {
                  addToast({ title: 'Invalid quantity', variant: 'destructive' })
                  return
                }
                const res = await addFoodOverride(assignmentId, addMealId, fid, n, addUnit || 'g', null, coachProfileId)
                if (!res.ok) {
                  addToast({ title: res.error || 'Add failed', variant: 'destructive' })
                  return
                }
                addToast({ title: 'Food added for client', variant: 'default' })
                if (el) el.value = ''
                await load()
                onChanged?.()
              }}
            >
              Add food
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
