/** Cool→warm electric ramp for the periodization ribbon (contrast pass). */
export const RIBBON_RAMP = ['#2EF2C6', '#B4FF3D', '#FFC822', '#FF8A1F'] as const

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a)
  const [br, bg, bb] = parseHex(b)
  const r = lerpChannel(ar, br, t)
  const g = lerpChannel(ag, bg, t)
  const bl = lerpChannel(ab, bb, t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

/** Distinct solid color per block order; interpolates along ramp for 2+ blocks. */
export function ribbonBlockColor(blockIndex: number, blockCount: number): string {
  if (blockCount <= 1) return RIBBON_RAMP[0]
  const t = blockIndex / Math.max(1, blockCount - 1)
  const pos = t * (RIBBON_RAMP.length - 1)
  const i = Math.min(Math.floor(pos), RIBBON_RAMP.length - 2)
  const f = pos - i
  return lerpHex(RIBBON_RAMP[i], RIBBON_RAMP[i + 1], f)
}

/** Monday-of-week label for week cells. */
export function weekDateLabel(absoluteWeek: number): string {
  const base = new Date()
  const day = base.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(base)
  monday.setHours(12, 0, 0, 0)
  monday.setDate(monday.getDate() + mondayOffset + (absoluteWeek - 1) * 7)
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
