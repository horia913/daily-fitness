'use client'

import { useQuery } from '@tanstack/react-query'
import {
  COACH_PROGRAMS_LIST_QUERY_KEY,
  fetchCoachProgramsList,
} from '@/lib/coachProgramsList'
import styles from './ProgramTemplatePicker.module.css'

/** Slim view of a list row — picker only reads these fields. */
export type CoachProgramListItem = {
  id: string
  name: string
  totalWeeks?: number
  is_active?: boolean
  difficulty_level?: string
  assignedPreview?: {
    count: number
    initials: string[]
  }
}

export type ProgramTemplatePickerProps = {
  onSelect: (programId: string) => void
  selectedProgramId?: string | null
  className?: string
}

export function ProgramTemplatePicker({
  onSelect,
  selectedProgramId = null,
  className,
}: ProgramTemplatePickerProps) {
  const query = useQuery({
    queryKey: COACH_PROGRAMS_LIST_QUERY_KEY,
    queryFn: ({ signal }) => fetchCoachProgramsList(signal),
  })

  // Shared cache holds filter=all; picker only shows active programs.
  const programs = (query.data?.programs ?? []).filter((p) => p.is_active !== false)

  return (
    <div className={`${styles.root}${className ? ` ${className}` : ''}`}>
      <h2 className={styles.heading}>Programs</h2>

      {query.isLoading ? (
        <div className={styles.list} role="status" aria-label="Loading programs">
          <div className={styles.skeleton} aria-hidden />
          <div className={styles.skeleton} aria-hidden />
          <div className={styles.skeleton} aria-hidden />
        </div>
      ) : query.isError ? (
        <p className={styles.empty} role="alert">
          Couldn&apos;t load programs.
        </p>
      ) : programs.length === 0 ? (
        <p className={styles.empty}>No active programs yet.</p>
      ) : (
        <ul className={styles.list} role="listbox" aria-label="Program templates">
          {programs.map((p) => {
            const assigned = p.assignedPreview?.count ?? 0
            const weeks = p.totalWeeks ?? 0
            const selected = selectedProgramId === p.id
            const meta = [
              weeks > 0 ? `${weeks} wk` : null,
              assigned > 0 ? `${assigned} assigned` : null,
            ]
              .filter(Boolean)
              .join(' · ')

            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`${styles.row}${selected ? ` ${styles.rowSelected}` : ''}`}
                  onClick={() => onSelect(p.id)}
                >
                  <span className={styles.name}>{p.name || 'Untitled program'}</span>
                  {meta ? <span className={styles.meta}>{meta}</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
