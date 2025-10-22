'use client'

import { useState, useEffect, useCallback } from 'react'
import { notificationService, NotificationData } from '@/lib/notifications'

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [permissionGranted, setPermissionGranted] = useState(false)

  useEffect(() => {
    // Initialize the service for browser environment
    notificationService.initialize()
    
    // Check initial permission
    setPermissionGranted(notificationService.canSendNotifications())
    
    // Load notifications
    loadNotifications()
    
    // Set up interval to check for updates
    const interval = setInterval(loadNotifications, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = useCallback(() => {
    try {
      const allNotifications = notificationService.getNotifications()
      const unreadCount = notificationService.getUnreadCount()
      
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
    try {
      await notificationService.sendMessageNotification(senderName, message)
      loadNotifications()
    } catch (error) {
      console.error('Error sending message notification:', error)
    }
  }, [loadNotifications])

  const sendGoalReminder = useCallback(async (goalName: string, progress: string) => {
    try {
      await notificationService.sendGoalReminder(goalName, progress)
      loadNotifications()
    } catch (error) {
      console.error('Error sending goal reminder:', error)
    }
  }, [loadNotifications])

  const markAsRead = useCallback((notificationId: string) => {
    notificationService.markAsRead(notificationId)
    loadNotifications()
  }, [loadNotifications])

  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead()
    loadNotifications()
  }, [loadNotifications])

  const clearAllNotifications = useCallback(() => {
    notificationService.clearAllNotifications()
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
