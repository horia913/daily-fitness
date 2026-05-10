'use client'

function rankColor(rank: number): string {
  if (rank === 1) return 'var(--lime)'
  if (rank === 2) return 'var(--cyan)'
  if (rank === 3) return 'var(--purple)'
  return 'var(--t3)'
}

function pctColor(pct: number | null, empty: boolean): string {
  if (empty || pct === null) return 'var(--t4)'
  if (pct >= 75) return 'var(--good)'
  if (pct >= 50) return 'var(--warning)'
  if (pct > 0) return 'var(--critical)'
  return 'var(--t4)'
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function avatarGradient(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const hue = h % 360
  const hue2 = (hue + 40) % 360
  return `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${hue2} 50% 28%))`
}

export function RankingRow({
  rank,
  name,
  avatarUrl,
  seed,
  pct,
  attentionStripe,
}: {
  rank: number
  name: string
  avatarUrl?: string | null
  seed: string
  pct: number | null
  attentionStripe?: boolean
}) {
  const empty = pct === null || Number.isNaN(pct)
  const pctLabel = empty ? '—' : `${Math.round(pct)}%`

  return (
    <div
      className="flex items-center gap-2 rounded-[11px] border px-2.5 py-2"
      style={{
        background: 'var(--card-2)',
        borderColor: 'var(--line-2)',
        borderLeftWidth: attentionStripe ? 2 : 1,
        borderLeftColor: attentionStripe ? 'var(--critical)' : 'var(--line-2)',
      }}
    >
      <div
        className="w-[18px] shrink-0 text-center text-[11px] font-semibold"
        style={{ fontFamily: 'var(--f-mono, "Geist Mono", monospace)', color: rankColor(rank) }}
      >
        {rank}
      </div>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="size-[26px] shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div
          className="flex size-[26px] shrink-0 items-center justify-center rounded-lg text-[10px] font-bold leading-none text-white"
          style={{
            fontFamily: 'var(--f-headline, "Bricolage Grotesque", sans-serif)',
            background: avatarGradient(seed),
          }}
        >
          {initials(name)}
        </div>
      )}
      <span className="min-w-0 flex-1 truncate text-xs font-medium" style={{ color: 'var(--t1)' }}>
        {name}
      </span>
      <span
        className="shrink-0 text-[14px] font-bold leading-none"
        style={{
          fontFamily: 'var(--f-display, "Big Shoulders Display", sans-serif)',
          color: pctColor(pct, empty),
        }}
      >
        {pctLabel}
      </span>
    </div>
  )
}
