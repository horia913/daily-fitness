'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
      return <Clock className="w-4 h-4 text-blue-600" />
    case 'achievement':
      return <Trophy className="w-4 h-4 text-yellow-600" />
    case 'workout':
      return <Dumbbell className="w-4 h-4 text-purple-600" />
    case 'session':
      return <MessageCircle className="w-4 h-4 text-green-600" />
    case 'general':
      return <Target className="w-4 h-4 text-orange-600" />
    default:
      return <Bell className="w-4 h-4 text-slate-600" />
  }
}

const getNotificationColor = (type: NotificationData['type']) => {
  switch (type) {
    case 'reminder':
      return 'bg-blue-100 text-blue-800'
    case 'achievement':
      return 'bg-yellow-100 text-yellow-800'
    case 'session':
      return 'bg-green-100 text-green-800'
    case 'workout':
      return 'bg-purple-100 text-purple-800'
    case 'general':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-slate-100 text-slate-800'
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end p-4">
      <div className="w-full max-w-sm" style={{maxWidth: '400px'}}>
        <Card className="bg-white border-slate-200 w-full max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl">
          <CardHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-slate-600" />
                <CardTitle className="text-lg">Notifications</CardTitle>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="p-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4 text-green-600" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="p-1"
                  title="Clear all"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-slate-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-slate-800 mb-1">No notifications</h3>
                <p className="text-sm text-slate-500">
                  You're all caught up! New notifications will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
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
                            <h4 className="text-sm font-medium text-slate-800 mb-1">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${getNotificationColor(notification.type)}`}>
                                {notification.type.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-slate-500">
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
                                className="p-1"
                                title="Mark as read"
                              >
                                <Check className="w-3 h-3 text-green-600" />
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
