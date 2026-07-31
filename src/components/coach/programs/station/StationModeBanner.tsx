'use client'

import React from 'react'
import { User } from 'lucide-react'
import type { ProgramEditorMode } from '@/types/programDraft'
import stationCss from './stationEditor.module.css'
import { cn } from '@/lib/utils'

export interface StationModeBannerProps {
  mode: ProgramEditorMode
  clientName?: string
  clientAvatarUrl?: string | null
}

export function StationModeBanner({ mode, clientName, clientAvatarUrl }: StationModeBannerProps) {
  const isClient = mode === 'client'
  const displayName = clientName?.trim() || 'this client'

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'sticky top-0 z-[10040] w-full border-b px-4 py-2.5 sm:px-6',
        stationCss.modeBanner,
        isClient ? stationCss.modeBannerClient : stationCss.modeBannerMaster,
      )}
      data-testid={isClient ? 'station-mode-client' : 'station-mode-master'}
    >
      <div className="mx-auto flex max-w-[1600px] items-center gap-3">
        {isClient ? (
          clientAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clientAvatarUrl}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-[color-mix(in_srgb,var(--fc-accent)_45%,transparent)]"
            />
          ) : (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--fc-accent)_18%,transparent)] text-[color:var(--fc-accent)]"
              aria-hidden
            >
              <User className="h-4 w-4" />
            </span>
          )
        ) : null}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-sm font-semibold leading-snug',
              isClient ? 'text-[color:var(--fc-accent)]' : 'text-[color:var(--fc-status-warning)]',
            )}
          >
            {isClient
              ? `Editing ${displayName}'s copy — changes affect only this client`
              : 'Editing MASTER template — changes affect future assignments, not active clients'}
          </p>
          <p className="text-[11px] opacity-80 mt-0.5 text-[var(--pe-t2)]">
            {isClient
              ? 'You are in the Station with this client\u2019s instance data. The master template is unchanged.'
              : 'Active clients keep their own copies. Assign or re-assign to push template changes to new clients.'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default StationModeBanner
