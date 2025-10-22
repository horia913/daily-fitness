'use client'

/**
 * Android Emergency Rendering Fix
 * Forces elements to render properly on Android devices
 */

export const applyAndroidEmergencyFix = () => {
  if (typeof window === 'undefined') return

  // Check if we're on Android
  const isAndroid = /Android/i.test(navigator.userAgent)
  if (!isAndroid) return

  console.log('🚨 Applying Android Emergency Rendering Fix')
  console.log('📱 User Agent:', navigator.userAgent)
  console.log('📱 Viewport:', window.innerWidth + 'x' + window.innerHeight)

  // Inject emergency CSS directly into the page
  const injectEmergencyCSS = () => {
    const style = document.createElement('style')
    style.textContent = `
      /* Android Emergency CSS Injection */
      * {
        visibility: visible !important;
        opacity: 1 !important;
        -webkit-transform: translateZ(0) !important;
        transform: translateZ(0) !important;
        -webkit-backface-visibility: hidden !important;
        backface-visibility: hidden !important;
      }
      
      div, section, article, aside, header, footer, nav, main {
        display: block !important;
      }
      
      button, [role="button"] {
        display: inline-block !important;
        background-color: #3b82f6 !important;
        color: white !important;
        border: none !important;
        border-radius: 6px !important;
        padding: 8px 16px !important;
        cursor: pointer !important;
      }
      
      svg, [class*="lucide"] {
        display: inline-block !important;
        width: auto !important;
        height: auto !important;
      }
      
      img {
        display: block !important;
        max-width: 100% !important;
        height: auto !important;
      }
      
      input, textarea, select {
        display: block !important;
      }
      
      /* Force card styling */
      [class*="bg-white"], [class*="bg-slate"] {
        background-color: white !important;
        border-radius: 8px !important;
        padding: 16px !important;
        margin: 8px !important;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
        position: relative !important;
        width: auto !important;
        height: auto !important;
      }
      
      /* Force text styling */
      p, span, h1, h2, h3, h4, h5, h6 {
        display: block !important;
        color: #0f172a !important;
        position: relative !important;
        width: auto !important;
        height: auto !important;
      }
      
      /* Fix layout positioning */
      .fixed {
        position: fixed !important;
      }
      
      .absolute {
        position: absolute !important;
      }
      
      .relative {
        position: relative !important;
      }
      
      /* Fix flexbox layout */
      .flex {
        display: flex !important;
        flex-direction: row !important;
      }
      
      .flex-col {
        display: flex !important;
        flex-direction: column !important;
      }
      
      .flex-1 {
        flex: 1 !important;
      }
      
      /* Fix grid layout */
      .grid {
        display: grid !important;
      }
      
      /* Fix spacing */
      .space-y-4 > * + * {
        margin-top: 1rem !important;
      }
      
      .space-y-6 > * + * {
        margin-top: 1.5rem !important;
      }
      
      .gap-4 {
        gap: 1rem !important;
      }
      
      .gap-6 {
        gap: 1.5rem !important;
      }
      
      /* Fix padding and margins */
      .p-4 {
        padding: 1rem !important;
      }
      
      .p-6 {
        padding: 1.5rem !important;
      }
      
      .px-4 {
        padding-left: 1rem !important;
        padding-right: 1rem !important;
      }
      
      .py-4 {
        padding-top: 1rem !important;
        padding-bottom: 1rem !important;
      }
      
      .m-4 {
        margin: 1rem !important;
      }
      
      .mx-4 {
        margin-left: 1rem !important;
        margin-right: 1rem !important;
      }
      
      .my-4 {
        margin-top: 1rem !important;
        margin-bottom: 1rem !important;
      }
      
      /* Fix width and height */
      .w-full {
        width: 100% !important;
      }
      
      .h-full {
        height: 100% !important;
      }
      
      .min-h-screen {
        min-height: 100vh !important;
      }
      
      /* Fix text alignment */
      .text-center {
        text-align: center !important;
      }
      
      .text-left {
        text-align: left !important;
      }
      
      .text-right {
        text-align: right !important;
      }
      
      /* Fix overflow */
      .overflow-hidden {
        overflow: hidden !important;
      }
      
      .overflow-y-auto {
        overflow-y: auto !important;
      }
    `
    document.head.appendChild(style)
    console.log('💉 Emergency CSS injected')
  }

  // Inject CSS immediately
  injectEmergencyCSS()

  // Force all elements to be visible
  const forceElementVisibility = () => {
    const allElements = document.querySelectorAll('*')
    
    allElements.forEach((element) => {
      const htmlElement = element as HTMLElement
      
      // Force visibility with !important
      htmlElement.style.setProperty('visibility', 'visible', 'important')
      htmlElement.style.setProperty('opacity', '1', 'important')
      
      // Force hardware acceleration
      htmlElement.style.setProperty('transform', 'translateZ(0)', 'important')
      htmlElement.style.setProperty('-webkit-transform', 'translateZ(0)', 'important')
      htmlElement.style.setProperty('backface-visibility', 'hidden', 'important')
      htmlElement.style.setProperty('-webkit-backface-visibility', 'hidden', 'important')
      
      // Force display properties for specific elements
      const tagName = htmlElement.tagName.toLowerCase()
      
      switch (tagName) {
        case 'div':
        case 'section':
        case 'article':
        case 'aside':
        case 'header':
        case 'footer':
        case 'nav':
        case 'main':
          htmlElement.style.setProperty('display', 'block', 'important')
          break
        case 'button':
        case 'a':
          if (htmlElement.getAttribute('role') === 'button' || tagName === 'button') {
            htmlElement.style.setProperty('display', 'inline-block', 'important')
          }
          break
        case 'input':
        case 'textarea':
        case 'select':
          htmlElement.style.setProperty('display', 'block', 'important')
          break
        case 'img':
          htmlElement.style.setProperty('display', 'block', 'important')
          htmlElement.style.setProperty('max-width', '100%', 'important')
          htmlElement.style.setProperty('height', 'auto', 'important')
          break
        case 'svg':
          htmlElement.style.setProperty('display', 'inline-block', 'important')
          break
        case 'span':
        case 'p':
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          htmlElement.style.setProperty('display', 'block', 'important')
          break
      }
      
      // Force Lucide icons to render
      if (htmlElement.classList.contains('lucide') || 
          htmlElement.classList.toString().includes('lucide')) {
        htmlElement.style.setProperty('display', 'inline-block', 'important')
        htmlElement.style.setProperty('visibility', 'visible', 'important')
        htmlElement.style.setProperty('opacity', '1', 'important')
        htmlElement.style.setProperty('width', 'auto', 'important')
        htmlElement.style.setProperty('height', 'auto', 'important')
      }
      
      // Force card backgrounds
      if (htmlElement.classList.contains('card') || 
          htmlElement.classList.toString().includes('bg-white') ||
          htmlElement.classList.toString().includes('bg-slate')) {
        htmlElement.style.setProperty('background-color', 'white', 'important')
        htmlElement.style.setProperty('border-radius', '8px', 'important')
        htmlElement.style.setProperty('padding', '16px', 'important')
        htmlElement.style.setProperty('margin', '8px', 'important')
        htmlElement.style.setProperty('box-shadow', '0 4px 6px rgba(0, 0, 0, 0.1)', 'important')
      }
      
      // Force button styling
      if (htmlElement.tagName === 'BUTTON' || htmlElement.getAttribute('role') === 'button') {
        htmlElement.style.setProperty('background-color', '#3b82f6', 'important')
        htmlElement.style.setProperty('color', 'white', 'important')
        htmlElement.style.setProperty('border', 'none', 'important')
        htmlElement.style.setProperty('border-radius', '6px', 'important')
        htmlElement.style.setProperty('padding', '8px 16px', 'important')
        htmlElement.style.setProperty('cursor', 'pointer', 'important')
        htmlElement.style.setProperty('position', 'relative', 'important')
        htmlElement.style.setProperty('width', 'auto', 'important')
        htmlElement.style.setProperty('height', 'auto', 'important')
      }
      
      // Fix layout containers
      if (htmlElement.classList.contains('flex') || 
          htmlElement.classList.toString().includes('flex-')) {
        htmlElement.style.setProperty('display', 'flex', 'important')
        htmlElement.style.setProperty('position', 'relative', 'important')
      }
      
      if (htmlElement.classList.contains('grid') || 
          htmlElement.classList.toString().includes('grid-')) {
        htmlElement.style.setProperty('display', 'grid', 'important')
        htmlElement.style.setProperty('position', 'relative', 'important')
      }
      
      // Fix positioning classes
      if (htmlElement.classList.contains('fixed')) {
        htmlElement.style.setProperty('position', 'fixed', 'important')
      }
      
      if (htmlElement.classList.contains('absolute')) {
        htmlElement.style.setProperty('position', 'absolute', 'important')
      }
      
      if (htmlElement.classList.contains('relative')) {
        htmlElement.style.setProperty('position', 'relative', 'important')
      }
      
      // Fix width classes
      if (htmlElement.classList.contains('w-full')) {
        htmlElement.style.setProperty('width', '100%', 'important')
      }
      
      // Fix height classes
      if (htmlElement.classList.contains('h-full')) {
        htmlElement.style.setProperty('height', '100%', 'important')
      }
      
      if (htmlElement.classList.contains('min-h-screen')) {
        htmlElement.style.setProperty('min-height', '100vh', 'important')
      }
    })
  }

  // Apply fixes immediately
  forceElementVisibility()

  // Apply fixes after DOM changes
  const observer = new MutationObserver(() => {
    forceElementVisibility()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  })

  // Apply fixes on window load
  window.addEventListener('load', forceElementVisibility)

  // Apply fixes on resize
  window.addEventListener('resize', forceElementVisibility)

  console.log('✅ Android Emergency Rendering Fix Applied')
  
  // Add a test element to verify the fix is working
  const testElement = document.createElement('div')
  testElement.style.cssText = `
    position: fixed;
    top: 50px;
    right: 10px;
    background: #10b981;
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-size: 12px;
    z-index: 99999;
    font-family: monospace;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `
  testElement.textContent = '✅ Android Fix Active'
  document.body.appendChild(testElement)
  
  // Add a second indicator for layout fixes
  const layoutElement = document.createElement('div')
  layoutElement.style.cssText = `
    position: fixed;
    top: 90px;
    right: 10px;
    background: #3b82f6;
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-size: 12px;
    z-index: 99999;
    font-family: monospace;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `
  layoutElement.textContent = '🔧 Layout Fixed'
  document.body.appendChild(layoutElement)
  
  // Remove test elements after 5 seconds
  setTimeout(() => {
    if (testElement.parentNode) {
      testElement.parentNode.removeChild(testElement)
    }
    if (layoutElement.parentNode) {
      layoutElement.parentNode.removeChild(layoutElement)
    }
  }, 5000)
}
