'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LineChart, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import hub from '@/components/coach-analytics/coachAnalyticsHub.module.css'

const analyticsTabs = [
  { href: '/coach/insights', label: 'Insights', icon: LineChart, activeClass: hub.tabActiveAccentSolid },
  { href: '/coach/reports', label: 'Reports', icon: FileText, activeClass: hub.tabActiveAccentSolid },
] as const

function isTabActive(pathname: string, href: string): boolean {
  if (href === '/coach/insights') {
    return (
      pathname === '/coach/insights' ||
      pathname.startsWith('/coach/analytics') ||
      pathname.startsWith('/coach/compliance')
    )
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

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
        const isActive = isTabActive(pathname, tab.href)

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
