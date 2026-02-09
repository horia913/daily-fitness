'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon, Bell } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

export default function Header() {
  const { user, profile } = useAuth()
  const { toggleTheme, isDark } = useTheme()

  const initials = profile?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <header className="fc-header-bar">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-full px-4 md:px-6">
        {/* Left: Avatar */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold fc-header-avatar">
            {initials}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="fc-header-icon-btn"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun className="w-[18px] h-[18px]" />
            ) : (
              <Moon className="w-[18px] h-[18px]" />
            )}
          </button>
          
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}
