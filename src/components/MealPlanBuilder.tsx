'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Trash, 
  Calculator, 
  Utensils, 
  Eye,
  EyeOff
} from 'lucide-react'
import MealForm from './MealForm'

interface Meal {
  id: string
  name: string
  meal_type: string
  order_index: number
  food_items: any[]
  totals: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
}

interface MealPlanBuilderProps {
  mealPlanId: string
  onUpdate: () => void
}

export default function MealPlanBuilder({ mealPlanId, onUpdate }: MealPlanBuilderProps) {
  const theme = {
    text: 'fc-text-primary',
    textSecondary: 'fc-text-subtle',
    border: 'border-[color:var(--fc-glass-border)]',
    card: 'fc-glass fc-card',
    shadow: '',
    primary: 'fc-btn fc-btn-primary fc-press'
  }
  
  const [meals, setMeals] = useState<Meal[]>([])
  const [showMealForm, setShowMealForm] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState('')
  const [loading, setLoading] = useState(false)
  const [showNutritionSummary, setShowNutritionSummary] = useState(true)
  const [showMealDetails, setShowMealDetails] = useState<Record<string, boolean>>({})

  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' }
  ]

  const toggleMealDetails = (mealId: string) => {
    setShowMealDetails(prev => ({
      ...prev,
      [mealId]: !prev[mealId]
    }))
  }

  const loadMeals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select(`
          *,
          meal_food_items (
            *,
            foods (*)
          )
        `)
        .eq('meal_plan_id', mealPlanId)
        .order('order_index')

      if (error) throw error

      // Calculate totals for each meal
      const mealsWithTotals = data?.map(meal => {
        const foodItems = meal.meal_food_items.map((item: any) => ({
          ...item,
          food_name: item.foods.name,
          calories: (item.foods.calories_per_serving * item.quantity) / item.foods.serving_size,
          protein: (item.foods.protein * item.quantity) / item.foods.serving_size,
          carbs: (item.foods.carbs * item.quantity) / item.foods.serving_size,
          fat: (item.foods.fat * item.quantity) / item.foods.serving_size,
          fiber: (item.foods.fiber * item.quantity) / item.foods.serving_size
        }))

        const totals = foodItems.reduce((acc: any, item: any) => ({
          calories: acc.calories + item.calories,
          protein: acc.protein + item.protein,
          carbs: acc.carbs + item.carbs,
          fat: acc.fat + item.fat,
          fiber: acc.fiber + item.fiber
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })

        return {
          ...meal,
          food_items: foodItems,
          totals
        }
      }) || []

      setMeals(mealsWithTotals)
    } catch (error) {
      console.error('Error loading meals:', error)
    }
  }, [mealPlanId])

  useEffect(() => {
    loadMeals()
  }, [loadMeals])

  const handleAddMeal = (mealType: string) => {
    setSelectedMealType(mealType)
    setShowMealForm(true)
  }

  const handleMealSaved = () => {
    setShowMealForm(false)
    setSelectedMealType('')
    loadMeals()
    onUpdate()
  }

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm('Are you sure you want to delete this meal?')) return

    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId)

      if (error) throw error
      loadMeals()
      onUpdate()
    } catch (error) {
      console.error('Error deleting meal:', error)
    }
  }

  // Calculate daily totals
  const dailyTotals = meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.totals.calories,
    protein: acc.protein + meal.totals.protein,
    carbs: acc.carbs + meal.totals.carbs,
    fat: acc.fat + meal.totals.fat,
    fiber: acc.fiber + meal.totals.fiber
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })

  const getMealsByType = (type: string) => meals.filter(meal => meal.meal_type === type)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className={`${theme.card} ${theme.shadow} rounded-3xl border ${theme.border} p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="fc-icon-tile fc-icon-workouts">
              <Utensils className={`w-6 h-6 ${theme.text}`} />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${theme.text}`}>Meal Plan Builder</h2>
              <p className={`text-sm ${theme.textSecondary} mt-1`}>
                Design comprehensive meal plans with nutritional tracking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNutritionSummary(!showNutritionSummary)}
              className="fc-btn fc-btn-secondary fc-press"
            >
              {showNutritionSummary ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showNutritionSummary ? 'Hide' : 'Show'} Summary
            </Button>
          </div>
        </div>
      </div>

      {/* Daily Nutrition Summary */}
      {showNutritionSummary && (
        <div className={`${theme.card} border ${theme.border} rounded-2xl`}>
          <div className="p-6 border-b border-[color:var(--fc-glass-border)]">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-workouts">
                <Calculator className="w-5 h-5" />
              </div>
              <h3 className={`text-xl font-bold ${theme.text}`}>Daily Nutrition Summary</h3>
            </div>
          </div>
          <div className="p-6 pt-0">
            <div className={`p-6 border ${theme.border} rounded-2xl fc-glass-soft`}>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${theme.text}`}>{dailyTotals.calories.toFixed(0)}</div>
                  <div className={`text-sm ${theme.textSecondary}`}>Calories</div>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${theme.text}`}>{dailyTotals.protein.toFixed(1)}g</div>
                  <div className={`text-sm ${theme.textSecondary}`}>Protein</div>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${theme.text}`}>{dailyTotals.carbs.toFixed(1)}g</div>
                  <div className={`text-sm ${theme.textSecondary}`}>Carbs</div>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${theme.text}`}>{dailyTotals.fat.toFixed(1)}g</div>
                  <div className={`text-sm ${theme.textSecondary}`}>Fat</div>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${theme.text}`}>{dailyTotals.fiber.toFixed(1)}g</div>
                  <div className={`text-sm ${theme.textSecondary}`}>Fiber</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meal Types */}
      <div className="space-y-6">
        {mealTypes.map(mealType => {
          const typeMeals = getMealsByType(mealType.value)
          const mealTypeColors = {
            breakfast: { icon: 'fc-text-warning' },
            lunch: { icon: 'fc-text-success' },
            dinner: { icon: 'fc-text-workouts' },
            snack: { icon: 'fc-text-subtle' }
          }
          const colors = mealTypeColors[mealType.value as keyof typeof mealTypeColors] || mealTypeColors.breakfast
          
          return (
            <div key={mealType.value} className={`${theme.card} border ${theme.border} rounded-2xl`}>
              <div className="p-6 border-b border-[color:var(--fc-glass-border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="fc-icon-tile fc-icon-workouts">
                      <Utensils className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${theme.text}`}>{mealType.label}</h3>
                      <p className={`text-sm ${theme.textSecondary}`}>
                        {typeMeals.length} meal{typeMeals.length !== 1 ? 's' : ''} • {typeMeals.reduce((sum, meal) => sum + meal.totals.calories, 0).toFixed(0)} calories
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddMeal(mealType.value)}
                    className="fc-btn fc-btn-primary fc-press rounded-xl flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add {mealType.label}
                  </Button>
                </div>
              </div>

              <div className="p-6 pt-0">
                {typeMeals.length === 0 ? (
                  <div className="text-center py-12 fc-text-subtle">
                    <div className="p-4 rounded-2xl fc-glass-soft border border-[color:var(--fc-glass-border)] inline-block mb-4">
                      <Utensils className={`w-12 h-12 ${colors.icon}`} />
                    </div>
                    <h3 className={`text-lg font-bold ${theme.text} mb-2`}>No {mealType.label.toLowerCase()} meals yet</h3>
                    <p className={`text-sm ${theme.textSecondary} mb-4`}>
                      Start building your meal plan by adding {mealType.label.toLowerCase()} meals
                    </p>
                    <Button
                      onClick={() => handleAddMeal(mealType.value)}
                      className="fc-btn fc-btn-primary fc-press rounded-xl"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First {mealType.label}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {typeMeals.map(meal => (
                      <div
                        key={meal.id}
                        className="p-6 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl transition-all duration-200 fc-hover-rise"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className={`text-lg font-bold ${theme.text}`}>{meal.name}</h4>
                              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                                {meal.totals.calories.toFixed(0)} cal
                              </span>
                            </div>
                            
                            {/* Food Items */}
                            <div className="space-y-2 mb-4">
                              {meal.food_items.slice(0, showMealDetails[meal.id] ? meal.food_items.length : 3).map((item, index) => (
                                <div key={index} className={`flex items-center justify-between text-sm ${theme.textSecondary}`}>
                                  <span>
                                    {item.quantity} {item.unit} {item.food_name}
                                  </span>
                                  <span className={`${theme.textSecondary}`}>
                                    {item.calories.toFixed(0)} cal
                                  </span>
                                </div>
                              ))}
                              {meal.food_items.length > 3 && !showMealDetails[meal.id] && (
                                <div className={`text-sm ${theme.textSecondary} italic`}>
                                  +{meal.food_items.length - 3} more items
                                </div>
                              )}
                            </div>

                            {/* Meal Totals */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="fc-pill fc-pill-glass fc-text-subtle text-xs">
                                {meal.totals.protein.toFixed(1)}g protein
                              </span>
                              <span className="fc-pill fc-pill-glass fc-text-subtle text-xs">
                                {meal.totals.carbs.toFixed(1)}g carbs
                              </span>
                              <span className="fc-pill fc-pill-glass fc-text-subtle text-xs">
                                {meal.totals.fat.toFixed(1)}g fat
                              </span>
                              <span className="fc-pill fc-pill-glass fc-text-subtle text-xs">
                                {meal.totals.fiber.toFixed(1)}g fiber
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                            {meal.food_items.length > 3 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleMealDetails(meal.id)}
                                className="p-2 rounded-xl transition-all duration-200 fc-text-subtle hover:fc-text-primary hover:bg-[color:var(--fc-glass-border)]/30"
                              >
                                {showMealDetails[meal.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteMeal(meal.id)}
                              className="p-2 rounded-xl transition-all duration-200 fc-text-error hover:bg-[color:var(--fc-status-error)]/10"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Meal Form Modal */}
      {showMealForm && (
        <MealForm
          mealPlanId={mealPlanId}
          mealType={selectedMealType}
          onSave={handleMealSaved}
          onCancel={() => {
            setShowMealForm(false)
            setSelectedMealType('')
          }}
        />
      )}
    </div>
  )
}
