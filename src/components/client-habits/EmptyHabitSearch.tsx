import { Search } from 'lucide-react'
import styles from './habitLibraryModalV1.module.css'

export function EmptyHabitSearch({
  query,
  onClear,
}: {
  query: string
  onClear: () => void
}) {
  return (
    <div className={styles.emptySearch}>
      <div className={styles.emptyIconWrap}>
        <Search size={18} strokeWidth={2} aria-hidden />
      </div>
      <p className={styles.emptyTitle}>No habits match &quot;{query}&quot;</p>
      <p className={styles.emptyDesc}>Try a different search or browse all categories.</p>
      <button type="button" className={`${styles.btnOutline} ${styles.btnOutlineSm}`} onClick={onClear}>
        Clear search
      </button>
    </div>
  )
}
