'use client'

import styles from './gymConsoleV1.module.css'

export function ProgressStrip({
  doneCount,
  totalCount,
  currentIndex,
}: {
  doneCount: number
  totalCount: number
  currentIndex: number
}) {
  const safeTotal = Math.max(totalCount, 1)
  const donePct = (doneCount / safeTotal) * 100
  const curPct = (1 / safeTotal) * 100

  return (
    <div className={styles.progressWrap}>
      <div className={styles.progressRow}>
        <span>Progress</span>
        <span>
          <strong>{doneCount}</strong> of {totalCount} done · on exercise {currentIndex}
        </span>
      </div>
      <div className={styles.barTrack}>
        <div className={styles.barDone} style={{ width: `${donePct}%` }} />
        <div className={styles.barSpacer} />
        <div className={styles.barCurrent} style={{ width: `${curPct}%` }} />
      </div>
    </div>
  )
}
