'use client'

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CANVAS } from './canvasTokens'

export interface CanvasFloatingMenuProps {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  children: React.ReactNode
  align?: 'start' | 'end'
  minWidth?: number
}

export function CanvasFloatingMenu({
  open,
  anchorRef,
  onClose,
  children,
  align = 'start',
  minWidth = 200,
}: CanvasFloatingMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const menuWidth = menuRef.current?.offsetWidth ?? minWidth
    const left = align === 'end' ? rect.right - menuWidth : rect.left
    setPosition({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8)),
    })
  }, [align, anchorRef, minWidth])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open, updatePosition, children])

  useEffect(() => {
    if (!open) return
    const onScroll = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointerDown)
    }
  }, [open, onClose, anchorRef])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="rounded-lg py-2 shadow-2xl"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 10000,
        minWidth,
        background: CANVAS.menuSurface,
        border: `1px solid ${CANVAS.hairline}`,
        boxShadow: '0 12px 40px rgba(0,0,0,.45)',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

export function CanvasMenuSection({ label }: { label: string }) {
  return (
    <p
      className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: CANVAS.muted }}
    >
      {label}
    </p>
  )
}

export function CanvasMenuItem({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
      style={{ color: active ? CANVAS.cyan : CANVAS.text }}
      onClick={onClick}
    >
      <span>{children}</span>
      {active ? <span aria-hidden>✓</span> : null}
    </button>
  )
}
