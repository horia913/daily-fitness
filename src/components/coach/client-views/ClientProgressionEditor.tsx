'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ProgramProgressionService from '@/lib/programProgressionService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast-provider'
import { ChevronDown, ChevronUp, RefreshCw, Save } from 'lucide-react'
import ExerciseSwapModal from './ExerciseSwapModal'

type ClientRuleRow = {
  id: string
  week_number: number
  block_id: string | null
  exercise_id: string | null
  exercise_order: number | null
  sets: number | null
  reps: string | null
  rest_seconds: number | null
  tempo: string | null
  rir: number | null
  weight_kg: number | string | null
  load_percentage: number | string | null
  override_exercise_id: string | null
  block_type: string | null
}

function masterKey(r: { block_id?: string | null; exercise_order?: number | null; exercise_id?: string | null }) {
  return `${r.block_id ?? ''}:${r.exercise_order ?? 0}:${r.exercise_id ?? ''}`
}

export interface ClientProgressionEditorProps {
  programAssignmentId: string
  programId: string
  clientId: string
  durationWeeks: number
  defaultWeek?: number
  /** When true, panel starts expanded (e.g. opened from Training tab). */
  initialOpen?: boolean
}

export default function ClientProgressionEditor({
  programAssignmentId,
  programId,
  clientId,
  durationWeeks,
  defaultWeek = 1,
  initialOpen = false,
}: ClientProgressionEditorProps) {
  const { addToast } = useToast()
  const [open, setOpen] = useState(initialOpen)
  const [week, setWeek] = useState(defaultWeek)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clientRows, setClientRows] = useState<ClientRuleRow[]>([])
  const [masterByKey, setMasterByKey] = useState<Record<string, Record<string, unknown>>>({})
  const [draft, setDraft] = useState<Record<string, Partial<ClientRuleRow>>>({})
  const [swapRuleId, setSwapRuleId] = useState<string | null>(null)
  const [nameById, setNameById] = useState<Record<string, string>>({})
  const [fallbackBanner, setFallbackBanner] = useState<string | null>(null)

  const weekOptions = useMemo(
    () => Array.from({ length: Math.max(1, durationWeeks) }, (_, i) => i + 1),
    [durationWeeks]
  )

  useEffect(() => {
    if (defaultWeek >= 1 && defaultWeek <= durationWeeks) {
      setWeek(defaultWeek)
    }
  }, [defaultWeek, durationWeeks])

  const load = useCallback(async () => {
    setLoading(true)
    setFallbackBanner(null)
    try {
      const [{ data: clientData, error: cErr }, masterRes] = await Promise.all([
        supabase
          .from('client_program_progression_rules')
          .select('*')
          .eq('program_assignment_id', programAssignmentId)
          .eq('week_number', week)
          .order('block_order', { ascending: true })
          .order('exercise_order', { ascending: true }),
        ProgramProgressionService.getProgressionRules(programId, week),
      ])
      if (cErr) throw cErr
      let rows = (clientData || []) as ClientRuleRow[]

      // Fallback 1: auto-populate from week 1 client rules when the target week is empty
      if (rows.length === 0 && week > 1) {
        const { data: week1Data } = await supabase
          .from('client_program_progression_rules')
          .select('*')
          .eq('program_assignment_id', programAssignmentId)
          .eq('week_number', 1)
          .order('block_order', { ascending: true })
          .order('exercise_order', { ascending: true })

        if (week1Data && week1Data.length > 0) {
          const newRows = week1Data.map((r: any) => {
            const { id, created_at, updated_at, ...rest } = r
            return { ...rest, week_number: week }
          })
          const { error: insertErr } = await supabase
            .from('client_program_progression_rules')
            .insert(newRows)

          if (!insertErr) {
            setFallbackBanner(`Showing Week 1 rules as a starting point. Adjust values and save to customize Week ${week} for this client.`)
            const { data: freshData } = await supabase
              .from('client_program_progression_rules')
              .select('*')
              .eq('program_assignment_id', programAssignmentId)
              .eq('week_number', week)
              .order('block_order', { ascending: true })
              .order('exercise_order', { ascending: true })
            rows = (freshData || []) as ClientRuleRow[]
          }
        }
      }

      // Fallback 2: build progression rows from workout template exercises
      if (rows.length === 0) {
        const { data: scheduleSlots } = await supabase
          .from('program_schedule')
          .select('template_id')
          .eq('program_id', programId)
          .eq('week_number', week)

        const templateIds = [...new Set((scheduleSlots ?? []).map((s: any) => s.template_id).filter(Boolean))]

        if (templateIds.length > 0) {
          const { data: blocks } = await supabase
            .from('workout_set_entries')
            .select('id, template_id, set_type, set_name, total_sets, reps_per_set, rest_seconds, set_order')
            .in('template_id', templateIds)
            .order('set_order', { ascending: true })

          const blockIds = (blocks ?? []).map((b: any) => b.id)
          if (blockIds.length > 0) {
            const { data: exercises } = await supabase
              .from('workout_set_entry_exercises')
              .select('set_entry_id, exercise_id, exercise_order, sets, reps, weight_kg, rest_seconds, rir, exercise_letter')
              .in('set_entry_id', blockIds)
              .order('exercise_order', { ascending: true })

            if (exercises && exercises.length > 0) {
              const blockMap = new Map((blocks ?? []).map((b: any) => [b.id, b]))
              const insertRows = exercises
                .filter((ex: any) => ex.exercise_id)
                .map((ex: any, idx: number) => {
                  const block = blockMap.get(ex.set_entry_id)
                  return {
                    client_id: clientId,
                    program_assignment_id: programAssignmentId,
                    week_number: week,
                    block_id: ex.set_entry_id,
                    block_type: block?.set_type ?? 'straight_set',
                    block_order: block?.set_order ?? 0,
                    block_name: block?.set_name ?? null,
                    exercise_id: ex.exercise_id,
                    exercise_order: ex.exercise_order ?? idx,
                    exercise_letter: ex.exercise_letter ?? null,
                    sets: ex.sets ?? block?.total_sets ?? null,
                    reps: ex.reps != null ? String(ex.reps) : (block?.reps_per_set != null ? String(block.reps_per_set) : null),
                    rest_seconds: ex.rest_seconds ?? block?.rest_seconds ?? null,
                    rir: ex.rir ?? null,
                    weight_kg: ex.weight_kg ?? null,
                  }
                })

              if (insertRows.length > 0) {
                const { error: tplInsertErr } = await supabase
                  .from('client_program_progression_rules')
                  .insert(insertRows)

                if (!tplInsertErr) {
                  setFallbackBanner(`No progression rules authored yet. Showing template defaults — edit and save to customize Week ${week} for this client.`)
                  const { data: freshData } = await supabase
                    .from('client_program_progression_rules')
                    .select('*')
                    .eq('program_assignment_id', programAssignmentId)
                    .eq('week_number', week)
                    .order('block_order', { ascending: true })
                    .order('exercise_order', { ascending: true })
                  rows = (freshData || []) as ClientRuleRow[]
                } else {
                  console.error('[ClientProgressionEditor] Template fallback insert failed:', tplInsertErr)
                }
              }
            }
          }
        }
      }

      setClientRows(rows)
      setDraft({})
      const map: Record<string, Record<string, unknown>> = {}
      for (const r of masterRes.rules || []) {
        const k = masterKey(r as { block_id?: string | null; exercise_order?: number | null; exercise_id?: string | null })
        map[k] = r as unknown as Record<string, unknown>
      }
      setMasterByKey(map)

      const ids = new Set<string>()
      rows.forEach((r) => {
        if (r.exercise_id) ids.add(r.exercise_id)
        if (r.override_exercise_id) ids.add(r.override_exercise_id)
      })
      if (ids.size > 0) {
        const { data: ex } = await supabase.from('exercises').select('id, name').in('id', [...ids])
        const nm: Record<string, string> = {}
        ;(ex || []).forEach((e: { id: string; name: string }) => {
          nm[e.id] = e.name
        })
        setNameById(nm)
      } else {
        setNameById({})
      }
    } catch (e) {
      console.error(e)
      addToast({ title: 'Failed to load progression rules', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [programAssignmentId, programId, week, addToast])

  useEffect(() => {
    if (!open) return
    load()
  }, [open, load])

  const visibleRows = useMemo(
    () => clientRows.filter((r) => r.exercise_id && r.block_type !== 'rest'),
    [clientRows]
  )

  const isModified = (row: ClientRuleRow, field: keyof ClientRuleRow) => {
    const k = masterKey(row)
    const m = masterByKey[k]
    if (!m) return false
    const cur = draft[row.id]?.[field] !== undefined ? draft[row.id][field] : row[field]
    const mv = m[field as string]
    if (field === 'reps') return String(cur ?? '') !== String(mv ?? '')
    return cur !== mv && !(cur == null && mv == null)
  }

  const buildPatch = (row: ClientRuleRow, d: Partial<ClientRuleRow>): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    const num = (v: unknown) => {
      if (v === '' || v === undefined || v === null) return null
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }
    if (d.sets !== undefined) out.sets = num(d.sets)
    if (d.reps !== undefined) out.reps = d.reps === '' ? null : String(d.reps)
    if (d.rest_seconds !== undefined) out.rest_seconds = num(d.rest_seconds)
    if (d.rir !== undefined) out.rir = num(d.rir)
    if (d.weight_kg !== undefined) out.weight_kg = num(d.weight_kg)
    if (d.load_percentage !== undefined) out.load_percentage = num(d.load_percentage)
    if (d.tempo !== undefined) out.tempo = d.tempo === '' ? null : String(d.tempo)
    return out
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const row of visibleRows) {
        const d = draft[row.id]
        if (!d || Object.keys(d).length === 0) continue
        const patch = buildPatch(row, d)
        if (Object.keys(patch).length === 0) continue
        const res = await ProgramProgressionService.updateClientProgramProgressionRule(row.id, patch)
        if (!res.ok) {
          addToast({ title: res.error || 'Save failed', variant: 'destructive' })
          return
        }
      }
      addToast({ title: 'Progression saved', variant: 'default' })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleResetWeek = async () => {
    if (!confirm(`Reset week ${week} to program defaults for this client?`)) return
    const res = await ProgramProgressionService.resetClientProgramProgressionRules(
      programId,
      programAssignmentId,
      clientId,
      week
    )
    if (!res.ok) {
      addToast({ title: res.error || 'Reset failed', variant: 'destructive' })
      return
    }
    addToast({ title: 'Week reset to program defaults', variant: 'default' })
    await load()
  }

  const handleResetAll = async () => {
    if (!confirm('Reset ALL weeks to program defaults? Custom edits will be lost.')) return
    const res = await ProgramProgressionService.resetClientProgramProgressionRules(
      programId,
      programAssignmentId,
      clientId
    )
    if (!res.ok) {
      addToast({ title: res.error || 'Reset failed', variant: 'destructive' })
      return
    }
    addToast({ title: 'All weeks reset', variant: 'default' })
    await load()
  }

  const val = (row: ClientRuleRow, field: keyof ClientRuleRow): string | number | null => {
    const v = draft[row.id]?.[field]
    if (v !== undefined) return v as string | number | null
    return row[field] as string | number | null
  }

  const setVal = (rowId: string, field: keyof ClientRuleRow, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], [field]: value },
    }))
  }

  const swapTargetId = swapRuleId
    ? clientRows.find((r) => r.id === swapRuleId)?.exercise_id ?? null
    : null

  return (
    <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
      >
        <div>
          <h2 className="text-lg font-bold fc-text-primary">Customize progression</h2>
          <p className="text-xs fc-text-dim mt-0.5">
            Edit this client&apos;s sets, reps, load, and rest without changing the master program.
          </p>
        </div>
        {open ? <ChevronUp className="w-5 h-5 fc-text-dim" /> : <ChevronDown className="w-5 h-5 fc-text-dim" />}
      </button>

      {open && (
        <div className="p-4 pt-0 border-t border-[color:var(--fc-glass-border)] space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm fc-text-dim">Week</label>
            <select
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="text-sm fc-glass rounded-lg px-3 py-2 border border-[color:var(--fc-glass-border)] fc-text-primary bg-transparent"
            >
              {weekOptions.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="fc-btn fc-btn-secondary gap-1"
              disabled={loading}
              onClick={() => load()}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {fallbackBanner && (
            <div className="rounded-lg border-l-[3px] border-l-amber-500 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              {fallbackBanner}
            </div>
          )}

          {loading ? (
            <p className="text-sm fc-text-dim py-6 text-center">Loading…</p>
          ) : visibleRows.length === 0 ? (
            <p className="text-sm fc-text-dim py-4">
              No progression rows for this week (or only rest blocks). Ensure the program has progression rules authored for at least week 1.
            </p>
          ) : (
            <div className="space-y-4">
              {visibleRows.map((row) => {
                const displayName =
                  (row.override_exercise_id && nameById[row.override_exercise_id]) ||
                  (row.exercise_id && nameById[row.exercise_id]) ||
                  'Exercise'
                const swapped = Boolean(row.override_exercise_id || draft[row.id]?.override_exercise_id)
                return (
                  <div
                    key={row.id}
                    className="fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold fc-text-primary">{displayName}</p>
                        <p className="text-xs fc-text-dim">
                          {row.block_type || 'block'} · order {row.exercise_order ?? '—'}
                          {swapped && (
                            <span className="ml-2 fc-pill fc-pill-glass fc-text-info">Swapped</span>
                          )}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="fc-btn fc-btn-secondary text-xs"
                        onClick={() => setSwapRuleId(row.id)}
                      >
                        Swap exercise
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {(
                        [
                          ['sets', 'Sets'],
                          ['reps', 'Reps'],
                          ['weight_kg', 'Weight (kg)'],
                          ['rest_seconds', 'Rest (s)'],
                          ['rir', 'RIR'],
                          ['tempo', 'Tempo'],
                        ] as const
                      ).map(([field, label]) => (
                        <div key={field}>
                          <label className="text-[10px] uppercase tracking-wide fc-text-dim block mb-1">
                            {label}
                            {isModified(row, field) && (
                              <span className="ml-1 fc-text-warning font-semibold">· Modified</span>
                            )}
                          </label>
                          <Input
                            value={val(row, field) ?? ''}
                            onChange={(e) => setVal(row.id, field, e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              className="fc-btn fc-btn-primary gap-2"
              disabled={saving || loading || visibleRows.length === 0}
              onClick={handleSave}
            >
              <Save className="w-4 h-4" />
              Save changes
            </Button>
            <Button
              type="button"
              variant="outline"
              className="fc-btn fc-btn-secondary"
              disabled={loading}
              onClick={handleResetWeek}
            >
              Reset week to defaults
            </Button>
            <Button
              type="button"
              variant="outline"
              className="fc-btn fc-btn-secondary"
              disabled={loading}
              onClick={handleResetAll}
            >
              Reset all weeks
            </Button>
          </div>
        </div>
      )}

      <ExerciseSwapModal
        open={swapRuleId != null}
        onClose={() => setSwapRuleId(null)}
        baseExerciseId={swapTargetId ?? null}
        onSelect={async (replacementId) => {
          if (!swapRuleId) return
          const res = await ProgramProgressionService.updateClientProgramProgressionRule(swapRuleId, {
            override_exercise_id: replacementId,
          })
          if (!res.ok) {
            addToast({ title: res.error || 'Swap failed', variant: 'destructive' })
            return
          }
          addToast({ title: 'Exercise swapped for this client', variant: 'default' })
          setSwapRuleId(null)
          await load()
        }}
      />
    </div>
  )
}
