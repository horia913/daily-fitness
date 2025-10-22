// Service Worker for DailyFitness PWA
// Handles push notifications and offline functionality

const CACHE_NAME = 'dailyfitness-v1'
const urlsToCache = [
  '/',
  '/manifest.json'
  // Note: We'll cache other resources dynamically to avoid 404 errors
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service worker installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache')
        // Only cache resources that definitely exist
        return cache.addAll(urlsToCache.filter(url => {
          // Skip resources that might not exist in development
          return !url.includes('static/js/bundle.js') && 
                 !url.includes('static/css/main.css') &&
                 !url.includes('icon-192x192.png') &&
                 !url.includes('icon-512x512.png')
        }))
      })
      .catch((error) => {
        console.log('Cache addAll failed:', error)
        // Don't fail the installation if caching fails
        return Promise.resolve()
      })
  )
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service worker activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim()
    })
  )
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
  )
})

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event)
  
  let notificationData = {
    title: 'DailyFitness',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'dailyfitness-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }

  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        ...notificationData,
        ...data
      }
    } catch (error) {
      console.error('Error parsing push data:', error)
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event)
  
  event.notification.close()
  
  if (event.action === 'dismiss') {
    return
  }
  
  // Handle notification click
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Otherwise, open new window
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag)
  
  if (event.tag === 'workout-sync') {
    event.waitUntil(syncWorkoutData())
  } else if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications())
  }
})

// Sync workout data when back online
async function syncWorkoutData() {
  try {
    // This would sync any offline workout data
    console.log('Syncing workout data...')
    // Implementation would depend on your offline storage strategy
  } catch (error) {
    console.error('Error syncing workout data:', error)
  }
}

// Sync notifications when back online
async function syncNotifications() {
  try {
    console.log('Syncing notifications...')
    // This would sync any pending notifications
  } catch (error) {
    console.error('Error syncing notifications:', error)
  }
}

// Handle message events from main thread
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Note: OneSignal integration is handled in the main app
// This service worker focuses on PWA functionality and basic notifications
