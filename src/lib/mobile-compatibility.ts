'use client'

/**
 * Mobile Compatibility Utilities
 * Ensures the app works across all mobile devices and browsers
 */

// Safe browser environment check
const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined' && typeof navigator !== 'undefined'

// Mobile device detection
export const isMobile = isBrowser() ? /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) : false

// Touch device detection
export const isTouchDevice = isBrowser() ? ('ontouchstart' in window || navigator.maxTouchPoints > 0) : false

// iOS detection
export const isIOS = isBrowser() ? /iPad|iPhone|iPod/.test(navigator.userAgent) : false

// Android detection
export const isAndroid = isBrowser() ? /Android/.test(navigator.userAgent) : false

// Safari detection
export const isSafari = isBrowser() ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent) : false

// Chrome detection
export const isChrome = isBrowser() ? /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor) : false

// Firefox detection
export const isFirefox = isBrowser() ? /Firefox/.test(navigator.userAgent) : false

/**
 * Safe localStorage access with fallback
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isBrowser()) return null
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.warn('localStorage not available:', error)
      // Fallback to sessionStorage on mobile
      try {
        return sessionStorage.getItem(key)
      } catch {
        return null
      }
    }
  },
  
  setItem: (key: string, value: string): boolean => {
    if (!isBrowser()) return false
    try {
      localStorage.setItem(key, value)
      return true
    } catch (error) {
      console.warn('localStorage not available:', error)
      // Fallback to sessionStorage on mobile
      try {
        sessionStorage.setItem(key, value)
        return true
      } catch {
        return false
      }
    }
  },
  
  removeItem: (key: string): boolean => {
    if (!isBrowser()) return false
    try {
      localStorage.removeItem(key)
      // Also remove from sessionStorage if it exists
      try {
        sessionStorage.removeItem(key)
      } catch {}
      return true
    } catch (error) {
      console.warn('localStorage not available:', error)
      return false
    }
  }
}

/**
 * Safe sessionStorage access with fallback
 */
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (!isBrowser()) return null
    try {
      return sessionStorage.getItem(key)
    } catch (error) {
      console.warn('sessionStorage not available:', error)
      return null
    }
  },
  
  setItem: (key: string, value: string): boolean => {
    if (!isBrowser()) return false
    try {
      sessionStorage.setItem(key, value)
      return true
    } catch (error) {
      console.warn('sessionStorage not available:', error)
      return false
    }
  },
  
  removeItem: (key: string): boolean => {
    if (!isBrowser()) return false
    try {
      sessionStorage.removeItem(key)
      return true
    } catch (error) {
      console.warn('sessionStorage not available:', error)
      return false
    }
  }
}

/**
 * Safe window object access
 */
export const safeWindow = {
  get: (): Window | null => {
    if (!isBrowser()) return null
    return window
  },
  
  addEventListener: (event: string, handler: EventListener): boolean => {
    if (!isBrowser()) return false
    try {
      window.addEventListener(event, handler)
      return true
    } catch (error) {
      console.warn('window.addEventListener failed:', error)
      return false
    }
  },
  
  removeEventListener: (event: string, handler: EventListener): boolean => {
    if (!isBrowser()) return false
    try {
      window.removeEventListener(event, handler)
      return true
    } catch (error) {
      console.warn('window.removeEventListener failed:', error)
      return false
    }
  },
  
  location: {
    get href(): string {
      if (!isBrowser()) return ''
      return window.location.href
    },
    
    set href(value: string): void {
      if (!isBrowser()) return
      try {
        window.location.href = value
      } catch (error) {
        console.warn('window.location.href set failed:', error)
      }
    },
    
    reload: (): void => {
      if (!isBrowser()) return
      try {
        window.location.reload()
      } catch (error) {
        console.warn('window.location.reload failed:', error)
      }
    }
  }
}

/**
 * Safe navigator object access
 */
export const safeNavigator = {
  get: (): Navigator | null => {
    if (!isBrowser()) return null
    return navigator
  },
  
  userAgent: (): string => {
    if (!isBrowser()) return ''
    return navigator.userAgent
  },
  
  serviceWorker: {
    get: (): ServiceWorkerContainer | null => {
      if (!isBrowser() || !('serviceWorker' in navigator)) return null
      return navigator.serviceWorker
    },
    
    register: async (scriptURL: string): Promise<ServiceWorkerRegistration | null> => {
      if (!isBrowser() || !('serviceWorker' in navigator)) return null
      try {
        return await navigator.serviceWorker.register(scriptURL)
      } catch (error) {
        console.warn('ServiceWorker registration failed:', error)
        return null
      }
    }
  }
}

/**
 * Safe document object access
 */
export const safeDocument = {
  get: (): Document | null => {
    if (!isBrowser()) return null
    return document
  },
  
  addEventListener: (event: string, handler: EventListener): boolean => {
    if (!isBrowser()) return false
    try {
      document.addEventListener(event, handler)
      return true
    } catch (error) {
      console.warn('document.addEventListener failed:', error)
      return false
    }
  },
  
  removeEventListener: (event: string, handler: EventListener): boolean => {
    if (!isBrowser()) return false
    try {
      document.removeEventListener(event, handler)
      return true
    } catch (error) {
      console.warn('document.removeEventListener failed:', error)
      return false
    }
  }
}

/**
 * Touch event utilities
 */
export const touchUtils = {
  /**
   * Check if touch events are supported
   */
  isSupported: (): boolean => {
    return isBrowser() && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  },
  
  /**
   * Add touch event listener safely
   */
  addTouchListener: (element: HTMLElement, event: string, handler: EventListener): boolean => {
    if (!isBrowser() || !element) return false
    try {
      element.addEventListener(event, handler, { passive: true })
      return true
    } catch (error) {
      console.warn('Touch event listener failed:', error)
      return false
    }
  },
  
  /**
   * Remove touch event listener safely
   */
  removeTouchListener: (element: HTMLElement, event: string, handler: EventListener): boolean => {
    if (!isBrowser() || !element) return false
    try {
      element.removeEventListener(event, handler)
      return true
    } catch (error) {
      console.warn('Touch event listener removal failed:', error)
      return false
    }
  }
}

/**
 * Viewport utilities for mobile
 */
export const viewportUtils = {
  /**
   * Get viewport dimensions
   */
  getDimensions: (): { width: number; height: number } => {
    if (!isBrowser()) return { width: 0, height: 0 }
    return {
      width: window.innerWidth || document.documentElement.clientWidth || 0,
      height: window.innerHeight || document.documentElement.clientHeight || 0
    }
  },
  
  /**
   * Check if device is in landscape mode
   */
  isLandscape: (): boolean => {
    if (!isBrowser()) return false
    return window.innerWidth > window.innerHeight
  },
  
  /**
   * Check if device is in portrait mode
   */
  isPortrait: (): boolean => {
    if (!isBrowser()) return false
    return window.innerHeight > window.innerWidth
  },
  
  /**
   * Add resize event listener
   */
  onResize: (handler: () => void): boolean => {
    if (!isBrowser()) return false
    try {
      window.addEventListener('resize', handler, { passive: true })
      return true
    } catch (error) {
      console.warn('Resize event listener failed:', error)
      return false
    }
  }
}

/**
 * Device capabilities detection
 */
export const deviceCapabilities = {
  /**
   * Check if device supports notifications
   */
  supportsNotifications: (): boolean => {
    if (!isBrowser()) return false
    return 'Notification' in window && typeof Notification !== 'undefined'
  },
  
  /**
   * Check if device supports service workers
   */
  supportsServiceWorkers: (): boolean => {
    if (!isBrowser()) return false
    return 'serviceWorker' in navigator
  },
  
  /**
   * Check if device supports push notifications
   */
  supportsPushNotifications: (): boolean => {
    if (!isBrowser()) return false
    return 'PushManager' in window && 'serviceWorker' in navigator
  },
  
  /**
   * Check if device supports geolocation
   */
  supportsGeolocation: (): boolean => {
    if (!isBrowser()) return false
    return 'geolocation' in navigator
  },
  
  /**
   * Check if device supports camera
   */
  supportsCamera: (): boolean => {
    if (!isBrowser()) return false
    return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
  },
  
  /**
   * Check if device supports file uploads
   */
  supportsFileUpload: (): boolean => {
    if (!isBrowser()) return false
    return 'FileReader' in window && 'FormData' in window
  }
}

/**
 * Performance utilities for mobile
 */
export const performanceUtils = {
  /**
   * Debounce function for mobile performance
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout | null = null
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  },
  
  /**
   * Throttle function for mobile performance
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }
}

/**
 * Mobile-specific CSS utilities
 */
export const mobileCSS = {
  /**
   * Add mobile-specific CSS classes to body
   */
  addMobileClasses: (): void => {
    if (!isBrowser()) return
    try {
      const body = document.body
      if (isMobile) body.classList.add('mobile-device')
      if (isTouchDevice) body.classList.add('touch-device')
      if (isIOS) body.classList.add('ios-device')
      if (isAndroid) body.classList.add('android-device')
      if (isSafari) body.classList.add('safari-browser')
      if (isChrome) body.classList.add('chrome-browser')
      if (isFirefox) body.classList.add('firefox-browser')
    } catch (error) {
      console.warn('Failed to add mobile CSS classes:', error)
    }
  },
  
  /**
   * Remove mobile-specific CSS classes from body
   */
  removeMobileClasses: (): void => {
    if (!isBrowser()) return
    try {
      const body = document.body
      body.classList.remove('mobile-device', 'touch-device', 'ios-device', 'android-device', 'safari-browser', 'chrome-browser', 'firefox-browser')
    } catch (error) {
      console.warn('Failed to remove mobile CSS classes:', error)
    }
  }
}

/**
 * Prevent background scrolling when modal is open
 */
export const preventBackgroundScroll = (): void => {
  if (!isBrowser()) return
  
  const body = document.body
  if (body) {
    body.classList.add('modal-open')
    // Only prevent background scroll, don't interfere with modal content
    body.style.overflow = 'hidden'
  }
}

/**
 * Restore background scrolling when modal is closed
 */
export const restoreBackgroundScroll = (): void => {
  if (!isBrowser()) return
  
  const body = document.body
  if (body) {
    body.classList.remove('modal-open')
    body.style.overflow = ''
  }
}

/**
 * Initialize mobile compatibility
 */
export const initMobileCompatibility = (): void => {
  if (!isBrowser()) return
  
  // Add mobile CSS classes
  mobileCSS.addMobileClasses()
  
  // Log device information for debugging
  console.log('Mobile Compatibility Info:', {
    isMobile,
    isTouchDevice,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isFirefox,
    capabilities: {
      notifications: deviceCapabilities.supportsNotifications(),
      serviceWorkers: deviceCapabilities.supportsServiceWorkers(),
      pushNotifications: deviceCapabilities.supportsPushNotifications(),
      geolocation: deviceCapabilities.supportsGeolocation(),
      camera: deviceCapabilities.supportsCamera(),
      fileUpload: deviceCapabilities.supportsFileUpload()
    },
    viewport: viewportUtils.getDimensions(),
    userAgent: navigator.userAgent
  })
  
  // Android-specific debugging
  if (isAndroid) {
    console.log('🤖 Android Device Detected - Applying Android-specific fixes')
    console.log('Android Chrome Version:', navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown')
    
    // Add a visual indicator for Android
    const indicator = document.createElement('div')
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4CAF50;
      color: white;
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 12px;
      z-index: 99999;
      font-family: monospace;
    `
    indicator.textContent = '🤖 Android'
    document.body.appendChild(indicator)
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator)
      }
    }, 5000)
  }
}

// Don't auto-initialize to prevent SSR issues
// Initialization is handled by MobileCompatibilityProvider
