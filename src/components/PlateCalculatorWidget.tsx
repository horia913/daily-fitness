'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator, 
  Weight, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle, 
  AlertCircle,
  Settings,
  X,
  Info
} from 'lucide-react'
import { 
  PlateCalculator, 
  PlateCalculationResult, 
  GymConfiguration 
} from '@/lib/plateCalculator'
import { GymSettings } from './GymSettings'

interface PlateCalculatorWidgetProps {
  currentWeight: number
  unit: 'kg' | 'lb'
  onWeightSelect: (weight: number) => void
  className?: string
}

export function PlateCalculatorWidget({
  currentWeight,
  unit,
  onWeightSelect,
  className = ''
}: PlateCalculatorWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [totalWeight, setTotalWeight] = useState(currentWeight)
  const [barType, setBarType] = useState<'olympic' | 'standard' | 'ez' | 'hex'>('olympic')
  const [currentConfig, setCurrentConfig] = useState<GymConfiguration>(
    PlateCalculator.getStandardConfigurations()[0]
  )
  const [calculationResult, setCalculationResult] = useState<PlateCalculationResult | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    setTotalWeight(currentWeight)
  }, [currentWeight])

  useEffect(() => {
    const result = PlateCalculator.calculatePlates(totalWeight, barType, unit, currentConfig.plates)
    setCalculationResult(result)
  }, [totalWeight, barType, unit, currentConfig])

  const handleWeightChange = (weight: number) => {
    setTotalWeight(weight)
    onWeightSelect(weight)
  }

  const incrementWeight = (increment: number) => {
    const newWeight = totalWeight + increment
    if (newWeight > 0) {
      handleWeightChange(newWeight)
    }
  }

  const decrementWeight = (decrement: number) => {
    const newWeight = totalWeight - decrement
    if (newWeight > 0) {
      handleWeightChange(newWeight)
    }
  }

  const getWeightIncrement = () => {
    return unit === 'kg' ? 2.5 : 5
  }

  const formatWeight = (weight: number) => {
    return PlateCalculator.formatWeight(weight, unit)
  }

  const PlateVisualization = ({ plates }: { plates: any[] }) => (
    <div className="flex justify-center items-center space-x-2">
      {plates.map((plate, index) => (
        <div
          key={`${plate.weight}-${index}`}
          className="flex items-center justify-center text-xs font-bold text-white"
          style={{
            width: `${Math.max(16, plate.weight * 1.5)}px`,
            height: `${Math.max(6, plate.weight * 0.6)}px`,
            backgroundColor: plate.color,
            borderRadius: '2px',
            border: '1px solid #374151'
          }}
        >
          {plate.weight}
        </div>
      ))}
    </div>
  )

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 ${className}`}
      >
        <Calculator className="w-4 h-4" />
        Plate Calc
      </Button>
    )
  }

  return (
    <>
      <Card className={`w-full max-w-md ${className}`}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">Plate Calculator</span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="h-8 w-8 p-0"
                >
                  <Settings className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Weight Input */}
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-sm">Total Weight</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => decrementWeight(getWeightIncrement())}
                  disabled={totalWeight <= getWeightIncrement()}
                  className="h-8 w-8 p-0"
                >
                  <ArrowDown className="w-3 h-3" />
                </Button>
                <Input
                  id="weight"
                  type="number"
                  value={totalWeight}
                  onChange={(e) => handleWeightChange(parseFloat(e.target.value) || 0)}
                  className="text-center h-8"
                  step={getWeightIncrement()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => incrementWeight(getWeightIncrement())}
                  className="h-8 w-8 p-0"
                >
                  <ArrowUp className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Bar Type */}
            <div className="space-y-2">
              <Label htmlFor="barType" className="text-sm">Bar Type</Label>
              <Select value={barType} onValueChange={(value: any) => setBarType(value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="olympic">Olympic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="ez">EZ Bar</SelectItem>
                  <SelectItem value="hex">Hex Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Weights */}
            <div className="space-y-2">
              <Label className="text-sm">Quick Weights</Label>
              <div className="grid grid-cols-3 gap-1">
                {[50, 75, 100, 125, 150, 200].map(weight => (
                  <Button
                    key={weight}
                    variant="outline"
                    size="sm"
                    onClick={() => handleWeightChange(weight)}
                    className={`h-6 text-xs ${
                      totalWeight === weight ? 'bg-blue-600 text-white' : ''
                    }`}
                  >
                    {formatWeight(weight)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Calculation Result */}
            {calculationResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {calculationResult.isValid ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    calculationResult.isValid ? 'text-green-800' : 'text-orange-800'
                  }`}>
                    {calculationResult.isValid ? 'Achievable' : 'Not exact'}
                  </span>
                </div>

                {/* Plates Visualization */}
                <div className="space-y-2">
                  <div className="text-xs text-gray-600 text-center">
                    Plates per side: {formatWeight(calculationResult.totalPlatesPerSide)}
                  </div>
                  <PlateVisualization plates={calculationResult.platesPerSide} />
                </div>

                {/* Plates List */}
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Plates needed:</div>
                  <div className="flex flex-wrap gap-1">
                    {calculationResult.platesPerSide.map((plate, index) => (
                      <Badge
                        key={`${plate.weight}-${index}`}
                        className="text-xs"
                        style={{ backgroundColor: plate.color, color: 'white' }}
                      >
                        {plate.count}×{plate.weight}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Alternative Weights */}
                {calculationResult.alternativeWeights && calculationResult.alternativeWeights.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600">Alternative weights:</div>
                    <div className="flex flex-wrap gap-1">
                      {calculationResult.alternativeWeights.slice(0, 3).map((weight, index) => (
                        <Button
                          key={weight}
                          variant="outline"
                          size="sm"
                          onClick={() => handleWeightChange(weight)}
                          className="h-6 text-xs"
                        >
                          {formatWeight(weight)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gym Settings Modal */}
      <GymSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentConfig={currentConfig}
        onConfigChange={setCurrentConfig}
      />
    </>
  )
}
