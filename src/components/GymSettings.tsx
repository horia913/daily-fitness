'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  Info,
  Weight,
  Palette,
  X
} from 'lucide-react'
import { 
  PlateCalculator, 
  GymConfiguration, 
  Plate 
} from '@/lib/plateCalculator'

interface GymSettingsProps {
  isOpen: boolean
  onClose: () => void
  currentConfig: GymConfiguration
  onConfigChange: (config: GymConfiguration) => void
}

export function GymSettings({ 
  isOpen, 
  onClose, 
  currentConfig, 
  onConfigChange 
}: GymSettingsProps) {
  const [config, setConfig] = useState<GymConfiguration>(currentConfig)
  const [newPlate, setNewPlate] = useState<Partial<Plate>>({
    weight: 0,
    unit: 'kg',
    color: '#6B7280',
    size: 'small',
    count: 0
  })
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    setConfig(currentConfig)
  }, [currentConfig])

  const handleConfigChange = (updates: Partial<GymConfiguration>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const addPlate = () => {
    if (!newPlate.weight || newPlate.weight <= 0) {
      setErrors(['Plate weight must be greater than 0'])
      return
    }

    if (config.plates.some(p => p.weight === newPlate.weight)) {
      setErrors(['Plate weight already exists'])
      return
    }

    const plate: Plate = {
      weight: newPlate.weight!,
      unit: newPlate.unit!,
      color: newPlate.color!,
      size: newPlate.size!,
      count: newPlate.count || 0
    }

    setConfig(prev => ({
      ...prev,
      plates: [...prev.plates, plate].sort((a, b) => b.weight - a.weight)
    }))

    setNewPlate({
      weight: 0,
      unit: config.unit,
      color: '#6B7280',
      size: 'small',
      count: 0
    })
    setErrors([])
  }

  const removePlate = (weight: number) => {
    setConfig(prev => ({
      ...prev,
      plates: prev.plates.filter(p => p.weight !== weight)
    }))
  }

  const updatePlateCount = (weight: number, count: number) => {
    setConfig(prev => ({
      ...prev,
      plates: prev.plates.map(p => 
        p.weight === weight ? { ...p, count: Math.max(0, count) } : p
      )
    }))
  }

  const updatePlateColor = (weight: number, color: string) => {
    setConfig(prev => ({
      ...prev,
      plates: prev.plates.map(p => 
        p.weight === weight ? { ...p, color } : p
      )
    }))
  }

  const saveConfig = () => {
    const validation = PlateCalculator.validateConfiguration(config)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    onConfigChange(config)
    onClose()
    setErrors([])
  }

  const resetToDefault = () => {
    const defaultConfigs = PlateCalculator.getStandardConfigurations()
    const defaultConfig = defaultConfigs.find(c => c.unit === config.unit) || defaultConfigs[0]
    setConfig(defaultConfig)
    setErrors([])
  }

  const loadPreset = (presetName: string) => {
    const presets = PlateCalculator.getStandardConfigurations()
    const preset = presets.find(p => p.name === presetName)
    if (preset) {
      setConfig(preset)
      setErrors([])
    }
  }

  const plateColors = [
    '#FF0000', '#0000FF', '#FFFF00', '#00FF00', '#FF00FF', 
    '#00FFFF', '#FFA500', '#800080', '#6B7280', '#EF4444',
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Gym Settings
          </CardTitle>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Configuration Name */}
          <div className="space-y-2">
            <Label htmlFor="configName">Configuration Name</Label>
            <Input
              id="configName"
              value={config.name}
              onChange={(e) => handleConfigChange({ name: e.target.value })}
              placeholder="My Gym Setup"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={config.description || ''}
              onChange={(e) => handleConfigChange({ description: e.target.value })}
              placeholder="Describe your gym setup..."
              rows={2}
            />
          </div>

          {/* Bar Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barWeight">Bar Weight</Label>
              <Input
                id="barWeight"
                type="number"
                value={config.barWeight}
                onChange={(e) => handleConfigChange({ barWeight: parseFloat(e.target.value) || 0 })}
                step="0.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select 
                value={config.unit} 
                onValueChange={(value: 'kg' | 'lb') => handleConfigChange({ unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="lb">Pounds (lb)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preset Configurations */}
          <div className="space-y-3">
            <Label>Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {PlateCalculator.getStandardConfigurations().map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => loadPreset(preset.name)}
                  className="text-xs"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Add New Plate */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Plate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plateWeight">Weight</Label>
                  <Input
                    id="plateWeight"
                    type="number"
                    value={newPlate.weight || ''}
                    onChange={(e) => setNewPlate(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                    step="0.5"
                    placeholder="25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plateUnit">Unit</Label>
                  <Select 
                    value={newPlate.unit} 
                    onValueChange={(value: 'kg' | 'lb') => setNewPlate(prev => ({ ...prev, unit: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="lb">lb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plateSize">Size</Label>
                  <Select 
                    value={newPlate.size} 
                    onValueChange={(value: 'small' | 'medium' | 'large') => setNewPlate(prev => ({ ...prev, size: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plateCount">Count</Label>
                  <Input
                    id="plateCount"
                    type="number"
                    value={newPlate.count || ''}
                    onChange={(e) => setNewPlate(prev => ({ ...prev, count: parseInt(e.target.value) || 0 }))}
                    min="0"
                    placeholder="4"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {plateColors.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded border-2 ${
                        newPlate.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewPlate(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>

              <Button onClick={addPlate} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Plate
              </Button>
            </CardContent>
          </Card>

          {/* Current Plates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Plates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config.plates.map((plate, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: plate.color }}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{plate.weight}{plate.unit}</div>
                      <div className="text-sm text-gray-600 capitalize">{plate.size} plate</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`count-${plate.weight}`} className="text-sm">Count:</Label>
                      <Input
                        id={`count-${plate.weight}`}
                        type="number"
                        value={plate.count}
                        onChange={(e) => updatePlateCount(plate.weight, parseInt(e.target.value) || 0)}
                        className="w-16 h-8"
                        min="0"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label htmlFor={`color-${plate.weight}`} className="text-sm">Color:</Label>
                      <input
                        id={`color-${plate.weight}`}
                        type="color"
                        value={plate.color}
                        onChange={(e) => updatePlateColor(plate.weight, e.target.value)}
                        className="w-8 h-8 rounded border"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePlate(plate.weight)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-800">Please fix the following errors:</span>
              </div>
              <ul className="list-disc list-inside text-sm text-red-700">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={resetToDefault}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Default
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={saveConfig}>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
