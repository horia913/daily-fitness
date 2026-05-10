import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import styles from './clientProfileV1.module.css'

export function ProfileField({
  label,
  required,
  optional,
  error,
  children,
  className,
}: {
  label: string
  required?: boolean
  optional?: boolean
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn(styles.field, className)}>
      <label className={styles.fieldLabel}>
        {label}
        {required && <span className={styles.req}>*</span>}
        {optional && <span className={styles.opt}>optional</span>}
      </label>
      {children}
      {error ? <div className={styles.fieldError}>{error}</div> : null}
    </div>
  )
}
