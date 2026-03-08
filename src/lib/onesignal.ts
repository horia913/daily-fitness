'use client'

import OneSignal from 'react-onesignal'

let initialized = false
let initAttempted = false

/**
 * Safe wrapper for OneSignal initialization with timeout.
 * OneSignal should NEVER block page rendering or data loading.
 */
async function initOneSignalWithTimeout(): Promise<boolean> {
  if (initialized) return true
  if (initAttempted) return false // Only try once per session
  
  initAttempted = true
  
  try {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    
    if (!appId || appId === 'your-onesignal-app-id' || appId === 'your-actual-app-id-here') {
      console.log('[OneSignal] No app ID configured, skipping initialization')
      return false
    }

    // In development, skip OneSignal if port doesn't match expected (3000)
    // This prevents "Can only be used on: http://localhost:3000" errors
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const currentOrigin = window.location.origin;
      const expectedOrigin = process.env.NEXT_PUBLIC_ONESIGNAL_ORIGIN || 'http://localhost:3000';
      if (!currentOrigin.includes('localhost:3000') && currentOrigin.includes('localhost')) {
        console.log(`[OneSignal] Skipping init - port mismatch. Current: ${currentOrigin}, Expected: ${expectedOrigin}`);
        return false;
      }
    }

    // Wrap OneSignal.init in a timeout - max 3 seconds
    // If it takes longer, just move on - notifications aren't critical
    await Promise.race([
      OneSignal.init({
      appId: appId,
      safari_web_id: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID,
      notifyButton: {
        enable: false, // We'll use custom UI
        prenotify: false,
        showCredit: false,
        text: {
          'tip.state.unsubscribed': 'Subscribe to notifications',
          'tip.state.subscribed': "You're subscribed to notifications",
          'tip.state.blocked': "You've blocked notifications",
          'message.prenotify': 'Click to subscribe to notifications',
          'message.action.subscribing': 'Subscribing...',
          'message.action.subscribed': "Thanks for subscribing!",
          'message.action.resubscribed': "You're subscribed to notifications",
          'message.action.unsubscribed': "You won't receive notifications again",
          'dialog.main.title': 'Manage Site Notifications',
          'dialog.main.button.subscribe': 'SUBSCRIBE',
          'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
          'dialog.blocked.title': 'Unblock Notifications',
          'dialog.blocked.message': "Follow these instructions to allow notifications:"
        }
      },
        allowLocalhostAsSecureOrigin: true, // For development
        serviceWorkerParam: { scope: '/' },
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        // Suppress session tracking errors when user hasn't subscribed
        autoResubscribe: false,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OneSignal init timeout')), 3000)
      )
    ]);

    // Suppress OneSignal "No subscription" errors in console
    if (typeof window !== 'undefined') {
      const originalError = console.error
      console.error = (...args: any[]) => {
        const errorMessage = args[0]?.toString() || ''
        // Filter out OneSignal session tracking errors and port mismatch errors
        if (
          (errorMessage.includes('No subscription') && errorMessage.includes('SessionManager')) ||
          errorMessage.includes('Can only be used on:') ||
          errorMessage.includes('localhost')
        ) {
          return // Suppress these errors
        }
        originalError.apply(console, args)
      }
    }

    initialized = true
    console.log('✅ OneSignal initialized successfully')
    
    return true
  } catch (error: any) {
    // Log but DO NOT throw - notifications failing should never break the app
    const errorMessage = error?.message || String(error);
    
    if (errorMessage.includes('timeout')) {
      console.warn('[OneSignal] Initialization timed out after 3s (non-critical - notifications disabled)');
    } else if (process.env.NODE_ENV === 'development' && (
      errorMessage.includes('Can only be used on:') ||
      errorMessage.includes('localhost')
    )) {
      console.log('[OneSignal] Port mismatch in dev (non-critical):', errorMessage);
    } else {
      console.warn('[OneSignal] Initialization failed (non-critical):', errorMessage);
    }
    
    return false // Fail gracefully, don't block app
  }
}

export const initOneSignal = async () => {
  return await initOneSignalWithTimeout();
}

// Subscribe user to push notifications
export const subscribeUser = async (userId: string, email?: string, userData?: {
  role?: 'coach' | 'client'
  firstName?: string
  lastName?: string
}) => {
  try {
    if (!initialized) {
      const initResult = await initOneSignal()
      if (!initResult) {
        // OneSignal not available - fail silently
        return false
      }
    }

    // Wrap OneSignal operations in timeout to prevent hanging
    await Promise.race([
      (async () => {
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
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OneSignal subscribe timeout')), 2000)
      )
    ]);
    
    console.log('✅ User subscribed to OneSignal:', userId)
    return true
  } catch (error: any) {
    // Log but don't throw - subscription failure shouldn't break the app
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('timeout')) {
      console.warn('[OneSignal] User subscription timed out (non-critical)');
    } else {
      console.warn('[OneSignal] Failed to subscribe user (non-critical):', errorMessage);
    }
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
    
    // Wrap in timeout to prevent hanging
    await Promise.race([
      OneSignal.User.addTags(tags),
      new Promise<void>((resolve) =>
        setTimeout(() => {
          console.warn('[OneSignal] Update tags timed out (non-critical)');
          resolve();
        }, 2000)
      )
    ]);
    
    return true
  } catch (error: any) {
    console.warn('[OneSignal] Failed to update user tags (non-critical):', error?.message || String(error));
    return false
  }
}

// Unsubscribe (on logout)
export const unsubscribeUser = async () => {
  try {
    if (!initialized) return
    
    // Wrap in timeout to prevent blocking logout
    await Promise.race([
      OneSignal.logout(),
      new Promise<void>((resolve) =>
        setTimeout(() => {
          console.warn('[OneSignal] Unsubscribe timed out (non-critical)');
          resolve();
        }, 2000)
      )
    ]);
    
    console.log('✅ User unsubscribed from OneSignal')
  } catch (error: any) {
    // Log but don't throw - unsubscribe failure shouldn't block logout
    console.warn('[OneSignal] Failed to unsubscribe (non-critical):', error?.message || String(error));
  }
}

// Check if user is subscribed to push
export const isPushSubscribed = async (): Promise<boolean> => {
  try {
    if (!initialized) return false
    
    // Wrap in timeout to prevent hanging
    const permission = await Promise.race([
      OneSignal.Notifications.permission,
      new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), 1000)
      )
    ]);
    
    return permission === true
  } catch (error) {
    return false
  }
}

// Get notification permission status
export const getPermissionStatus = async (): Promise<'granted' | 'denied' | 'default'> => {
  try {
    if (!initialized) return 'default'
    
    // Wrap in timeout to prevent hanging
    const permission = await Promise.race([
      OneSignal.Notifications.permission,
      new Promise<boolean | 'default'>((resolve) =>
        setTimeout(() => resolve('default'), 1000)
      )
    ]);
    
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