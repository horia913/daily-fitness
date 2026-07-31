'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Dumbbell,
  RefreshCw,
  Play,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronDown,
  ArrowDownUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast-provider'
import ExerciseForm from '@/components/ExerciseForm'
import CoachExerciseAlternativesModal from '@/components/coach/CoachExerciseAlternativesModal'
import VideoPlayerModal from '@/components/VideoPlayerModal'
import { fetchApi } from '@/lib/apiClient'
import { cn } from '@/lib/utils'
import { AnalyticsHero } from '@/components/coach-analytics/AnalyticsHero'
import hub from '@/components/coach-analytics/coachAnalyticsHub.module.css'
import styles from '@/components/coach-exercises/coachExerciseLibraryV1.module.css'
import {
  type LibraryExercise,
  ExerciseThumb,
  CategoryPill,
  EquipmentLine,
  DifficultyBar,
  ExerciseRowMenu,
} from '@/components/coach-exercises/exerciseLibraryParts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ExerciseCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

interface OptimizedExerciseLibraryProps {
  coachId?: string
}

function normalizeExercise(row: Record<string, unknown>): LibraryExercise {
  const eqRaw = row.equipment_types ?? row.equipment
  const equipment = Array.isArray(eqRaw) ? (eqRaw as unknown[]).map(String) : []
  const mgRaw = row.muscle_groups
  const muscle_groups = Array.isArray(mgRaw) ? (mgRaw as unknown[]).map(String) : []
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    category: String(row.category ?? ''),
    muscle_groups,
    equipment,
    equipment_types: equipment,
    difficulty: String(row.difficulty ?? 'intermediate'),
    instructions: Array.isArray(row.instructions) ? (row.instructions as string[]) : [],
    tips: Array.isArray(row.tips) ? (row.tips as string[]) : [],
    video_url: row.video_url ? String(row.video_url) : undefined,
    image_url: row.image_url ? String(row.image_url) : undefined,
    is_public: Boolean(row.is_public),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    usage_count: typeof row.usage_count === 'number' ? row.usage_count : undefined,
    rating: typeof row.rating === 'number' ? row.rating : undefined,
  }
}

const EQUIPMENT_FILTER_CHOICES = [
  'Bodyweight',
  'Dumbbells',
  'Barbell',
  'Kettlebell',
  'Resistance Bands',
  'Cable Machine',
  'Smith Machine',
  'Bench',
  'Pull-up Bar',
  'Medicine Ball',
  'Stability Ball',
  'Foam Roller',
  'Yoga Mat',
  'Treadmill',
  'Bike',
  'Rowing Machine',
  'Elliptical',
  'Jump Rope',
]

const DIFFICULTY_CHOICES = ['beginner', 'intermediate', 'advanced', 'athlete'] as const

function equipmentList(ex: LibraryExercise): string[] {
  if (ex.equipment?.length) return ex.equipment
  return (ex.equipment_types as string[] | undefined) || []
}

function matchesEquipmentFilter(ex: LibraryExercise, selected: string): boolean {
  if (selected === 'all') return true
  const list = equipmentList(ex)
  return list.some((e) => e.toLowerCase() === selected.toLowerCase())
}

export default function OptimizedExerciseLibrary({}: OptimizedExerciseLibraryProps) {
  const { addToast } = useToast()

  const [exercises, setExercises] = useState<LibraryExercise[]>([])
  const [categories, setCategories] = useState<ExerciseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [usedLast7d, setUsedLast7d] = useState(0)
  const loadingRef = useRef(false)
  const didLoadRef = useRef(false)
  const [searchTerm, setSearchTerm] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [showKbdHint, setShowKbdHint] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [selectedEquipment, setSelectedEquipment] = useState('all')
  const [sortBy, setSortBy] = useState<'created' | 'name' | 'usage'>('created')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches ? 'grid' : 'list'
  )
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingExercise, setEditingExercise] = useState<LibraryExercise | null>(null)
  const [alternativesModalExercise, setAlternativesModalExercise] = useState<LibraryExercise | null>(null)
  const [videoPlayerExercise, setVideoPlayerExercise] = useState<LibraryExercise | null>(null)
  const [detailExercise, setDetailExercise] = useState<LibraryExercise | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    const apply = () => setShowKbdHint(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (didLoadRef.current) return
    if (loadingRef.current) return
    didLoadRef.current = true
    loadingRef.current = true
    try {
      setLoading(true)
      setLoadError(null)
      const res = await fetchApi('/api/coach/exercises', { signal: signal ?? null })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      const json = await res.json()
      const exList = json.exercises
      const catList = json.categories
      const meta = json.meta ?? {}
      setExercises(
        Array.isArray(exList) ? exList.map((r: Record<string, unknown>) => normalizeExercise(r)) : []
      )
      setCategories(Array.isArray(catList) ? catList : [])
      setUsedLast7d(typeof meta.used_last_7d === 'number' ? meta.used_last_7d : 0)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        didLoadRef.current = false
        return
      }
      console.error('Error loading exercises:', err)
      didLoadRef.current = false
      setExercises([])
      setCategories([])
      setUsedLast7d(0)
      setLoadError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    loadData(ac.signal)
    return () => {
      didLoadRef.current = false
      loadingRef.current = false
      ac.abort()
    }
  }, [loadData])

  const retryLoad = useCallback(() => {
    didLoadRef.current = false
    loadData()
  }, [loadData])

  const filteredAndSortedExercises = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    const filtered = exercises.filter((exercise) => {
      const matchesSearch =
        !q ||
        exercise.name.toLowerCase().includes(q) ||
        (exercise.description || '').toLowerCase().includes(q) ||
        (exercise.muscle_groups || []).some((g) => g.toLowerCase().includes(q)) ||
        equipmentList(exercise).some((eq) => eq.toLowerCase().includes(q))
      const matchesCategory = selectedCategory === 'all' || exercise.category === selectedCategory
      const matchesDifficulty =
        selectedDifficulty === 'all' || exercise.difficulty?.toLowerCase() === selectedDifficulty
      const matchesEquipment = matchesEquipmentFilter(exercise, selectedEquipment)
      return matchesSearch && matchesCategory && matchesDifficulty && matchesEquipment
    })

    return filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          return comparison
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          return -comparison
        case 'usage':
          comparison = (a.usage_count || 0) - (b.usage_count || 0)
          return -comparison
        default:
          return 0
      }
    })
  }, [exercises, searchTerm, selectedCategory, selectedDifficulty, selectedEquipment, sortBy])

  const cycleSort = () => {
    setSortBy((prev) => {
      if (prev === 'created') return 'name'
      if (prev === 'name') return 'usage'
      return 'created'
    })
  }

  const sortLabel = sortBy === 'created' ? 'Date' : sortBy === 'name' ? 'Name' : 'Usage'

  const deleteExercise = async (exerciseId: string) => {
    if (!confirm('Are you sure you want to delete this exercise?')) return

    try {
      const { error } = await supabase.from('exercises').delete().eq('id', exerciseId)

      if (error) {
        console.error('Error deleting exercise:', error)
        if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
          addToast({
            title:
              'Cannot delete this exercise because it is currently being used in workout templates. Please remove it from all workouts first, or deactivate it instead.',
            variant: 'destructive',
          })
          return
        }
        addToast({ title: 'Failed to delete exercise. Please try again.', variant: 'destructive' })
        return
      }

      setExercises((prev) => prev.filter((exercise) => exercise.id !== exerciseId))
    } catch (error) {
      console.error('Error deleting exercise:', error)
      addToast({ title: 'An error occurred while deleting the exercise. Please try again.', variant: 'destructive' })
    }
  }

  const duplicateExercise = async (src: LibraryExercise) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        addToast({ title: 'You must be signed in to duplicate an exercise.', variant: 'destructive' })
        return
      }
      const instructions = (src.instructions || []).filter((s) => s.trim() !== '')
      const tips = (src.tips || []).filter((s) => s.trim() !== '')
      const equipment_types = equipmentList(src)
      let name = `${src.name} (copy)`
      const payload = {
        name,
        description: src.description?.trim() || null,
        category: src.category || null,
        coach_id: user.id,
        instructions,
        tips,
        equipment_types: equipment_types.length > 0 ? equipment_types : [],
        video_url: src.video_url?.trim() || null,
        image_url: src.image_url?.trim() || null,
      }

      let { error } = await supabase.from('exercises').insert(payload).select('id').single()
      if (error?.code === '23505' || error?.message?.includes('unique')) {
        name = `${src.name} (copy ${Date.now()})`
        const retry = await supabase.from('exercises').insert({ ...payload, name }).select('id').single()
        error = retry.error
      }
      if (error) {
        console.error('Duplicate exercise error:', error)
        addToast({ title: 'Could not duplicate exercise.', variant: 'destructive' })
        return
      }
      didLoadRef.current = false
      await loadData()
      addToast({ title: 'Exercise duplicated.', variant: 'default' })
    } catch (e) {
      console.error(e)
      addToast({ title: 'Could not duplicate exercise.', variant: 'destructive' })
    }
  }

  const publicCount = exercises.filter((e) => e.is_public).length
  const rated = exercises.filter((e) => typeof e.rating === 'number' && e.rating! > 0)
  const avgRating =
    rated.length >= 3 ? (rated.reduce((s, e) => s + (e.rating || 0), 0) / rated.length).toFixed(1) : null

  const closeDetails = () => setDetailExercise(null)

  const openEdit = (ex: LibraryExercise) => {
    setEditingExercise(ex)
    setShowCreateForm(true)
  }

  const heroStats = [
    { num: exercises.length, label: 'Exercises', color: 'var(--fc-accent)' },
    {
      num: publicCount,
      label: 'Public',
      color: publicCount === 0 ? 'var(--t4)' : 'var(--t1)',
    },
    {
      num: usedLast7d,
      label: 'Used 7d',
      color: usedLast7d === 0 ? 'var(--t4)' : 'var(--t1)',
    },
    {
      num: avgRating ?? '—',
      label: 'Avg rating',
      color: avgRating == null ? 'var(--t4)' : 'var(--t1)',
    },
  ]

  const chipCls = (active: boolean) => cn(styles.chip, active && styles.chipActive)

  const renderFilterDropdown = (
    summary: React.ReactNode,
    active: boolean,
    badge: string | number | null,
    children: React.ReactNode
  ) => (
    <details className={styles.chipDetails}>
      <summary className={chipCls(active)}>
        {summary}
        {badge != null ? <span className={styles.chipBadge}>{badge}</span> : null}
        <ChevronDown size={11} strokeWidth={2} aria-hidden />
      </summary>
      <div className={styles.chipPanel} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </details>
  )

  const emptyLibrary = !loading && !loadError && exercises.length === 0
  const emptySearch =
    !loading &&
    !loadError &&
    exercises.length > 0 &&
    filteredAndSortedExercises.length === 0 &&
    (searchTerm.trim() !== '' ||
      selectedCategory !== 'all' ||
      selectedDifficulty !== 'all' ||
      selectedEquipment !== 'all')

  return (
    <div className={cn(styles.root, styles.stack)}>
      <AnalyticsHero
        accent="cyan"
        eyebrow="Exercise library"
        title="Library"
        subtitle="Browse, search and manage your training catalog"
        controls={
          <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
            <Link href="/coach/training" className={hub.btnOutline}>
              <ChevronLeft size={12} strokeWidth={2} aria-hidden />
              Training
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={styles.fabDesktop} onClick={() => setShowCreateForm(true)}>
                <Plus size={16} strokeWidth={2} aria-hidden />
                New exercise
              </button>
              <button
                type="button"
                className={hub.btnOutline}
                onClick={() => {
                  didLoadRef.current = false
                  loadData()
                }}
              >
                <RefreshCw size={12} strokeWidth={2} aria-hidden />
                Refresh
              </button>
            </div>
          </div>
        }
        stats={heroStats}
      />

      {loadError ? (
        <button type="button" className={styles.errorBanner} onClick={retryLoad}>
          Couldn&apos;t load exercises · Tap to retry
          <span className="mt-1 block text-[11px] opacity-70">{loadError}</span>
        </button>
      ) : null}

      {!loadError && (
        <>
          <div className={styles.toolbarSearch}>
            <Search size={13} className={styles.searchIcon} aria-hidden />
            <input
              ref={searchInputRef}
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search exercises by name, muscle, or equipment..."
              aria-label="Search exercises"
            />
            {showKbdHint ? <span className={styles.kbdHint}>⌘K</span> : null}
          </div>

          <div className={styles.chipRow}>
            {renderFilterDropdown(
              <>All categories</>,
              selectedCategory !== 'all',
              categories.length || 0,
              <>
                <button
                  type="button"
                  className={cn(styles.chipPanelItem, selectedCategory === 'all' && styles.chipPanelItemActive)}
                  onClick={(e) => {
                    setSelectedCategory('all')
                    ;(e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open')
                  }}
                >
                  All categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={cn(
                      styles.chipPanelItem,
                      selectedCategory === c.name && styles.chipPanelItemActive
                    )}
                    onClick={(ev) => {
                      setSelectedCategory(c.name)
                      ;(ev.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open')
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </>
            )}

            {renderFilterDropdown(
              <>All levels</>,
              selectedDifficulty !== 'all',
              null,
              <>
                <button
                  type="button"
                  className={cn(styles.chipPanelItem, selectedDifficulty === 'all' && styles.chipPanelItemActive)}
                  onClick={(e) => {
                    setSelectedDifficulty('all')
                    ;(e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open')
                  }}
                >
                  All levels
                </button>
                {DIFFICULTY_CHOICES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={cn(
                      styles.chipPanelItem,
                      selectedDifficulty === d && styles.chipPanelItemActive
                    )}
                    onClick={(ev) => {
                      setSelectedDifficulty(d)
                      ;(ev.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open')
                    }}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </>
            )}

            {renderFilterDropdown(
              <>Equipment</>,
              selectedEquipment !== 'all',
              null,
              <>
                <button
                  type="button"
                  className={cn(styles.chipPanelItem, selectedEquipment === 'all' && styles.chipPanelItemActive)}
                  onClick={(e) => {
                    setSelectedEquipment('all')
                    ;(e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open')
                  }}
                >
                  All equipment
                </button>
                {EQUIPMENT_FILTER_CHOICES.map((eq) => (
                  <button
                    key={eq}
                    type="button"
                    className={cn(
                      styles.chipPanelItem,
                      selectedEquipment === eq && styles.chipPanelItemActive
                    )}
                    onClick={(ev) => {
                      setSelectedEquipment(eq)
                      ;(ev.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open')
                    }}
                  >
                    {eq}
                  </button>
                ))}
              </>
            )}

            <button type="button" className={styles.chip} onClick={cycleSort}>
              <ArrowDownUp size={11} strokeWidth={2} aria-hidden />
              Sort: {sortLabel}
            </button>
          </div>

          <div className={styles.resultsBar}>
            <div className={styles.resultsCount}>
              <strong>{filteredAndSortedExercises.length}</strong> exercises
            </div>
            <div className={styles.viewToggle} role="group" aria-label="View mode">
              <button
                type="button"
                className={cn(styles.viewBtn, viewMode === 'list' && styles.viewBtnActive)}
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                aria-label="List view"
              >
                <List size={14} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={cn(styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive)}
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                aria-label="Grid view"
              >
                <Grid3X3 size={14} strokeWidth={2} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.stack}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={styles.skelRow} />
              ))}
            </div>
          ) : emptyLibrary ? (
            <div className={styles.emptyDash}>
              <Dumbbell size={40} strokeWidth={1.5} className="mx-auto mb-3 opacity-40" aria-hidden />
              <p className="mb-4 text-sm" style={{ color: 'var(--t2)' }}>
                Your library is empty · Add your first exercise
              </p>
              <button type="button" className={styles.fabDesktop} onClick={() => setShowCreateForm(true)}>
                <Plus size={16} strokeWidth={2} aria-hidden />
                Create exercise
              </button>
            </div>
          ) : emptySearch ? (
            <div className={styles.emptyMini}>
              <Search size={22} className="mx-auto mb-2 opacity-50" aria-hidden />
              <p className="mb-3" style={{ color: 'var(--t2)' }}>
                {searchTerm.trim()
                  ? `No exercises match "${searchTerm.trim()}"`
                  : 'No exercises match your filters'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('all')
                  setSelectedDifficulty('all')
                  setSelectedEquipment('all')
                }}
              >
                Clear search
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className={styles.grid2}>
              {filteredAndSortedExercises.map((exercise) => (
                <div key={exercise.id} className={styles.gridCard}>
                  <div className={styles.gridThumb}>
                    <ExerciseThumb exercise={exercise} />
                  </div>
                  <div className={styles.gridName}>{exercise.name}</div>
                  <div className={styles.gridFoot}>
                    <CategoryPill category={exercise.category} />
                    <ExerciseRowMenu
                      exercise={exercise}
                      onView={() => setDetailExercise(exercise)}
                      onEdit={() => openEdit(exercise)}
                      onSwaps={() => setAlternativesModalExercise(exercise)}
                      onDuplicate={() => duplicateExercise(exercise)}
                      onDelete={() => deleteExercise(exercise.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.listCol}>
              {filteredAndSortedExercises.map((exercise) => (
                <div key={exercise.id} className={cn(styles.rowWrap, styles.row)}>
                  <button
                    type="button"
                    className={styles.rowMain}
                    onClick={() => setDetailExercise(exercise)}
                  >
                    <ExerciseThumb exercise={exercise} />
                    <div className={styles.meta}>
                      <div className={styles.name}>{exercise.name}</div>
                      <div className={styles.tagRow}>
                        <CategoryPill category={exercise.category} />
                        <EquipmentLine exercise={exercise} />
                      </div>
                      <DifficultyBar difficulty={exercise.difficulty} />
                    </div>
                  </button>
                  <ExerciseRowMenu
                    exercise={exercise}
                    onView={() => setDetailExercise(exercise)}
                    onEdit={() => openEdit(exercise)}
                    onSwaps={() => setAlternativesModalExercise(exercise)}
                    onDuplicate={() => duplicateExercise(exercise)}
                    onDelete={() => deleteExercise(exercise.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <button type="button" className={styles.fab} onClick={() => setShowCreateForm(true)}>
        <Plus size={18} strokeWidth={2} aria-hidden />
        New exercise
      </button>

      <ExerciseForm
        isOpen={showCreateForm}
        layout={editingExercise ? 'default' : 'coachCreate'}
        onClose={() => {
          setShowCreateForm(false)
          setEditingExercise(null)
        }}
        onSuccess={() => {
          didLoadRef.current = false
          loadData()
          setShowCreateForm(false)
          setEditingExercise(null)
        }}
        exercise={editingExercise}
      />

      {alternativesModalExercise && (
        <CoachExerciseAlternativesModal
          isOpen={!!alternativesModalExercise}
          onClose={() => setAlternativesModalExercise(null)}
          exercise={alternativesModalExercise}
          allExercises={exercises}
        />
      )}

      {videoPlayerExercise && (
        <VideoPlayerModal
          isOpen={!!videoPlayerExercise}
          onClose={() => setVideoPlayerExercise(null)}
          videoUrl={videoPlayerExercise.video_url || ''}
          title={videoPlayerExercise.name}
        />
      )}

      <Dialog open={!!detailExercise} onOpenChange={(o) => !o && closeDetails()}>
        <DialogContent className="max-w-md border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-elevated)]">
          <div className={styles.root}>
            <DialogHeader>
              <DialogTitle className="fc-text-primary pr-8">{detailExercise?.name}</DialogTitle>
            </DialogHeader>
            {detailExercise ? (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryPill category={detailExercise.category} />
                  <DifficultyBar difficulty={detailExercise.difficulty} />
                </div>
                {detailExercise.description ? (
                  <p className="text-[color:var(--fc-text-dim)]">{detailExercise.description}</p>
                ) : null}
                <div className="text-[color:var(--fc-text-dim)]">
                  <span className="font-medium text-[color:var(--fc-text-primary)]">Equipment: </span>
                  {equipmentList(detailExercise).join(', ') || 'No equipment'}
                </div>
                {detailExercise.instructions?.length ? (
                  <ol className="list-decimal space-y-1 pl-4 text-[color:var(--fc-text-dim)]">
                    {detailExercise.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-2">
                  {detailExercise.video_url ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => setVideoPlayerExercise(detailExercise)}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Watch video
                    </Button>
                  ) : null}
                  <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(detailExercise)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAlternativesModalExercise(detailExercise)}
                  >
                    Manage swaps
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
