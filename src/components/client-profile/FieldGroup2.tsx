import type { ReactNode } from 'react'
import styles from './clientProfileV1.module.css'

export function FieldGroup2({ children }: { children: ReactNode }) {
  return <div className={styles.fieldGroup2}>{children}</div>
}
