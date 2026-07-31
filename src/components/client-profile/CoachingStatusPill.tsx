import styles from './clientProfileV1.module.css'

export type CoachingPillState = 'active' | 'paused' | 'ended'

/** Reuses ProfileHero coaching pill styles for other surfaces (e.g. Coach screen). */
export function CoachingStatusPill({ state }: { state: CoachingPillState }) {
  if (state === 'active') {
    return (
      <span className={`${styles.pill} ${styles.pillGood}`}>
        <span className={styles.pillDot} aria-hidden />
        Active
      </span>
    )
  }
  if (state === 'paused') {
    return (
      <span className={`${styles.pill} ${styles.pillWarn}`}>
        <span className={styles.pillDot} aria-hidden />
        Paused
      </span>
    )
  }
  return (
    <span className={`${styles.pill} ${styles.pillMuted}`}>
      <span className={styles.pillDot} aria-hidden />
      Ended
    </span>
  )
}
