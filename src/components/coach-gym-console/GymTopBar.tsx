'use client'

import Link from 'next/link'
import { ChevronLeft, Loader2, RefreshCw } from 'lucide-react'
import styles from './gymConsoleV1.module.css'

export function GymTopBar({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void
  refreshing: boolean
}) {
  return (
    <div className={styles.topBar}>
      <Link href="/coach/training" className={styles.backLink}>
        <ChevronLeft size={12} strokeWidth={2} aria-hidden />
        Back to training
      </Link>
      <button type="button" className={styles.refreshBtn} onClick={() => void onRefresh()} disabled={refreshing}>
        {refreshing ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <RefreshCw size={12} aria-hidden />}
        Refresh
      </button>
    </div>
  )
}
