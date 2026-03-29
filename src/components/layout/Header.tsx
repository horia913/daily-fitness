'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import NotificationBell from '@/components/NotificationBell'

export default function Header() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const headerRef = useRef<HTMLElement>(null)

  const initials = profile?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
  const profileHref = pathname?.startsWith('/coach') ? '/coach/profile' : '/client/profile'

  useEffect(() => {
    const main = document.querySelector('main')
    const el = headerRef.current
    if (!main || !el) return
    const onScroll = () => {
      el.classList.toggle('fc-header-collapsed', main.scrollTop > 20)
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => main.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header ref={headerRef} className="fc-header-bar fc-header transition-[box-shadow,background-color] duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-full px-4 md:px-6">
        {/* Left: Avatar (links to Profile) */}
        <div className="flex items-center gap-3">
          <Link href={profileHref} className="block" aria-label="Go to profile">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold fc-header-avatar">
              {initials}
            </div>
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}
