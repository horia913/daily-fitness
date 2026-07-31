'use client'

import { ChevronDown, Layers, User, X } from 'lucide-react'
import { ProgramWeekDayMap } from './ProgramWeekDayMap'
import type { GymConsoleBoardItem, GymConsoleOpenedSelection } from './boardStorage'
import { boardItemKey } from './boardStorage'
import styles from './GymConsoleBoard.module.css'

export type GymConsoleBoardCardProps = {
  item: GymConsoleBoardItem
  expanded: boolean
  onToggle: () => void
  onRemove: () => void
  onFinalize: (selection: GymConsoleOpenedSelection) => void
}

export function GymConsoleBoardCard({
  item,
  expanded,
  onToggle,
  onRemove,
  onFinalize,
}: GymConsoleBoardCardProps) {
  const kindLabel = item.kind === 'client' ? 'Client' : 'Program'
  const KindIcon = item.kind === 'client' ? User : Layers
  const initialSelection =
    item.status === 'finalized' && item.selection ? item.selection : null

  return (
    <article
      className={`${styles.card}${expanded ? ` ${styles.cardExpanded}` : ''}`}
      data-board-key={boardItemKey(item)}
      data-board-status={item.status}
    >
      <div className={styles.cardHeader}>
        <button
          type="button"
          className={styles.cardToggle}
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <span className={styles.cardKind} title={kindLabel}>
            <KindIcon size={14} strokeWidth={2} aria-hidden />
            <span className={styles.cardKindText}>{kindLabel}</span>
          </span>
          <span className={styles.cardTitle}>{item.label}</span>
          <ChevronDown
            className={`${styles.cardChevron}${expanded ? ` ${styles.cardChevronOpen}` : ''}`}
            size={18}
            strokeWidth={2}
            aria-hidden
          />
        </button>
        <button
          type="button"
          className={styles.cardRemove}
          aria-label={`Remove ${item.label} from console`}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <X size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>

      {expanded ? (
        <div className={styles.cardBody}>
          {item.kind === 'client' ? (
            <ProgramWeekDayMap
              mode="assignment"
              clientId={item.id}
              initialSelection={initialSelection}
              onFinalizeSelection={onFinalize}
            />
          ) : (
            <ProgramWeekDayMap
              mode="template"
              programId={item.id}
              initialSelection={initialSelection}
              onFinalizeSelection={onFinalize}
            />
          )}
        </div>
      ) : null}
    </article>
  )
}
