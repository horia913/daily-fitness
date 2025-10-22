'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { 
  Settings, 
  Timer, 
  Heart, 
  Volume2, 
  Vibrate, 
  Download, 
  Upload,
  BarChart3,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Play,
  RotateCcw,
  Zap,
  Activity,
  CheckCircle,
  AlertCircle,
  Star,
  Award
} from 'lucide-react'
import { useSmartTimerConfig } from '@/hooks/useSmartTimerConfig'
import { useTheme } from '@/contexts/ThemeContext'

interface TimerSettingsProps {
  userId: string
  isOpen: boolean
  onClose: () => void
}

export function TimerSettings({ userId, isOpen, onClose }: TimerSettingsProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const {
    preferences,
    analytics,
    savePreferences,
    resetAnalytics,
    exportData,
    importData
  } = useSmartTimerConfig(userId)

  const [activeTab, setActiveTab] = useState('preferences')
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [customRestTime, setCustomRestTime] = useState(60)
  const [soundVolume, setSoundVolume] = useState(80)
  const [selectedSound, setSelectedSound] = useState('default')

  // Initialize custom rest time from preferences
  useEffect(() => {
    if (isOpen && analytics.preferredRestDuration) {
      setCustomRestTime(Math.round(analytics.preferredRestDuration))
    }
  }, [isOpen, analytics.preferredRestDuration])

  if (!isOpen) return null

  const handlePreferenceChange = (key: string, value: string | boolean | number) => {
    savePreferences({ [key]: value })
    showSuccessFeedback()
  }

  const showSuccessFeedback = () => {
    setShowSuccessMessage(true)
    setTimeout(() => setShowSuccessMessage(false), 2000)
  }

  const handleCustomRestTimeChange = (value: number) => {
    setCustomRestTime(value)
    showSuccessFeedback()
  }

  const getRestTimePresets = () => [
    { label: '30s', value: 30, icon: Zap },
    { label: '60s', value: 60, icon: Clock },
    { label: '90s', value: 90, icon: Timer },
    { label: '2m', value: 120, icon: Activity },
    { label: '3m', value: 180, icon: Heart },
    { label: '5m', value: 300, icon: Target }
  ]

  const getSoundOptions = () => [
    { label: 'Default', value: 'default', icon: Volume2 },
    { label: 'Chime', value: 'chime', icon: Star },
    { label: 'Beep', value: 'beep', icon: AlertCircle },
    { label: 'Bell', value: 'bell', icon: Award }
  ]

  const getTimerTypeInfo = (type: string) => {
    switch (type) {
      case 'rest':
        return { label: 'Rest Timer', icon: Timer, color: 'blue' }
      case 'interval':
        return { label: 'Interval Timer', icon: Clock, color: 'green' }
      case 'stopwatch':
        return { label: 'Stopwatch', icon: Play, color: 'purple' }
      default:
        return { label: 'Timer', icon: Timer, color: 'blue' }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
  }

  const getPerformanceTrendColor = () => {
    switch (analytics.performanceTrend) {
      case 'improving': return isDark ? 'text-green-400' : 'text-green-600'
      case 'declining': return isDark ? 'text-red-400' : 'text-red-600'
      default: return isDark ? 'text-slate-400' : 'text-slate-600'
    }
  }

  const getPerformanceTrendBgColor = () => {
    switch (analytics.performanceTrend) {
      case 'improving': return isDark ? 'bg-green-900/20' : 'bg-green-50'
      case 'declining': return isDark ? 'bg-red-900/20' : 'bg-red-50'
      default: return isDark ? 'bg-slate-800/50' : 'bg-slate-50'
    }
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          importData(data)
        } catch (error) {
          console.error('Error importing file:', error)
        }
      }
      reader.readAsText(file)
    }
  }

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smart-timer-data-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[95vh] overflow-hidden">
        <Card className={`${theme.card} border ${theme.border} h-full flex flex-col rounded-3xl ${theme.shadow}`}>
          {/* Header */}
          <CardHeader className="pb-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                  <Settings className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <CardTitle className={`text-2xl font-bold ${theme.text}`}>
                    Timer Settings
                  </CardTitle>
                  <p className={`${theme.textSecondary} mt-1`}>
                    Configure your workout timers and preferences
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {showSuccessMessage && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Settings saved!</span>
                  </div>
                )}
                <Button variant="outline" onClick={onClose} className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid w-full grid-cols-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <TabsTrigger value="preferences" className="rounded-xl flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Preferences</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="rounded-xl flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="data" className="rounded-xl flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Data</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preferences" className="space-y-8 mt-8">
                {/* Timer Type Selection */}
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                        <Timer className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>Timer Types</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['rest', 'interval', 'stopwatch'].map((type) => {
                        const typeInfo = getTimerTypeInfo(type)
                        const Icon = typeInfo.icon
                        return (
                          <div
                            key={type}
                            className={`p-4 border ${theme.border} rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-lg`}
                            onClick={() => handlePreferenceChange('restPreference', type)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
                                <Icon className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                              </div>
                              <div>
                                <h4 className={`font-semibold ${theme.text}`}>{typeInfo.label}</h4>
                                <p className={`text-sm ${theme.textSecondary}`}>
                                  {type === 'rest' ? 'Between sets' : type === 'interval' ? 'Work intervals' : 'Time tracking'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Duration Settings */}
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                        <Clock className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>Duration Settings</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="space-y-6">
                      {/* Rest Time Presets */}
                      <div className="space-y-4">
                        <Label className={`text-sm font-semibold ${theme.text}`}>Quick Presets</Label>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                          {getRestTimePresets().map((preset) => {
                            const Icon = preset.icon
                            return (
                              <Button
                                key={preset.value}
                                variant={customRestTime === preset.value ? 'default' : 'outline'}
                                onClick={() => handleCustomRestTimeChange(preset.value)}
                                className={`rounded-xl h-16 flex flex-col gap-1 ${
                                  customRestTime === preset.value ? theme.primary : ''
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                                <span className="text-xs font-medium">{preset.label}</span>
                              </Button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Custom Duration Slider */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className={`text-sm font-semibold ${theme.text}`}>Custom Duration</Label>
                          <div className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            {formatTime(customRestTime)}
                          </div>
                        </div>
                        <div className={`p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                          <Input
                            type="range"
                            min="10"
                            max="600"
                            step="5"
                            value={customRestTime}
                            onChange={(e) => handleCustomRestTimeChange(parseInt(e.target.value))}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs mt-2">
                            <span className={`${theme.textSecondary}`}>10s</span>
                            <span className={`${theme.textSecondary}`}>10m</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Audio & Haptic Settings */}
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-orange-100'}`}>
                        <Volume2 className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>Audio & Haptic</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="space-y-6">
                      {/* Sound Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Volume2 className={`w-5 h-5 ${theme.textSecondary}`} />
                            <Label className={`text-sm font-semibold ${theme.text}`}>Sound Notifications</Label>
                          </div>
                          <Button
                            variant={preferences.soundEnabled ? 'default' : 'outline'}
                            onClick={() => handlePreferenceChange('soundEnabled', !preferences.soundEnabled)}
                            className="rounded-xl"
                          >
                            {preferences.soundEnabled ? 'On' : 'Off'}
                          </Button>
                        </div>

                        {preferences.soundEnabled && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className={`text-sm ${theme.textSecondary}`}>Sound Type</Label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {getSoundOptions().map((sound) => {
                                  const Icon = sound.icon
                                  return (
                                    <Button
                                      key={sound.value}
                                      variant={selectedSound === sound.value ? 'default' : 'outline'}
                                      onClick={() => setSelectedSound(sound.value)}
                                      className="rounded-xl h-12 flex items-center gap-2"
                                    >
                                      <Icon className="w-4 h-4" />
                                      <span className="text-sm">{sound.label}</span>
                                    </Button>
                                  )
                                })}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className={`text-sm ${theme.textSecondary}`}>Volume</Label>
                                <span className={`text-sm font-medium ${theme.text}`}>{soundVolume}%</span>
                              </div>
                              <Input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={soundVolume}
                                onChange={(e) => setSoundVolume(parseInt(e.target.value))}
                                className="w-full"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Vibration Settings */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Vibrate className={`w-5 h-5 ${theme.textSecondary}`} />
                          <Label className={`text-sm font-semibold ${theme.text}`}>Vibration</Label>
                        </div>
                        <Button
                          variant={preferences.vibrationEnabled ? 'default' : 'outline'}
                          onClick={() => handlePreferenceChange('vibrationEnabled', !preferences.vibrationEnabled)}
                          className="rounded-xl"
                        >
                          {preferences.vibrationEnabled ? 'On' : 'Off'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-8 mt-8">
                {/* Analytics Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                          <Clock className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <div>
                          <div className={`text-3xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            {Math.round(analytics.averageRestTime)}s
                          </div>
                          <div className={`text-sm font-medium ${theme.textSecondary}`}>Average Rest Time</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                          <Target className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                        </div>
                        <div>
                          <div className={`text-3xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            {analytics.completedRests + analytics.skippedRests > 0 
                              ? Math.round((analytics.completedRests / (analytics.completedRests + analytics.skippedRests)) * 100)
                              : 0}%
                          </div>
                          <div className={`text-sm font-medium ${theme.textSecondary}`}>Completion Rate</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                          <Activity className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                        </div>
                        <div>
                          <div className={`text-3xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                            {Math.round(analytics.totalRestTime / 60)}m
                          </div>
                          <div className={`text-sm font-medium ${theme.textSecondary}`}>Total Rest Time</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Trends */}
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-orange-100'}`}>
                        <BarChart3 className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>Performance Trends</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className={`p-4 border ${theme.border} rounded-2xl ${getPerformanceTrendBgColor()}`}>
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-sm ${theme.textSecondary}`}>Current Trend</span>
                        <div className="flex items-center gap-2">
                          {analytics.performanceTrend === 'improving' && <TrendingUp className={`w-4 h-4 ${getPerformanceTrendColor()}`} />}
                          {analytics.performanceTrend === 'declining' && <TrendingDown className={`w-4 h-4 ${getPerformanceTrendColor()}`} />}
                          {analytics.performanceTrend === 'stable' && <Minus className={`w-4 h-4 ${getPerformanceTrendColor()}`} />}
                          <span className={`text-sm font-medium ${getPerformanceTrendColor()}`}>
                            {analytics.performanceTrend.charAt(0).toUpperCase() + analytics.performanceTrend.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className={`text-sm ${theme.textSecondary}`}>Preferred Duration:</span>
                          <span className={`font-semibold ${theme.text} ml-2`}>{Math.round(analytics.preferredRestDuration)}s</span>
                        </div>
                        <div>
                          <span className={`text-sm ${theme.textSecondary}`}>Completed Rests:</span>
                          <span className={`font-semibold ${theme.text} ml-2`}>{analytics.completedRests}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Reset Analytics */}
                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    onClick={resetAnalytics}
                    className="rounded-xl text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Analytics
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-8 mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                          <Download className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                        </div>
                        <CardTitle className={`text-xl font-bold ${theme.text}`}>Export Data</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <p className={`${theme.textSecondary} mb-4`}>
                        Export your timer preferences, analytics, and settings to a JSON file.
                      </p>
                      <Button onClick={handleExport} className={`w-full rounded-xl ${theme.primary} hover:opacity-90 transition-all duration-200`}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Data
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                          <Upload className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <CardTitle className={`text-xl font-bold ${theme.text}`}>Import Data</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <p className={`${theme.textSecondary} mb-4`}>
                        Import previously exported timer data from a JSON file.
                      </p>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileImport}
                        className="hidden"
                        id="import-file"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => document.getElementById('import-file')?.click()}
                        className="w-full rounded-xl"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Import Data
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>
    </div>
  )
}
