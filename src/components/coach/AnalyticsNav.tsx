'use client'

/**
 * AnalyticsNav — coach Analytics tab strip
 *
 * Spec ref: design-system-v4 §6.33 Tab strip (active = cyan underline + primary
 *           text; inactive = dim text, no underline). Canonical v4 example
 *           lists exactly these four tabs (Overview / Compliance / Progress /
 *           Reports).
 *
 * Phase 0b (Task 3): replaced the undefined token `var(--fc-accent)` with
 * `var(--fc-accent-cyan)`. The bare `--fc-accent` is not defined in
 * `src/styles/ui-system.css`, so the active state was silently falling back
 * to the parent color. This restores the cyan underline + cyan text active
 * state mandated by §6.33.
 */

import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, ShieldCheck, TrendingUp, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const analyticsTabs = [
  { href: '/coach/analytics', label: 'Overview', icon: BarChart3 },
  { href: '/coach/compliance', label: 'Compliance', icon: ShieldCheck },
  { href: '/coach/progress', label: 'Progress', icon: TrendingUp },
  { href: '/coach/reports', label: 'Reports', icon: FileText },
]

export default function AnalyticsNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="border-b border-[color:var(--fc-glass-border)] mb-4 sm:mb-6 -mx-4 sm:mx-0 px-4 sm:px-0">
      <nav
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        role="tablist"
        aria-label="Analytics sections"
      >
        {analyticsTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = pathname === tab.href

          return (
            <button
              key={tab.href}
              type="button"
              onClick={() => router.push(tab.href)}
              className={cn(
                'bg-transparent border-none cursor-pointer',
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px] rounded-t-xl',
                'border-b-2 -mb-[1px]',
                isActive
                  ? 'text-[color:var(--fc-accent-cyan)] border-[color:var(--fc-accent-cyan)]'
                  : 'text-[color:var(--fc-text-dim)] border-transparent hover:text-[color:var(--fc-text-primary)] hover:border-[color:var(--fc-glass-border)]'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
