'use client'

import Link from 'next/link'
import { Eye, MessageSquare, Settings, Dumbbell, Apple, Zap, Calendar } from 'lucide-react'
import type { ComplianceDashboardData } from '@/lib/clientCompliance'
import { ClientComplianceTracker } from '@/lib/clientCompliance'
import { ClientMetricStrip } from './ClientMetricStrip'
import { ClientCountStrip } from './ClientCountStrip'
import { InsightsCallout } from './InsightsCallout'

function initials(first?: string, last?: string): string {
  const a = (first?.[0] ?? '').toUpperCase()
  const b = (last?.[0] ?? '').toUpperCase()
  return (a + b) || '?'
}

function avatarGradient(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const hue = h % 360
  const hue2 = (hue + 40) % 360
  return `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${hue2} 50% 28%))`
}

function pillChrome(tier: 'crit' | 'warn' | 'good' | 'muted') {
  const map = {
    crit: { bg: 'var(--critical-soft)', fg: 'var(--critical)', bd: 'rgba(255,90,95,0.35)' },
    warn: { bg: 'var(--warning-soft)', fg: 'var(--warning)', bd: 'rgba(245,194,66,0.35)' },
    good: { bg: 'var(--good-soft)', fg: 'var(--good)', bd: 'rgba(52,211,153,0.35)' },
    muted: { bg: 'rgba(255,255,255,0.04)', fg: 'var(--t3)', bd: 'var(--line)' },
  }
  return map[tier]
}

export function ComplianceClientCard({
  row,
  hasNutritionPlan,
  hasHabitsConfigured,
}: {
  row: ComplianceDashboardData
  hasNutritionPlan: boolean
  hasHabitsConfigured: boolean
}) {
  const { client, compliance, engagement, insights } = row
  const name = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || 'Client'
  const complianceLevel = ClientComplianceTracker.getComplianceLevel(compliance.overall_compliance)
  const engagementLevel = ClientComplianceTracker.getEngagementLevel(compliance.engagement_score)

  const flagged = compliance.overall_compliance < 75
  const stripe =
    compliance.overall_compliance < 50
      ? 'var(--critical)'
      : compliance.overall_compliance < 75
        ? 'var(--warning)'
        : null

  const filteredInsights = insights.filter((line) => {
    const l = line.toLowerCase()
    if (!hasNutritionPlan && l.includes('nutrition')) return false
    if (!hasHabitsConfigured && l.includes('habit')) return false
    return true
  })

  const showInsights = flagged && filteredInsights.length > 0

  const pills: Array<{ text: string; tier: 'crit' | 'warn' | 'good' | 'muted' }> = []
  if (compliance.overall_compliance < 50) pills.push({ text: 'Critical compliance', tier: 'crit' })
  if (engagementLevel.level === 'low') pills.push({ text: 'Low engagement', tier: 'warn' })
  if (engagementLevel.level === 'very_low') pills.push({ text: 'Very low engagement', tier: 'warn' })
  if (compliance.overall_compliance >= 75) pills.push({ text: 'On track', tier: 'good' })

  const statusDot =
    complianceLevel.level === 'excellent'
      ? 'var(--good)'
      : complianceLevel.level === 'good'
        ? 'var(--cyan)'
        : complianceLevel.level === 'fair'
          ? 'var(--warning)'
          : 'var(--critical)'

  const fmtPct = (v: number, na: boolean) => (na ? 'N/A' : `${Math.round(v)}%`)

  const metricCells = [
    {
      icon: Dumbbell,
      abbrev: 'Wkt',
      domainColor: 'var(--cyan)',
      valueLabel: fmtPct(compliance.workout_compliance, false),
      pct: compliance.workout_compliance,
      na: false,
    },
    {
      icon: Apple,
      abbrev: 'Nut',
      domainColor: 'var(--good)',
      valueLabel: fmtPct(compliance.nutrition_compliance, !hasNutritionPlan),
      pct: hasNutritionPlan ? compliance.nutrition_compliance : null,
      na: !hasNutritionPlan,
    },
    {
      icon: Zap,
      abbrev: 'Hab',
      domainColor: 'var(--warning)',
      valueLabel: fmtPct(compliance.habit_compliance, !hasHabitsConfigured),
      pct: hasHabitsConfigured ? compliance.habit_compliance : null,
      na: !hasHabitsConfigured,
    },
    {
      icon: Calendar,
      abbrev: 'Ses',
      domainColor: 'var(--purple)',
      valueLabel: fmtPct(compliance.session_attendance, false),
      pct: compliance.session_attendance,
      na: false,
    },
  ]

  const countCells = [
    {
      icon: Dumbbell,
      abbrev: 'Wkts',
      domainColor: 'var(--cyan)',
      value: engagement.workout_sessions,
      sub: 'this wk',
    },
    {
      icon: Apple,
      abbrev: 'Nut',
      domainColor: 'var(--good)',
      value: engagement.nutrition_logs,
      sub: 'logs',
    },
    {
      icon: Zap,
      abbrev: 'Hab',
      domainColor: 'var(--warning)',
      value: engagement.habit_completions,
      sub: 'done',
    },
    {
      icon: MessageSquare,
      abbrev: 'Msg',
      domainColor: 'var(--purple)',
      value: engagement.messages_sent,
      sub: 'this wk',
    },
  ]

  return (
    <div
      className="relative overflow-hidden rounded-[18px] border p-3.5"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--line)',
        borderLeftWidth: stripe ? 3 : 1,
        borderLeftColor: stripe ?? 'var(--line)',
      }}
    >
      {stripe ? (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1/2"
          style={{
            background: `linear-gradient(90deg, ${
              stripe === 'var(--critical)' ? 'var(--critical-soft)' : 'var(--warning-soft)'
            }, transparent)`,
          }}
        />
      ) : null}
      <div className="relative z-[1] space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div
              className="relative flex size-[38px] shrink-0 items-center justify-center rounded-[11px] text-xs font-bold text-white"
              style={{
                fontFamily: 'var(--f-headline, "Bricolage Grotesque", sans-serif)',
                background: avatarGradient(client.id),
              }}
            >
              {initials(client.first_name, client.last_name)}
              <span
                className="absolute -bottom-0.5 -right-0.5 size-[11px] rounded-full border-2"
                style={{ borderColor: 'var(--card)', background: statusDot }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium" style={{ color: 'var(--t1)' }}>
                {name}
              </div>
              <div className="truncate text-xs" style={{ color: 'var(--t3)' }}>
                {client.email}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Link
              href={`/coach/clients/${client.id}`}
              className="flex size-[26px] items-center justify-center rounded-lg border transition-colors hover:bg-white/[0.04]"
              style={{ borderColor: 'var(--line)', color: 'var(--t2)' }}
              aria-label="View client"
            >
              <Eye className="size-3.5" />
            </Link>
            <Link
              href={`/coach/clients/${client.id}`}
              className="flex size-[26px] items-center justify-center rounded-lg border transition-colors hover:bg-white/[0.04]"
              style={{ borderColor: 'var(--line)', color: 'var(--t2)' }}
              aria-label="Message client"
            >
              <MessageSquare className="size-3.5" />
            </Link>
            <Link
              href={`/coach/clients/${client.id}`}
              className="flex size-[26px] items-center justify-center rounded-lg border transition-colors hover:bg-white/[0.04]"
              style={{ borderColor: 'var(--line)', color: 'var(--t2)' }}
              aria-label="Client settings"
            >
              <Settings className="size-3.5" />
            </Link>
          </div>
        </div>

        {pills.length ? (
          <div className="flex flex-wrap gap-1.5">
            {pills.map((p) => {
              const c = pillChrome(p.tier)
              return (
                <span
                  key={p.text}
                  className="rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide"
                  style={{
                    fontFamily: 'var(--f-mono, "Geist Mono", monospace)',
                    background: c.bg,
                    color: c.fg,
                    borderColor: c.bd,
                  }}
                >
                  {p.text}
                </span>
              )
            })}
          </div>
        ) : null}

        <ClientMetricStrip cells={metricCells} />
        <ClientCountStrip cells={countCells} />

        {showInsights ? <InsightsCallout items={filteredInsights.slice(0, 5)} /> : null}
      </div>
    </div>
  )
}
