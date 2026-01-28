'use client'

import { useState, useEffect, useCallback } from 'react'
import { notificationService, NotificationData } from '@/lib/notifications'
import { isNotificationsPollDisabled } from '@/lib/featureFlags'
import { isLiveWorkoutRoute } from '@/lib/workoutMode'
import { usePathname } from 'next/navigation'

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (isLiveWorkoutRoute(pathname)) {
      return
    }
    // Initialize the service for browser environment
    notificationService.initialize()
    
    // Check initial permission
    setPermissionGranted(notificationService.canSendNotifications())
    
    // Load notifications
    loadNotifications()
    
    // Set up interval to check for updates
    if (isNotificationsPollDisabled) {
      return
    }

    const interval = setInterval(loadNotifications, 5000)

    return () => clearInterval(interval)
  }, [pathname])

  const loadNotifications = useCallback(async () => {
    try {
      const allNotifications = await notificationService.getNotifications()
      const unreadCount = await notificationService.getUnreadCount()
      
      setNotifications(allNotifications)
      setUnreadCount(unreadCount)
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    try {
      const permission = await notificationService.requestPermission()
      setPermissionGranted(permission.granted)
      return permission
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      throw error
    }
  }, [])

  const sendWorkoutReminder = useCallback(async (workoutName: string, scheduledTime: string) => {
    try {
      await notificationService.sendWorkoutReminder(workoutName, scheduledTime)
      loadNotifications()
    } catch (error) {
      console.error('Error sending workout reminder:', error)
    }
  }, [loadNotifications])

  const sendAchievementNotification = useCallback(async (achievementName: string, description: string) => {
    try {
      await notificationService.sendAchievementNotification(achievementName, description)
      loadNotifications()
    } catch (error) {
      console.error('Error sending achievement notification:', error)
    }
  }, [loadNotifications])

  const sendWorkoutCompleteNotification = useCallback(async (workoutName: string, duration: number) => {
    try {
      await notificationService.sendWorkoutCompleteNotification(workoutName, duration)
      loadNotifications()
    } catch (error) {
      console.error('Error sending workout complete notification:', error)
    }
  }, [loadNotifications])

  const sendMessageNotification = useCallback(async (senderName: string, message: string) => {
    // Deprecated - messaging moved to WhatsApp
    console.log('Message notifications disabled - use WhatsApp for coach-client communication')
  }, [])

  const sendGoalReminder = useCallback(async (goalName: string, progress: string) => {
    try {
      await notificationService.sendGoalReminder(goalName, progress)
      loadNotifications()
    } catch (error) {
      console.error('Error sending goal reminder:', error)
    }
  }, [loadNotifications])

  const markAsRead = useCallback(async (notificationId: string) => {
    await notificationService.markAsRead(notificationId)
    loadNotifications()
  }, [loadNotifications])

  const markAllAsRead = useCallback(async () => {
    await notificationService.markAllAsRead()
    loadNotifications()
  }, [loadNotifications])

  const clearAllNotifications = useCallback(async () => {
    await notificationService.clearAllNotifications()
    loadNotifications()
  }, [loadNotifications])

  return {
    notifications,
    unreadCount,
    permissionGranted,
    requestPermission,
    sendWorkoutReminder,
    sendAchievementNotification,
    sendWorkoutCompleteNotification,
    sendMessageNotification,
    sendGoalReminder,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    loadNotifications
  }
}
