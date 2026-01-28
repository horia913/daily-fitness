'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { LogOut, User, Sun, Moon } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

export default function Header() {
  const { user, signOut } = useAuth()
  const { toggleTheme, isDark } = useTheme()

  return (
    <header className="fc-glass fc-card border-b border-[color:var(--fc-glass-border)] px-4 py-3 relative z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 fc-icon-tile fc-icon-workouts rounded-lg flex items-center justify-center">
            <span className="fc-text-primary font-bold text-sm">DF</span>
          </div>
          <div>
            <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
              App
            </span>
            <h1 className="text-xl font-bold fc-text-primary mt-2">DailyFitness</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="fc-btn fc-btn-ghost fc-press rounded-full"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
          
          <NotificationBell />
          
          <div className="flex items-center gap-2 fc-text-subtle">
            <User className="w-4 h-4" />
            <span className="text-sm hidden sm:block">
              {user?.email?.split('@')[0] || 'User'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
