'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Search } from 'lucide-react'

export interface ExerciseSwapModalProps {
  open: boolean
  onClose: () => void
  baseExerciseId: string | null
  onSelect: (replacementExerciseId: string) => void
}

export default function ExerciseSwapModal({
  open,
  onClose,
  baseExerciseId,
  onSelect,
}: ExerciseSwapModalProps) {
  const [muscleGroupId, setMuscleGroupId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([])

  const loadBase = useCallback(async () => {
    if (!baseExerciseId) {
      setMuscleGroupId(null)
      return
    }
    const { data } = await supabase
      .from('exercises')
      .select('primary_muscle_group_id')
      .eq('id', baseExerciseId)
      .maybeSingle()
    setMuscleGroupId((data as { primary_muscle_group_id?: string | null } | null)?.primary_muscle_group_id ?? null)
  }, [baseExerciseId])

  const search = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase.from('exercises').select('id, name').limit(40)
      if (muscleGroupId) {
        q = q.eq('primary_muscle_group_id', muscleGroupId)
      }
      if (query.trim()) {
        q = q.ilike('name', `%${query.trim()}%`)
      }
      const { data, error } = await q.order('name', { ascending: true })
      if (error) {
        console.error(error)
        setExercises([])
        return
      }
      setExercises((data as { id: string; name: string }[]) || [])
    } finally {
      setLoading(false)
    }
  }, [muscleGroupId, query])

  useEffect(() => {
    if (!open) return
    loadBase()
  }, [open, loadBase])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      search()
    }, 200)
    return () => clearTimeout(t)
  }, [open, search, muscleGroupId])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[color:var(--fc-glass-border)]">
          <h2 className="text-lg font-bold fc-text-primary">Swap exercise</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-black/10" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          <p className="text-xs fc-text-dim">
            {muscleGroupId
              ? 'Showing exercises in the same primary muscle group. Search to narrow down.'
              : 'Search the exercise library. Same muscle filter unavailable for this exercise.'}
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 fc-text-dim" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="pl-10"
            />
          </div>
          {loading ? (
            <p className="text-sm fc-text-dim text-center py-4">Loading…</p>
          ) : (
            <ul className="space-y-1">
              {exercises.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    disabled={ex.id === baseExerciseId}
                    onClick={() => {
                      onSelect(ex.id)
                      onClose()
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-domain-workouts)] text-sm fc-text-primary disabled:opacity-40"
                  >
                    {ex.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!loading && exercises.length === 0 && (
            <p className="text-sm fc-text-dim text-center py-4">No exercises found.</p>
          )}
        </div>
        <div className="p-4 border-t border-[color:var(--fc-glass-border)]">
          <Button variant="outline" className="w-full fc-btn fc-btn-secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
