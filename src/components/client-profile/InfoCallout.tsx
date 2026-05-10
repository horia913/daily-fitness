import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import styles from './clientProfileV1.module.css'

export function InfoCallout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.infoCallout}>
      <Info className={styles.infoCalloutIcon} aria-hidden strokeWidth={2} />
      <div className={styles.infoCalloutText}>{children}</div>
    </div>
  )
}
