'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border p-6 pr-8 shadow-lg transition-all backdrop-blur-[var(--fc-blur-card)]',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--fc-glass-base)] border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)]',
        destructive:
          'bg-[color:color-mix(in_srgb,var(--fc-status-error)_12%,transparent)] border-[color:var(--fc-status-error)] text-[color:var(--fc-status-error)]',
        success:
          'bg-[color:color-mix(in_srgb,var(--fc-status-success)_15%,transparent)] border-[color:var(--fc-status-success)] text-[color:var(--fc-status-success)]',
        warning:
          'bg-[color:color-mix(in_srgb,var(--fc-status-warning)_15%,transparent)] border-[color:var(--fc-status-warning)] text-[color:var(--fc-status-warning)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof toastVariants> {
  title?: string
  description?: string
  onClose?: () => void
  action?: ToastAction
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, title, description, onClose, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        <div className="flex-1 min-w-0">
          {title && (
            <div className="text-sm font-semibold">{title}</div>
          )}
          {description && (
            <div className="text-sm text-[color:var(--fc-text-dim)]">{description}</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {action && (
            <button
              type="button"
              onClick={() => {
                action.onClick();
                onClose?.();
              }}
              className="text-sm font-medium underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 rounded"
            >
              {action.label}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1 fc-text-dim opacity-0 transition-opacity hover:fc-text-primary focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
  }
)
Toast.displayName = 'Toast'

export { Toast, toastVariants }
