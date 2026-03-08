'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, ClipboardCheck, TrendingUp, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const analyticsTabs = [
  { href: '/coach/analytics', label: 'Overview', icon: BarChart3 },
  { href: '/coach/adherence', label: 'Adherence', icon: ClipboardCheck },
  { href: '/coach/progress', label: 'Progress', icon: TrendingUp },
  { href: '/coach/reports', label: 'Reports', icon: FileText },
]

export default function AnalyticsNav() {
  const pathname = usePathname()

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
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px] rounded-t-xl',
                'border-b-2 -mb-[1px]',
                isActive
                  ? 'text-[color:var(--fc-accent)] border-[color:var(--fc-accent)]'
                  : 'text-[color:var(--fc-text-dim)] border-transparent hover:text-[color:var(--fc-text-primary)] hover:border-[color:var(--fc-glass-border)]'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
