'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { listLibraryWorkouts } from '@/lib/programs/stationDayWorkout'

export interface LibraryWorkoutPickerProps {
  open: boolean
  coachId: string
  onOpenChange: (open: boolean) => void
  onSelect: (libraryWorkoutId: string) => void | Promise<void>
  busy?: boolean
}

export function LibraryWorkoutPicker({
  open,
  coachId,
  onOpenChange,
  onSelect,
  busy = false,
}: LibraryWorkoutPickerProps) {
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<
    Array<{ id: string; name: string; description?: string; exercise_count?: number }>
  >([])

  const load = useCallback(async () => {
    if (!coachId) return
    setLoading(true)
    try {
      const list = await listLibraryWorkouts(supabase, coachId)
      setItems(list)
    } catch (e) {
      console.error('[LibraryWorkoutPicker] load failed', e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [coachId])

  useEffect(() => {
    if (open) {
      void load()
      setQuery('')
    }
  }, [open, load])

  const filtered = items.filter((item) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      item.name.toLowerCase().includes(q) ||
      (item.description?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="library-workout-picker">
        <DialogHeader>
          <DialogTitle>Insert from library</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pe-t4)] pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search library workouts…"
            className="pl-9"
            disabled={busy}
          />
        </div>
        <div className="max-h-[280px] overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-sm text-[var(--pe-t3)] py-6 text-center">Loading library…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[var(--pe-t3)] py-6 text-center">
              {items.length === 0
                ? 'No library workouts yet. Save a program day to the library first.'
                : 'No matches for your search.'}
            </p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={busy}
                data-testid={`library-pick-${item.id}`}
                onClick={() => void onSelect(item.id)}
                className="w-full text-left rounded-lg border border-[var(--pe-line)] px-3 py-2.5 hover:border-[var(--fc-accent)] hover:bg-[rgba(34, 211, 238, 0.06)] transition-colors disabled:opacity-50"
              >
                <span className="block text-sm font-semibold text-[var(--pe-t1)]">{item.name}</span>
                <span className="block text-[11px] text-[var(--pe-t3)] mt-0.5">
                  {(item.exercise_count ?? 0) > 0
                    ? `${item.exercise_count} exercises`
                    : 'Empty workout'}
                  {item.description ? ` · ${item.description}` : ''}
                </span>
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <button
            type="button"
            className="text-sm text-[var(--pe-t2)] hover:text-[var(--pe-t1)]"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
