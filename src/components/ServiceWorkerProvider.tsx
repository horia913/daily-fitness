'use client'

import { useEffect } from 'react'
import { registerServiceWorker, requestNotificationPermission } from '@/lib/serviceWorker'

export default function ServiceWorkerProvider() {
  useEffect(() => {
    // Register service worker
    registerServiceWorker()
    
    // Request notification permission on app load
    requestNotificationPermission()
  }, [])

  return null
}
