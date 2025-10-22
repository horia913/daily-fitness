'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  RefreshCw, 
  Clock, 
  Eye, 
  EyeOff, 
  Palette, 
  Zap,
  Save,
  RotateCcw,
  Check
} from 'lucide-react'
import { useGreetingPreferences } from '@/hooks/useGreetingPreferences'

interface GreetingSettingsProps {
  userId: string
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function GreetingSettings({ userId, isOpen, onClose, className = '' }: GreetingSettingsProps) {
  const {
    preferences,
    loading,
    saving,
    error,
    savePreferences,
    resetPreferences,
    updateGreetingStyle,
    togglePreference,
    updateRefreshInterval
  } = useGreetingPreferences(userId)

  const [showPreview, setShowPreview] = useState(false)

  if (!isOpen) return null

  const greetingStyles = [
    { value: 'casual', label: 'Casual', description: 'Friendly and relaxed tone', icon: '😊' },
    { value: 'motivational', label: 'Motivational', description: 'Inspiring and energetic', icon: '💪' },
    { value: 'professional', label: 'Professional', description: 'Formal and business-like', icon: '👔' }
  ]

  const refreshIntervals = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 0, label: 'Manual only' }
  ]

  const handleSave = async () => {
    await savePreferences(preferences)
  }

  const handleReset = async () => {
    await resetPreferences()
  }

  if (loading) {
    return (
      <div className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 ${className}`}>
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 ${className}`}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Greeting Settings
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Greeting Style */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Greeting Style
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {greetingStyles.map((style) => (
                <div
                  key={style.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    preferences.greetingStyle === style.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateGreetingStyle(style.value as any)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{style.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{style.label}</div>
                      <div className="text-sm text-gray-600">{style.description}</div>
                    </div>
                    {preferences.greetingStyle === style.value && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Display Options
            </h3>
            <div className="space-y-3">
              {[
                { key: 'showStreak', label: 'Show Streak Counter', description: 'Display your workout streak' },
                { key: 'showMotivation', label: 'Show Motivational Messages', description: 'Display daily motivation quotes' },
                { key: 'showTimeContext', label: 'Show Time Context', description: 'Display current time period badge' },
                { key: 'showQuickStats', label: 'Show Quick Stats', description: 'Display time and role information' },
                { key: 'showWeather', label: 'Show Weather Info', description: 'Display weather information (coming soon)' }
              ].map((option) => (
                <div
                  key={option.key}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-800">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePreference(option.key as keyof typeof preferences)}
                    className={`${
                      preferences[option.key as keyof typeof preferences]
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {preferences[option.key as keyof typeof preferences] ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Auto Refresh */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Auto Refresh
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-800">Enable Auto Refresh</div>
                  <div className="text-sm text-gray-600">Automatically update greeting based on time</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePreference('autoRefresh')}
                  className={`${
                    preferences.autoRefresh
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                </Button>
              </div>

              {preferences.autoRefresh && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Refresh Interval</label>
                  <div className="grid grid-cols-2 gap-2">
                    {refreshIntervals.map((interval) => (
                      <Button
                        key={interval.value}
                        variant="outline"
                        size="sm"
                        onClick={() => updateRefreshInterval(interval.value)}
                        className={`${
                          preferences.refreshInterval === interval.value
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : ''
                        }`}
                      >
                        {interval.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Preview
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
            
            {showPreview && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Current settings preview:</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{preferences.greetingStyle}</Badge>
                    <span className="text-sm text-gray-600">Greeting Style</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {preferences.autoRefresh ? `${preferences.refreshInterval}min` : 'Manual'}
                    </Badge>
                    <span className="text-sm text-gray-600">Refresh Rate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {Object.values(preferences).filter(Boolean).length} enabled
                    </Badge>
                    <span className="text-sm text-gray-600">Features</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
