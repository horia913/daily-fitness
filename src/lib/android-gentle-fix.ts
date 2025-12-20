/**
 * Android Gentle Fix
 * Minimal, targeted fixes for Android rendering issues
 */

export const applyAndroidGentleFix = () => {
  if (typeof window === 'undefined') return

  // Check if we're on Android
  const isAndroid = /Android/i.test(navigator.userAgent)
  if (!isAndroid) {
    console.log('🖥️ Not Android device, skipping Android fixes')
    return
  }

  console.log('🤖 Applying Android Gentle Fix')

  // Only apply minimal, safe fixes
  const applyGentleFixes = () => {
    // Fix body rendering
    ;(document.body.style as any).webkitTextSizeAdjust = '100%'
    ;(document.body.style as any).webkitFontSmoothing = 'antialiased'
    
    // Fix scrolling
    ;(document.documentElement.style as any).webkitOverflowScrolling = 'touch'
    ;(document.body.style as any).webkitOverflowScrolling = 'touch'
    
    // Add Android-specific class to body (should already be there from MobileCompatibilityProvider)
    if (!document.body.classList.contains('android-device')) {
      document.body.classList.add('android-device')
    }
    
    // Apply targeted fixes for specific issues
    setTimeout(() => {
      // Fix main content padding to account for bottom nav
      const main = document.querySelector('main')
      if (main) {
        const mainElement = main as HTMLElement
        mainElement.style.paddingBottom = '80px'
        console.log('✅ Main content padding fixed')
      }
      
      // Fix bottom navigation positioning - Targeted approach
      const bottomNav = document.querySelector('nav.fixed.bottom-0')
      if (bottomNav) {
        const navElement = bottomNav as HTMLElement
        
        console.log('🔧 Applying targeted bottom navigation fix...')
        
        // Ensure fixed positioning with proper specificity
        navElement.style.setProperty('position', 'fixed', 'important')
        navElement.style.setProperty('bottom', '0', 'important')
        navElement.style.setProperty('left', '0', 'important')
        navElement.style.setProperty('right', '0', 'important')
        navElement.style.setProperty('z-index', '10000', 'important')
        navElement.style.setProperty('width', '100%', 'important')
        
        console.log('✅ Bottom navigation positioning confirmed via JavaScript')
        
        // Also fix inner containers if needed
        const innerContainer = navElement.querySelector('div')
        if (innerContainer) {
          const innerElement = innerContainer as HTMLElement
          const computedStyle = window.getComputedStyle(innerElement)
          
          // Only fix if the inner container is broken (flex-direction is column instead of row)
          if (computedStyle.flexDirection === 'column') {
            console.log('🔧 Bottom navigation is vertical, forcing horizontal...')
            innerElement.style.display = 'flex'
            innerElement.style.flexDirection = 'row'
            innerElement.style.alignItems = 'center'
            innerElement.style.justifyContent = 'space-between'
            innerElement.style.height = '100%'
            innerElement.style.width = '100%'
            innerElement.style.padding = '0 8px'
            innerElement.style.maxWidth = 'none'
            innerElement.style.margin = '0 auto'
          } else {
            console.log('✅ Bottom navigation is already horizontal')
          }
        }
      }
      
      console.log('✅ Android gentle fixes applied')
      
      // Add visual indicator
      const indicator = document.createElement('div')
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #10b981;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 11px;
        z-index: 99999;
        font-family: monospace;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      `
      indicator.textContent = '🤖 Android Fixed'
      document.body.appendChild(indicator)
      
      // Remove indicator after 3 seconds
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator)
        }
      }, 3000)
    }, 500)
    
    console.log('✅ Android gentle fixes applied')
  }

  // Apply fixes when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyGentleFixes)
  } else {
    applyGentleFixes()
  }
}