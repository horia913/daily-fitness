'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calculator, 
  Weight, 
  RotateCcw, 
  Settings, 
  Info,
  AlertCircle,
  CheckCircle,
  Zap,
  Target,
  BarChart3,
  ArrowUp,
  ArrowDown,
  X,
  Save,
  Copy,
  Eye,
  EyeOff,
  TrendingUp,
  Dumbbell,
  Clock
} from 'lucide-react'
import { 
  PlateCalculator, 
  PlateCalculationResult, 
  GymConfiguration, 
  Plate 
} from '@/lib/plateCalculator'
import { useTheme } from '@/contexts/ThemeContext'

interface PlateCalculatorProps {
  initialWeight?: number
  initialUnit?: 'kg' | 'lb'
  onWeightSelect?: (weight: number) => void
  className?: string
}

export function PlateCalculatorComponent({
  initialWeight = 100,
  initialUnit = 'kg',
  onWeightSelect,
  className = ''
}: PlateCalculatorProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  
  const [totalWeight, setTotalWeight] = useState(initialWeight)
  const [unit, setUnit] = useState<'kg' | 'lb'>(initialUnit)
  const [barType, setBarType] = useState<'olympic' | 'standard' | 'ez' | 'hex'>('olympic')
  const [currentConfig, setCurrentConfig] = useState<GymConfiguration>(
    PlateCalculator.getStandardConfigurations()[0]
  )
  const [calculationResult, setCalculationResult] = useState<PlateCalculationResult | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState('calculator')
  const [showVisualization, setShowVisualization] = useState(true)

  // Calculate plates when inputs change
  useEffect(() => {
    const result = PlateCalculator.calculatePlates(totalWeight, barType, unit, currentConfig.plates)
    setCalculationResult(result)
  }, [totalWeight, barType, unit, currentConfig])

  const handleWeightChange = useCallback((weight: number) => {
    setTotalWeight(weight)
    onWeightSelect?.(weight)
  }, [onWeightSelect])

  const handleUnitChange = useCallback((newUnit: 'kg' | 'lb') => {
    const convertedWeight = PlateCalculator.convertWeight(totalWeight, unit, newUnit)
    setUnit(newUnit)
    setTotalWeight(convertedWeight)
  }, [totalWeight, unit])

  const incrementWeight = useCallback((increment: number) => {
    const newWeight = totalWeight + increment
    if (newWeight > 0) {
      handleWeightChange(newWeight)
    }
  }, [totalWeight, handleWeightChange])

  const decrementWeight = useCallback((decrement: number) => {
    const newWeight = totalWeight - decrement
    if (newWeight > 0) {
      handleWeightChange(newWeight)
    }
  }, [totalWeight, handleWeightChange])

  const getWeightIncrement = useCallback(() => {
    return unit === 'kg' ? 2.5 : 5
  }, [unit])

  const formatWeight = useCallback((weight: number) => {
    return PlateCalculator.formatWeight(weight, unit)
  }, [unit])

  const getPlateVisualization = useCallback(() => {
    if (!calculationResult) return null

    const leftSide: Plate[] = []
    const rightSide: Plate[] = []

    calculationResult.platesPerSide.forEach(plate => {
      if (plate.count > 0) {
        leftSide.push({ ...plate, count: plate.count })
        rightSide.push({ ...plate, count: plate.count })
      }
    })

    return { leftSide, rightSide }
  }, [calculationResult])

  const PlateVisualization = ({ plates, side }: { plates: Plate[]; side: 'left' | 'right' }) => (
    <div className="flex flex-col items-center space-y-3">
      <div className={`text-sm font-medium ${theme.textSecondary} capitalize`}>{side} side</div>
      <div className="flex flex-col-reverse items-center space-y-reverse space-y-2">
        {plates.map((plate, index) => (
          <div
            key={`${plate.weight}-${index}`}
            className={`flex items-center justify-center rounded-xl border-2 ${theme.border} shadow-lg transition-all duration-200 hover:scale-105`}
            style={{
              width: `${Math.max(24, plate.weight * 2.5)}px`,
              height: `${Math.max(12, plate.weight * 1)}px`,
              backgroundColor: plate.color,
              color: 'white',
              fontSize: '11px',
              fontWeight: 'bold'
            }}
          >
            {formatWeight(plate.weight)}
          </div>
        ))}
      </div>
    </div>
  )

  const WeightProgressions = () => {
    const progressions = PlateCalculator.getWeightProgressions(totalWeight, unit)
    const increment = getWeightIncrement()

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
            <TrendingUp className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
          </div>
          <h3 className={`text-lg font-bold ${theme.text}`}>Weight Progressions</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {progressions.map((weight, index) => (
            <Button
              key={weight}
              variant={weight === totalWeight ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleWeightChange(weight)}
              className={`rounded-xl transition-all duration-200 ${
                weight === totalWeight 
                  ? `${theme.primary} text-white` 
                  : `${theme.textSecondary} hover:${theme.text} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`
              }`}
            >
              {formatWeight(weight)}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  const AlternativeWeights = () => {
    if (!calculationResult?.alternativeWeights || calculationResult.alternativeWeights.length === 0) {
      return null
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-orange-100'}`}>
            <Target className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <h3 className={`text-lg font-bold ${theme.text}`}>Alternative Weights</h3>
        </div>
        <div className="space-y-3">
          {calculationResult.alternativeWeights.map((weight, index) => (
            <Button
              key={weight}
              variant="outline"
              size="sm"
              onClick={() => handleWeightChange(weight)}
              className={`w-full justify-start rounded-xl transition-all duration-200 ${theme.textSecondary} hover:${theme.text} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
            >
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              {formatWeight(weight)} - Achievable
            </Button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full max-w-6xl mx-auto ${className}`}>
      {/* Header */}
      <div className={`${theme.card} ${theme.shadow} rounded-3xl border ${theme.border} p-6 mb-8`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-gradient-to-br from-blue-100 to-purple-100'}`}>
              <Calculator className={`w-6 h-6 ${theme.text}`} />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${theme.text}`}>Plate Calculator</h2>
              <p className={`text-sm ${theme.textSecondary} mt-1`}>
                Calculate the perfect plate combination for any weight
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVisualization(!showVisualization)}
              className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}
            >
              {showVisualization ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showVisualization ? 'Hide' : 'Show'} Visualization
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Calculator */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full grid-cols-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <TabsTrigger value="calculator" className="rounded-xl">Calculator</TabsTrigger>
              <TabsTrigger value="visualization" className="rounded-xl">Visualization</TabsTrigger>
              <TabsTrigger value="progressions" className="rounded-xl">Progressions</TabsTrigger>
            </TabsList>

            <TabsContent value="calculator" className="space-y-8">
              {/* Input Controls */}
              <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                <CardHeader className="p-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                      <Weight className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <CardTitle className={`text-xl font-bold ${theme.text}`}>Weight Configuration</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Weight Input */}
                    <div className="space-y-3">
                      <Label htmlFor="totalWeight" className={`text-sm font-medium ${theme.text}`}>Total Weight</Label>
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => decrementWeight(getWeightIncrement())}
                          disabled={totalWeight <= getWeightIncrement()}
                          className="rounded-xl"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Input
                          id="totalWeight"
                          type="number"
                          value={totalWeight}
                          onChange={(e) => handleWeightChange(parseFloat(e.target.value) || 0)}
                          className="text-center rounded-xl"
                          step={getWeightIncrement()}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => incrementWeight(getWeightIncrement())}
                          className="rounded-xl"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Unit Selection */}
                    <div className="space-y-3">
                      <Label htmlFor="unit" className={`text-sm font-medium ${theme.text}`}>Unit</Label>
                      <Select value={unit} onValueChange={handleUnitChange}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="lb">Pounds (lb)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Bar Type */}
                    <div className="space-y-3">
                      <Label htmlFor="barType" className={`text-sm font-medium ${theme.text}`}>Bar Type</Label>
                      <Select value={barType} onValueChange={(value: any) => setBarType(value)}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="olympic">Olympic (20kg/45lb)</SelectItem>
                          <SelectItem value="standard">Standard (15kg/35lb)</SelectItem>
                          <SelectItem value="ez">EZ Bar (10kg/20lb)</SelectItem>
                          <SelectItem value="hex">Hex Bar (15kg/35lb)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Quick Weight Buttons */}
                  <div className="space-y-4">
                    <Label className={`text-sm font-medium ${theme.text}`}>Quick Weights</Label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {[50, 75, 100, 125, 150, 200].map(weight => (
                        <Button
                          key={weight}
                          variant="outline"
                          size="sm"
                          onClick={() => handleWeightChange(weight)}
                          className={`rounded-xl transition-all duration-200 ${
                            totalWeight === weight 
                              ? `${theme.primary} text-white` 
                              : `${theme.textSecondary} hover:${theme.text} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`
                          }`}
                        >
                          {formatWeight(weight)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Calculation Result */}
              {calculationResult && (
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                        {calculationResult.isValid ? (
                          <CheckCircle className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                        ) : (
                          <AlertCircle className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                        )}
                      </div>
                      <div>
                        <CardTitle className={`text-xl font-bold ${theme.text}`}>
                          {calculationResult.isValid ? 'Exact Weight Achievable' : 'Exact Weight Not Achievable'}
                        </CardTitle>
                        <p className={`text-sm ${theme.textSecondary} mt-1`}>
                          {calculationResult.isValid 
                            ? 'Perfect! You can achieve this exact weight' 
                            : 'Here are the closest achievable weights'
                          }
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-6">
                    {calculationResult.error && (
                      <div className={`p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
                        <p className={`text-sm ${theme.text}`}>{calculationResult.error}</p>
                      </div>
                    )}

                    {/* Plates Needed */}
                    <div className="space-y-4">
                      <h3 className={`text-lg font-bold ${theme.text}`}>Plates Needed (Each Side)</h3>
                      <div className="flex flex-wrap gap-3">
                        {calculationResult.platesPerSide.map((plate, index) => (
                          <Badge
                            key={`${plate.weight}-${index}`}
                            className="flex items-center gap-2 rounded-xl px-3 py-2"
                            style={{ backgroundColor: plate.color, color: 'white' }}
                          >
                            <span className="font-bold">{plate.count}×</span>
                            <span>{formatWeight(plate.weight)}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Alternative Weights */}
                    <AlternativeWeights />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="visualization" className="space-y-6">
              {calculationResult && (
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                        <Dumbbell className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <CardTitle className={`text-xl font-bold ${theme.text}`}>
                          Barbell Setup: {formatWeight(calculationResult.totalWeight)}
                        </CardTitle>
                        <p className={`text-sm ${theme.textSecondary} mt-1`}>
                          Bar: {formatWeight(calculationResult.barWeight)} | 
                          Plates per side: {formatWeight(calculationResult.totalPlatesPerSide)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-8">
                    <div className="flex justify-center items-center space-x-12">
                      {getPlateVisualization() && (
                        <>
                          <PlateVisualization 
                            plates={getPlateVisualization()!.leftSide} 
                            side="left" 
                          />
                          
                          {/* Bar Visualization */}
                          <div className="flex flex-col items-center space-y-3">
                            <div className={`w-40 h-6 ${isDark ? 'bg-slate-600' : 'bg-slate-400'} rounded-xl shadow-lg`}></div>
                            <div className={`text-sm font-medium ${theme.textSecondary}`}>Olympic Bar</div>
                          </div>
                          
                          <PlateVisualization 
                            plates={getPlateVisualization()!.rightSide} 
                            side="right" 
                          />
                        </>
                      )}
                    </div>

                    {/* Plate Legend */}
                    <div className="space-y-4">
                      <h4 className={`text-lg font-bold ${theme.text}`}>Plate Legend</h4>
                      <div className="grid grid-cols-4 gap-4">
                        {currentConfig.plates.map((plate, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <div
                              className="w-6 h-6 rounded-xl shadow-md"
                              style={{ backgroundColor: plate.color }}
                            ></div>
                            <span className={`text-sm font-medium ${theme.text}`}>{formatWeight(plate.weight)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="progressions" className="space-y-6">
              <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                <CardContent className="p-6">
                  <WeightProgressions />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
            <CardHeader className="p-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                  <Zap className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <CardTitle className={`text-lg font-bold ${theme.text}`}>Quick Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <Button
                variant="outline"
                onClick={() => handleWeightChange(100)}
                className={`w-full rounded-xl justify-start ${theme.textSecondary} hover:${theme.text}`}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to 100{unit}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSettings(true)}
                className={`w-full rounded-xl justify-start ${theme.textSecondary} hover:${theme.text}`}
              >
                <Settings className="w-4 h-4 mr-2" />
                Gym Settings
              </Button>
            </CardContent>
          </Card>

          {/* Current Setup Summary */}
          {calculationResult && (
            <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                    <BarChart3 className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <CardTitle className={`text-lg font-bold ${theme.text}`}>Setup Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${theme.textSecondary}`}>Total Weight</span>
                    <span className={`font-bold ${theme.text}`}>{formatWeight(calculationResult.totalWeight)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${theme.textSecondary}`}>Bar Weight</span>
                    <span className={`font-bold ${theme.text}`}>{formatWeight(calculationResult.barWeight)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${theme.textSecondary}`}>Plates per Side</span>
                    <span className={`font-bold ${theme.text}`}>{formatWeight(calculationResult.totalPlatesPerSide)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${theme.textSecondary}`}>Total Plates</span>
                    <span className={`font-bold ${theme.text}`}>
                      {calculationResult.platesPerSide.reduce((sum, plate) => sum + plate.count, 0) * 2}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// Hook for managing plate calculator state
export function usePlateCalculator(initialWeight?: number, initialUnit?: 'kg' | 'lb') {
  const [totalWeight, setTotalWeight] = useState(initialWeight || 100)
  const [unit, setUnit] = useState<'kg' | 'lb'>(initialUnit || 'kg')
  const [barType, setBarType] = useState<'olympic' | 'standard' | 'ez' | 'hex'>('olympic')
  const [currentConfig, setCurrentConfig] = useState<GymConfiguration>(
    PlateCalculator.getStandardConfigurations()[0]
  )

  const calculatePlates = useCallback((weight: number) => {
    return PlateCalculator.calculatePlates(weight, barType, unit, currentConfig.plates)
  }, [barType, unit, currentConfig])

  const convertWeight = useCallback((weight: number, fromUnit: 'kg' | 'lb', toUnit: 'kg' | 'lb') => {
    return PlateCalculator.convertWeight(weight, fromUnit, toUnit)
  }, [])

  const getWeightProgressions = useCallback((weight: number) => {
    return PlateCalculator.getWeightProgressions(weight, unit)
  }, [unit])

  return {
    totalWeight,
    setTotalWeight,
    unit,
    setUnit,
    barType,
    setBarType,
    currentConfig,
    setCurrentConfig,
    calculatePlates,
    convertWeight,
    getWeightProgressions
  }
}
