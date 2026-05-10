/**
 * Maps DB exercise category names to v6 visual lanes for gradients / pills.
 * Does not change stored category strings.
 */
export type ExerciseVisualLane =
  | 'strength'
  | 'hypertrophy'
  | 'athletic'
  | 'mobility'
  | 'conditioning'

export function visualExerciseCategory(raw: string): ExerciseVisualLane {
  const c = (raw || '').toLowerCase()
  if (c.includes('hyper') || c.includes('muscle') || c.includes('bodybuilding')) return 'hypertrophy'
  if (c.includes('hiit') || c.includes('athletic') || c.includes('power') || c.includes('sport')) return 'athletic'
  if (c.includes('mobil') || c.includes('flex') || c.includes('yoga') || c.includes('recovery')) return 'mobility'
  if (c.includes('cardio') || c.includes('condition') || c.includes('endurance')) return 'conditioning'
  if (c.includes('strength') || c.includes('weight')) return 'strength'
  return 'strength'
}

export function formatCategoryLabel(raw: string): string {
  if (!raw) return '—'
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}
