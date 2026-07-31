'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WorkoutCanvasCore } from './WorkoutCanvasCore'
import { DesktopOnlyGate, useIsDesktopCanvas } from './DesktopOnlyGate'
import { CANVAS } from './canvasTokens'
import { useToast } from '@/components/ui/toast-provider'
import { useLibraryWorkoutDraft } from '@/hooks/useLibraryWorkoutDraft'
import { LeaveConfirmDialog } from '@/components/coach/programs/station/LeaveConfirmDialog'
import { ArrowLeft, MoreVertical } from 'lucide-react'

export interface WorkoutTemplateEditorProps {
  templateId?: string
  coachId: string
  onClose?: () => void
}

export function WorkoutTemplateEditor({ templateId, coachId, onClose }: WorkoutTemplateEditorProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const isDesktop = useIsDesktopCanvas()
  const dataEnabled = isDesktop === true

  const {
    workingCopy,
    loading,
    dirty,
    saveState,
    saveError,
    handleWorkoutChange,
    handleNameChange,
    discard,
    commit,
    isNew,
  } = useLibraryWorkoutDraft(templateId, coachId)

  const [menuOpen, setMenuOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaveSaving, setLeaveSaving] = useState(false)

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const saveIndicatorColor =
    saveState === 'error'
      ? '#F87171'
      : saveState === 'saved'
        ? CANVAS.cyan
        : dirty
          ? CANVAS.accent
          : CANVAS.muted

  const navigateBack = () => {
    if (onClose) onClose()
    else router.push('/coach/workouts/templates')
  }

  const tryBack = () => {
    if (dirty) {
      setLeaveOpen(true)
      return
    }
    navigateBack()
  }

  const runSave = async () => {
    const result = await commit()
    if (!result.success) {
      addToast({ title: result.error ?? 'Save failed', variant: 'destructive' })
      return false
    }
    if (isNew && result.templateId && !templateId) {
      router.replace(`/coach/workouts/templates/${result.templateId}/edit`)
    }
    addToast({ title: 'Template saved' })
    return true
  }

  if (isDesktop === null) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center" style={{ background: CANVAS.bg }}>
        <p style={{ color: CANVAS.muted }}>Loading…</p>
      </div>
    )
  }

  if (!isDesktop) {
    return <DesktopOnlyGate />
  }

  if (!dataEnabled || loading || !workingCopy) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center" style={{ background: CANVAS.bg }}>
        <p style={{ color: CANVAS.muted }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full" style={{ background: CANVAS.bg, color: CANVAS.text }}>
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3"
        style={{ background: CANVAS.surface, borderBottom: `1px solid ${CANVAS.hairline}` }}
      >
        <button
          type="button"
          onClick={tryBack}
          className="p-1"
          style={{ color: CANVAS.muted }}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <input
          value={workingCopy.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="flex-1 bg-transparent text-lg font-semibold outline-none min-w-0"
          placeholder="Template name"
        />
        <button
          type="button"
          data-testid="library-save-button"
          onClick={() => void runSave()}
          disabled={saveState === 'saving' || (!dirty && saveState !== 'error')}
          className="text-xs shrink-0 font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
          style={{
            background: dirty || saveState === 'error' ? CANVAS.cyan : 'transparent',
            color: dirty || saveState === 'error' ? CANVAS.bg : CANVAS.muted,
            border: dirty || saveState === 'error' ? 'none' : `1px solid ${CANVAS.hairline}`,
          }}
        >
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Retry' : 'Save'}
        </button>
        <span className="text-xs shrink-0 font-medium hidden sm:inline" style={{ color: saveIndicatorColor }}>
          {dirty && saveState === 'idle' ? 'Unsaved' : null}
          {saveState === 'error' && saveError ? saveError : null}
        </span>
        {templateId ? (
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((v) => !v)} style={{ color: CANVAS.muted }}>
              <MoreVertical className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-1 min-w-[160px] rounded-lg py-1 z-50"
                style={{ background: CANVAS.menuSurface, border: `1px solid ${CANVAS.hairline}` }}
              >
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm"
                  onClick={() => {
                    setMenuOpen(false)
                    router.push(`/coach/workouts/templates/${templateId}`)
                  }}
                >
                  View details
                </button>
              </div>
            )}
          </div>
        ) : null}
      </header>

      <WorkoutCanvasCore
        coachId={coachId}
        workout={workingCopy}
        onWorkoutChange={handleWorkoutChange}
      />

      <LeaveConfirmDialog
        open={leaveOpen}
        saving={leaveSaving}
        onCancel={() => setLeaveOpen(false)}
        onDiscard={() => {
          discard()
          setLeaveOpen(false)
          navigateBack()
        }}
        onSave={async () => {
          setLeaveSaving(true)
          const ok = await runSave()
          setLeaveSaving(false)
          if (ok) {
            setLeaveOpen(false)
            if (!isNew || templateId) navigateBack()
          }
        }}
      />
    </div>
  )
}
