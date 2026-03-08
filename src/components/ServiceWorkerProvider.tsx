'use client'

import { useEffect } from 'react'
import { registerServiceWorker, requestNotificationPermission } from '@/lib/serviceWorker'

export default function ServiceWorkerProvider() {
  useEffect(() => {
    // Fire and forget - service worker registration should NEVER block rendering
    // Register service worker (non-blocking)
    registerServiceWorker()
    
    // Request notification permission (non-blocking, already has try/catch)
    requestNotificationPermission().catch((error) => {
      console.warn('[ServiceWorkerProvider] Notification permission request failed (non-critical):', error);
    });
  }, [])

  return null
}
