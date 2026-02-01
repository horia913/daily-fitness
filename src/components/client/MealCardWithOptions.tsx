'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Camera, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight,
  X,
  Image as ImageIcon
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { uploadMealPhoto, validateMealOptionForUpload } from '@/lib/mealPhotoService'
import type { MealOptionWithFoods, MacroTotals } from '@/lib/mealPlanService'

// ============================================================================
// Types
// ============================================================================

export interface MealFoodItemDisplay {
  food: {
    id: string
    name: string
    serving_size: number
    serving_unit: string
  }
  quantity: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface MealWithOptionsDisplay {
  id: string
  name: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  emoji: string
  options: MealOptionDisplay[]
  // For legacy meals without options
  legacyItems?: MealFoodItemDisplay[]
  // Logging status
  logged: boolean
  loggedOptionId?: string
  photoUrl?: string
  logged_at?: string
}

export interface MealOptionDisplay {
  id: string
  name: string
  order_index: number
  items: MealFoodItemDisplay[]
  totals: MacroTotals
}

interface MealCardWithOptionsProps {
  meal: MealWithOptionsDisplay
  clientId: string
  onMealLogged: (mealId: string, optionId: string | null, photoUrl: string) => void
}

// ============================================================================
// Component
// ============================================================================

export default function MealCardWithOptions({
  meal,
  clientId,
  onMealLogged
}: MealCardWithOptionsProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  // State
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0)
  const [showPhotoPreview, setShowPhotoPreview] = useState(false)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Determine if meal has options or is legacy
  const hasOptions = meal.options && meal.options.length > 0
  const currentOption = hasOptions ? meal.options[selectedOptionIndex] : null
  const currentItems = currentOption?.items || meal.legacyItems || []
  const currentTotals = currentOption?.totals || calculateTotals(currentItems)

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // ============================================================================
  // Handlers
  // ============================================================================

  const handlePrevOption = () => {
    if (showPhotoPreview) return // Locked during preview
    setSelectedOptionIndex(prev => Math.max(0, prev - 1))
  }

  const handleNextOption = () => {
    if (showPhotoPreview) return // Locked during preview
    setSelectedOptionIndex(prev => Math.min((meal.options?.length || 1) - 1, prev + 1))
  }

  const handlePhotoSelect = () => {
    if (meal.logged) {
      alert(`Photo already uploaded for ${meal.name} today. Each meal can have one photo per day.`)
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please use JPEG, PNG, or WebP.')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.')
      return
    }

    // Create preview URL (in-memory, NOT uploaded yet)
    const url = URL.createObjectURL(file)
    setPreviewFile(file)
    setPreviewUrl(url)
    setShowPhotoPreview(true)
    setError(null)

    // Reset file input
    e.target.value = ''
  }

  const handleDiscardPhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewFile(null)
    setPreviewUrl(null)
    setShowPhotoPreview(false)
    setError(null)
  }

  const handleLogMeal = async () => {
    if (!previewFile) return

    // Validate option requirement
    if (hasOptions && !currentOption) {
      setError('Please select an option before logging.')
      return
    }

    const optionId = currentOption?.id || null
    const validationError = validateMealOptionForUpload(hasOptions, optionId)
    if (validationError) {
      setError(validationError)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const today = new Date().toISOString().split('T')[0]
      const result = await uploadMealPhoto(
        clientId,
        meal.id,
        previewFile,
        today,
        undefined, // notes
        optionId   // meal_option_id (INFORMATIONAL)
      )

      if (!result.success) {
        setError(result.error || 'Failed to upload photo')
        return
      }

      // Success! Notify parent and cleanup
      onMealLogged(meal.id, optionId, result.photoLog?.photo_url || '')
      handleDiscardPhoto()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setUploading(false)
    }
  }

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const getMealCalories = (): number => {
    return currentTotals.calories || 0
  }

  const getMealDescription = (): string => {
    if (currentItems.length === 0) return ''
    return currentItems.map(item => item.food?.name || 'Unknown').join(', ')
  }

  const formatTime = (timestamp?: string): string => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Crystal card style
  const crystalCardStyle: React.CSSProperties = {
    background: isDark
      ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: isDark
      ? '1px solid rgba(255,255,255,0.1)'
      : '1px solid rgba(0,0,0,0.1)',
    borderRadius: '24px',
    position: 'relative',
    overflow: 'hidden'
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      <div style={crystalCardStyle} className="flex flex-col h-full">
        {meal.logged && meal.photoUrl ? (
          // ===== LOGGED MEAL =====
          <>
            <div className="p-5 border-b border-white/5">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{meal.emoji}</span>
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {meal.name}
                  </h3>
                </div>
                <span className={`text-sm font-bold font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {Math.round(getMealCalories())} kcal
                </span>
              </div>
              {meal.loggedOptionId && hasOptions && (
                <Badge className={`mt-1 ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                  {meal.options.find(o => o.id === meal.loggedOptionId)?.name || 'Option'}
                </Badge>
              )}
            </div>

            {/* Photo Display */}
            <div className="relative h-40 group">
              <img
                src={meal.photoUrl}
                alt={`${meal.name} photo`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <div className="bg-green-500/20 backdrop-blur-md border border-green-500/30 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Logged
                </div>
                {meal.logged_at && (
                  <span className={`text-[10px] font-mono ${isDark ? 'text-neutral-300' : 'text-neutral-200'}`}>
                    {formatTime(meal.logged_at)}
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          // ===== UNLOGGED MEAL =====
          <>
            {/* Header */}
            <div className="p-5">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{meal.emoji}</span>
                  <h3 className={`text-lg font-bold ${isDark ? 'text-neutral-100' : 'text-slate-900'}`}>
                    {meal.name}
                  </h3>
                </div>
                <span className={`text-sm font-bold font-mono ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Not Logged
                </span>
              </div>
            </div>

            {/* Options Carousel (if meal has options) */}
            {hasOptions && meal.options.length > 1 && (
              <div className="px-5 pb-3">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevOption}
                    disabled={selectedOptionIndex === 0 || showPhotoPreview}
                    className="h-8 w-8 p-0 rounded-full"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex-1 text-center">
                    <Badge className={`${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                      {currentOption?.name || 'Default'}
                    </Badge>
                    <div className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-500'} mt-1`}>
                      {selectedOptionIndex + 1} of {meal.options.length}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextOption}
                    disabled={selectedOptionIndex === meal.options.length - 1 || showPhotoPreview}
                    className="h-8 w-8 p-0 rounded-full"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Option dots indicator */}
                <div className="flex justify-center gap-1 mt-2">
                  {meal.options.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === selectedOptionIndex
                          ? 'bg-blue-500'
                          : isDark ? 'bg-white/20' : 'bg-black/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Food Items */}
            <div className="px-5 pb-3">
              <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                {getMealDescription()}
              </p>
              <p className={`text-sm font-semibold mt-1 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                {Math.round(getMealCalories())} kcal
              </p>
            </div>

            {/* No Photo Placeholder */}
            <div className="mx-5 mb-4 flex flex-col items-center justify-center py-6 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <ImageIcon className={`w-8 h-8 mb-2 ${isDark ? 'text-neutral-700' : 'text-neutral-400'}`} />
              <p className={`text-xs italic ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                {showPhotoPreview ? 'Photo selected - ready to log' : 'No photo uploaded yet'}
              </p>
            </div>

            {/* Upload Button */}
            <div className="px-5 pb-5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                onClick={handlePhotoSelect}
                disabled={meal.logged}
                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/40 transition-all"
              >
                <Camera className="w-5 h-5" />
                Upload Photo
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Photo Preview Modal */}
      {showPhotoPreview && previewUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && !uploading && handleDiscardPhoto()}
        >
          <div className={`${theme.card} fc-glass fc-card rounded-3xl border ${theme.border} max-w-lg w-full overflow-hidden`}>
            {/* Preview Header */}
            <div className={`p-4 border-b ${theme.border} flex items-center justify-between`}>
              <div>
                <h3 className={`font-bold ${theme.text}`}>
                  Confirm Photo
                </h3>
                <p className={`text-sm ${theme.textSecondary}`}>
                  {meal.name}
                  {hasOptions && currentOption && ` - ${currentOption.name}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDiscardPhoto}
                disabled={uploading}
                className="h-8 w-8 rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Preview Image */}
            <div className="relative">
              <img
                src={previewUrl}
                alt="Photo preview"
                className="w-full h-64 object-cover"
              />
              {hasOptions && currentOption && (
                <div className="absolute top-3 left-3">
                  <Badge className="bg-blue-500/90 text-white backdrop-blur-sm">
                    {currentOption.name}
                  </Badge>
                </div>
              )}
            </div>

            {/* Option Lock Notice */}
            {hasOptions && meal.options.length > 1 && (
              <div className={`px-4 py-2 ${isDark ? 'bg-yellow-500/10' : 'bg-yellow-50'} border-b ${theme.border}`}>
                <p className={`text-xs ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                  Option selection is locked. Discard to choose a different option.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className={`px-4 py-2 ${isDark ? 'bg-red-500/10' : 'bg-red-50'} border-b ${theme.border}`}>
                <p className={`text-xs ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                  {error}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-4 flex gap-3">
              <Button
                variant="outline"
                onClick={handleDiscardPhoto}
                disabled={uploading}
                className="flex-1 rounded-xl"
              >
                Discard
              </Button>
              <Button
                onClick={handleLogMeal}
                disabled={uploading}
                className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Logging...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Log Meal
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function calculateTotals(items: MealFoodItemDisplay[]): MacroTotals {
  return items.reduce((totals, item) => ({
    calories: totals.calories + (item.calories || 0),
    protein: totals.protein + (item.protein || 0),
    carbs: totals.carbs + (item.carbs || 0),
    fat: totals.fat + (item.fat || 0),
    fiber: totals.fiber + 0 // Not tracked in display items
  }), {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0
  })
}
