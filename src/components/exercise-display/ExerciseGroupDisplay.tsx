'use client'

import { ExerciseDisplay, groupHueClass } from './ExerciseDisplay'
import type { ExerciseGroupDisplayProps } from './types'
import styles from './exerciseDisplay.module.css'

export function ExerciseGroupDisplay({
  groupIndex,
  letter,
  metaLine,
  exercises,
  size = 'list',
  compact,
}: ExerciseGroupDisplayProps) {
  const isMulti = exercises.length > 1
  const hue = groupHueClass(groupIndex)

  if (!isMulti && exercises.length === 1) {
    const solo = exercises[0]
    return (
      <ExerciseDisplay
        badge={letter}
        groupIndex={groupIndex}
        name={solo.name}
        size={size}
        compact={compact}
        segments={solo.segments}
        exerciseId={solo.exerciseId}
        secondaryLine={solo.secondaryLine}
        markToggle={solo.markToggle}
      />
    )
  }

  return (
    <div className={styles.groupWrap}>
      <div className={styles.groupHeader}>
        <span className={`${styles.badge} ${hue.badge}`}>{letter}</span>
        {metaLine ? <span className={styles.groupMeta}>{metaLine}</span> : null}
      </div>
      <div className={`${styles.groupBody} ${styles.groupMulti} ${hue.rule}`}>
        {exercises.map((ex) => (
          <div key={`${ex.badge}-${ex.exerciseId ?? ex.name}`} className={styles.groupExercise}>
            <ExerciseDisplay
              badge={ex.badge}
              groupIndex={groupIndex}
              name={ex.name}
              size={size}
              compact={compact}
              segments={ex.segments}
              exerciseId={ex.exerciseId}
              secondaryLine={ex.secondaryLine}
              markToggle={ex.markToggle}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
