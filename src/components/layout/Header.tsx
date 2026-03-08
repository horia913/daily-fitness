'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Bell } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

export default function Header() {
  const pathname = usePathname()
  const { user, profile } = useAuth()

  const initials = profile?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
  const profileHref = pathname?.startsWith('/coach') ? '/coach/profile' : '/client/profile'

  return (
    <header className="fc-header-bar">
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
