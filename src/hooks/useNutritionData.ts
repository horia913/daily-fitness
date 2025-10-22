'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { cache, PrefetchService } from '@/lib/prefetch'

interface Food {
  id: string
  name: string
  brand: string
  serving_size: number
  serving_unit: string
  calories_per_serving: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  category: string
}

interface MealLog {
  id: string
  client_id: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  logged_at: string
  foods: Array<{
    food: Food
    quantity: number
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }>
  totals: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
}

interface DailyNutrition {
  date: string
  meals: MealLog[]
  totals: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  goals: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
}

export function useFoodLibrary() {
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadFoods = async () => {
      setLoading(true)
      setError(null)
      const cacheKey = 'food_library_global'

      try {
        // Try to get from cache first
        const cachedData = cache.get<Food[]>(cacheKey)
        if (cachedData) {
          setFoods(cachedData)
          setLoading(false)
          
          // Trigger background refresh
          PrefetchService.prefetchFoodLibrary()
          return
        }

        // Fetch fresh data
        const { data, error } = await supabase
          .from('foods')
          .select('*')
          .order('name')
          .limit(200)

        if (error) throw error

        // Cache the data
        cache.set(cacheKey, data || [], 15 * 60 * 1000) // 15 minutes TTL
        setFoods(data || [])
      } catch (err) {
        console.error('Error loading foods:', err)
        setError(err as Error)
        
        // Fallback to sample data
        const sampleFoods = [
          {
            id: '1',
            name: 'Chicken breast, skinless, boneless, raw',
            brand: 'USDA',
            serving_size: 100,
            serving_unit: 'g',
            calories_per_serving: 165,
            protein: 31.0,
            carbs: 0,
            fat: 3.6,
            fiber: 0,
            category: 'Protein'
          },
          {
            id: '2',
            name: 'Brown rice, long-grain, cooked',
            brand: 'USDA',
            serving_size: 100,
            serving_unit: 'g',
            calories_per_serving: 111,
            protein: 2.6,
            carbs: 23.0,
            fat: 0.9,
            fiber: 1.8,
            category: 'Grains'
          }
        ]
        setFoods(sampleFoods)
      } finally {
        setLoading(false)
      }
    }

    loadFoods()
  }, [])

  return { foods, loading, error }
}

export function useDailyNutrition(userId: string, date: string) {
  const [dailyNutrition, setDailyNutrition] = useState<DailyNutrition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) return

    const loadDailyNutrition = async () => {
      setLoading(true)
      setError(null)
      const cacheKey = `nutrition_${userId}_${date}`

      try {
        // Try to get from cache first
        const cachedData = cache.get<DailyNutrition>(cacheKey)
        if (cachedData) {
          setDailyNutrition(cachedData)
          setLoading(false)
          
          // Trigger background refresh for next time
          PrefetchService.prefetchNutritionData(userId, date)
          return
        }

        // Fetch fresh data
        const { data: mealLogsData, error: mealLogsError } = await supabase
          .from('meal_logs')
          .select(`
            *,
            foods:meal_food_items(
              food:foods(*),
              quantity,
              calories,
              protein,
              carbs,
              fat,
              fiber
            )
          `)
          .eq('client_id', userId)
          .eq('logged_at', date)

        if (mealLogsError) throw mealLogsError

        // Calculate daily totals
        const meals = mealLogsData || []
        const totals = meals.reduce((acc, meal) => ({
          calories: acc.calories + (meal.totals?.calories || 0),
          protein: acc.protein + (meal.totals?.protein || 0),
          carbs: acc.carbs + (meal.totals?.carbs || 0),
          fat: acc.fat + (meal.totals?.fat || 0),
          fiber: acc.fiber + (meal.totals?.fiber || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })

        const goals = {
          calories: 2000,
          protein: 150,
          carbs: 250,
          fat: 65,
          fiber: 25
        }

        const nutritionData = {
          date,
          meals,
          totals,
          goals
        }

        // Cache the data
        cache.set(cacheKey, nutritionData, 2 * 60 * 1000) // 2 minutes TTL
        setDailyNutrition(nutritionData)
      } catch (err) {
        console.error('Error loading daily nutrition:', err)
        setError(err as Error)
        
        // Set fallback data
        setDailyNutrition({
          date,
          meals: [],
          totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
          goals: { calories: 2000, protein: 150, carbs: 250, fat: 65, fiber: 25 }
        })
      } finally {
        setLoading(false)
      }
    }

    loadDailyNutrition()
  }, [userId, date])

  return { dailyNutrition, loading, error }
}

export function useNutritionGoals(userId: string) {
  // This could be expanded to fetch user-specific goals from the database
  // For now, returning default goals
  return {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
    fiber: 25
  }
}
