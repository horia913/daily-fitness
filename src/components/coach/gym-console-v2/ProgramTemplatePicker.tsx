'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '@/lib/apiClient'
import styles from './ProgramTemplatePicker.module.css'

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

type ProgramsApiResponse = {
  programs?: CoachProgramListItem[]
  assignmentCountByProgram?: Record<string, number>
  error?: string
}

export type ProgramTemplatePickerProps = {
  onSelect: (programId: string) => void
  selectedProgramId?: string | null
  className?: string
}

async function fetchCoachPrograms(): Promise<CoachProgramListItem[]> {
  const res = await fetchApi('/api/coach/programs?filter=active')
  const body = (await res.json()) as ProgramsApiResponse
  if (!res.ok) {
    throw new Error(body.error ?? 'Failed to load programs')
  }
  return Array.isArray(body.programs) ? body.programs : []
}

export function ProgramTemplatePicker({
  onSelect,
  selectedProgramId = null,
  className,
}: ProgramTemplatePickerProps) {
  const query = useQuery({
    queryKey: ['coach-programs-list'],
    queryFn: fetchCoachPrograms,
  })

  const programs = query.data ?? []

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
