import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './habitLibraryModalV1.module.css'

export function ModalFooter({
  sessionCount,
  sessionSummaryLine,
  saving,
  onClose,
  onDone,
}: {
  sessionCount: number
  sessionSummaryLine: string
  saving: boolean
  onClose: () => void
  onDone: () => void
}) {
  const dirty = sessionCount > 0

  return (
    <footer className={styles.modalFooter}>
      <div className={styles.footerStatus}>
        <div
          className={cn(styles.footerEyebrow, dirty && styles.footerEyebrowGood)}
        >
          <span
            className={cn(styles.footerDot, dirty && styles.footerDotGlow)}
            aria-hidden
          />
          {dirty ? `${sessionCount} habit${sessionCount === 1 ? '' : 's'} added` : 'Tap any habit to add'}
        </div>
        {dirty ? (
          <div className={cn(styles.footerSub, styles.footerSubEmph)}>{sessionSummaryLine}</div>
        ) : (
          <div className={styles.footerSub}>Or close to keep what you have</div>
        )}
      </div>
      {dirty ? (
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={onDone}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="animate-spin" size={16} aria-hidden />
          ) : (
            <Check size={16} strokeWidth={2.5} aria-hidden />
          )}
          Done
        </button>
      ) : (
        <button type="button" className={styles.btnOutline} onClick={onClose}>
          Close
        </button>
      )}
    </footer>
  )
}
