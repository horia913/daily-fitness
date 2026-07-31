'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Layers, Plus, User } from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { useTheme } from '@/contexts/ThemeContext'
import { AddClientToBoardModal } from '@/components/coach/gym-console-v2/AddClientToBoardModal'
import { AddProgramToBoardModal } from '@/components/coach/gym-console-v2/AddProgramToBoardModal'
import { GymConsoleBoardCard } from '@/components/coach/gym-console-v2/GymConsoleBoardCard'
import {
  GYM_CONSOLE_BOARD_MAX,
  boardItemKey,
  clearGymConsoleBoard,
  readGymConsoleBoard,
  writeGymConsoleBoard,
  type GymConsoleBoardItem,
  type GymConsoleOpenedSelection,
} from '@/components/coach/gym-console-v2/boardStorage'
import { clearAllGymConsoleSessionMarks } from '@/components/coach/gym-console-v2/sessionMarksStorage'
import styles from '@/components/coach/gym-console-v2/GymConsoleBoard.module.css'

function GymConsoleContent() {
  const { performanceSettings } = useTheme()

  // SSR-safe: never read localStorage during render. Hydrate finalized items on mount ONLY.
  // Shells are never written; hasHydrated gates all storage writes so we never clobber with [].
  const [board, setBoard] = useState<GymConsoleBoardItem[]>([])
  const [hasHydrated, setHasHydrated] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set())
  const [clientModalOpen, setClientModalOpen] = useState(false)
  const [programModalOpen, setProgramModalOpen] = useState(false)

  useEffect(() => {
    const finalized = readGymConsoleBoard()
    setBoard(finalized)
    // Restored items open directly to their workout — expand so the map mounts with selection.
    setExpandedKeys(new Set(finalized.map(boardItemKey)))
    setHasHydrated(true)
  }, [])

  /** Persist finalized-only snapshot. Never call for shell-only changes. */
  const persistFinalized = useCallback(
    (next: GymConsoleBoardItem[]) => {
      if (!hasHydrated) return
      writeGymConsoleBoard(next)
    },
    [hasHydrated],
  )

  const slotsRemaining = GYM_CONSOLE_BOARD_MAX - board.length
  const boardFull = slotsRemaining <= 0

  const existingClientIds = useMemo(
    () => board.filter((i) => i.kind === 'client').map((i) => i.id),
    [board],
  )
  const existingProgramIds = useMemo(
    () => board.filter((i) => i.kind === 'program').map((i) => i.id),
    [board],
  )

  /** Add client/program → transient shell only (React state). Never touches localStorage. */
  const addItems = useCallback(
    (kind: 'client' | 'program', incoming: { id: string; label: string }[]) => {
      if (incoming.length === 0) return
      setBoard((prev) => {
        const seen = new Set(prev.map(boardItemKey))
        const toPrepend: GymConsoleBoardItem[] = []
        for (const row of incoming) {
          if (prev.length + toPrepend.length >= GYM_CONSOLE_BOARD_MAX) break
          const item: GymConsoleBoardItem = {
            kind,
            id: row.id,
            label: row.label,
            status: 'shell',
          }
          const key = boardItemKey(item)
          if (seen.has(key)) continue
          seen.add(key)
          toPrepend.push(item)
        }
        return [...toPrepend, ...prev].slice(0, GYM_CONSOLE_BOARD_MAX)
      })
    },
    [],
  )

  /** Open workout → finalize + write resolved selection to storage. */
  const finalizeItem = useCallback(
    (item: GymConsoleBoardItem, selection: GymConsoleOpenedSelection) => {
      setBoard((prev) => {
        const key = boardItemKey(item)
        const next = prev.map((row) =>
          boardItemKey(row) === key
            ? { ...row, status: 'finalized' as const, selection }
            : row,
        )
        persistFinalized(next)
        return next
      })
    },
    [persistFinalized],
  )

  const removeItem = useCallback(
    (item: GymConsoleBoardItem) => {
      const key = boardItemKey(item)
      setBoard((prev) => {
        const next = prev.filter((i) => boardItemKey(i) !== key)
        persistFinalized(next)
        return next
      })
      setExpandedKeys((prev) => {
        if (!prev.has(key)) return prev
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    },
    [persistFinalized],
  )

  const clearBoard = useCallback(() => {
    if (!hasHydrated) return
    if (board.length === 0) return
    const ok = window.confirm(
      'Clear the gym console? This removes all clients and programs from the board.',
    )
    if (!ok) return
    setBoard([])
    clearGymConsoleBoard()
    clearAllGymConsoleSessionMarks()
    setExpandedKeys(new Set())
  }, [board.length, hasHydrated])

  const toggleExpanded = useCallback((item: GymConsoleBoardItem) => {
    const key = boardItemKey(item)
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className={`relative z-10 ${styles.root}`}>
        <div className={styles.shell}>
          <header className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Gym console</h1>
              <p className={styles.pageSub}>
                {hasHydrated ? `${board.length}/${GYM_CONSOLE_BOARD_MAX} on board` : '…'}
              </p>
            </div>
            <div className={styles.toolbar}>
              <button
                type="button"
                className={styles.addBtn}
                disabled={!hasHydrated || boardFull}
                onClick={() => setClientModalOpen(true)}
              >
                <Plus size={16} aria-hidden />
                Add Client
              </button>
              <button
                type="button"
                className={`${styles.addBtn} ${styles.addBtnSecondary}`}
                disabled={!hasHydrated || boardFull}
                onClick={() => setProgramModalOpen(true)}
              >
                <Plus size={16} aria-hidden />
                Add Program
              </button>
              {hasHydrated && board.length > 0 ? (
                <button type="button" className={styles.clearBtn} onClick={clearBoard}>
                  Clear console
                </button>
              ) : null}
            </div>
          </header>

          {boardFull ? <p className={styles.boardFull}>Board full — remove an item to add more.</p> : null}

          {!hasHydrated ? null : board.length === 0 ? (
            <div className={styles.empty}>
              <User size={40} strokeWidth={1.5} className="text-[color:var(--fc-text-dim)]" aria-hidden />
              <h2 className={styles.emptyTitle}>Console is empty</h2>
              <p className={styles.emptyHint}>
                Add a client to open their assigned program navigator, or a program template to browse weeks and
                days. Up to {GYM_CONSOLE_BOARD_MAX} items.
              </p>
              <div className={styles.emptyActions}>
                <button type="button" className={styles.addBtn} onClick={() => setClientModalOpen(true)}>
                  <User size={16} aria-hidden />
                  Add Client
                </button>
                <button
                  type="button"
                  className={`${styles.addBtn} ${styles.addBtnSecondary}`}
                  onClick={() => setProgramModalOpen(true)}
                >
                  <Layers size={16} aria-hidden />
                  Add Program
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.grid}>
              {board.map((item) => {
                const key = boardItemKey(item)
                return (
                  <GymConsoleBoardCard
                    key={key}
                    item={item}
                    expanded={expandedKeys.has(key)}
                    onToggle={() => toggleExpanded(item)}
                    onRemove={() => removeItem(item)}
                    onFinalize={(selection) => finalizeItem(item, selection)}
                  />
                )
              })}
            </div>
          )}
        </div>

        <AddClientToBoardModal
          open={clientModalOpen}
          onClose={() => setClientModalOpen(false)}
          existingClientIds={existingClientIds}
          slotsRemaining={slotsRemaining}
          onAdd={(items) => addItems('client', items)}
        />
        <AddProgramToBoardModal
          open={programModalOpen}
          onClose={() => setProgramModalOpen(false)}
          existingProgramIds={existingProgramIds}
          slotsRemaining={slotsRemaining}
          onAdd={(items) => addItems('program', items)}
        />
      </div>
    </AnimatedBackground>
  )
}

export default function GymConsolePage() {
  return (
    <ProtectedRoute allowedRoles={['coach', 'admin']}>
      <GymConsoleContent />
    </ProtectedRoute>
  )
}
