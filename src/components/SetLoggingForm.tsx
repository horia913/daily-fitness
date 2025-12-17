'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Dumbbell, 
  Target, 
  Weight, 
  Play, 
  Youtube,
  Plus,
  Minus,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  TrendingUp,
  Activity,
  MessageSquare,
  Eye,
  EyeOff,
  SkipForward,
  RotateCcw,
  Star,
  Award,
  Timer,
  BarChart3,
  Heart,
  Flame
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { PlateCalculatorWidget } from './PlateCalculatorWidget'

interface SetLoggingFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  sessionId: string
  templateExercise: any
  setNumber: number
  totalSets?: number
  previousSet?: any
  nextSet?: any
}

export default function SetLoggingForm({
  isOpen,
  onClose,
  onSuccess,
  sessionId,
  templateExercise,
  setNumber,
  totalSets = 1,
  previousSet,
  nextSet
}: SetLoggingFormProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const [formData, setFormData] = useState({
    weight_used: '',
    reps_completed: '',
    rpe: 5,
    notes: '',
    rest_time: 0
  })
  const [loading, setLoading] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [setStatus, setSetStatus] = useState<'completed' | 'failed' | 'skipped' | 'pending'>('pending')

  // Initialize form data with previous set values or defaults
  useEffect(() => {
    if (isOpen) {
      const defaultWeight = previousSet?.weight_used || templateExercise?.weight || ''
      const defaultReps = previousSet?.reps_completed || templateExercise?.reps || ''
      
      setFormData({
        weight_used: defaultWeight.toString(),
        reps_completed: defaultReps.toString(),
        rpe: previousSet?.rpe || 5,
        notes: '',
        rest_time: templateExercise?.rest_seconds || 60
      })
      setSetStatus('pending')
      setShowSuccessAnimation(false)
    }
  }, [isOpen, previousSet, templateExercise])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Call /api/log-set endpoint
      const response = await fetch('/api/log-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_log_id: undefined, // API will create if needed
          block_id: templateExercise?.block_id,
          exercise_id: templateExercise?.exercise_id || templateExercise?.exercise?.id,
          weight: parseFloat(formData.weight_used) || 0,
          reps: parseInt(formData.reps_completed) || 0,
          client_id: user.id,
          session_id: sessionId,
          template_exercise_id: templateExercise?.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to log set')
      }

      const result = await response.json()
      
      // Show PR notification if needed
      if (result.e1rm?.is_new_pr) {
        // PR notification can be added here if toast context is available
        console.log('New PR!', result.e1rm)
      }

      // Show success animation
      setShowSuccessAnimation(true)
      setSetStatus('completed')
      
      // Close modal after a brief delay
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (error) {
      console.error('Error logging set:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSkipSet = () => {
    setSetStatus('skipped')
    handleSubmit(new Event('submit') as any)
  }

  const handleFailedSet = () => {
    setSetStatus('failed')
    handleSubmit(new Event('submit') as any)
  }

  const adjustValue = (field: 'weight_used' | 'reps_completed', delta: number) => {
    const currentValue = parseFloat(formData[field]) || 0
    const newValue = Math.max(0, currentValue + delta)
    setFormData(prev => ({
      ...prev,
      [field]: newValue.toString()
    }))
  }

  const getRpeColor = (rpe: number) => {
    if (rpe <= 3) return isDark ? 'text-green-400' : 'text-green-600'
    if (rpe <= 6) return isDark ? 'text-yellow-400' : 'text-yellow-600'
    if (rpe <= 8) return isDark ? 'text-orange-400' : 'text-orange-600'
    return isDark ? 'text-red-400' : 'text-red-600'
  }

  const getRpeLabel = (rpe: number) => {
    const labels = {
      1: 'Very Easy',
      2: 'Easy',
      3: 'Moderate',
      4: 'Somewhat Hard',
      5: 'Hard',
      6: 'Hard+',
      7: 'Very Hard',
      8: 'Extremely Hard',
      9: 'Maximum Effort',
      10: 'Absolute Maximum'
    }
    return labels[rpe as keyof typeof labels] || 'Unknown'
  }

  const getRpeBgColor = (rpe: number) => {
    if (rpe <= 3) return isDark ? 'bg-green-900/20' : 'bg-green-50'
    if (rpe <= 6) return isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'
    if (rpe <= 8) return isDark ? 'bg-orange-900/20' : 'bg-orange-50'
    return isDark ? 'bg-red-900/20' : 'bg-red-50'
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Get YouTube video ID from exercise video_url
  const getVideoId = () => {
    const videoUrl = templateExercise?.exercise?.video_url
    if (videoUrl) {
      // Extract video ID from YouTube URL
      const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
      return match ? match[1] : 'IODxDxX7oi4' // Default fallback
    }
    return 'IODxDxX7oi4' // Default push-up video
  }

  const getVideoThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
  }

  // Check if exercise uses barbell equipment
  const isBarbellExercise = () => {
    const equipment = templateExercise?.exercise?.equipment || []
    return equipment.some((eq: string) => 
      eq.toLowerCase().includes('barbell') || 
      eq.toLowerCase().includes('bar') ||
      eq.toLowerCase().includes('olympic')
    )
  }

  if (!isOpen) return null

  return (
    <>
      {/* Main Set Logging Form */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className={`${theme.card} border ${theme.border} rounded-3xl ${theme.shadow} overflow-hidden`}>
            {/* Header */}
            <CardHeader className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                    <Dumbbell className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <CardTitle className={`text-xl font-bold ${theme.text}`}>
                      Set {setNumber} of {totalSets}
                    </CardTitle>
                    <CardDescription className={`${theme.textSecondary}`}>
                      {templateExercise?.exercise?.name || 'Exercise'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVideoModal(true)}
                    className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}
                  >
                    <Youtube className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={onClose} className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {showSuccessAnimation ? (
                /* Success Animation */
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 bg-green-100 dark:bg-green-900/20">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>Set Logged!</h3>
                  <p className={`${theme.textSecondary}`}>Great work! Keep it up! 💪</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Target Information */}
                  <div className={`p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <Target className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={`font-semibold ${theme.text}`}>Target</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className={`${theme.textSecondary}`}>Reps:</span>
                        <span className={`font-semibold ${theme.text} ml-2`}>{templateExercise?.reps || 'N/A'}</span>
                      </div>
                      <div>
                        <span className={`${theme.textSecondary}`}>Weight:</span>
                        <span className={`font-semibold ${theme.text} ml-2`}>{templateExercise?.weight || 'N/A'} kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-6">
                    {/* Weight Input with Steppers */}
                    <div className="space-y-3">
                      <Label htmlFor="weight" className={`text-sm font-semibold ${theme.text}`}>Weight (kg)</Label>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => adjustValue('weight_used', -2.5)}
                          className="rounded-xl w-12 h-12"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="flex-1">
                          <Input
                            id="weight"
                            type="number"
                            step="0.5"
                            placeholder="0"
                            value={formData.weight_used}
                            onChange={(e) => handleInputChange('weight_used', e.target.value)}
                            className="text-center text-2xl font-bold rounded-xl h-12"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => adjustValue('weight_used', 2.5)}
                          className="rounded-xl w-12 h-12"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Plate Calculator for Barbell Exercises */}
                      {isBarbellExercise() && (
                        <div className="mt-4">
                          <PlateCalculatorWidget
                            currentWeight={parseFloat(formData.weight_used) || 0}
                            unit="kg"
                            onWeightSelect={(weight) => {
                              setFormData(prev => ({
                                ...prev,
                                weight_used: weight.toString()
                              }))
                            }}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>

                    {/* Reps Input with Steppers */}
                    <div className="space-y-3">
                      <Label htmlFor="reps" className={`text-sm font-semibold ${theme.text}`}>Reps Completed</Label>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => adjustValue('reps_completed', -1)}
                          className="rounded-xl w-12 h-12"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="flex-1">
                          <Input
                            id="reps"
                            type="number"
                            placeholder="0"
                            value={formData.reps_completed}
                            onChange={(e) => handleInputChange('reps_completed', e.target.value)}
                            className="text-center text-2xl font-bold rounded-xl h-12"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => adjustValue('reps_completed', 1)}
                          className="rounded-xl w-12 h-12"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* RPE Slider */}
                    <div className="space-y-3">
                      <Label className={`text-sm font-semibold ${theme.text}`}>Rate of Perceived Exertion (RPE)</Label>
                      <div className={`p-4 border ${theme.border} rounded-2xl ${getRpeBgColor(formData.rpe)}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-sm ${theme.textSecondary}`}>How hard was this set?</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${getRpeColor(formData.rpe)}`}>{formData.rpe}</span>
                            <span className={`text-sm font-medium ${getRpeColor(formData.rpe)}`}>/10</span>
                          </div>
                        </div>
                        <Slider
                          value={[formData.rpe]}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, rpe: value[0] }))}
                          max={10}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs mt-2">
                          <span className={`${theme.textSecondary}`}>Very Easy</span>
                          <span className={`${theme.textSecondary}`}>Maximum Effort</span>
                        </div>
                        <div className={`text-sm font-medium mt-2 ${getRpeColor(formData.rpe)}`}>
                          {getRpeLabel(formData.rpe)}
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className={`text-sm font-semibold ${theme.text}`}>Notes (Optional)</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowNotes(!showNotes)}
                          className="rounded-xl"
                        >
                          {showNotes ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                          {showNotes ? 'Hide' : 'Add'} Notes
                        </Button>
                      </div>
                      {showNotes && (
                        <div className={`p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                          <Input
                            placeholder="Add any notes about this set..."
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            className="rounded-xl"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-4">
                    <Button 
                      type="submit" 
                      className={`w-full rounded-xl ${theme.primary} hover:opacity-90 transition-all duration-200 h-14 text-lg font-semibold`}
                      disabled={loading || !formData.weight_used || !formData.reps_completed}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Logging Set...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          Log Set
                        </div>
                      )}
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleSkipSet}
                        className="rounded-xl h-12"
                        disabled={loading}
                      >
                        <SkipForward className="w-4 h-4 mr-2" />
                        Skip Set
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleFailedSet}
                        className="rounded-xl h-12"
                        disabled={loading}
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Failed Set
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-60 flex items-center justify-center p-4">
          <div className={`w-full max-w-md ${theme.card} border ${theme.border} rounded-3xl overflow-hidden`}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className={`text-lg font-semibold ${theme.text}`}>
                {templateExercise?.exercise?.name || 'Exercise'} Video
              </h3>
              <Button variant="outline" size="sm" onClick={() => setShowVideoModal(false)} className="rounded-xl">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4">
              <div className="relative w-full" style={{paddingBottom: '56.25%'}}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-2xl"
                  src={`https://www.youtube.com/embed/${getVideoId()}?autoplay=1`}
                  title={templateExercise?.exercise?.name || 'Exercise Video'}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}