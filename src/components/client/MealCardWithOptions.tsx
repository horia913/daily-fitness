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
import { getFoodVisuals } from '@/lib/foodIconMap'
import { useToast } from '@/components/ui/toast-provider'
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
  /** Called when user logs via photo (legacy flow). */
  onMealLogged?: (mealId: string, optionId: string | null, photoUrl: string) => void
  /** When provided, Fuel flow: primary "Mark Complete" and optional photo; no photo required. */
  onMarkComplete?: (mealId: string, optionId: string | null) => void
  /** Called when user taps Undo on a completed meal. */
  onUndo?: () => void
  /** Fuel mode: add photo to completion (optional). Parent calls addPhotoToCompletion and refetches. */
  onAddPhoto?: (mealId: string, file: File) => Promise<void>
}

// ============================================================================
// Component
// ============================================================================

export default function MealCardWithOptions({
  meal,
  clientId,
  onMealLogged,
  onMarkComplete,
  onUndo,
  onAddPhoto,
}: MealCardWithOptionsProps) {
  const isFuelMode = !!onMarkComplete
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const { addToast } = useToast()

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

  // When logged, show the completed option's items (for read-only food list)
  const completedOption = meal.loggedOptionId && hasOptions
    ? meal.options.find(o => o.id === meal.loggedOptionId) ?? meal.options[0]
    : meal.options?.[0] ?? null
  const completedItems = completedOption?.items ?? meal.legacyItems ?? []
  const completedTotals = completedOption?.totals ?? calculateTotals(completedItems)

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
      addToast({
        title: 'Already logged',
        description: `Photo already uploaded for ${meal.name} today. Each meal can have one photo per day.`,
        variant: 'destructive',
      })
      return
    }
    setError(null)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please use JPEG, PNG, or WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.')
      return
    }

    // Fuel mode + already completed: add photo to completion only (no preview)
    if (meal.logged && isFuelMode && onAddPhoto) {
      e.target.value = ''
      try {
        await onAddPhoto(meal.id, file)
      } catch (_) {}
      return
    }

    // Preview flow (unlogged or legacy photo log)
    const url = URL.createObjectURL(file)
    setPreviewFile(file)
    setPreviewUrl(url)
    setShowPhotoPreview(true)
    setError(null)
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
      onMealLogged?.(meal.id, optionId, result.photoLog?.photo_url || '')
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

  const MEAL_TYPE_CATEGORY: Record<string, string> = {
    breakfast: 'Dairy',
    lunch: 'Protein',
    dinner: 'Protein',
    snack: 'Fruits',
  }
  const mealVisuals = getFoodVisuals({ category: MEAL_TYPE_CATEGORY[meal.meal_type] || null })
  const MealIcon = mealVisuals.Icon
  const mealIconColor = mealVisuals.color

  const getMealCalories = (): number => {
    return currentTotals.calories || 0
  }

  const formatTime = (timestamp?: string): string => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Surface card class
  const surfaceCard = "fc-surface rounded-3xl border border-[color:var(--fc-surface-card-border)] relative overflow-hidden"

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden
      />
      <div className={surfaceCard + " flex flex-col h-full"}>
        {meal.logged ? (
          // ===== LOGGED MEAL =====
          <>
            <div className="p-5 border-b border-[color:var(--fc-glass-border)]">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${mealIconColor}18` }}>
                    <MealIcon className="w-4 h-4" style={{ color: mealIconColor }} />
                  </div>
                  <h3 className="text-lg font-bold fc-text-primary">
                    {meal.name}
                  </h3>
                </div>
                <span className="text-sm font-bold font-mono text-[color:var(--fc-text-dim)]">
                  Completed{meal.logged_at ? ` ${formatTime(meal.logged_at)}` : ''}
                </span>
              </div>
              {meal.loggedOptionId && hasOptions && (
                <p className="text-sm text-[color:var(--fc-text-dim)] mt-0.5">
                  {meal.options.find(o => o.id === meal.loggedOptionId)?.name || 'Option'}
                </p>
              )}
            </div>

            {/* Photo Display or completed state without photo */}
            {meal.photoUrl ? (
              <div className="relative h-40 group">
                <img
                  src={meal.photoUrl}
                  alt={`${meal.name} photo`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <div className="bg-cyan-500/15 backdrop-blur-md border border-cyan-500/35 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Logged
                  </div>
                  {meal.logged_at && (
                    <span className="text-[10px] font-mono text-[color:var(--fc-text-subtle)]">
                      {formatTime(meal.logged_at)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-5 py-3 flex items-center gap-2">
                <div className="bg-[color:var(--fc-status-success)]/20 text-[color:var(--fc-status-success)] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Completed
                </div>
                {meal.logged_at && (
                  <span className="text-[10px] font-mono text-[color:var(--fc-text-dim)]">
                    {formatTime(meal.logged_at)}
                  </span>
                )}
              </div>
            )}

            {/* Food list (read-only) — always visible */}
            {completedItems.length > 0 && (
              <div className="px-5 py-2 border-t border-[color:var(--fc-glass-border)]">
                <ul className="space-y-1">
                  {completedItems.map((item, idx) => (
                    <li key={item.food?.id ?? idx} className="flex justify-between items-center text-sm">
                      <span className="fc-text-primary truncate pr-2">{item.food?.name ?? 'Unknown'}</span>
                      <span className="font-mono text-[color:var(--fc-text-dim)] shrink-0">
                        {Math.round(item.quantity)}g
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-[color:var(--fc-text-dim)] mt-2">
                  {Math.round(completedTotals.calories)} kcal · {Math.round(completedTotals.protein)}g P · {Math.round(completedTotals.carbs)}g C · {Math.round(completedTotals.fat)}g F
                </p>
              </div>
            )}

            <div className="px-5 pb-5 flex gap-2">
              {isFuelMode && !meal.photoUrl && onAddPhoto && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] rounded-xl text-sm text-[color:var(--fc-text-dim)]"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Add Photo
                </Button>
              )}
              {isFuelMode && onUndo && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onUndo}
                  className="flex-1 min-h-[44px] rounded-xl border-[color:var(--fc-status-warning)]/50 text-[color:var(--fc-status-warning)] hover:bg-[color:var(--fc-status-warning)]/10"
                >
                  Undo
                </Button>
              )}
            </div>
          </>
        ) : (
          // ===== UNLOGGED MEAL =====
          <>
            {/* Header */}
            <div className="p-5">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${mealIconColor}18` }}>
                    <MealIcon className="w-4 h-4" style={{ color: mealIconColor }} />
                  </div>
                  <h3 className="text-lg font-bold fc-text-primary">
                    {meal.name}
                  </h3>
                </div>
                <span className="text-sm font-bold font-mono text-[color:var(--fc-text-dim)]">
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
                    className="min-h-[44px] min-w-[44px] p-0 rounded-full"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex-1 text-center">
                    <Badge className="bg-[color:var(--fc-accent-cyan)]/10 text-[color:var(--fc-accent-cyan)]">
                      {currentOption?.name || 'Default'}
                    </Badge>
                    <div className="text-xs text-[color:var(--fc-text-subtle)] mt-1">
                      {selectedOptionIndex + 1} of {meal.options.length}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextOption}
                    disabled={selectedOptionIndex === meal.options.length - 1 || showPhotoPreview}
                    className="min-h-[44px] min-w-[44px] p-0 rounded-full"
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
                          ? 'bg-[color:var(--fc-accent-cyan)]'
                          : 'bg-[color:var(--fc-glass-highlight)]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Food list — always visible, one line per food */}
            <div className="px-5 pb-3">
              <ul className="space-y-1">
                {currentItems.map((item, idx) => (
                  <li key={item.food?.id ?? idx} className="flex justify-between items-center text-sm">
                    <span className="fc-text-primary truncate pr-2">{item.food?.name ?? 'Unknown'}</span>
                    <span className="font-mono text-[color:var(--fc-text-dim)] shrink-0">
                      {Math.round(item.quantity)}g
                    </span>
                  </li>
                ))}
              </ul>
              {currentItems.length > 0 && (
                <p className="text-xs text-[color:var(--fc-text-dim)] mt-2">
                  {Math.round(currentTotals.calories)} kcal · {Math.round(currentTotals.protein)}g P · {Math.round(currentTotals.carbs)}g C · {Math.round(currentTotals.fat)}g F
                </p>
              )}
            </div>

            {/* No Photo Placeholder */}
            <div className="mx-5 mb-4 flex flex-col items-center justify-center py-6 bg-[color:var(--fc-glass-highlight)] rounded-2xl border border-dashed border-[color:var(--fc-glass-border)]">
              <ImageIcon className="w-8 h-8 mb-2 text-[color:var(--fc-text-subtle)]" />
              <p className="text-xs italic text-[color:var(--fc-text-subtle)]">
                {showPhotoPreview ? (isFuelMode ? 'Photo selected' : 'Photo selected - ready to log') : (isFuelMode ? 'Add photo below' : 'No photo uploaded yet')}
              </p>
            </div>

            {/* Actions: Fuel mode = Mark Complete (primary, accent) + Add Photo (secondary); 44px min touch targets */}
            <div className="px-5 pb-5 space-y-2">
              {isFuelMode && onMarkComplete ? (
                <>
                  <Button
                    type="button"
                    onClick={() => onMarkComplete(meal.id, currentOption?.id ?? null)}
                    className="w-full min-h-[44px] rounded-xl flex items-center justify-center gap-2 font-semibold text-base bg-gradient-to-r from-cyan-600 to-cyan-400 text-white border-0 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark Complete
                  </Button>
                  <Button
                    onClick={handlePhotoSelect}
                    variant="ghost"
                    size="sm"
                    className="w-full min-h-[44px] rounded-xl text-sm text-[color:var(--fc-text-dim)] hover:bg-[color:var(--fc-glass-highlight)]"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Add Photo
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handlePhotoSelect}
                  disabled={meal.logged}
                  variant="fc-primary"
                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all"
                >
                  <Camera className="w-5 h-5" />
                  Upload Photo
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Photo Preview Modal — scrollable overlay, modal near top on mobile so no page scroll needed */}
      {showPhotoPreview && previewUrl && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && !uploading && handleDiscardPhoto()}
        >
          <div className="min-h-full flex flex-col items-center justify-start pt-4 sm:pt-8 pb-8 px-4">
            <div
              className={`fc-surface rounded-3xl border border-[color:var(--fc-surface-card-border)] max-w-lg w-full overflow-y-auto max-h-[85vh] flex flex-col`}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Preview Header */}
            <div className={`p-4 border-b ${theme.border} flex items-center justify-between flex-shrink-0`}>
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
                className="min-h-[44px] min-w-[44px] rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Preview Image */}
            <div className="relative flex-shrink-0">
              <img
                src={previewUrl}
                alt="Photo preview"
                className="w-full h-64 object-cover"
              />
              {hasOptions && currentOption && (
                <div className="absolute top-3 left-3">
                  <Badge className="bg-[color:var(--fc-accent-cyan)]/90 text-white backdrop-blur-sm">
                    {currentOption.name}
                  </Badge>
                </div>
              )}
            </div>

            {/* Option Lock Notice */}
            {hasOptions && meal.options.length > 1 && (
              <div className={`px-4 py-2 bg-[color:var(--fc-status-warning)]/10 border-b ${theme.border}`}>
                <p className="text-xs text-[color:var(--fc-status-warning)]">
                  Option selection is locked. Discard to choose a different option.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className={`px-4 py-2 bg-[color:var(--fc-status-error)]/10 border-b ${theme.border}`}>
                <p className="text-xs text-[color:var(--fc-status-error)]">
                  {error}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-4 flex gap-3 flex-shrink-0">
              <Button
                variant="outline"
                onClick={handleDiscardPhoto}
                disabled={uploading}
                className="flex-1 rounded-xl"
              >
                Discard
              </Button>
              <Button
                onClick={async () => {
                  if (isFuelMode && onAddPhoto && previewFile) {
                    setUploading(true);
                    setError(null);
                    try {
                      await onAddPhoto(meal.id, previewFile);
                      handleDiscardPhoto();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Upload failed');
                    } finally {
                      setUploading(false);
                    }
                  } else {
                    handleLogMeal();
                  }
                }}
                disabled={uploading || (isFuelMode ? !onAddPhoto : !onMealLogged)}
                className="flex-1 rounded-xl bg-[color:var(--fc-status-success)] hover:opacity-90 text-white"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {isFuelMode ? 'Adding...' : 'Logging...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isFuelMode ? 'Add Photo' : 'Log Meal'}
                  </>
                )}
              </Button>
            </div>
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
