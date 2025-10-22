'use client'

import { Button } from '@/components/ui/button'
import { Minus, Plus, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlateCalculatorWidget } from '@/components/PlateCalculatorWidget'

interface StepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  label?: string
  className?: string
  quickIncrements?: number[]
  previousValue?: number
  showQuickIncrements?: boolean
  showPlateCalculator?: boolean
  exerciseEquipment?: string[]
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  unit = '',
  label,
  className,
  quickIncrements = [],
  previousValue,
  showQuickIncrements = false,
  showPlateCalculator = false,
  exerciseEquipment = []
}: StepperProps) {
  const handleDecrement = () => {
    const newValue = Math.max(min, value - step)
    onChange(newValue)
  }

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step)
    onChange(newValue)
  }

  const handleQuickIncrement = (increment: number) => {
    const newValue = Math.min(max, value + increment)
    onChange(newValue)
  }

  const handlePreviousValue = () => {
    if (previousValue !== undefined) {
      onChange(previousValue)
    }
  }

  // Check if exercise uses barbell equipment
  const isBarbellExercise = () => {
    return exerciseEquipment.some((eq: string) => 
      eq.toLowerCase().includes('barbell') || 
      eq.toLowerCase().includes('bar') ||
      eq.toLowerCase().includes('olympic')
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {label && (
        <label className="text-lg font-medium text-slate-700 block text-center">
          {label}
        </label>
      )}
      
      {/* Main Stepper Controls */}
      <div className="flex items-center justify-center gap-6">
        {/* Decrement Button */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-20 h-20 rounded-2xl border-2 border-slate-300 hover:border-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Minus className="w-10 h-10" />
        </Button>

        {/* Value Display / Input */}
        <div className="flex items-center justify-center min-w-[160px] px-8 py-6 bg-white rounded-2xl border-2 border-slate-200 shadow-lg focus-within:border-blue-500 focus-within:shadow-xl transition-all duration-200">
          <input
            type="number"
            value={value === 0 ? '' : value}
            onChange={(e) => {
              const inputValue = e.target.value
              if (inputValue === '') {
                onChange(0)
                return
              }
              const newValue = parseFloat(inputValue) || 0
              const clampedValue = Math.max(min, Math.min(max, newValue))
              onChange(clampedValue)
            }}
            onFocus={(e) => {
              if (value === 0) {
                e.target.select()
              }
            }}
            className="text-4xl font-bold text-slate-800 bg-transparent border-none outline-none text-center w-full"
            style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
          />
          {unit && (
            <span className="text-xl font-medium text-slate-600 ml-2">
              {unit}
            </span>
          )}
        </div>

        {/* Increment Button */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-20 h-20 rounded-2xl border-2 border-slate-300 hover:border-green-500 hover:bg-green-50 hover:text-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Plus className="w-10 h-10" />
        </Button>
      </div>

      {/* Plate Calculator for Barbell Exercises */}
      {showPlateCalculator && isBarbellExercise() && (
        <div className="mt-6">
          <PlateCalculatorWidget
            currentWeight={value}
            unit={unit === 'kg' ? 'kg' : 'lb'}
            onWeightSelect={(weight) => onChange(weight)}
            className="w-full"
          />
        </div>
      )}

      {/* Quick Increment Options */}
      {showQuickIncrements && quickIncrements.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          {quickIncrements.map((increment) => (
            <Button
              key={increment}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleQuickIncrement(increment)}
              className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200 transition-all duration-200"
            >
              +{increment}
            </Button>
          ))}
        </div>
      )}

      {/* Previous Value Button */}
      {previousValue !== undefined && previousValue > 0 && (
        <div className="flex items-center justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePreviousValue}
            className="px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 border border-orange-200 transition-all duration-200"
          >
            <Zap className="w-4 h-4 mr-2" />
            Use Previous ({previousValue}{unit})
          </Button>
        </div>
      )}
    </div>
  )
}
