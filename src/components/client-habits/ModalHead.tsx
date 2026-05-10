'use client'

import { forwardRef } from 'react'
import { Search, X } from 'lucide-react'
import styles from './habitLibraryModalV1.module.css'

export const ModalHead = forwardRef<
  HTMLInputElement,
  {
    searchValue: string
    onSearchChange: (v: string) => void
    onClose: () => void
  }
>(function ModalHead({ searchValue, onSearchChange, onClose }, ref) {
  return (
    <header className={styles.modalHead}>
      <div className={styles.titleRow}>
        <div className={styles.metaCol}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden />
            Habit library
          </div>
          <h2 id="habit-lib-title" className={styles.modalTitle}>
            Pick a habit to track
          </h2>
          <p className={styles.modalSubtitle}>
            Auto-tracked habits sync from your logs · manual habits you tick yourself
          </p>
        </div>
        <button type="button" onClick={onClose} className={styles.modalCloseBtn} aria-label="Close">
          <X size={13} strokeWidth={2} />
        </button>
      </div>
      <div className={styles.searchBar}>
        <Search size={12} className={styles.searchIcon} aria-hidden strokeWidth={2} />
        <input
          ref={ref}
          type="search"
          className={styles.searchInput}
          placeholder="Search habits..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          autoComplete="off"
        />
        {searchValue ? (
          <button
            type="button"
            className={styles.searchClear}
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <X size={9} strokeWidth={2} />
          </button>
        ) : null}
      </div>
    </header>
  )
})

ModalHead.displayName = 'ModalHead'
