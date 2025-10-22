'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface ProgressStep {
  id: string
  title: string
  description?: string
}

interface ProgressIndicatorProps {
  steps: ProgressStep[]
  currentStep: number
  className?: string
}

export function ProgressIndicator({ steps, currentStep, className }: ProgressIndicatorProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isUpcoming = stepNumber > currentStep

          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              {/* Step Circle */}
              <div className="relative">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCompleted
                      ? "bg-green-500 border-green-500 text-white"
                      : isCurrent
                      ? "bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-500/25"
                      : "bg-white border-slate-300 text-slate-400 dark:bg-slate-800 dark:border-slate-600"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{stepNumber}</span>
                  )}
                </div>
                
                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute top-1/2 left-full w-full h-0.5 -translate-y-1/2 transition-all duration-300",
                      isCompleted
                        ? "bg-green-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    )}
                    style={{ width: 'calc(100% - 2.5rem)' }}
                  />
                )}
              </div>

              {/* Step Content */}
              <div className="mt-3 text-center max-w-32">
                <h3
                  className={cn(
                    "text-sm font-medium transition-colors duration-200",
                    isCurrent
                      ? "text-purple-600 dark:text-purple-400"
                      : isCompleted
                      ? "text-green-600 dark:text-green-400"
                      : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  {step.title}
                </h3>
                {step.description && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
