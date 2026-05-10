'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Dumbbell,
  MoreVertical,
  Eye,
  Pencil,
  Shuffle,
  Copy,
  Trash2,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatCategoryLabel,
  visualExerciseCategory,
  type ExerciseVisualLane,
} from './exerciseCategoryVisual'
import styles from './coachExerciseLibraryV1.module.css'

export type LibraryExercise = {
  id: string
  name: string
  description: string
  category: string
  muscle_groups: string[]
  equipment: string[]
  equipment_types?: string[]
  difficulty: string
  instructions: string[]
  tips: string[]
  video_url?: string
  image_url?: string
  is_public: boolean
  created_at: string
  updated_at: string
  usage_count?: number
  rating?: number
}

function laneClass(lane: ExerciseVisualLane): string {
  switch (lane) {
    case 'hypertrophy':
      return styles.laneHypertrophy
    case 'athletic':
      return styles.laneAthletic
    case 'mobility':
      return styles.laneMobility
    case 'conditioning':
      return styles.laneConditioning
    default:
      return styles.laneStrength
  }
}

function pillClass(lane: ExerciseVisualLane): string {
  switch (lane) {
    case 'hypertrophy':
      return styles.pillHypertrophy
    case 'athletic':
      return styles.pillAthletic
    case 'mobility':
      return styles.pillMobility
    case 'conditioning':
      return styles.pillConditioning
    default:
      return styles.pillStrength
  }
}

function categoryIcon(lane: ExerciseVisualLane) {
  switch (lane) {
    case 'conditioning':
      return Activity
    default:
      return Dumbbell
  }
}

export function ExerciseThumb({ exercise }: { exercise: LibraryExercise }) {
  const lane = visualExerciseCategory(exercise.category)
  const Icon = categoryIcon(lane)
  return (
    <div className={cn(styles.thumb, laneClass(lane))}>
      {exercise.image_url ? (
        <img src={exercise.image_url} alt="" />
      ) : (
        <Icon size={18} strokeWidth={2} />
      )}
    </div>
  )
}

export function CategoryPill({ category }: { category: string }) {
  const lane = visualExerciseCategory(category)
  return <span className={cn(styles.catPill, pillClass(lane))}>{formatCategoryLabel(category)}</span>
}

export function EquipmentGlyph({ name }: { name: string }) {
  const n = name.toLowerCase()
  if (n.includes('body') || n.includes('no equip'))
    return (
      <span className={styles.equGlyph} aria-hidden>
        ○
      </span>
    )
  if (n.includes('kettle'))
    return (
      <span className={styles.equGlyph} aria-hidden>
        ◎
      </span>
    )
  return <Dumbbell size={9} strokeWidth={2} className={styles.equGlyph} aria-hidden />
}

export function EquipmentLine({ exercise }: { exercise: LibraryExercise }) {
  const list =
    exercise.equipment?.length > 0
      ? exercise.equipment
      : (exercise.equipment_types as string[] | undefined) || []
  if (!list.length) {
    return (
      <span className={styles.equChip}>
        <EquipmentGlyph name="bodyweight" />
        No equipment
      </span>
    )
  }
  const first = list[0]
  const more = list.length - 1
  return (
    <span className={styles.equChip}>
      <EquipmentGlyph name={first} />
      {first}
      {more > 0 ? ` +${more} more` : ''}
    </span>
  )
}

function difficultyNumeric(d: string): number {
  const v = (d || '').toLowerCase()
  if (v === 'beginner') return 1
  if (v === 'intermediate') return 3
  if (v === 'advanced') return 4
  if (v === 'athlete' || v === 'elite') return 5
  const n = Number.parseInt(v, 10)
  if (!Number.isNaN(n) && n >= 1 && n <= 5) return n
  return 2
}

export function DifficultyBar({ difficulty }: { difficulty: string }) {
  const filled = difficultyNumeric(difficulty)
  return (
    <div className={styles.diffBar} title={difficulty}>
      {[1, 2, 3, 4, 5].map((i) => {
        const on = i <= filled
        let segClass = styles.diffSegOff
        if (on) {
          if (filled <= 3) segClass = styles.diffSegCyan
          else if (filled === 4) segClass = styles.diffSegWarn
          else segClass = styles.diffSegCrit
        }
        return <span key={i} className={segClass} />
      })}
    </div>
  )
}

export function ExerciseRowMenu({
  exercise,
  onView,
  onEdit,
  onSwaps,
  onDuplicate,
  onDelete,
}: {
  exercise: LibraryExercise
  onView: () => void
  onEdit: () => void
  onSwaps: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className={styles.rowWrap} ref={ref}>
      <button
        type="button"
        className={styles.menuBtn}
        aria-label="More actions"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
      >
        <MoreVertical size={16} strokeWidth={2} />
      </button>
      {open ? (
        <div className={styles.menuPop} role="menu">
          <button type="button" className={styles.menuItem} role="menuitem" onClick={() => { setOpen(false); onView() }}>
            <Eye size={14} /> View details
          </button>
          <button type="button" className={styles.menuItem} role="menuitem" onClick={() => { setOpen(false); onEdit() }}>
            <Pencil size={14} /> Edit
          </button>
          <button type="button" className={styles.menuItem} role="menuitem" onClick={() => { setOpen(false); onSwaps() }}>
            <Shuffle size={14} /> Manage swaps
          </button>
          <button type="button" className={styles.menuItem} role="menuitem" onClick={() => { setOpen(false); onDuplicate() }}>
            <Copy size={14} /> Duplicate
          </button>
          <div className={styles.menuDivider} />
          <button
            type="button"
            className={cn(styles.menuItem, styles.menuItemDanger)}
            role="menuitem"
            onClick={() => { setOpen(false); onDelete() }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      ) : null}
    </div>
  )
}
