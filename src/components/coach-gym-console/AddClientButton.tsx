'use client'

import { Plus } from 'lucide-react'
import styles from './gymConsoleV1.module.css'

export function AddClientButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={styles.addClientBtn} onClick={onClick}>
      <Plus size={14} strokeWidth={2} aria-hidden />
      Add client to console
    </button>
  )
}
