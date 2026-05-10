import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './clientProfileV1.module.css'

export function StickySaveBar({
  visible,
  isDirty,
  dirtyCount,
  dirtySummaryLine,
  saving,
  onSave,
  onDiscard,
  discardDisabled,
}: {
  visible: boolean
  isDirty: boolean
  dirtyCount: number
  dirtySummaryLine: string
  saving: boolean
  onSave: () => void
  onDiscard: () => void
  discardDisabled?: boolean
}) {
  if (!visible) return null

  return (
    <div className={cn(styles.stickyBar, isDirty && styles.stickyBarDirty)}>
      <div className={styles.stickyStatus}>
        <div
          className={cn(styles.stickyEyebrow, isDirty && styles.stickyEyebrowDirty)}
        >
          <span
            className={cn(styles.stickyDot, isDirty && styles.stickyDotGlow)}
            aria-hidden
          />
          {isDirty ? 'UNSAVED' : 'UP TO DATE'}
        </div>
        {isDirty ? (
          <>
            <div className={cn(styles.stickyText, styles.stickyTextEmph)}>
              {dirtyCount} unsaved change{dirtyCount === 1 ? '' : 's'}
            </div>
            {dirtySummaryLine ? (
              <div className={styles.stickySub}>{dirtySummaryLine}</div>
            ) : null}
          </>
        ) : (
          <div className={styles.stickyText}>All changes saved</div>
        )}
      </div>
      {isDirty ? (
        <button
          type="button"
          className={styles.btnGhostSm}
          onClick={onDiscard}
          disabled={discardDisabled || saving}
        >
          Discard
        </button>
      ) : null}
      <button
        type="button"
        className={styles.btnPrimary}
        onClick={onSave}
        disabled={!isDirty || saving}
      >
        {saving ? (
          <Loader2 className="animate-spin" size={16} aria-hidden />
        ) : (
          <Check size={16} aria-hidden strokeWidth={2.5} />
        )}
        {isDirty ? 'Save' : 'Saved'}
      </button>
    </div>
  )
}
