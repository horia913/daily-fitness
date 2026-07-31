import { COLLECTION_HUES } from '@/components/ui/CollectionCard'
import { PERIODIZATION_STYLES } from '@/lib/programs/periodizationStyles'

const HUE_LIST = [
  COLLECTION_HUES.a,
  COLLECTION_HUES.b,
  COLLECTION_HUES.c,
  COLLECTION_HUES.d,
] as const

/** Stable item hue from program id (filter-independent). */
export function programCollectionHue(programId: string): string {
  let hash = 0
  for (let i = 0; i < programId.length; i++) {
    hash = (hash + programId.charCodeAt(i)) % HUE_LIST.length
  }
  return HUE_LIST[hash]!
}

export function avatarHueByIndex(index: number): string {
  return HUE_LIST[index % HUE_LIST.length]!
}

export function formatDifficultyLevel(
  level: 'beginner' | 'intermediate' | 'advanced' | 'athlete',
): string {
  return level.charAt(0).toUpperCase() + level.slice(1)
}

export function formatPeriodizationListLabel(
  style: string | null | undefined,
): string | null {
  if (!style) return null
  const match = PERIODIZATION_STYLES.find((s) => s.id === style)
  if (!match) return null
  if (style === 'linear_4') return 'Linear'
  if (style === 'hsp_peak') return 'HSP Peak'
  if (style === 'gpp_spp') return 'GPP/SPP'
  if (style === 'block') return 'Block'
  if (style === 'seasonal') return 'Seasonal'
  if (style === 'custom') return 'Custom'
  return match.label
}

export function clientInitialsFromProfile(profile: {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
} | null | undefined): string {
  if (!profile) return '??'
  const f = profile.first_name?.trim()?.[0] ?? ''
  const l = profile.last_name?.trim()?.[0] ?? ''
  const combined = `${f}${l}`.toUpperCase()
  if (combined) return combined.slice(0, 2)
  const email = profile.email?.trim()
  if (email) return email.slice(0, 2).toUpperCase()
  return '??'
}
