'use client'

import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationFeedList } from '@/components/notifications/NotificationFeedList'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-end p-4">
      <div className="w-full max-w-sm" style={{ maxWidth: '400px' }}>
        <div className="fc-modal fc-card w-full max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="p-4 border-b border-[color:var(--fc-glass-border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="fc-icon-tile fc-icon-workouts">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                    Notifications
                  </span>
                  <div className="text-lg font-semibold fc-text-primary mt-2">
                    Notifications
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="fc-btn fc-btn-ghost"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <NotificationFeedList variant="coach" onClose={onClose} />
        </div>
      </div>
    </div>
  )
}
