'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  X, 
  Search, 
  Trash,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  AlertCircle
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  MealPlanService,
  type MealOption,
  type MealFoodItem,
  type Food,
  type MacroTotals
} from '@/lib/mealPlanService'

// ============================================================================
// Types
// ============================================================================

interface MealOptionWithFoods {
  id: string
  meal_id: string
  name: string
  order_index: number
  food_items: MealFoodItem[]
  totals: MacroTotals
  isNew?: boolean  // For unsaved options
  isEditing?: boolean
}

interface MealOptionEditorProps {
  mealId: string
  mealPlanId: string
  onOptionsChange?: (options: MealOptionWithFoods[]) => void
}

// ============================================================================
// Constants
// ============================================================================

const MAX_OPTIONS = 5

// ============================================================================
// Component
// ============================================================================

export default function MealOptionEditor({ 
  mealId, 
  mealPlanId,
  onOptionsChange 
}: MealOptionEditorProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  // State
  const [options, setOptions] = useState<MealOptionWithFoods[]>([])
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedOption, setExpandedOption] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingOptionName, setEditingOptionName] = useState<string | null>(null)
  const [newOptionName, setNewOptionName] = useState('')

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadOptions = useCallback(async () => {
    try {
      setLoading(true)
      const mealData = await MealPlanService.getMealWithOptions(mealId)
      
      if (mealData) {
        // If meal has legacy items but no options, show them as "unsaved default"
        if (mealData.options.length === 0 && mealData.legacy_food_items && mealData.legacy_food_items.length > 0) {
          const legacyTotals = MealPlanService.calculateFoodItemTotals(mealData.legacy_food_items)
          setOptions([{
            id: 'legacy',
            meal_id: mealId,
            name: 'Default',
            order_index: 0,
            food_items: mealData.legacy_food_items,
            totals: legacyTotals,
            isNew: true
          }])
        } else {
          setOptions(mealData.options)
        }
      }
    } catch (error) {
      console.error('Error loading meal options:', error)
    } finally {
      setLoading(false)
    }
  }, [mealId])

  const loadFoods = useCallback(async () => {
    try {
      const foodData = await MealPlanService.getFoods()
      setFoods(foodData)
    } catch (error) {
      console.error('Error loading foods:', error)
    }
  }, [])

  useEffect(() => {
    loadOptions()
    loadFoods()
  }, [loadOptions, loadFoods])

  useEffect(() => {
    onOptionsChange?.(options)
  }, [options, onOptionsChange])

  // ============================================================================
  // Option Management
  // ============================================================================

  const handleAddOption = async () => {
    console.log('[handleAddOption] Button clicked, current options:', options.length)
    
    if (options.length >= MAX_OPTIONS) {
      alert(`Maximum ${MAX_OPTIONS} options allowed per meal.`)
      return
    }

    const optionName = `Option ${options.length + 1}`
    console.log('[handleAddOption] Creating option:', optionName, 'for meal:', mealId)
    
    try {
      setSaving(true)
      const newOption = await MealPlanService.createMealOption(mealId, optionName)
      console.log('[handleAddOption] Option created:', newOption)
      
      // Reload options to get the full data including any migrated items
      await loadOptions()
      
      // Auto-expand the new option
      setExpandedOption(newOption.id)
    } catch (error) {
      console.error('[handleAddOption] Error creating option:', error)
      alert('Failed to create option. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOption = async (optionId: string) => {
    if (options.length <= 1) {
      alert('Cannot delete the only option. A meal must have at least one option.')
      return
    }

    if (!confirm('Delete this option? All foods in this option will be removed.')) {
      return
    }

    try {
      setSaving(true)
      const success = await MealPlanService.deleteMealOption(optionId)
      
      if (success) {
        await loadOptions()
      } else {
        alert('Failed to delete option. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting option:', error)
      alert('Failed to delete option. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleRenameOption = async (optionId: string, newName: string) => {
    if (!newName.trim()) return

    try {
      await MealPlanService.updateMealOption(optionId, { name: newName.trim() })
      setOptions(prev => prev.map(opt => 
        opt.id === optionId ? { ...opt, name: newName.trim() } : opt
      ))
      setEditingOptionName(null)
    } catch (error) {
      console.error('Error renaming option:', error)
    }
  }

  // ============================================================================
  // Food Management
  // ============================================================================

  const handleAddFood = async (optionId: string, food: Food) => {
    try {
      const foodItem = await MealPlanService.addFoodToOption(
        mealId,
        optionId,
        food.id,
        food.serving_size, // Default to one serving
        food.serving_unit
      )

      if (foodItem) {
        setOptions(prev => prev.map(opt => {
          if (opt.id === optionId) {
            const newItems = [...opt.food_items, foodItem]
            const newTotals = MealPlanService.calculateFoodItemTotals(newItems)
            return { ...opt, food_items: newItems, totals: newTotals }
          }
          return opt
        }))
      }
    } catch (error) {
      console.error('Error adding food to option:', error)
    }
  }

  const handleRemoveFood = async (optionId: string, foodItemId: string) => {
    try {
      const success = await MealPlanService.removeFoodFromOption(foodItemId)
      
      if (success) {
        setOptions(prev => prev.map(opt => {
          if (opt.id === optionId) {
            const newItems = opt.food_items.filter(item => item.id !== foodItemId)
            const newTotals = MealPlanService.calculateFoodItemTotals(newItems)
            return { ...opt, food_items: newItems, totals: newTotals }
          }
          return opt
        }))
      }
    } catch (error) {
      console.error('Error removing food from option:', error)
    }
  }

  const handleUpdateFoodQuantity = async (optionId: string, foodItemId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFood(optionId, foodItemId)
      return
    }

    try {
      const updated = await MealPlanService.updateFoodInOption(foodItemId, { quantity })
      
      if (updated) {
        setOptions(prev => prev.map(opt => {
          if (opt.id === optionId) {
            const newItems = opt.food_items.map(item => 
              item.id === foodItemId ? updated : item
            )
            const newTotals = MealPlanService.calculateFoodItemTotals(newItems)
            return { ...opt, food_items: newItems, totals: newTotals }
          }
          return opt
        }))
      }
    } catch (error) {
      console.error('Error updating food quantity:', error)
    }
  }

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const filteredFoods = foods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    food.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className={`h-8 ${isDark ? 'bg-white/10' : 'bg-slate-200'} rounded w-1/3`} />
        <div className={`h-32 ${isDark ? 'bg-white/10' : 'bg-slate-200'} rounded-xl`} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-bold ${theme.text}`}>Meal Options</h3>
          <p className={`text-sm ${theme.textSecondary}`}>
            Add up to {MAX_OPTIONS} options for this meal. Clients will choose one when logging.
          </p>
        </div>
        <Button
          onClick={handleAddOption}
          disabled={saving || options.length >= MAX_OPTIONS}
          className="fc-btn fc-btn-primary fc-press rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Option
        </Button>
      </div>

      {/* Options List */}
      {options.length === 0 ? (
        <div className={`text-center py-12 ${theme.card} fc-glass fc-card border ${theme.border} rounded-2xl`}>
          <AlertCircle className={`w-12 h-12 mx-auto ${theme.textSecondary} mb-4`} />
          <h4 className={`text-lg font-semibold ${theme.text} mb-2`}>No Options Yet</h4>
          <p className={`text-sm ${theme.textSecondary} mb-4`}>
            Add your first option to start building this meal.
          </p>
          <Button
            onClick={handleAddOption}
            className="fc-btn fc-btn-primary fc-press rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Option
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {options.map((option, index) => (
            <div
              key={option.id}
              className={`${theme.card} fc-glass fc-card border ${theme.border} rounded-2xl overflow-hidden`}
            >
              {/* Option Header */}
              <div 
                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors`}
                onClick={() => setExpandedOption(expandedOption === option.id ? null : option.id)}
              >
                <div className="flex items-center gap-3">
                  <Badge className={`${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                    {index + 1}
                  </Badge>
                  
                  {editingOptionName === option.id ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Input
                        value={newOptionName}
                        onChange={e => setNewOptionName(e.target.value)}
                        className="w-48 h-8"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameOption(option.id, newOptionName)
                          if (e.key === 'Escape') setEditingOptionName(null)
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRenameOption(option.id, newOptionName)}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${theme.text}`}>{option.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={e => {
                          e.stopPropagation()
                          setNewOptionName(option.name)
                          setEditingOptionName(option.id)
                        }}
                        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className={`text-sm ${theme.textSecondary}`}>
                    {option.food_items.length} item{option.food_items.length !== 1 ? 's' : ''} • {Math.round(option.totals.calories)} cal
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {options.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={e => {
                          e.stopPropagation()
                          handleDeleteOption(option.id)
                        }}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    )}
                    {expandedOption === option.id ? (
                      <ChevronUp className={`w-5 h-5 ${theme.textSecondary}`} />
                    ) : (
                      <ChevronDown className={`w-5 h-5 ${theme.textSecondary}`} />
                    )}
                  </div>
                </div>
              </div>

              {/* Option Content (Expanded) */}
              {expandedOption === option.id && (
                <div className={`border-t ${theme.border} p-4 space-y-4`}>
                  {/* Macro Summary */}
                  <div className={`grid grid-cols-5 gap-3 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${theme.text}`}>{Math.round(option.totals.calories)}</div>
                      <div className={`text-xs ${theme.textSecondary}`}>Calories</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold text-green-500`}>{option.totals.protein.toFixed(1)}g</div>
                      <div className={`text-xs ${theme.textSecondary}`}>Protein</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold text-blue-500`}>{option.totals.carbs.toFixed(1)}g</div>
                      <div className={`text-xs ${theme.textSecondary}`}>Carbs</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold text-yellow-500`}>{option.totals.fat.toFixed(1)}g</div>
                      <div className={`text-xs ${theme.textSecondary}`}>Fat</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold text-purple-500`}>{option.totals.fiber.toFixed(1)}g</div>
                      <div className={`text-xs ${theme.textSecondary}`}>Fiber</div>
                    </div>
                  </div>

                  {/* Food Items */}
                  <div>
                    <Label className={`text-sm font-medium ${theme.text} mb-2 block`}>
                      Foods in this option
                    </Label>
                    
                    {option.food_items.length === 0 ? (
                      <p className={`text-sm ${theme.textSecondary} italic py-4`}>
                        No foods added yet. Search below to add foods.
                      </p>
                    ) : (
                      <div className="space-y-2 mb-4">
                        {option.food_items.map(item => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}
                          >
                            <div className="flex-1">
                              <div className={`font-medium ${theme.text}`}>{item.food?.name || 'Unknown'}</div>
                              <div className={`text-xs ${theme.textSecondary}`}>
                                {item.food ? `${Math.round((item.food.calories_per_serving * item.quantity) / item.food.serving_size)} cal` : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={e => handleUpdateFoodQuantity(option.id, item.id, parseFloat(e.target.value) || 0)}
                                className="w-20 h-8 text-center"
                                min="0"
                                step="0.1"
                              />
                              <span className={`text-sm ${theme.textSecondary} w-8`}>{item.unit}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveFood(option.id, item.id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Food Search */}
                  <div>
                    <Label className={`text-sm font-medium ${theme.text} mb-2 block`}>
                      Add Foods
                    </Label>
                    <div className="relative mb-3">
                      <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme.textSecondary}`} />
                      <Input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search foods..."
                        className="pl-10 rounded-xl"
                      />
                    </div>
                    
                    {searchTerm && (
                      <div className={`max-h-48 overflow-y-auto border ${theme.border} rounded-xl`}>
                        {filteredFoods.slice(0, 10).map(food => (
                          <div
                            key={food.id}
                            className={`flex items-center justify-between p-3 border-b ${theme.border} last:border-b-0 hover:bg-white/5 cursor-pointer transition-colors`}
                            onClick={() => {
                              handleAddFood(option.id, food)
                              setSearchTerm('')
                            }}
                          >
                            <div>
                              <div className={`font-medium ${theme.text}`}>{food.name}</div>
                              <div className={`text-xs ${theme.textSecondary}`}>
                                {food.calories_per_serving} cal • {food.serving_size}{food.serving_unit}
                              </div>
                            </div>
                            <Plus className={`w-5 h-5 ${theme.textSecondary}`} />
                          </div>
                        ))}
                        {filteredFoods.length === 0 && (
                          <div className={`p-4 text-center ${theme.textSecondary}`}>
                            No foods found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Max Options Warning */}
      {options.length >= MAX_OPTIONS && (
        <p className={`text-sm ${theme.textSecondary} text-center`}>
          Maximum {MAX_OPTIONS} options reached.
        </p>
      )}
    </div>
  )
}
