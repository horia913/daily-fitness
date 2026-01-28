'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Bell, 
  X, 
  Check, 
  CheckCheck, 
  Trash2,
  Dumbbell,
  Trophy,
  MessageCircle,
  Target,
  Clock
} from 'lucide-react'
import { notificationService, NotificationData } from '@/lib/notifications'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

const getNotificationIcon = (type: NotificationData['type']) => {
  switch (type) {
    case 'reminder':
      return <Clock className="w-4 h-4 fc-text-workouts" />
    case 'achievement':
      return <Trophy className="w-4 h-4 fc-text-warning" />
    case 'workout':
      return <Dumbbell className="w-4 h-4 fc-text-habits" />
    case 'session':
      return <MessageCircle className="w-4 h-4 fc-text-success" />
    case 'general':
      return <Target className="w-4 h-4 fc-text-warning" />
    default:
      return <Bell className="w-4 h-4 fc-text-subtle" />
  }
}

const getNotificationColor = (type: NotificationData['type']) => {
  switch (type) {
    case 'reminder':
      return 'fc-text-workouts'
    case 'achievement':
      return 'fc-text-warning'
    case 'session':
      return 'fc-text-success'
    case 'workout':
      return 'fc-text-habits'
    case 'general':
      return 'fc-text-warning'
    default:
      return 'fc-text-subtle'
  }
}

const formatTimestamp = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) { // Less than 1 minute
    return 'Just now'
  } else if (diff < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m ago`
  } else if (diff < 86400000) { // Less than 1 day
    const hours = Math.floor(diff / 3600000)
    return `${hours}h ago`
  } else {
    const days = Math.floor(diff / 86400000)
    return `${days}d ago`
  }
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const unreadCount = await notificationService.getUnreadCount()
      
      // For now, use empty array as notifications are handled server-side
      setNotifications([])
      setUnreadCount(unreadCount)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId)
    loadNotifications()
  }

  const handleMarkAllAsRead = async () => {
    // Mark all notifications as read individually
    notifications.forEach(notification => {
      notificationService.markAsRead(notification.id)
    })
    await loadNotifications()
  }

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all notifications?')) {
      // Mark all notifications as read to clear them
      notifications.forEach(notification => {
        notificationService.markAsRead(notification.id)
      })
      setNotifications([])
      await loadNotifications()
    }
  }

  const handleNotificationClick = (notification: NotificationData) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-end p-4">
      <div className="w-full max-w-sm" style={{maxWidth: '400px'}}>
        <div className="fc-modal fc-card w-full max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="p-4 border-b border-[color:var(--fc-glass-border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="fc-icon-tile fc-icon-workouts">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                    Notifications
                  </span>
                  <div className="text-lg font-semibold fc-text-primary mt-2">Notifications</div>
                </div>
                {unreadCount > 0 && (
                  <span className="fc-pill fc-pill-glass fc-text-error text-xs">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="p-1 fc-btn fc-btn-ghost"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4 fc-text-success" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="p-1 fc-btn fc-btn-ghost"
                  title="Clear all"
                >
                  <Trash2 className="w-4 h-4 fc-text-error" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose} className="fc-btn fc-btn-ghost">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-[color:var(--fc-glass-border)] rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 fc-icon-tile fc-icon-workouts w-12 h-12">
                  <Bell className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-medium fc-text-primary mb-1">No notifications</h3>
                <p className="text-sm fc-text-subtle">
                  You're all caught up! New notifications will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-[color:var(--fc-glass-border)] cursor-pointer transition-colors ${
                      !notification.read ? 'fc-glass-soft' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium fc-text-primary mb-1">
                              {notification.title}
                            </h4>
                            <p className="text-sm fc-text-subtle mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`fc-pill fc-pill-glass text-xs ${getNotificationColor(notification.type)}`}>
                                {notification.type.replace('_', ' ')}
                              </span>
                              <span className="text-xs fc-text-subtle">
                                {formatTimestamp(notification.timestamp instanceof Date ? notification.timestamp.getTime() : new Date(notification.timestamp).getTime())}
                              </span>
                            </div>
                          </div>
                          {!notification.read && (
                            <div className="flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarkAsRead(notification.id)
                                }}
                                className="p-1 fc-btn fc-btn-ghost"
                                title="Mark as read"
                              >
                                <Check className="w-3 h-3 fc-text-success" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
