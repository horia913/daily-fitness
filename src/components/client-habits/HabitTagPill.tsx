import { Zap } from 'lucide-react'
import styles from './habitLibraryModalV1.module.css'

export function HabitTagPill({ mode }: { mode: 'auto' | 'manual' }) {
  if (mode === 'auto') {
    return (
      <span className={styles.tagAuto}>
        <Zap className={styles.tagBolt} aria-hidden strokeWidth={2.5} />
        Auto
      </span>
    )
  }
  return <span className={styles.tagManual}>Manual</span>
}
