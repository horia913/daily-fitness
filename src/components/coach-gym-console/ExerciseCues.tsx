'use client'

import styles from './gymConsoleV1.module.css'

export function ExerciseCues({ text }: { text: string }) {
  if (!text.trim()) return null
  return (
    <div className={styles.cues}>
      <span className={styles.cuePrefix}>Cue:</span>
      {text}
    </div>
  )
}
