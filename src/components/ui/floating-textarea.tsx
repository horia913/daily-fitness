'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface FloatingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  helperText?: string
  required?: boolean
}

const FloatingTextarea = React.forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
  ({ className, label, error, helperText, required, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue)

    React.useEffect(() => {
      setHasValue(!!props.value)
    }, [props.value])

    const isFloating = isFocused || hasValue

    return (
      <div className="relative">
        <div className="relative">
          <textarea
            className={cn(
              "peer w-full px-4 pt-6 pb-2 text-sm bg-transparent border-2 rounded-xl transition-all duration-200 ease-in-out resize-none",
              "focus:outline-none focus:ring-0",
              error
                ? "border-red-300 focus:border-red-500 dark:border-red-600 dark:focus:border-red-400"
                : "border-slate-300 focus:border-purple-500 dark:border-slate-600 dark:focus:border-purple-400",
              "dark:bg-slate-800 dark:text-white",
              className
            )}
            ref={ref}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => {
              setHasValue(!!e.target.value)
              props.onChange?.(e)
            }}
            {...props}
          />
          <label
            className={cn(
              "absolute left-4 transition-all duration-200 ease-in-out pointer-events-none",
              isFloating
                ? "top-2 text-xs font-medium"
                : "top-4 text-sm",
              error
                ? "text-red-500 dark:text-red-400"
                : isFloating
                ? "text-purple-600 dark:text-purple-400"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        </div>
        
        {helperText && !error && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
        
        {error && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    )
  }
)

FloatingTextarea.displayName = "FloatingTextarea"

export { FloatingTextarea }
