'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

export default function OneSignalScript() {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const [isClient, setIsClient] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsClient(true)
    // Check if mobile after client-side hydration
    if (typeof window !== 'undefined') {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
  }, [])

  // Don't load OneSignal if App ID is not configured
  if (!appId || appId === 'your-onesignal-app-id' || appId === 'your-actual-app-id-here') {
    return null
  }

  // Don't load OneSignal on mobile devices to prevent errors
  if (!isClient || isMobile) {
    return null
  }

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/OneSignalSDK.js"
      strategy="afterInteractive"
      onLoad={() => {
        console.log('OneSignal script loaded successfully')
        if (typeof window !== 'undefined') {
          (window as any).OneSignalLoaded = true
        }
      }}
      onError={() => {
        console.warn('OneSignal script failed to load')
        if (typeof window !== 'undefined') {
          (window as any).OneSignalLoaded = false
          (window as any).OneSignalError = true
        }
      }}
    />
  )
}
