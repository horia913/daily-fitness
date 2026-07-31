'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { CanvasWorkout } from '@/lib/groupModel/canvasTypes'
import {
  aggregateVolumeFromCanvasWorkouts,
  buildStationWeekVolumeRows,
  fetchExerciseVolumeMetaByIds,
  fetchMuscleGroupOptions,
  summarizeStationWeekVolume,
  type StationWeekVolumeSummary,
} from '@/lib/programs/stationWeekVolume'
import { VolumeRailExerciseTagRow, type MuscleOption } from './VolumeRailExerciseTagRow'
import css from './ProgramVolumeRail.module.css'
import { cn } from '@/lib/utils'

export type ProgramVolumeRailProps = {
  absoluteWeek: number
  workouts: CanvasWorkout[]
  sessionCount: number
  coachId: string
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

function collectExerciseIds(workouts: CanvasWorkout[]): string[] {
  const ids: string[] = []
  for (const w of workouts) {
    for (const g of w.groups) {
      for (const s of g.slots) {
        if (s.exercise_id) ids.push(s.exercise_id)
      }
    }
  }
  return ids
}

function barMetrics(sets: number, min: number, max: number): { fillPct: number; markPct: number } {
  const ceiling = Math.max(max * 1.25, max + 4, sets, 1)
  const fillPct = Math.min(100, (sets / ceiling) * 100)
  const markPct = Math.min(100, (max / ceiling) * 100)
  return { fillPct, markPct }
}

const EMPTY_SUMMARY: StationWeekVolumeSummary = {
  totalWorkingSets: 0,
  sessionCount: 0,
  rows: [],
  empty: true,
  athleticExcludedSets: 0,
  athleticExcludedExerciseCount: 0,
  athleticExcludedExercises: [],
  untaggedSets: 0,
  untaggedExerciseCount: 0,
  untaggedExercises: [],
}

export function ProgramVolumeRail({
  absoluteWeek,
  workouts,
  sessionCount,
  coachId,
  collapsed,
  onCollapsedChange,
}: ProgramVolumeRailProps) {
  const [summary, setSummary] = useState<StationWeekVolumeSummary>({
    ...EMPTY_SUMMARY,
    sessionCount,
  })
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [muscleOptions, setMuscleOptions] = useState<MuscleOption[]>([])
  const [athleticOpen, setAthleticOpen] = useState(false)
  const [untaggedOpen, setUntaggedOpen] = useState(false)

  const exerciseKey = useMemo(() => {
    const ids = collectExerciseIds(workouts).sort()
    const setSig = workouts
      .flatMap((w) =>
        w.groups.map(
          (g) =>
            `${g.id}:${g.total_sets}:${g.slots.map((s) => `${s.exercise_id}:${s.prescriptions?.length ?? 0}`).join(',')}`,
        ),
      )
      .join('|')
    return `${ids.join(',')}|${setSig}|${sessionCount}|${absoluteWeek}|${refreshKey}`
  }, [workouts, sessionCount, absoluteWeek, refreshKey])

  useEffect(() => {
    let cancelled = false
    void fetchMuscleGroupOptions().then((opts) => {
      if (!cancelled) setMuscleOptions(opts)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const ids = collectExerciseIds(workouts)
        const meta = await fetchExerciseVolumeMetaByIds(ids)
        const volume = aggregateVolumeFromCanvasWorkouts(workouts, meta)
        const rows = await buildStationWeekVolumeRows(volume.byMuscle)
        if (cancelled) return
        setSummary(summarizeStationWeekVolume(rows, sessionCount, volume))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [exerciseKey, workouts, sessionCount])

  const onTagged = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const showEmpty =
    !loading &&
    (summary.empty ||
      (summary.totalWorkingSets === 0 &&
        summary.rows.length === 0 &&
        summary.athleticExcludedSets === 0 &&
        summary.untaggedSets === 0))

  if (collapsed) {
    return (
      <div
        className={css.wrapCollapsed}
        data-testid="program-volume-rail"
        data-collapsed="true"
      >
        <button
          type="button"
          className={css.collapsedBtn}
          onClick={() => onCollapsedChange(false)}
          aria-expanded={false}
          data-testid="volume-rail-expand"
        >
          <span className={css.collapsedLeft}>
            Weekly volume
            {!showEmpty ? <em>{summary.totalWorkingSets}</em> : null}
            <span className={css.collapsedHint}>
              week {absoluteWeek} · {sessionCount} session{sessionCount === 1 ? '' : 's'}
            </span>
          </span>
          <span className={css.collapsedHint}>Show</span>
        </button>
      </div>
    )
  }

  const scopeFooters = (
    <div className={css.scopeFoot} data-testid="volume-rail-scope-foot">
      {summary.athleticExcludedSets > 0 ? (
        <div className={css.scopeBlock}>
          <button
            type="button"
            className={css.scopeToggle}
            onClick={() => setAthleticOpen((v) => !v)}
            aria-expanded={athleticOpen}
            data-testid="volume-rail-athletic-excluded"
          >
            <span>
              + {summary.athleticExcludedSets} set{summary.athleticExcludedSets === 1 ? '' : 's'} ·{' '}
              {summary.athleticExcludedExerciseCount} speed/plyo exercise
              {summary.athleticExcludedExerciseCount === 1 ? '' : 's'} (not counted)
            </span>
            <ChevronDown
              className={cn(css.scopeChevron, athleticOpen && css.scopeChevronOpen)}
              aria-hidden
            />
          </button>
          {athleticOpen ? (
            <div className={css.exList} data-testid="volume-rail-athletic-list">
              {summary.athleticExcludedExercises.map((ex) => (
                <VolumeRailExerciseTagRow
                  key={ex.id}
                  exercise={ex}
                  coachId={coachId}
                  muscleOptions={muscleOptions}
                  onSaved={onTagged}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {summary.untaggedSets > 0 ? (
        <div className={css.scopeBlock}>
          <button
            type="button"
            className={css.scopeToggle}
            onClick={() => setUntaggedOpen((v) => !v)}
            aria-expanded={untaggedOpen}
            data-testid="volume-rail-untagged"
          >
            <span>
              untagged: {summary.untaggedSets} set{summary.untaggedSets === 1 ? '' : 's'}
            </span>
            <ChevronDown
              className={cn(css.scopeChevron, untaggedOpen && css.scopeChevronOpen)}
              aria-hidden
            />
          </button>
          {untaggedOpen ? (
            <div className={css.exList} data-testid="volume-rail-untagged-list">
              {summary.untaggedExercises.map((ex) => (
                <VolumeRailExerciseTagRow
                  key={ex.id}
                  exercise={ex}
                  coachId={coachId}
                  muscleOptions={muscleOptions}
                  onSaved={onTagged}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  return (
    <section
      className={css.wrap}
      data-testid="program-volume-rail"
      aria-label="Weekly volume"
    >
      <div className={css.head}>
        <div className={css.headLeft}>
          <span className={css.headLabel}>Weekly volume</span>
          <span className={css.headMeta}>
            week {absoluteWeek} · {sessionCount} session{sessionCount === 1 ? '' : 's'}
          </span>
        </div>
        <div className={css.headRight}>
          <div className={css.headTotal}>
            <span className={css.headTotalN}>{showEmpty ? '—' : summary.totalWorkingSets}</span>
            <span className={css.headTotalL}>working sets · resistance work</span>
          </div>
          <button
            type="button"
            className={css.collapseBtn}
            onClick={() => onCollapsedChange(true)}
            aria-expanded
            title="Hide weekly volume"
            data-testid="volume-rail-collapse"
            aria-label="Hide weekly volume"
          >
            <ChevronUp className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className={css.body}>
        {showEmpty ? (
          <div className={css.empty} data-testid="program-volume-rail-empty">
            <div className={css.emptyTitle}>No volume yet</div>
            <p className={css.emptyHint}>
              Add resistance workouts this week to see per-muscle volume against target ranges.
            </p>
          </div>
        ) : summary.rows.length === 0 ? (
          <div className={css.empty} data-testid="program-volume-rail-unclassified">
            <div className={css.emptyTitle}>No tagged resistance volume</div>
            <p className={css.emptyHint}>
              Speed/plyo work is excluded. Expand the footer to tag mis-filed resistance exercises.
            </p>
          </div>
        ) : (
          <div className={css.cellsScroll} data-testid="volume-strip-cells">
            {summary.rows.map((row) => {
              const { fillPct, markPct } = barMetrics(row.sets, row.min, row.max)
              return (
                <div
                  key={row.muscleGroup}
                  className={cn(css.cell, css[row.status])}
                  data-testid={`volume-muscle-${row.muscleGroup}`}
                >
                  <div className={css.nm}>{row.muscleGroup}</div>
                  <div className={css.vrow}>
                    <span className={css.v}>{row.sets}</span>
                    <span className={css.tg}>
                      / {row.min}–{row.max}
                    </span>
                  </div>
                  <div className={css.bar}>
                    <i className={css.barFill} style={{ width: `${fillPct}%` }} />
                    <span className={css.mark} style={{ left: `${markPct}%` }} />
                  </div>
                  <div className={cn(css.mst, css[row.status])}>
                    {row.statusLabel}
                    {row.statusDetail ? <em>· {row.statusDetail}</em> : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {summary.athleticExcludedSets > 0 || summary.untaggedSets > 0 ? scopeFooters : null}

      <button type="button" className={css.rfoot} tabIndex={-1} aria-hidden>
        Full breakdown →
      </button>
    </section>
  )
}
