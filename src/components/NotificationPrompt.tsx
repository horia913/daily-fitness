'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Bell, X } from 'lucide-react'
import { requestPushPermission, getPermissionStatus } from '@/lib/oneSignal'
import { useTheme } from '@/contexts/ThemeContext'

export default function NotificationPrompt() {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [showPrompt, setShowPrompt] = useState(false)
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default'>('default')

  useEffect(() => {
    checkPermission()
  }, [])

  const checkPermission = async () => {
    const perm = await getPermissionStatus()
    setPermission(perm)
    
    // Show prompt after 5 seconds if permission not granted
    if (perm === 'default') {
      const timer = setTimeout(() => setShowPrompt(true), 5000)
      return () => clearTimeout(timer)
    }
  }

  const handleEnable = async () => {
    try {
      await requestPushPermission()
      const newPerm = await getPermissionStatus()
      setPermission(newPerm)
      setShowPrompt(false)
      
      if (newPerm === 'granted') {
        // Show success message
        console.log('✅ Push notifications enabled!')
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Don't show again for 24 hours
    localStorage.setItem('notificationPromptDismissed', Date.now().toString())
  }

  // Check if dismissed recently
  useEffect(() => {
    const dismissed = localStorage.getItem('notificationPromptDismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const hoursSince = (Date.now() - dismissedTime) / (1000 * 60 * 60)
      if (hoursSince < 24) {
        setShowPrompt(false)
      }
    }
  }, [])

  if (!showPrompt || permission !== 'default') return null

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <Card className={`${theme.card} shadow-2xl border-2 border-purple-300 dark:border-purple-700`}>
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className={`font-bold text-base sm:text-lg ${theme.text}`}>Stay in the Loop!</h3>
                <p className={`text-xs sm:text-sm ${theme.textSecondary} mt-1`}>
                  Get notified about workouts, sessions, and achievements
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="p-1 rounded-lg flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleEnable}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm"
            >
              Enable
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="flex-1 rounded-xl text-sm"
            >
              Not Now
            </Button>
          </div>
        </div>
      </Card>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

