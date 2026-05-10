'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LineChart, ShieldCheck, TrendingUp, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import hub from '@/components/coach-analytics/coachAnalyticsHub.module.css'

const analyticsTabs = [
  { href: '/coach/analytics', label: 'Overview', icon: LineChart, activeClass: hub.tabActiveCyan },
  { href: '/coach/compliance', label: 'Compliance', icon: ShieldCheck, activeClass: hub.tabActiveWarning },
  { href: '/coach/progress', label: 'Progress', icon: TrendingUp, activeClass: hub.tabActivePurple },
  { href: '/coach/reports', label: 'Reports', icon: FileText, activeClass: hub.tabActiveGood },
] as const

export default function AnalyticsNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav
      className={cn(hub.tabNav, hub.scrollbarHide)}
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
            data-active={isActive}
            onClick={() => router.push(tab.href)}
            className={cn(hub.tabBtn, isActive ? tab.activeClass : undefined)}
          >
            <Icon className={hub.tabIcon} aria-hidden />
            <span>{tab.label}</span>
            {isActive ? <span className={hub.activeDot} aria-hidden /> : null}
          </button>
        )
      })}
    </nav>
  )
}
