'use client'

import type { LucideIcon } from 'lucide-react'
import { Activity, Brain, Droplet, Moon, Utensils } from 'lucide-react'
import type { HabitTemplateRow } from '@/lib/habitTemplateService'
import { HabitRow } from './HabitRow'
import { categoryHeadTintClass } from './habitRowTints'
import styles from './habitLibraryModalV1.module.css'

const CAT_ICONS: Record<string, LucideIcon> = {
  hydration: Droplet,
  nutrition: Utensils,
  movement: Activity,
  sleep_recovery: Moon,
  mindfulness: Brain,
}

const CAT_NAME_COLOR: Record<string, string> = {
  hydration: 'var(--cyan)',
  nutrition: 'var(--good)',
  movement: 'var(--lime)',
  sleep_recovery: 'var(--purple)',
  mindfulness: 'var(--rose)',
}

export function HabitCategoryGroup({
  category,
  label,
  templates,
  sessionIds,
  saving,
  isManualLike,
  isAutoTracked,
  onRowActivate,
}: {
  category: string
  label: string
  templates: HabitTemplateRow[]
  sessionIds: Set<string>
  saving: boolean
  isManualLike: (t: HabitTemplateRow) => boolean
  isAutoTracked: (t: HabitTemplateRow) => boolean
  onRowActivate: (t: HabitTemplateRow) => void
}) {
  if (templates.length === 0) return null
  const Icon = CAT_ICONS[category] ?? Activity // check-in / lifestyle use Activity fallback
  const headTint = categoryHeadTintClass(category)

  return (
    <section>
      <div className={styles.catHead}>
        <div className={`${styles.catIcon} ${headTint}`}>
          <Icon size={12} strokeWidth={2} aria-hidden />
        </div>
        <span className={styles.catName} style={{ color: CAT_NAME_COLOR[category] ?? 'var(--t1)' }}>
          {label}
        </span>
        <span className={styles.catMeta}>{templates.length}</span>
      </div>
      <div className={styles.habitList}>
        {templates.map((t) => {
          const manual = isManualLike(t)
          const auto = isAutoTracked(t)
          const configurable = t.user_configurable_keys.length > 0
          const isAdded = !configurable && sessionIds.has(t.id)
          return (
            <HabitRow
              key={t.id}
              template={t}
              manualLike={manual}
              autoTracked={auto}
              isAdded={isAdded}
              disabled={saving}
              onPress={() => onRowActivate(t)}
            />
          )
        })}
      </div>
    </section>
  )
}
