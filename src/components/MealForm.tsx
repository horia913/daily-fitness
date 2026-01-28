'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  X, 
  Search, 
  Calculator, 
  Utensils, 
  Save, 
  Image, 
  Upload,
  Clock,
  Target,
  Zap,
  Info,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface Food {
  id: string
  name: string
  brand?: string
  serving_size: number
  serving_unit: string
  calories_per_serving: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  category: string
}

interface MealFoodItem {
  food_id: string
  food_name: string
  quantity: number
  unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

interface MealFormProps {
  mealPlanId: string
  mealType: string
  onSave: (meal: any) => void
  onCancel: () => void
}

const mealTypes = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' }
]

export default function MealForm({ mealPlanId, mealType, onSave, onCancel }: MealFormProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  
  const [mealName, setMealName] = useState('')
  const [mealDescription, setMealDescription] = useState('')
  const [selectedMealType, setSelectedMealType] = useState(mealType)
  const [foods, setFoods] = useState<Food[]>([])
  const [selectedFoods, setSelectedFoods] = useState<MealFoodItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showNutritionSummary, setShowNutritionSummary] = useState(false)

  // Macro totals
  const totalCalories = selectedFoods.reduce((sum, item) => sum + item.calories, 0)
  const totalProtein = selectedFoods.reduce((sum, item) => sum + item.protein, 0)
  const totalCarbs = selectedFoods.reduce((sum, item) => sum + item.carbs, 0)
  const totalFat = selectedFoods.reduce((sum, item) => sum + item.fat, 0)
  const totalFiber = selectedFoods.reduce((sum, item) => sum + item.fiber, 0)

  useEffect(() => {
    loadFoods()
  }, [])

  const loadFoods = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setFoods(data || [])
    } catch (error) {
      console.error('Error loading foods:', error)
    }
  }, [])

  const addFood = (food: Food) => {
    const existingIndex = selectedFoods.findIndex(item => item.food_id === food.id)
    
    if (existingIndex >= 0) {
      // Update existing food quantity
      const updatedFoods = [...selectedFoods]
      const item = updatedFoods[existingIndex]
      const newQuantity = item.quantity + 1
      
      // Find the original food data to recalculate properly
      const originalFood = foods.find(f => f.id === food.id)
      if (!originalFood) return
      
      const multiplier = newQuantity / originalFood.serving_size
      
      updatedFoods[existingIndex] = {
        ...item,
        quantity: newQuantity,
        calories: originalFood.calories_per_serving * multiplier,
        protein: originalFood.protein * multiplier,
        carbs: originalFood.carbs * multiplier,
        fat: originalFood.fat * multiplier,
        fiber: originalFood.fiber * multiplier
      }
      setSelectedFoods(updatedFoods)
    } else {
      // Add new food - calculate nutrition based on quantity
      const quantity = 1
      const multiplier = quantity / food.serving_size
      
      const newFood: MealFoodItem = {
        food_id: food.id,
        food_name: food.name,
        quantity: quantity,
        unit: food.serving_unit,
        calories: food.calories_per_serving * multiplier,
        protein: food.protein * multiplier,
        carbs: food.carbs * multiplier,
        fat: food.fat * multiplier,
        fiber: food.fiber * multiplier
      }
      setSelectedFoods([...selectedFoods, newFood])
    }
  }

  const updateFoodQuantity = (foodId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFood(foodId)
      return
    }

    const updatedFoods = selectedFoods.map(item => {
      if (item.food_id === foodId) {
        // Find the original food data to recalculate properly
        const originalFood = foods.find(f => f.id === foodId)
        if (!originalFood) return item
        
        const multiplier = quantity / originalFood.serving_size
        return {
          ...item,
          quantity,
          calories: originalFood.calories_per_serving * multiplier,
          protein: originalFood.protein * multiplier,
          carbs: originalFood.carbs * multiplier,
          fat: originalFood.fat * multiplier,
          fiber: originalFood.fiber * multiplier
        }
      }
      return item
    })
    setSelectedFoods(updatedFoods)
  }

  const removeFood = (foodId: string) => {
    setSelectedFoods(selectedFoods.filter(item => item.food_id !== foodId))
  }

  const handleSave = async () => {
    if (!mealName.trim() || selectedFoods.length === 0) return

    setLoading(true)
    try {
      // Create meal
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .insert({
          meal_plan_id: mealPlanId,
          name: mealName,
          description: mealDescription,
          meal_type: selectedMealType
        })
        .select()
        .single()

      if (mealError) throw mealError

      // Create meal food items
      const foodItems = selectedFoods.map(item => ({
        meal_id: meal.id,
        food_id: item.food_id,
        quantity: item.quantity,
        unit: item.unit
      }))

      const { error: itemsError } = await supabase
        .from('meal_food_items')
        .insert(foodItems)

      if (itemsError) throw itemsError

      onSave({
        ...meal,
        food_items: selectedFoods,
        totals: {
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
          fiber: totalFiber
        }
      })
    } catch (error) {
      console.error('Error saving meal:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredFoods = foods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    food.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/50 backdrop-blur-sm'}`}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      data-theme={isDark ? 'dark' : 'light'}
    >
      <div 
        className={`relative ${theme.card} ${theme.shadow} fc-glass fc-card rounded-3xl border ${theme.border} max-w-4xl max-h-[95vh] w-full overflow-hidden transform transition-all duration-300 ease-out`}
        style={{
          animation: 'modalSlideIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className={`sticky top-0 ${theme.card} fc-glass fc-card border-b ${theme.border} px-6 py-5 rounded-t-3xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-gradient-to-br from-green-100 to-orange-100'}`}>
                <Utensils className={`w-6 h-6 ${theme.text}`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${theme.text}`}>
                  Create {mealType.charAt(0).toUpperCase() + mealType.slice(1)} Meal
                </h2>
                <p className={`text-sm ${theme.textSecondary} mt-1`}>
                  Build a nutritious meal with ingredients and nutritional tracking
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className={`p-2 rounded-xl transition-all duration-200 ${theme.textSecondary} hover:${theme.text} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-120px)] px-6 py-6">
          <div className="space-y-8">
            {/* Meal Details */}
            <Card className={`${theme.card} fc-glass fc-card border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                    <Info className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${theme.text}`}>Meal Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="mealName" className={`text-sm font-medium ${theme.text}`}>Meal Name *</Label>
                  <Input
                    id="mealName"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="e.g., Post-Workout Protein Shake"
                    required
                    className="rounded-xl"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mealDescription" className={`text-sm font-medium ${theme.text}`}>Description</Label>
                  <Textarea
                    id="mealDescription"
                    value={mealDescription}
                    onChange={(e) => setMealDescription(e.target.value)}
                    placeholder="Brief description of this meal..."
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mealType" className={`text-sm font-medium ${theme.text}`}>Meal Type</Label>
                  <Select
                    value={selectedMealType}
                    onValueChange={(value) => setSelectedMealType(value)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select meal type" />
                    </SelectTrigger>
                    <SelectContent>
                      {mealTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Utensils className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Food Search & Selection */}
            <Card className={`${theme.card} fc-glass fc-card border ${theme.border} rounded-2xl`}>
              <CardHeader className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-orange-100'}`}>
                    <Search className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                  </div>
                  <CardTitle className={`text-xl font-bold ${theme.text}`}>Add Foods</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
                <div className="space-y-2">
                  <Label className={`text-sm font-medium ${theme.text}`}>Search Foods</Label>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme.textSecondary}`} />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search foods by name or category..."
                      className="pl-10 rounded-xl"
                    />
                  </div>
                </div>

                {/* Food List */}
                <div className="space-y-2">
                  <Label className={`text-sm font-medium ${theme.text}`}>Available Foods</Label>
                  <div className={`max-h-64 overflow-y-auto border ${theme.border} rounded-2xl`}>
                    {filteredFoods.map((food) => (
                      <div
                        key={food.id}
                        className={`flex items-center justify-between p-4 border-b ${theme.border} last:border-b-0 hover:${isDark ? 'bg-slate-700' : 'bg-slate-50'} transition-colors`}
                      >
                        <div className="flex-1">
                          <div className={`font-medium ${theme.text}`}>{food.name}</div>
                          <div className={`text-sm ${theme.textSecondary} mt-1`}>
                            {food.calories_per_serving} cal • {food.protein}g protein • {food.carbs}g carbs • {food.fat}g fat • {food.fiber}g fiber
                          </div>
                          <div className={`text-xs ${theme.textSecondary} mt-1`}>
                            {food.serving_size} {food.serving_unit} • {food.category}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addFood(food)}
                          className={`${theme.primary} rounded-xl ml-3`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Foods */}
            {selectedFoods.length > 0 && (
              <Card className={`${theme.card} fc-glass fc-card border ${theme.border} rounded-2xl`}>
                <CardHeader className="p-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                      <CheckCircle className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <CardTitle className={`text-xl font-bold ${theme.text}`}>Selected Foods</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  <div className="space-y-3">
                    {selectedFoods.map((item) => (
                      <div
                        key={item.food_id}
                        className={`flex items-center justify-between p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-2xl border ${theme.border}`}
                      >
                        <div className="flex-1">
                          <div className={`font-medium ${theme.text}`}>{item.food_name}</div>
                          <div className={`text-sm ${theme.textSecondary} mt-1`}>
                            {item.calories.toFixed(0)} cal • {item.protein.toFixed(1)}g protein • {item.carbs.toFixed(1)}g carbs • {item.fat.toFixed(1)}g fat • {item.fiber.toFixed(1)}g fiber
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateFoodQuantity(item.food_id, parseFloat(e.target.value) || 0)}
                              className="w-20 h-8 text-center rounded-xl"
                              min="0"
                              step="0.1"
                            />
                            <span className={`text-sm ${theme.textSecondary}`}>{item.unit}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFood(item.food_id)}
                            className={`p-2 rounded-xl transition-all duration-200 ${theme.textSecondary} hover:text-red-600 hover:${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Nutrition Summary */}
            {selectedFoods.length > 0 && (
              <Card className={`${theme.card} fc-glass fc-card border ${theme.border} rounded-2xl`}>
                <CardHeader className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                        <Calculator className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>Nutrition Summary</CardTitle>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNutritionSummary(!showNutritionSummary)}
                      className={`p-2 rounded-xl transition-all duration-200 ${theme.textSecondary} hover:${theme.text} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                    >
                      {showNutritionSummary ? <X className="w-4 h-4" /> : <Calculator className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardHeader>
                {showNutritionSummary && (
                  <CardContent className="p-6 pt-0">
                    <div className={`p-6 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-gradient-to-br from-blue-50 to-green-50'}`}>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${theme.text}`}>{totalCalories.toFixed(0)}</div>
                          <div className={`text-sm ${theme.textSecondary}`}>Calories</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${theme.text}`}>{totalProtein.toFixed(1)}g</div>
                          <div className={`text-sm ${theme.textSecondary}`}>Protein</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${theme.text}`}>{totalCarbs.toFixed(1)}g</div>
                          <div className={`text-sm ${theme.textSecondary}`}>Carbs</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${theme.text}`}>{totalFat.toFixed(1)}g</div>
                          <div className={`text-sm ${theme.textSecondary}`}>Fat</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${theme.text}`}>{totalFiber.toFixed(1)}g</div>
                          <div className={`text-sm ${theme.textSecondary}`}>Fiber</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`sticky bottom-0 ${theme.card} fc-glass fc-card border-t ${theme.border} px-6 py-4 rounded-b-3xl`}>
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!mealName.trim() || selectedFoods.length === 0 || loading}
              className={`${theme.primary} flex items-center gap-2 rounded-xl`}
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Meal'}
            </Button>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
