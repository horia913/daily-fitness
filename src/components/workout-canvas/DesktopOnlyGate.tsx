'use client'

import { useLayoutEffect, useState } from 'react'
import { CANVAS } from './canvasTokens'

export function DesktopOnlyGate() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center px-6"
      style={{ background: CANVAS.bg, color: CANVAS.text }}
    >
      <div
        className="max-w-md rounded-xl p-8 text-center"
        style={{ background: CANVAS.surface, border: `1px solid ${CANVAS.hairline}` }}
      >
        <h2 className="text-xl font-semibold mb-3">Program building lives on desktop</h2>
        <p className="text-sm" style={{ color: CANVAS.muted }}>
          Workout structure editing needs a wider screen. Open this template on a laptop or desktop to
          edit exercises, sets, and groups.
        </p>
      </div>
    </div>
  )
}

/** `null` until measured — avoids treating mobile as desktop on first paint. */
export function useIsDesktopCanvas(minWidth = 1024): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null)

  useLayoutEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= minWidth)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [minWidth])

  return isDesktop
}
