'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { LogOut, User, Sun, Moon } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

export default function Header() {
  const { user, signOut } = useAuth()
  const { isDark, toggleTheme, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  return (
    <header className={`${theme.background} border-b ${theme.border} px-4 py-3 relative z-30`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">DF</span>
          </div>
          <h1 className={`text-xl font-bold ${theme.text}`}>DailyFitness</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className={`${theme.secondary} ${theme.shadow} rounded-full`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
          
          <NotificationBell />
          
          <div className={`flex items-center gap-2 ${theme.textSecondary}`}>
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
