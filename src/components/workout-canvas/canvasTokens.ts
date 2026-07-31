export const CANVAS = {
  bg: '#0b1219',
  surface: '#0d1922',
  menuSurface: '#101e27',
  text: '#e9f0f2',
  muted: '#74878f',
  hairline: 'rgba(255,255,255,.06)',
  cyan: '#22D3EE' /* == --fc-group-c; was #4FE3E8 */,
  /** Retired lime — action CTAs use app accent blue. */
  chartreuse: '#2E7BFF',
  accent: '#2E7BFF',
  groupColors: ['#6EE7B7', '#7DD3FC', '#F0ABFC', '#FDE68A', '#FDBA74', '#A5B4FC'],
} as const

export function groupChipBg(color: string): string {
  return `${color}1F`
}

/** Station editor — saturated luminous badge fill. */
export function groupChipBgVibrant(color: string): string {
  return `color-mix(in srgb, ${color} 88%, #ffffff 12%)`
}

export function groupConnectorColor(color: string): string {
  return `${color}47`
}
