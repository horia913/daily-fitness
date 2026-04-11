import React from 'react'

interface LoadingSkeletonProps {
  variant: 'page' | 'card' | 'list' | 'chart' | 'form'
  count?: number      // for list variant: how many items
  fields?: number     // for form variant: how many fields
  className?: string
}

export function LoadingSkeleton({
  variant,
  count = 3,
  fields = 3,
  className = '',
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse'

  switch (variant) {
    case 'page':
      return (
        <div className={`${baseClasses} space-y-6 ${className}`}>
          {/* Header skeleton */}
          <div className="space-y-3">
            <div className="h-8 w-40 rounded-full bg-[color:var(--fc-glass-highlight)]" />
            <div className="h-4 w-64 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
          </div>
          {/* Card skeletons */}
          <div className="space-y-4">
            <div className="fc-card-shell p-6">
              <div className="h-6 w-3/4 rounded-lg bg-[color:var(--fc-glass-highlight)] mb-4" />
              <div className="h-4 w-full rounded-lg bg-[color:var(--fc-glass-highlight)] mb-2" />
              <div className="h-4 w-5/6 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
            </div>
            <div className="fc-card-shell p-6">
              <div className="h-6 w-3/4 rounded-lg bg-[color:var(--fc-glass-highlight)] mb-4" />
              <div className="h-4 w-full rounded-lg bg-[color:var(--fc-glass-highlight)] mb-2" />
              <div className="h-4 w-5/6 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
            </div>
            <div className="fc-card-shell p-6">
              <div className="h-6 w-3/4 rounded-lg bg-[color:var(--fc-glass-highlight)] mb-4" />
              <div className="h-4 w-full rounded-lg bg-[color:var(--fc-glass-highlight)] mb-2" />
              <div className="h-4 w-5/6 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
            </div>
          </div>
        </div>
      )

    case 'card':
      return (
        <div className={`${baseClasses} ${className}`}>
          <div className="fc-card-shell p-6">
            <div className="h-6 w-3/4 rounded-lg bg-[color:var(--fc-glass-highlight)] mb-4" />
            <div className="h-4 w-full rounded-lg bg-[color:var(--fc-glass-highlight)] mb-2" />
            <div className="h-4 w-5/6 rounded-lg bg-[color:var(--fc-glass-highlight)] mb-2" />
            <div className="h-4 w-4/6 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
          </div>
        </div>
      )

    case 'list':
      return (
        <div className={`${baseClasses} space-y-3 ${className}`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[color:var(--fc-glass-highlight)] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
                <div className="h-3 w-1/2 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
              </div>
            </div>
          ))}
        </div>
      )

    case 'chart':
      return (
        <div className={`${baseClasses} ${className}`}>
          <div className="fc-card-shell p-6">
            {/* Chart header */}
            <div className="h-6 w-48 rounded-lg bg-[color:var(--fc-glass-highlight)] mb-6" />
            {/* Chart area with grid lines */}
            <div className="relative h-64 rounded-xl bg-[color:var(--fc-glass-highlight)]/30 border border-[color:var(--fc-glass-border)]">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between p-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-px w-full bg-[color:var(--fc-glass-border)] opacity-30"
                  />
                ))}
              </div>
              {/* Chart bars placeholder */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2 h-[calc(100%-2rem)]">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-lg bg-[color:var(--fc-glass-highlight)]"
                    style={{ height: `${30 + Math.random() * 50}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )

    case 'form':
      return (
        <div className={`${baseClasses} space-y-4 ${className}`}>
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
              <div className="h-11 rounded-xl bg-[color:var(--fc-glass-highlight)]" />
            </div>
          ))}
        </div>
      )

    default:
      return null
  }
}
