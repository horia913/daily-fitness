import type { HabitTemplateRow } from '@/lib/habitTemplateService'
import styles from './habitLibraryModalV1.module.css'

/** Row icon badge from template category + manual hint (nutrition/movement manual → warning tint). */
export function rowTintClass(template: HabitTemplateRow, manualLike: boolean): string {
  const { category } = template
  if (category === 'nutrition' && manualLike) return styles.tintWarn
  if (category === 'movement' && manualLike) return styles.tintWarn
  switch (category) {
    case 'hydration':
      return styles.tintCyan
    case 'nutrition':
      return styles.tintGood
    case 'movement':
      return styles.tintLime
    case 'sleep_recovery':
      return styles.tintPurple
    case 'mindfulness':
      return styles.tintRose
    default:
      return styles.tintMuted
  }
}

/** Category group header icon (no manual/warn override). */
export function categoryHeadTintClass(category: string): string {
  switch (category) {
    case 'hydration':
      return styles.tintCyan
    case 'nutrition':
      return styles.tintGood
    case 'movement':
      return styles.tintLime
    case 'sleep_recovery':
      return styles.tintPurple
    case 'mindfulness':
      return styles.tintRose
    default:
      return styles.tintMuted
  }
}
