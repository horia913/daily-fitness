'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIcon,
  Sun,
  Moon,
  Leaf,
  Cookie,
  type LucideIcon,
} from 'lucide-react'
import { IconButton } from '@/components/client-ui'
import { cn } from '@/lib/utils'
import fuelMeal from '@/components/client/mealCardFuel.module.css'
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

function ingredientQtyParts(item: MealFoodItemDisplay): { num: string; unit: string } {
  const raw = (item.food?.serving_unit || 'g').trim()
  const lower = raw.toLowerCase()
  const q = item.quantity
  const num =
    Math.abs(q - Math.round(q)) < 0.001 ? String(Math.round(q)) : String(Math.round(q * 10) / 10)
  if (lower === 'g' || lower === 'ml') return { num, unit: lower }
  return { num, unit: raw.length <= 4 ? raw : `${raw.slice(0, 4)}…` }
}

const FUEL_MEAL_ICON: Record<
  MealWithOptionsDisplay['meal_type'],
  { Icon: LucideIcon; softVar: string; colorVar: string }
> = {
  breakfast: {
    Icon: Sun,
    softVar: 'var(--fc-meal-breakfast-soft)',
    colorVar: 'var(--fc-meal-breakfast, var(--fc-accent-gold))',
  },
  lunch: {
    Icon: Leaf,
    softVar: 'var(--fc-meal-lunch-soft)',
    colorVar: 'var(--fc-meal-lunch)',
  },
  dinner: {
    Icon: Moon,
    softVar: 'var(--fc-meal-dinner-soft)',
    colorVar: 'var(--fc-meal-dinner)',
  },
  snack: {
    Icon: Cookie,
    softVar: 'var(--fc-meal-snack-soft, var(--fc-meal-lunch-soft))',
    colorVar: 'var(--fc-meal-snack, var(--fc-meal-lunch))',
  },
}

interface MealCardWithOptionsProps {
  meal: MealWithOptionsDisplay
  clientId: string
  /** Called when user logs via photo (legacy flow). */
  onMealLogged?: (mealId: string, optionId: string | null, photoUrl: string) => void
  /** When provided, Fuel flow: primary "Mark Complete" and optional photo; no photo required. */
  onMarkComplete?: (mealId: string, optionId: string | null) => void | Promise<void>
  /** Called when user taps Undo on a completed meal. */
  onUndo?: () => void
  /** Fuel mode: add photo to completion (optional). Parent calls addPhotoToCompletion and refetches. */
  onAddPhoto?: (mealId: string, file: File) => Promise<void>
  /** Opens full meal detail (e.g. `/client/nutrition/meals/[id]`). */
  onOpenMealDetails?: () => void
  /** When food row has an id, parent can navigate to food detail. */
  onFoodClick?: (foodId: string) => void
  /** Fuel hub: click header to collapse/expand body. */
  collapsible?: boolean
  /** Initial open state when `collapsible` is true. Defaults to true. */
  defaultExpanded?: boolean
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
  onOpenMealDetails,
  onFoodClick,
  collapsible = false,
  defaultExpanded = true,
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
  const [expanded, setExpanded] = useState(defaultExpanded)
  const showBody = !collapsible || expanded

  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleExpanded = () => {
    if (!collapsible) return
    setExpanded((prev) => !prev)
  }

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

  // Flat meal row (no card chrome; parent may use divide-y)
  const surfaceCard =
    "relative overflow-hidden border-b border-white/5 bg-transparent"

  const fuelMealIcon = FUEL_MEAL_ICON[meal.meal_type]
  const FuelMealGlyph = fuelMealIcon.Icon

  const macroMetaLine = (t: MacroTotals) =>
    `${Math.round(t.calories)} kcal · ${Math.round(t.protein)}g P · ${Math.round(t.carbs)}g C · ${Math.round(t.fat)}g F`

  const fuelMacroStatRow = (t: MacroTotals) => (
    <div className={fuelMeal.macroLine}>
      <div className={fuelMeal.stat}>
        <span className={fuelMeal.statVal} style={{ color: "var(--fc-accent)" }}>
          {Math.round(t.calories)}
        </span>
        <span className={fuelMeal.statLbl}>kcal</span>
      </div>
      <span className={fuelMeal.dotSep} aria-hidden />
      <div className={fuelMeal.stat}>
        <span className={fuelMeal.statVal} style={{ color: "var(--fc-macro-protein)" }}>
          {Math.round(t.protein)}g
        </span>
        <span className={fuelMeal.statLbl}>P</span>
      </div>
      <span className={fuelMeal.dotSep} aria-hidden />
      <div className={fuelMeal.stat}>
        <span className={fuelMeal.statVal} style={{ color: "var(--fc-macro-carbs)" }}>
          {Math.round(t.carbs)}g
        </span>
        <span className={fuelMeal.statLbl}>C</span>
      </div>
      <span className={fuelMeal.dotSep} aria-hidden />
      <div className={fuelMeal.stat}>
        <span className={fuelMeal.statVal} style={{ color: "var(--fc-macro-fat)" }}>
          {Math.round(t.fat)}g
        </span>
        <span className={fuelMeal.statLbl}>F</span>
      </div>
    </div>
  )

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
      <div
        className={cn(
          "flex flex-col h-full min-w-0",
          isFuelMode ? fuelMeal.shell : surfaceCard
        )}
      >
        {meal.logged ? (
          isFuelMode ? (
          <>
            <button
              type="button"
              className={cn(fuelMeal.headRow, fuelMeal.headRowButton)}
              onClick={toggleExpanded}
              aria-expanded={collapsible ? expanded : undefined}
              aria-label={
                collapsible
                  ? expanded
                    ? `Collapse ${meal.name}`
                    : `Expand ${meal.name}`
                  : undefined
              }
              style={collapsible ? undefined : { pointerEvents: "none" }}
            >
              <div
                className={fuelMeal.mealIconWrap}
                style={{
                  background: fuelMealIcon.softVar,
                  color: fuelMealIcon.colorVar,
                }}
              >
                <FuelMealGlyph className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className={fuelMeal.headInfo}>
                <h3 className={fuelMeal.mealTitle}>{meal.name}</h3>
                <p className={fuelMeal.mealMeta}>{macroMetaLine(completedTotals)}</p>
              </div>
              <div className={fuelMeal.headActions}>
                <span className={cn(fuelMeal.statusPill, fuelMeal.statusPillLogged)}>Logged</span>
                {collapsible ? (
                  <ChevronDown
                    className={cn(fuelMeal.headChevron, expanded && fuelMeal.headChevronOpen)}
                    strokeWidth={2.2}
                    aria-hidden
                  />
                ) : null}
              </div>
            </button>
            {showBody ? (
              <>
            <div className={fuelMeal.divider} />
            {meal.loggedOptionId && hasOptions && completedOption?.name && (
              <p className="px-4 pt-3 text-xs text-[color:var(--fc-text-dim)]">{completedOption.name}</p>
            )}
            {meal.photoUrl ? (
              <div className="px-4 pt-3">
                <div className={cn(fuelMeal.photoThumbWrap, fuelMeal.loggedPhotoHero)}>
                  <img src={meal.photoUrl} alt="" className={fuelMeal.photoThumb} />
                  <div className={fuelMeal.photoReplaceRow}>
                    <span className="text-xs text-[color:var(--fc-text-dim)]">Meal photo</span>
                    {onAddPhoto ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-[color:var(--fc-accent)] hover:underline min-h-[40px] px-1"
                      >
                        Replace
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
            {completedItems.length > 0 ? (
              <>
                <div className={fuelMeal.ingredients}>
                  {completedItems.map((item, idx) => {
                    const q = ingredientQtyParts(item)
                    return (
                      <div key={item.food?.id ?? idx} className={fuelMeal.ingRow}>
                        {onFoodClick && item.food?.id ? (
                          <button
                            type="button"
                            onClick={() => onFoodClick(item.food!.id)}
                            className={cn(fuelMeal.ingName, "truncate text-left hover:underline min-h-[40px]")}
                          >
                            {item.food?.name ?? "Unknown"}
                          </button>
                        ) : (
                          <span className={cn(fuelMeal.ingName, "truncate")}>{item.food?.name ?? "Unknown"}</span>
                        )}
                        <span className={fuelMeal.ingQty}>
                          {q.num}
                          <span className={fuelMeal.ingQtyUnit}>{q.unit}</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
                {fuelMacroStatRow(completedTotals)}
              </>
            ) : null}
            <div className={fuelMeal.actions}>
              {!meal.photoUrl && onAddPhoto ? (
                <button type="button" className={fuelMeal.photoDashed} onClick={() => fileInputRef.current?.click()}>
                  <Camera className="h-4 w-4 shrink-0" />
                  Add photo
                </button>
              ) : null}
              {onUndo ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onUndo}
                  className="w-full min-h-[44px] rounded-xl border-[color:var(--fc-status-warning)]/50 text-[color:var(--fc-status-warning)] hover:bg-[color:var(--fc-status-warning)]/10"
                >
                  Undo
                </Button>
              ) : null}
            </div>
              </>
            ) : null}
          </>
          ) : (
          <>
            <div className="p-5 border-b border-[color:var(--fc-glass-border)]">
              <div className="flex justify-between items-start mb-1 gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${mealIconColor}18` }}>
                    <MealIcon className="w-4 h-4" style={{ color: mealIconColor }} />
                  </div>
                  <h3 className="text-lg font-bold fc-text-primary truncate">
                    {meal.name}
                  </h3>
                  {onOpenMealDetails && (
                    <button
                      type="button"
                      onClick={onOpenMealDetails}
                      className="shrink-0 text-xs font-semibold text-[color:var(--fc-accent)] hover:underline min-h-[44px] px-1"
                    >
                      Details
                    </button>
                  )}
                </div>
                <span className="text-sm font-bold font-mono text-[color:var(--fc-text-dim)] shrink-0 text-right">
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
                  <div className="bg-[color-mix(in_srgb,var(--fc-group-c)_15%,transparent)] backdrop-blur-md border border-[color-mix(in_srgb,var(--fc-group-c)_35%,transparent)] text-[color:var(--fc-group-c)] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
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
                    <li key={item.food?.id ?? idx} className="flex justify-between items-center text-sm gap-2">
                      {onFoodClick && item.food?.id ? (
                        <button
                          type="button"
                          onClick={() => onFoodClick(item.food!.id)}
                          className="fc-text-primary truncate pr-2 text-left min-h-[44px] hover:underline"
                        >
                          {item.food?.name ?? 'Unknown'}
                        </button>
                      ) : (
                        <span className="fc-text-primary truncate pr-2">{item.food?.name ?? 'Unknown'}</span>
                      )}
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
          )
        ) : !isFuelMode ? (
          <>
            {/* Header — legacy (non–Fuel) */}
            <div className="p-5">
              <div className="flex justify-between items-start mb-1 gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${mealIconColor}18` }}>
                    <MealIcon className="w-4 h-4" style={{ color: mealIconColor }} />
                  </div>
                  <h3 className="text-lg font-bold fc-text-primary truncate">
                    {meal.name}
                  </h3>
                  {onOpenMealDetails && (
                    <button
                      type="button"
                      onClick={onOpenMealDetails}
                      className="shrink-0 text-xs font-semibold text-[color:var(--fc-accent)] hover:underline min-h-[44px] px-1"
                    >
                      Details
                    </button>
                  )}
                </div>
                <span className="text-sm font-bold font-mono text-[color:var(--fc-text-dim)] shrink-0">
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
                    <Badge className="bg-[color:var(--fc-accent)]/10 text-[color:var(--fc-accent)]">
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
                          ? 'bg-[color:var(--fc-accent)]'
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
                  <li key={item.food?.id ?? idx} className="flex justify-between items-center text-sm gap-2">
                    {onFoodClick && item.food?.id ? (
                      <button
                        type="button"
                        onClick={() => onFoodClick(item.food!.id)}
                        className="fc-text-primary truncate pr-2 text-left min-h-[44px] hover:underline"
                      >
                        {item.food?.name ?? 'Unknown'}
                      </button>
                    ) : (
                      <span className="fc-text-primary truncate pr-2">{item.food?.name ?? 'Unknown'}</span>
                    )}
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
                {showPhotoPreview ? 'Photo selected - ready to log' : 'No photo uploaded yet'}
              </p>
            </div>

            {/* Actions — legacy: photo log only */}
            <div className="px-5 pb-5 space-y-2">
              <Button
                onClick={handlePhotoSelect}
                disabled={meal.logged}
                variant="fc-primary"
                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all"
              >
                <Camera className="w-5 h-5" />
                Upload Photo
              </Button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className={cn(fuelMeal.headRow, fuelMeal.headRowButton)}
              onClick={toggleExpanded}
              aria-expanded={collapsible ? expanded : undefined}
              aria-label={
                collapsible
                  ? expanded
                    ? `Collapse ${meal.name}`
                    : `Expand ${meal.name}`
                  : undefined
              }
              style={collapsible ? undefined : { pointerEvents: "none" }}
            >
              <div
                className={fuelMeal.mealIconWrap}
                style={{
                  background: fuelMealIcon.softVar,
                  color: fuelMealIcon.colorVar,
                }}
              >
                <FuelMealGlyph className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className={fuelMeal.headInfo}>
                <h3 className={fuelMeal.mealTitle}>{meal.name}</h3>
                <p className={fuelMeal.mealMeta}>{macroMetaLine(currentTotals)}</p>
              </div>
              <div className={fuelMeal.headActions}>
                <span className={fuelMeal.statusPill}>Not logged</span>
                {collapsible ? (
                  <ChevronDown
                    className={cn(fuelMeal.headChevron, expanded && fuelMeal.headChevronOpen)}
                    strokeWidth={2.2}
                    aria-hidden
                  />
                ) : null}
              </div>
            </button>
            {showBody ? (
              <>
            <div className={fuelMeal.divider} />
            {hasOptions && meal.options.length > 1 && (
              <div className={fuelMeal.carousel}>
                <div className={fuelMeal.carouselInner}>
                  <IconButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Previous option"
                    onClick={handlePrevOption}
                    disabled={selectedOptionIndex === 0 || showPhotoPreview}
                    className="!h-7 !w-7 min-h-7 min-w-7 shrink-0 rounded-full"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </IconButton>
                  <div className={fuelMeal.carouselCenter}>
                    <p className={fuelMeal.optionTitle}>{currentOption?.name || 'Option'}</p>
                    <div className={fuelMeal.dots}>
                      {meal.options.map((_, idx) => (
                        <span
                          key={idx}
                          className={cn(fuelMeal.dot, idx === selectedOptionIndex && fuelMeal.dotActive)}
                          aria-hidden
                        />
                      ))}
                    </div>
                  </div>
                  <IconButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Next option"
                    onClick={handleNextOption}
                    disabled={selectedOptionIndex === meal.options.length - 1 || showPhotoPreview}
                    className="!h-7 !w-7 min-h-7 min-w-7 shrink-0 rounded-full"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            )}
            {hasOptions && meal.options.length === 1 && currentOption && (
              <div className="px-4 pt-3 pb-0">
                <p className={fuelMeal.optionTitle}>{currentOption.name}</p>
              </div>
            )}
            <div className={fuelMeal.ingredients}>
              {currentItems.map((item, idx) => {
                const q = ingredientQtyParts(item)
                return (
                  <div key={item.food?.id ?? idx} className={fuelMeal.ingRow}>
                    {onFoodClick && item.food?.id ? (
                      <button
                        type="button"
                        onClick={() => onFoodClick(item.food!.id)}
                        className={cn(fuelMeal.ingName, 'truncate text-left hover:underline min-h-[40px]')}
                      >
                        {item.food?.name ?? 'Unknown'}
                      </button>
                    ) : (
                      <span className={cn(fuelMeal.ingName, 'truncate')}>{item.food?.name ?? 'Unknown'}</span>
                    )}
                    <span className={fuelMeal.ingQty}>
                      {q.num}
                      <span className={fuelMeal.ingQtyUnit}>{q.unit}</span>
                    </span>
                  </div>
                )
              })}
            </div>
            {fuelMacroStatRow(currentTotals)}
            <div className={fuelMeal.actions}>
              <button
                type="button"
                className={fuelMeal.photoDashed}
                onClick={handlePhotoSelect}
                disabled={showPhotoPreview}
              >
                <Camera className="h-4 w-4 shrink-0" />
                {showPhotoPreview ? 'Photo selected' : 'Add photo'}
              </button>
              {onMarkComplete && (
                <Button
                  type="button"
                  onClick={() => onMarkComplete(meal.id, currentOption?.id ?? null)}
                  disabled={showPhotoPreview}
                  className="w-full min-h-[44px] gap-1.5 py-3 text-[13px] font-bold tracking-[0.06em] uppercase rounded-[14px] bg-[color:var(--fc-status-success)] text-[#08120A] hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Mark Complete
                </Button>
              )}
            </div>
              </>
            ) : null}
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
                  <Badge className="bg-[color:var(--fc-accent)]/90 text-white backdrop-blur-sm">
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
                  if (isFuelMode && !meal.logged && previewFile && onMarkComplete && onAddPhoto) {
                    setUploading(true);
                    setError(null);
                    try {
                      await Promise.resolve(onMarkComplete(meal.id, currentOption?.id ?? null));
                      await onAddPhoto(meal.id, previewFile);
                      handleDiscardPhoto();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Save failed');
                    } finally {
                      setUploading(false);
                    }
                  } else if (isFuelMode && meal.logged && onAddPhoto && previewFile) {
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
                disabled={
                  uploading ||
                  (!isFuelMode && !onMealLogged) ||
                  (isFuelMode &&
                    meal.logged &&
                    !onAddPhoto) ||
                  (isFuelMode && !meal.logged && (!onAddPhoto || !onMarkComplete))
                }
                className="flex-1 rounded-xl bg-[color:var(--fc-status-success)] hover:opacity-90 text-white"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {isFuelMode ? 'Saving...' : 'Logging...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isFuelMode && !meal.logged && previewFile
                      ? 'Log meal & photo'
                      : isFuelMode
                        ? 'Add Photo'
                        : 'Log Meal'}
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
