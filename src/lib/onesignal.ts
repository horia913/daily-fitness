'use client'

import OneSignal from 'react-onesignal'

let initialized = false

export const initOneSignal = async () => {
  if (initialized) return true
  
  try {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    
    if (!appId) {
      console.warn('OneSignal App ID not found in environment variables')
      return false
    }

    await OneSignal.init({
      appId: appId,
      safari_web_id: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID,
      notifyButton: {
        enable: false, // We'll use custom UI
      },
      allowLocalhostAsSecureOrigin: true, // For development
      serviceWorkerParam: { scope: '/' },
      serviceWorkerPath: '/OneSignalSDKWorker.js',
    })

    initialized = true
    console.log('✅ OneSignal initialized successfully')
    
    return true
  } catch (error) {
    console.error('❌ OneSignal initialization failed:', error)
    return false
  }
}

// Subscribe user to push notifications
export const subscribeUser = async (userId: string, email?: string, userData?: {
  role?: 'coach' | 'client'
  firstName?: string
  lastName?: string
}) => {
  try {
    if (!initialized) {
      await initOneSignal()
    }

    // Set external user ID (your app's user ID)
    await OneSignal.login(userId)
    
    // Set email for email notifications
    if (email) {
      await OneSignal.User.addEmail(email)
    }
    
    // Add tags for segmentation
    if (userData) {
      await OneSignal.User.addTags({
        role: userData.role || 'client',
        first_name: userData.firstName || '',
        last_name: userData.lastName || ''
      })
    }
    
    console.log('✅ User subscribed to OneSignal:', userId)
    return true
  } catch (error) {
    console.error('❌ Failed to subscribe user:', error)
    return false
  }
}

// Request push notification permission
export const requestPushPermission = async () => {
  try {
    if (!initialized) {
      await initOneSignal()
    }

    const permission = await OneSignal.Notifications.permission
    
    if (permission === false) {
      // Request permission
      await OneSignal.Notifications.requestPermission()
    }
    
    return true
  } catch (error) {
    console.error('Failed to request push permission:', error)
    return false
  }
}

// Update user tags (for targeting notifications)
export const updateUserTags = async (tags: {
  role?: 'coach' | 'client'
  firstName?: string
  lastName?: string
  [key: string]: any
}) => {
  try {
    if (!initialized) return false
    
    await OneSignal.User.addTags(tags)
    return true
  } catch (error) {
    console.error('Failed to update user tags:', error)
    return false
  }
}

// Unsubscribe (on logout)
export const unsubscribeUser = async () => {
  try {
    if (!initialized) return
    
    await OneSignal.logout()
    console.log('✅ User unsubscribed from OneSignal')
  } catch (error) {
    console.error('Failed to unsubscribe:', error)
  }
}

// Check if user is subscribed to push
export const isPushSubscribed = async (): Promise<boolean> => {
  try {
    if (!initialized) return false
    
    const permission = await OneSignal.Notifications.permission
    return permission === true
  } catch (error) {
    return false
  }
}

// Get notification permission status
export const getPermissionStatus = async (): Promise<'granted' | 'denied' | 'default'> => {
  try {
    if (!initialized) return 'default'
    
    const permission = await OneSignal.Notifications.permission
    if (permission === true) return 'granted'
    if (permission === false) return 'denied'
    return 'default'
  } catch (error) {
    return 'default'
  }
}

// OneSignal service for components
export const oneSignalService = {
  async initialize(): Promise<boolean> {
    return await initOneSignal()
  },
  
  async initializeWithUser(userId: string, tags: Record<string, any>): Promise<boolean> {
    return await subscribeUser(userId, undefined, tags)
  }
}