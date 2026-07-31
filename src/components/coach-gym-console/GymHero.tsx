'use client'

import styles from './gymConsoleV1.module.css'

export function GymHero({ clientCount }: { clientCount: number }) {
  return (
    <div className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden />
      <div className={styles.heroInner}>
        <div className={styles.eyebrowRow}>CLIPBOARD · GYM CONSOLE</div>
        <h1 className={styles.heroTitle}>Console</h1>
        <p className={styles.heroSub}>
          {clientCount === 0
            ? 'Pick clients to see today’s programmed workouts'
            : `${clientCount} ${clientCount === 1 ? 'client' : 'clients'} on the clipboard`}
        </p>
      </div>
    </div>
  )
}
