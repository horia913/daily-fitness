import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, Minus, X, ChefHat } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { MealPlanService, Food, MealItem } from '@/lib/mealPlanService'
import { supabase } from '@/lib/supabase'

interface MealCreatorProps {
  mealPlanId: string
  onClose: () => void
  onSave: () => void
}

interface SelectedFood extends Food {
  quantity: number
}

export default function MealCreator({ mealPlanId, onClose, onSave }: MealCreatorProps) {
  const { getThemeStyles } = useTheme()
  const { user } = useAuth()
  const theme = getThemeStyles()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [availableFoods, setAvailableFoods] = useState<Food[]>([])
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [mealName, setMealName] = useState('')

  // Load available foods on mount
  useEffect(() => {
    loadFoods()
  }, [])

  const loadFoods = async () => {
    try {
      setLoading(true)
      const foods = await MealPlanService.getFoods()
      setAvailableFoods(foods.slice(0, 20)) // Show first 20 foods initially
    } catch (error) {
      console.error('Error loading foods:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchFoods = async (query: string) => {
    if (!query.trim()) {
      loadFoods()
      return
    }

    try {
      setSearching(true)
      const foods = await MealPlanService.searchFoods(query)
      setAvailableFoods(foods)
    } catch (error) {
      console.error('Error searching foods:', error)
    } finally {
      setSearching(false)
    }
  }

  const addFoodToMeal = (food: Food) => {
    const existingIndex = selectedFoods.findIndex(f => f.id === food.id)
    
    if (existingIndex >= 0) {
      // Increase quantity if already added
      const updated = [...selectedFoods]
      updated[existingIndex].quantity += 1
      setSelectedFoods(updated)
    } else {
      // Add new food with quantity 1
      setSelectedFoods([...selectedFoods, { ...food, quantity: 1 }])
    }
    
    // Clear search after adding food
    setSearchQuery('')
    setAvailableFoods([])
  }

  const updateFoodQuantity = (foodId: string, quantity: number) => {
    // Only remove food if quantity is negative, not if it's 0
    if (quantity < 0) {
      removeFoodFromMeal(foodId)
      return
    }
    
    const updated = selectedFoods.map(food => 
      food.id === foodId ? { ...food, quantity } : food
    )
    setSelectedFoods(updated)
  }

  const handleQuantityChange = (foodId: string, value: string) => {
    const quantity = parseFloat(value) || 0
    updateFoodQuantity(foodId, quantity)
  }

  const removeFoodFromMeal = (foodId: string) => {
    setSelectedFoods(selectedFoods.filter(food => food.id !== foodId))
  }

  const calculateMealTotals = () => {
    return selectedFoods.reduce((totals, food) => {
      const multiplier = food.quantity / food.serving_size
      return {
        calories: totals.calories + (food.calories_per_serving * multiplier),
        protein: totals.protein + (food.protein * multiplier),
        carbs: totals.carbs + (food.carbs * multiplier),
        fat: totals.fat + (food.fat * multiplier),
        fiber: totals.fiber + (food.fiber * multiplier)
      }
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
  }

  const saveMeal = async () => {
    if (selectedFoods.length === 0) return

    // Generate a default meal name if not provided
    const finalMealName = mealName.trim() || `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Meal ${new Date().toLocaleDateString()}`

    try {
      setLoading(true)
      
      // First, create a meal entity in the meals table
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .insert({
          meal_plan_id: mealPlanId,
          name: finalMealName,
          meal_type: mealType
        })
        .select()
        .single()

      if (mealError) {
        console.error('Error creating meal:', mealError)
        throw mealError
      }

      // Then, create meal food items in meal_food_items table
      const foodItems = selectedFoods.map(food => ({
        meal_id: meal.id,
        food_id: food.id,
        quantity: food.quantity,
        unit: food.serving_unit || 'g'
      }))

      const { error: itemsError } = await supabase
        .from('meal_food_items')
        .insert(foodItems)

      if (itemsError) {
        console.error('Error adding food items:', itemsError)
        throw itemsError
      }
      
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving meal:', error)
      alert('Error saving meal. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateMealTotals()

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 pt-20 pb-20 z-[9999]"
      onClick={(e) => {
        // Don't close if clicking on Select dropdown
        if ((e.target as HTMLElement).closest('[data-slot="select-content"]')) {
          return
        }
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <Card className={`w-full max-w-4xl h-[87.5vh] flex flex-col overflow-hidden ${theme.card} ${theme.shadow} rounded-2xl`}>
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div>
            <h2 className={`text-xl font-semibold ${theme.text}`}>Create Meal</h2>
            <p className={`text-sm ${theme.textSecondary}`}>
              {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`${theme.textSecondary} hover:${theme.text} text-2xl`}
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Meal Name Input */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme.text}`}>Meal Name</label>
              <Input
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                placeholder={`e.g., ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Meal`}
                className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
              />
              <p className={`text-xs ${theme.textSecondary}`}>
                Leave empty to auto-generate a name
              </p>
            </div>

            {/* Meal Type Selection */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme.text}`}>Meal Type</label>
              <Select value={mealType} onValueChange={(value: 'breakfast' | 'lunch' | 'dinner' | 'snack') => setMealType(value)}>
                <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                  <SelectValue placeholder="Select meal type" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search foods..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  searchFoods(e.target.value)
                }}
                className={`pl-10 ${theme.border} ${theme.text} bg-transparent rounded-xl`}
              />
            </div>

            {/* Search results */}
            {searchQuery && (
              <div className="space-y-4">
                <h3 className={`font-semibold ${theme.text}`}>Search Results</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className={`${theme.textSecondary}`}>Searching...</div>
                    </div>
                  ) : availableFoods.length === 0 ? (
                    <div className="text-center py-4">
                      <ChefHat className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <div className={`${theme.textSecondary}`}>No foods found</div>
                    </div>
                  ) : (
                    availableFoods.map((food) => (
                      <div 
                        key={food.id} 
                        onClick={() => addFoodToMeal(food)}
                        className={`${theme.card} rounded-lg p-2 flex items-center justify-between cursor-pointer hover:bg-opacity-80 transition-colors`}
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-medium ${theme.text} truncate text-sm`}>{food.name}</h3>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`${theme.textSecondary}`}>{food.calories_per_serving} cal</span>
                            <span className={`${theme.textSecondary}`}>{food.protein}g protein</span>
                          </div>
                        </div>
                        <div className="ml-2 h-6 w-6 flex items-center justify-center bg-gradient-to-r from-green-600 to-teal-600 text-white rounded">
                          <Plus className="w-3 h-3" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Selected foods and totals */}
            <div className="space-y-4">
              <h3 className={`font-semibold ${theme.text}`}>Selected Foods</h3>
              
              {selectedFoods.length === 0 ? (
                <div className="text-center py-8">
                  <ChefHat className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <div className={`${theme.textSecondary}`}>No foods selected yet</div>
                  <div className={`text-sm ${theme.textSecondary}`}>
                    Search and add foods above
                  </div>
                </div>
              ) : (
                <>
                  {/* Selected foods list */}
                  <div className="space-y-3">
                    {selectedFoods.map((food) => (
                      <Card key={food.id} className={`${theme.card} ${theme.shadow} rounded-xl`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className={`font-medium ${theme.text}`}>{food.name}</h4>
                              <div className="flex items-center gap-4 mt-1 text-xs">
                                <span className={`${theme.textSecondary}`}>
                                  {Math.round(food.calories_per_serving * (food.quantity / food.serving_size))} cal
                                </span>
                                <span className={`${theme.textSecondary}`}>
                                  {Math.round(food.protein * (food.quantity / food.serving_size))}g protein
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={food.quantity}
                                onChange={(e) => handleQuantityChange(food.id, e.target.value)}
                                className="w-20 text-center"
                                min="0"
                                step="0.1"
                                placeholder="0"
                              />
                              <span className={`text-xs ${theme.textSecondary}`}>{food.serving_unit}</span>
                              <Button
                                onClick={() => removeFoodFromMeal(food.id)}
                                size="sm"
                                variant="outline"
                                className="rounded-xl text-red-600 hover:text-red-700"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Meal totals */}
                  <Card className={`bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 ${theme.shadow} rounded-xl`}>
                    <CardContent className="p-4">
                      <h4 className={`font-semibold ${theme.text} mb-3`}>Meal Totals</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                          <div className={`text-2xl font-bold ${theme.text}`}>
                            {Math.round(totals.calories)}
                          </div>
                          <div className={`text-sm ${theme.textSecondary}`}>Calories</div>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                          <div className={`text-2xl font-bold text-green-600 dark:text-green-400`}>
                            {Math.round(totals.protein)}g
                          </div>
                          <div className={`text-sm ${theme.textSecondary}`}>Protein</div>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                          <div className={`text-2xl font-bold text-blue-600 dark:text-blue-400`}>
                            {Math.round(totals.carbs)}g
                          </div>
                          <div className={`text-sm ${theme.textSecondary}`}>Carbs</div>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                          <div className={`text-2xl font-bold text-yellow-600 dark:text-yellow-400`}>
                            {Math.round(totals.fat)}g
                          </div>
                          <div className={`text-sm ${theme.textSecondary}`}>Fat</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-end gap-2 p-6 pt-4 border-t">
          <Button 
            onClick={onClose}
            variant="outline" 
            className={`${theme.border} ${theme.textSecondary} rounded-xl`}
          >
            Cancel
          </Button>
          <Button 
            onClick={saveMeal}
            disabled={loading || selectedFoods.length === 0}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-xl"
          >
            {loading ? 'Saving...' : 'Save Meal'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
