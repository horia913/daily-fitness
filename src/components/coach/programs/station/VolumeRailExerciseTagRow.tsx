'use client'

import React, { useState } from 'react'
import {
  EXERCISE_CATEGORY_OPTIONS,
  saveExerciseVolumeTags,
  type StationExcludedExercise,
} from '@/lib/programs/stationWeekVolume'
import css from './ProgramVolumeRail.module.css'

export type MuscleOption = { id: string; name: string }

type VolumeRailExerciseTagRowProps = {
  exercise: StationExcludedExercise
  coachId: string
  muscleOptions: MuscleOption[]
  onSaved: () => void
}

export function VolumeRailExerciseTagRow({
  exercise,
  coachId,
  muscleOptions,
  onSaved,
}: VolumeRailExerciseTagRowProps) {
  const canEdit = Boolean(exercise.coachId && exercise.coachId === coachId)
  const [open, setOpen] = useState(false)
  const [primaryId, setPrimaryId] = useState(exercise.primaryMuscleGroupId ?? '')
  const [sec1, setSec1] = useState(exercise.secondaryMuscleGroup1Id ?? '')
  const [sec2, setSec2] = useState(exercise.secondaryMuscleGroup2Id ?? '')
  const [category, setCategory] = useState(
    exercise.category &&
      EXERCISE_CATEGORY_OPTIONS.includes(
        exercise.category as (typeof EXERCISE_CATEGORY_OPTIONS)[number],
      )
      ? exercise.category
      : 'Uncategorized',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSave = async () => {
    if (!canEdit || !primaryId) return
    setSaving(true)
    setError(null)
    const result = await saveExerciseVolumeTags(exercise.id, coachId, {
      primaryMuscleGroupId: primaryId,
      secondaryMuscleGroup1Id: sec1 || null,
      secondaryMuscleGroup2Id: sec2 || null,
      category,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setOpen(false)
    onSaved()
  }

  return (
    <div className={css.exRow} data-testid={`volume-tag-row-${exercise.id}`}>
      <div className={css.exRowHead}>
        <div className={css.exMeta}>
          <span className={css.exName}>{exercise.name}</span>
          <span className={css.exSets}>
            {exercise.sets} set{exercise.sets === 1 ? '' : 's'}
            {exercise.category ? ` · ${exercise.category}` : ''}
          </span>
        </div>
        {canEdit ? (
          <button
            type="button"
            className={css.exTagBtn}
            onClick={() => setOpen((v) => !v)}
            data-testid={`volume-tag-toggle-${exercise.id}`}
          >
            {open ? 'Close' : 'Tag'}
          </button>
        ) : (
          <span className={css.exLocked} title="Only the owning coach can edit this exercise">
            Shared — can’t edit
          </span>
        )}
      </div>

      {open && canEdit ? (
        <div className={css.exEditor} data-testid={`volume-tag-editor-${exercise.id}`}>
          <label className={css.exField}>
            <span>Primary muscle *</span>
            <select
              value={primaryId}
              onChange={(e) => setPrimaryId(e.target.value)}
              data-testid={`volume-tag-primary-${exercise.id}`}
            >
              <option value="">Select…</option>
              {muscleOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className={css.exField}>
            <span>Secondary 1</span>
            <select value={sec1} onChange={(e) => setSec1(e.target.value)}>
              <option value="">None</option>
              {muscleOptions
                .filter((m) => m.id !== primaryId && m.id !== sec2)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </label>
          <label className={css.exField}>
            <span>Secondary 2</span>
            <select value={sec2} onChange={(e) => setSec2(e.target.value)}>
              <option value="">None</option>
              {muscleOptions
                .filter((m) => m.id !== primaryId && m.id !== sec1)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </label>
          <label className={css.exField}>
            <span>Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              data-testid={`volume-tag-category-${exercise.id}`}
            >
              {EXERCISE_CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className={css.exError}>{error}</p> : null}
          <button
            type="button"
            className={css.exSave}
            disabled={saving || !primaryId}
            onClick={() => void onSave()}
            data-testid={`volume-tag-save-${exercise.id}`}
          >
            {saving ? 'Saving…' : 'Save & recount'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
