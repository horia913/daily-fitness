'use client'

import styles from './gymConsoleV1.module.css'

function formatUpdated(secondsAgo: number | null): string {
  if (secondsAgo == null) return 'Updated just now'
  if (secondsAgo < 5) return 'Updated just now'
  if (secondsAgo < 60) return `Updated ${secondsAgo}s ago`
  const m = Math.floor(secondsAgo / 60)
  return `Updated ${m}m ago`
}

export function GymHero({
  secondsAgo,
  clientCount,
  sessionSetsLogged,
  prsToday,
}: {
  secondsAgo: number | null
  clientCount: number
  sessionSetsLogged: number
  prsToday: number
}) {
  return (
    <div className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden />
      <div className={styles.heroInner}>
        <div className={styles.eyebrowRow}>
          <span className={styles.liveDot} aria-hidden />
          LIVE · GYM SESSION
        </div>
        <h1 className={styles.heroTitle}>Console</h1>
        <p className={styles.heroSub}>
          {formatUpdated(secondsAgo)} · {clientCount} {clientCount === 1 ? 'client' : 'clients'} training in parallel
        </p>
        <div className={styles.statStrip}>
          <div>
            <div className={styles.statNum} style={{ color: 'var(--lime)' }}>
              {clientCount}
            </div>
            <div className={styles.statLabel}>Active clients</div>
          </div>
          <div>
            <div className={styles.statNum} style={{ color: 'var(--cyan)' }}>
              {sessionSetsLogged}
            </div>
            <div className={styles.statLabel}>Sets logged</div>
          </div>
          <div>
            <div className={styles.statNum} style={{ color: 'var(--purple)' }}>
              {prsToday}
            </div>
            <div className={styles.statLabel}>PRs today</div>
          </div>
        </div>
      </div>
    </div>
  )
}
