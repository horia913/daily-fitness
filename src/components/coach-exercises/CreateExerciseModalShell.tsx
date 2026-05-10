'use client'

import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import styles from '@/components/client-habits/habitLibraryModalV1.module.css'
import sheetExtras from './createExerciseModalShell.module.css'

export function CreateExerciseModalShell({
  open,
  onClose,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  footer: React.ReactNode
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const prevOpen = useRef(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open && !prevOpen.current) {
      const t = setTimeout(() => {
        const el = sheetRef.current?.querySelector<HTMLElement>('input, textarea, select')
        el?.focus()
      }, 80)
      return () => clearTimeout(t)
    }
    prevOpen.current = open
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className={sheetExtras.portalRoot}>
      <div className={sheetExtras.backdrop} aria-hidden onClick={() => onClose()} />
      <div ref={sheetRef} className={`${sheetExtras.sheet} ${sheetExtras.root}`} role="dialog" aria-modal="true">
        <div className={sheetExtras.grabber} aria-hidden />
        <header className={styles.modalHead}>
          <div className={styles.titleRow}>
            <div className={styles.metaCol}>
              <div className={sheetExtras.eyebrowLime}>
                <span className={sheetExtras.eyebrowDotLime} aria-hidden />
                New exercise
              </div>
              <h2 id="coach-ex-create-title" className={styles.modalTitle}>
                Create exercise
              </h2>
              <p className={styles.modalSubtitle}>Add a new exercise to your training library</p>
            </div>
            <button type="button" onClick={() => onClose()} className={styles.modalCloseBtn} aria-label="Close">
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        </header>
        <div className={sheetExtras.bodyScroll}>{children}</div>
        {footer}
      </div>
    </div>,
    document.body
  )
}
