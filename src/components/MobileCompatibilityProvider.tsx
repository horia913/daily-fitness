'use client'

import { useEffect, useState } from 'react'
import { initMobileCompatibility, isAndroid, isIOS, isMobile, isTouchDevice } from '@/lib/mobile-compatibility'
import { applyAndroidGentleFix } from '@/lib/android-gentle-fix'

/**
 * Mobile Compatibility Provider
 * Initializes mobile compatibility features when the app loads
 */
export default function MobileCompatibilityProvider() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Apply device-specific classes to body
    const body = document.body
    if (body) {
      // Remove any existing device classes
      body.classList.remove('android-device', 'ios-device', 'mobile-device', 'touch-device')
      
      // Apply appropriate device classes
      if (isAndroid) {
        body.classList.add('android-device')
        console.log('🤖 Android device detected - applied android-device class')
      } else if (isIOS) {
        body.classList.add('ios-device')
        console.log('🍎 iOS device detected - applied ios-device class')
      }
      
      if (isMobile) {
        body.classList.add('mobile-device')
        console.log('📱 Mobile device detected - applied mobile-device class')
      }
      
      if (isTouchDevice) {
        body.classList.add('touch-device')
        console.log('👆 Touch device detected - applied touch-device class')
      }
    }
    
    // Initialize mobile compatibility features only on client
    initMobileCompatibility()
    
    // Apply gentle Android fix ONLY on Android devices
    if (isAndroid) {
      applyAndroidGentleFix()
      console.log('📱 Mobile compatibility initialized with Android fixes')
    } else {
      console.log('📱 Mobile compatibility initialized (non-Android device)')
    }
  }, [])

  // This component doesn't render anything, it just initializes mobile compatibility
  return null
}
