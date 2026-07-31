'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'
import NotificationCenter from './NotificationCenter'
import { usePathname } from 'next/navigation'
import { isLiveWorkoutRoute } from '@/lib/workoutMode'
import { getUnreadNotificationCount } from '@/lib/inAppNotificationService'

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotificationCenter, setShowNotificationCenter] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (isLiveWorkoutRoute(pathname)) {
      return
    }

    const updateUnreadCount = async () => {
      const count = await getUnreadNotificationCount()
      setUnreadCount(count)
    }

    void updateUnreadCount()
    const interval = setInterval(() => void updateUnreadCount(), 15_000)
    return () => clearInterval(interval)
  }, [pathname])

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotificationCenter(true)}
        className="relative p-2 z-50 fc-btn fc-btn-ghost fc-press"
        title="Notifications"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
      >
        <Bell className="w-5 h-5 fc-text-primary" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 fc-pill fc-pill-glass fc-text-error text-[10px] min-w-[18px] h-[18px] flex items-center justify-center p-0">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      <NotificationCenter
        isOpen={showNotificationCenter}
        onClose={() => {
          setShowNotificationCenter(false)
          void getUnreadNotificationCount().then(setUnreadCount)
        }}
      />
    </>
  )
}
