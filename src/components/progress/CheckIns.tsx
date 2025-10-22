'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Calendar,
  Scale,
  Camera,
  Plus,
  TrendingDown,
  TrendingUp,
  Ruler,
  X,
  Upload,
  ChevronRight,
  Flame,
  Dumbbell
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

interface CheckIn {
  id: string
  date: string
  weight: number
  bodyFat?: number // percentage
  muscleMass?: number // kg
  measurements: {
    leftArm: number | undefined
    rightArm: number | undefined
    chest: number | undefined
    waist: number | undefined
    hips: number | undefined
    leftThigh: number | undefined
    rightThigh: number | undefined
  }
  photos: string[]
  notes?: string
}

interface CheckInsProps {
  loading?: boolean
}

export function CheckIns({ loading = false }: CheckInsProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [showForm, setShowForm] = useState(false)
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])

  // Load check-ins from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('fitness-checkins')
    if (saved) {
      try {
        setCheckIns(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load check-ins:', e)
      }
    }
  }, [])

  // Save check-ins to localStorage whenever they change
  useEffect(() => {
    if (checkIns.length > 0) {
      localStorage.setItem('fitness-checkins', JSON.stringify(checkIns))
    }
  }, [checkIns])
  
  const [formData, setFormData] = useState<Partial<CheckIn>>({
    date: new Date().toISOString().split('T')[0],
    weight: undefined,
    bodyFat: undefined,
    muscleMass: undefined,
    measurements: {
      leftArm: undefined,
      rightArm: undefined,
      chest: undefined,
      waist: undefined,
      hips: undefined,
      leftThigh: undefined,
      rightThigh: undefined
    },
    photos: [],
    notes: ''
  })
  
  const [photoPreviews, setPhotoPreviews] = useState<{
    front: string | null
    side: string | null
    back: string | null
  }>({
    front: null,
    side: null,
    back: null
  })

  const handlePhotoUpload = (file: File, position: 'front' | 'side' | 'back') => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const photoUrl = reader.result as string
      
      // Update previews
      setPhotoPreviews(prev => ({
        ...prev,
        [position]: photoUrl
      }))
      
      // Update formData photos array
      setFormData(prev => {
        const existingPhotos = prev.photos || []
        // Remove any existing photo for this position
        const filteredPhotos = existingPhotos.filter(p => 
          !p.includes(`${position}-view`)
        )
        // Add new photo with position tag
        return {
          ...prev,
          photos: [...filteredPhotos, photoUrl]
        }
      })
    }
    reader.readAsDataURL(file)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleSubmit = () => {
    // Add new check-in
    const newCheckIn: CheckIn = {
      id: Date.now().toString(),
      date: formData.date || new Date().toISOString(),
      weight: formData.weight || 0,
      measurements: formData.measurements || {
        leftArm: 0,
        rightArm: 0,
        chest: 0,
        waist: 0,
        hips: 0,
        leftThigh: 0,
        rightThigh: 0
      },
      photos: formData.photos || [],
      notes: formData.notes
    }
    
    setCheckIns([newCheckIn, ...checkIns])
    setShowForm(false)
    
    // Reset form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      weight: undefined,
      bodyFat: undefined,
      muscleMass: undefined,
      measurements: {
        leftArm: undefined,
        rightArm: undefined,
        chest: undefined,
        waist: undefined,
        hips: undefined,
        leftThigh: undefined,
        rightThigh: undefined
      },
      photos: [],
      notes: ''
    })
    
    // Reset photo previews
    setPhotoPreviews({
      front: null,
      side: null,
      back: null
    })
  }

  const getWeightChange = () => {
    if (checkIns.length < 2) return null
    const sorted = [...checkIns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const first = sorted[0].weight
    const latest = sorted[sorted.length - 1].weight
    return latest - first
  }

  const weightChange = getWeightChange()

  // Check-In Form Modal
  if (showForm) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-start justify-center p-4">
        <div 
          className={`relative ${theme.card} shadow-2xl rounded-3xl border ${theme.border} w-full flex flex-col transform transition-all duration-300 ease-out overflow-hidden`}
          style={{
            maxWidth: 'min(95vw, 50rem)',
            height: 'min(88vh, calc(100vh - 4rem))',
            maxHeight: 'min(88vh, calc(100vh - 4rem))'
          }}
        >
          {/* Header */}
          <div className={`sticky top-0 ${theme.card} border-b ${theme.border} px-6 py-5 rounded-t-3xl`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${theme.text}`}>New Check-In</h2>
                  <p className={`text-sm ${theme.textSecondary} mt-1`}>Record your progress</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
                className="rounded-xl"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-6 pt-6">
              {/* Date */}
              <div>
                <Label className={`text-sm font-medium ${theme.text} mb-2 block`}>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="rounded-xl"
                />
              </div>

              {/* Weight */}
              <div>
                <Label className={`text-sm font-medium ${theme.text} mb-2 block`}>Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="75.5"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value) || 0})}
                  className="rounded-xl"
                />
              </div>

              {/* Body Fat % (Optional) */}
              <div>
                <Label className={`text-sm font-medium ${theme.text} mb-2 block`}>Body Fat % (Optional)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="20.5"
                  value={formData.bodyFat || ''}
                  onChange={(e) => setFormData({...formData, bodyFat: parseFloat(e.target.value) || undefined})}
                  className="rounded-xl"
                />
              </div>

              {/* Muscle Mass (Optional) */}
              <div>
                <Label className={`text-sm font-medium ${theme.text} mb-2 block`}>Muscle Mass kg (Optional)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="55.5"
                  value={formData.muscleMass || ''}
                  onChange={(e) => setFormData({...formData, muscleMass: parseFloat(e.target.value) || undefined})}
                  className="rounded-xl"
                />
              </div>

              {/* Measurements */}
              <div>
                <Label className={`text-sm font-medium ${theme.text} mb-3 block`}>Body Measurements (cm)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className={`text-xs ${theme.textSecondary} mb-1 block`}>Left Arm</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="35.0"
                      value={formData.measurements?.leftArm || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements!, leftArm: parseFloat(e.target.value) || 0}
                      })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className={`text-xs ${theme.textSecondary} mb-1 block`}>Right Arm</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="35.0"
                      value={formData.measurements?.rightArm || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements!, rightArm: parseFloat(e.target.value) || 0}
                      })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className={`text-xs ${theme.textSecondary} mb-1 block`}>Chest</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="98.0"
                      value={formData.measurements?.chest || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements!, chest: parseFloat(e.target.value) || 0}
                      })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className={`text-xs ${theme.textSecondary} mb-1 block`}>Waist</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="82.0"
                      value={formData.measurements?.waist || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements!, waist: parseFloat(e.target.value) || 0}
                      })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className={`text-xs ${theme.textSecondary} mb-1 block`}>Hips</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="95.0"
                      value={formData.measurements?.hips || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements!, hips: parseFloat(e.target.value) || 0}
                      })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className={`text-xs ${theme.textSecondary} mb-1 block`}>Left Thigh</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="58.0"
                      value={formData.measurements?.leftThigh || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements!, leftThigh: parseFloat(e.target.value) || 0}
                      })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className={`text-xs ${theme.textSecondary} mb-1 block`}>Right Thigh</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="58.0"
                      value={formData.measurements?.rightThigh || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        measurements: {...formData.measurements!, rightThigh: parseFloat(e.target.value) || 0}
                      })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Progress Photos */}
              <div>
                <Label className={`text-sm font-medium ${theme.text} mb-3 block`}>Progress Photos</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Front Photo */}
                  <div>
                    <Label className={`text-xs ${theme.textSecondary} mb-2 block`}>Front View</Label>
                    <input
                      type="file"
                      id="photo-front"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handlePhotoUpload(file, 'front')
                      }}
                    />
                    <label
                      htmlFor="photo-front"
                      className={`border-2 border-dashed ${theme.border} rounded-xl overflow-hidden text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-colors block`}
                    >
                      {photoPreviews.front ? (
                        <div className="relative aspect-[3/4]">
                          <img src={photoPreviews.front} alt="Front view" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="p-4">
                          <Camera className={`w-8 h-8 ${theme.textSecondary} mx-auto mb-2`} />
                          <p className={`text-xs ${theme.text} font-medium`}>Add Photo</p>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Side Photo */}
                  <div>
                    <Label className={`text-xs ${theme.textSecondary} mb-2 block`}>Side View</Label>
                    <input
                      type="file"
                      id="photo-side"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handlePhotoUpload(file, 'side')
                      }}
                    />
                    <label
                      htmlFor="photo-side"
                      className={`border-2 border-dashed ${theme.border} rounded-xl overflow-hidden text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-colors block`}
                    >
                      {photoPreviews.side ? (
                        <div className="relative aspect-[3/4]">
                          <img src={photoPreviews.side} alt="Side view" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="p-4">
                          <Camera className={`w-8 h-8 ${theme.textSecondary} mx-auto mb-2`} />
                          <p className={`text-xs ${theme.text} font-medium`}>Add Photo</p>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Back Photo */}
                  <div>
                    <Label className={`text-xs ${theme.textSecondary} mb-2 block`}>Back View</Label>
                    <input
                      type="file"
                      id="photo-back"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handlePhotoUpload(file, 'back')
                      }}
                    />
                    <label
                      htmlFor="photo-back"
                      className={`border-2 border-dashed ${theme.border} rounded-xl overflow-hidden text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-colors block`}
                    >
                      {photoPreviews.back ? (
                        <div className="relative aspect-[3/4]">
                          <img src={photoPreviews.back} alt="Back view" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="p-4">
                          <Camera className={`w-8 h-8 ${theme.textSecondary} mx-auto mb-2`} />
                          <p className={`text-xs ${theme.text} font-medium`}>Add Photo</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className={`text-sm font-medium ${theme.text} mb-2 block`}>Notes (Optional)</Label>
                <Textarea
                  placeholder="How are you feeling? Any observations?"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="rounded-xl min-h-[100px]"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`flex-shrink-0 ${theme.card} border-t ${theme.border} px-6 py-4 rounded-b-3xl`}>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setPhotoPreviews({ front: null, side: null, back: null })
                }}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                Save Check-In
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Check-In Detail Modal
  if (selectedCheckIn) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-start justify-center p-4">
        <div 
          className={`relative ${theme.card} shadow-2xl rounded-3xl border ${theme.border} w-full flex flex-col transform transition-all duration-300 ease-out overflow-hidden`}
          style={{
            maxWidth: 'min(95vw, 50rem)',
            height: 'min(88vh, calc(100vh - 4rem))',
            maxHeight: 'min(88vh, calc(100vh - 4rem))'
          }}
        >
          {/* Header */}
          <div className={`sticky top-0 ${theme.card} border-b ${theme.border} px-6 py-5 rounded-t-3xl`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${theme.text}`}>Check-In Details</h2>
                  <p className={`text-sm ${theme.textSecondary} mt-1`}>{formatDate(selectedCheckIn.date)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCheckIn(null)}
                className="rounded-xl"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-6 pt-6">
              {/* Weight */}
              <div className="rounded-xl p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-3">
                  <Scale className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <p className={`text-sm ${theme.textSecondary}`}>Weight</p>
                    <p className={`text-2xl font-bold ${theme.text}`}>{selectedCheckIn.weight} kg</p>
                  </div>
                  {weightChange !== null && (
                    <Badge className={weightChange < 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}>
                      {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                      {weightChange < 0 ? <TrendingDown className="w-3 h-3 ml-1 inline" /> : <TrendingUp className="w-3 h-3 ml-1 inline" />}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Body Fat % */}
              {selectedCheckIn.bodyFat && (
                <div className="rounded-xl p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-700">
                  <div className="flex items-center gap-3">
                    <Flame className="w-6 h-6 text-red-600 dark:text-red-400" />
                    <div className="flex-1">
                      <p className={`text-sm ${theme.textSecondary}`}>Body Fat %</p>
                      <p className={`text-2xl font-bold ${theme.text}`}>{selectedCheckIn.bodyFat}%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Muscle Mass */}
              {selectedCheckIn.muscleMass && (
                <div className="rounded-xl p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-700">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    <div className="flex-1">
                      <p className={`text-sm ${theme.textSecondary}`}>Muscle Mass</p>
                      <p className={`text-2xl font-bold ${theme.text}`}>{selectedCheckIn.muscleMass} kg</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Measurements */}
              <div>
                <h3 className={`text-lg font-bold ${theme.text} mb-4 flex items-center gap-2`}>
                  <Ruler className="w-5 h-5" />
                  Body Measurements
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Left Arm', value: selectedCheckIn.measurements.leftArm },
                    { label: 'Right Arm', value: selectedCheckIn.measurements.rightArm },
                    { label: 'Chest', value: selectedCheckIn.measurements.chest },
                    { label: 'Waist', value: selectedCheckIn.measurements.waist },
                    { label: 'Hips', value: selectedCheckIn.measurements.hips },
                    { label: 'Left Thigh', value: selectedCheckIn.measurements.leftThigh },
                    { label: 'Right Thigh', value: selectedCheckIn.measurements.rightThigh }
                  ].filter(m => m.value && m.value > 0).map((measurement) => (
                    <div key={measurement.label} className={`rounded-xl p-3 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} border ${theme.border}`}>
                      <p className={`text-xs ${theme.textSecondary} mb-1`}>{measurement.label}</p>
                      <p className={`text-lg font-bold ${theme.text}`}>{measurement.value} cm</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos */}
              {selectedCheckIn.photos && selectedCheckIn.photos.length > 0 && (
                <div>
                  <h3 className={`text-lg font-bold ${theme.text} mb-4 flex items-center gap-2`}>
                    <Camera className="w-5 h-5" />
                    Progress Photos
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedCheckIn.photos.map((photo, index) => (
                      <div 
                        key={index} 
                        className="aspect-square rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedCheckIn(null)
                          setFullscreenPhoto(photo)
                        }}
                      >
                        <img src={photo} alt={`Progress photo ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedCheckIn.notes && (
                <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} border ${theme.border}`}>
                  <p className={`text-sm ${theme.textSecondary} mb-2`}>Notes</p>
                  <p className={`${theme.text}`}>{selectedCheckIn.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={`flex-shrink-0 ${theme.card} border-t ${theme.border} px-6 py-4 rounded-b-3xl`}>
            <Button
              onClick={() => setSelectedCheckIn(null)}
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Main View
  return (
    <>
      {/* Fullscreen Photo Modal - Rendered as overlay */}
      {fullscreenPhoto && (
        <div 
          className="fixed inset-0 bg-black/95 z-[10000] flex items-center justify-center p-4"
          onClick={() => setFullscreenPhoto(null)}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullscreenPhoto(null)}
            className="absolute top-4 right-4 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30 z-10"
          >
            <X className="w-5 h-5" />
          </Button>
          <img 
            src={fullscreenPhoto} 
            alt="Fullscreen view" 
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
        <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
          <CardHeader className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className={`text-2xl font-bold ${theme.text}`}>Check-Ins</CardTitle>
                  <p className={`${theme.textSecondary}`}>Track your progress over time</p>
                </div>
              </div>
              <Button
                onClick={() => setShowForm(true)}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Check-In
              </Button>
            </div>
          </CardHeader>
          
          {/* Summary Stats */}
          {checkIns.length > 0 && (
            <CardContent className="px-6 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} border ${theme.border}`}>
                  <p className={`text-xs ${theme.textSecondary} mb-1`}>Total Check-Ins</p>
                  <p className={`text-2xl font-bold ${theme.text}`}>{checkIns.length}</p>
                </div>
                <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} border ${theme.border}`}>
                  <p className={`text-xs ${theme.textSecondary} mb-1`}>Current Weight</p>
                  <p className={`text-2xl font-bold ${theme.text}`}>{checkIns[0].weight} kg</p>
                </div>
                {weightChange !== null && (
                  <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} border ${theme.border}`}>
                    <p className={`text-xs ${theme.textSecondary} mb-1`}>Weight Change</p>
                    <p className={`text-2xl font-bold ${weightChange < 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                    </p>
                  </div>
                )}
                <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} border ${theme.border}`}>
                  <p className={`text-xs ${theme.textSecondary} mb-1`}>Latest</p>
                  <p className={`text-sm font-bold ${theme.text}`}>{formatDate(checkIns[0].date)}</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Check-In History */}
      <div className="space-y-4">
        {checkIns.length === 0 ? (
          <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
            <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-12 h-12 text-purple-500 dark:text-purple-400" />
                </div>
                <h3 className={`text-2xl font-bold ${theme.text} mb-3`}>No Check-Ins Yet</h3>
                <p className={`${theme.textSecondary} mb-6 max-w-md mx-auto`}>
                  Start tracking your progress by creating your first check-in
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-3"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create First Check-In
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          checkIns.map((checkIn) => (
            <div 
              key={checkIn.id}
              className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-xl cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all"
              onClick={() => setSelectedCheckIn(checkIn)}
            >
              <Card className={`border-0 ${theme.card} bg-white/95 dark:bg-slate-800/95 backdrop-blur-md overflow-hidden rounded-3xl`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Date Badge */}
                      <div className="rounded-xl p-3 bg-gradient-to-br from-purple-500 to-indigo-600 flex-shrink-0">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-bold ${theme.text} mb-1`}>{formatDate(checkIn.date)}</h3>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Scale className={`w-4 h-4 ${theme.textSecondary}`} />
                            <span className={`text-sm font-medium ${theme.text}`}>{checkIn.weight} kg</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Ruler className={`w-4 h-4 ${theme.textSecondary}`} />
                            <span className={`text-sm ${theme.textSecondary}`}>7 measurements</span>
                          </div>
                          {checkIn.photos && checkIn.photos.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Camera className={`w-4 h-4 ${theme.textSecondary}`} />
                              <span className={`text-sm ${theme.textSecondary}`}>{checkIn.photos.length} photo{checkIn.photos.length > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <ChevronRight className={`w-5 h-5 ${theme.textSecondary} flex-shrink-0`} />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
      </div>
    </>
  )
}

