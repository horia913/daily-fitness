'use client'

// Service Worker Registration
export function registerServiceWorker() {
  const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined'
  const isProduction = process.env.NODE_ENV === 'production'
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_SW === 'true'

  if (!isBrowser) return

  if (!isProduction) {
    // SW disabled in dev to avoid cache/update loops.
    console.info('[serviceWorker] Skipping registration in non-production environment')
    return
  }

  if (!isEnabled) {
    console.info('[serviceWorker] Skipping registration (NEXT_PUBLIC_ENABLE_SW !== "true")')
    return
  }

  if ('serviceWorker' in navigator) {
    // After updating SW, DevTools → Application → Service Workers → Unregister, then hard refresh.
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError)
        })
    })
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window) || typeof Notification === 'undefined' || !window.Notification) {
    console.log('This browser does not support notifications')
    return false
  }

  if (window.Notification.permission === 'granted') {
    return true
  }

  if (window.Notification.permission === 'denied') {
    console.log('Notification permission denied')
    return false
  }

  try {
    const permission = await window.Notification.requestPermission()
    return permission === 'granted'
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

// Subscribe to push notifications (for future implementation)
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push messaging is not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    })

    console.log('Push subscription successful:', subscription)
    return subscription
  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    return null
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      await subscription.unsubscribe()
      console.log('Push subscription removed')
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    return false
  }
}

// Check if app is running in standalone mode (PWA)
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true
}

// Install PWA prompt
export function showInstallPrompt(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!('serviceWorker' in navigator)) {
      resolve(false)
      return
    }

    // Check if already installed
    if (isPWA()) {
      resolve(false)
      return
    }

    // Show install prompt (this would be customized based on your needs)
    const shouldInstall = confirm('Install DailyFitness as an app for a better experience?')
    resolve(shouldInstall)
  })
}
