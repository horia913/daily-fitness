'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell } from 'lucide-react'
import { notificationService } from '@/lib/notifications'
import NotificationCenter from './NotificationCenter'

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotificationCenter, setShowNotificationCenter] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)

  useEffect(() => {
    // Initialize the service for browser environment
    notificationService.initialize()
    
    // Check notification permission
    setPermissionGranted(notificationService.canSendNotifications())
    
    // Load initial unread count
    updateUnreadCount()
    
    // Set up interval to check for new notifications
    const interval = setInterval(updateUnreadCount, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const updateUnreadCount = async () => {
    const count = await notificationService.getUnreadCount()
    setUnreadCount(count)
  }

  const handleBellClick = async () => {
    if (!permissionGranted) {
      try {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission()
          setPermissionGranted(permission === 'granted')
          
          if (permission === 'granted') {
            // Send a welcome notification
            new Notification('🔔 Notifications Enabled!', {
              body: 'You\'ll now receive workout reminders and achievement notifications.',
            })
            updateUnreadCount()
          }
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error)
      }
    }
    
    setShowNotificationCenter(true)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBellClick}
        className="relative p-2 z-50"
        title={permissionGranted ? 'Notifications' : 'Enable Notifications'}
      >
        <Bell className={`w-5 h-5 ${permissionGranted ? 'text-slate-600' : 'text-slate-400'}`} />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <NotificationCenter
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />
    </>
  )
}
