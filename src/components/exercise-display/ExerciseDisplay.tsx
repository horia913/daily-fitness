'use client'

import type { ReactNode } from 'react'
import type { ExerciseDisplayProps, ExerciseDisplaySegments } from './types'
import styles from './exerciseDisplay.module.css'

const GROUP_BADGE_CLASS = [
  styles.badgeA,
  styles.badgeB,
  styles.badgeC,
  styles.badgeD,
] as const

const GROUP_BODY_CLASS = [
  styles.groupBodyA,
  styles.groupBodyB,
  styles.groupBodyC,
  styles.groupBodyD,
] as const

export function groupHueClass(index: number): {
  badge: string
  rule: string
} {
  const i = ((index % 4) + 4) % 4
  return {
    badge: GROUP_BADGE_CLASS[i],
    rule: GROUP_BODY_CLASS[i],
  }
}

function PrescriptionLine({ segments }: { segments: ExerciseDisplaySegments }) {
  const parts: Array<{ key: string; node: ReactNode }> = []

  if (segments.setsReps) {
    parts.push({
      key: 'sets',
      node: <span className={styles.prescriptionBold}>{segments.setsReps}</span>,
    })
  }
  if (segments.load) {
    parts.push({ key: 'load', node: segments.load })
  }
  if (segments.rir) {
    parts.push({ key: 'rir', node: segments.rir })
  }
  if (segments.technique) {
    parts.push({ key: 'technique', node: segments.technique })
  }
  if (segments.rest) {
    parts.push({
      key: 'rest',
      node: (
        <>
          rest <span className={styles.prescriptionRest}>{segments.rest}</span>
        </>
      ),
    })
  }
  for (const extra of segments.extras ?? []) {
    parts.push({ key: `extra-${extra}`, node: extra })
  }

  if (parts.length === 0) return null

  return (
    <p className={styles.prescription}>
      {parts.map((part, i) => (
        <span key={part.key} className={styles.prescriptionSegment}>
          {i > 0 ? <span className={styles.prescriptionSep}> · </span> : null}
          {part.node}
        </span>
      ))}
    </p>
  )
}

export function ExerciseDisplay({
  badge,
  groupIndex,
  name,
  size = 'list',
  segments,
  secondaryLine = null,
  markToggle = null,
}: ExerciseDisplayProps) {
  const hue = groupHueClass(groupIndex)
  const secondary = secondaryLine?.trim() || null
  const done = Boolean(markToggle?.done)

  const rowClass = [
    styles.row,
    markToggle ? styles.rowWithMark : '',
    done ? styles.rowMarked : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rowClass}>
      <span className={`${styles.badge} ${hue.badge}`}>{badge}</span>
      <div className={styles.body}>
        <div className={size === 'executor' ? styles.nameExecutor : styles.nameList}>{name}</div>
        <PrescriptionLine segments={segments} />
        {secondary ? <p className={styles.secondaryLine}>{secondary}</p> : null}
      </div>
      {markToggle ? (
        <button
          type="button"
          className={`fc-gym-mark-toggle ${styles.markToggle}${done ? ` ${styles.markToggleOn}` : ''}`}
          aria-pressed={done}
          aria-label={done ? `Unmark ${name}` : `Mark ${name} done`}
          onClick={markToggle.onToggle}
        >
          {done ? '✓' : ''}
        </button>
      ) : null}
    </div>
  )
}
