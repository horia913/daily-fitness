import { supabase } from './supabase'

export interface MealPlan {
  id: string
  name: string
  description?: string
  target_calories?: number
  coach_id: string
  difficulty_level?: string
  is_active: boolean
  created_at: string
  updated_at: string
  category?: string
  meal_count?: number
  usage_count?: number
  // Calculated fields
  actual_calories?: number
  actual_protein?: number
  actual_carbs?: number
  actual_fat?: number
  actual_fiber?: number
}

export interface Food {
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
  sodium: number
  category: string
  created_at: string
  updated_at: string
}

export interface MealItem {
  id: string
  meal_plan_id: string
  food_id: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  quantity: number
  notes?: string
  created_at: string
  food?: Food // populated when fetching
}

export interface Meal {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  day_of_week?: number
  items: MealItem[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  total_fiber: number
}

export class MealPlanService {
  // Food database methods
  static async getFoods(): Promise<Food[]> {
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching foods:', error)
      throw error
    }

    return data || []
  }

  static async searchFoods(query: string): Promise<Food[]> {
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true })
      .limit(20)

    if (error) {
      console.error('Error searching foods:', error)
      throw error
    }

    return data || []
  }

  static async createFood(foodData: Omit<Food, 'id' | 'created_at' | 'updated_at'>): Promise<Food> {
    const { data, error } = await supabase
      .from('foods')
      .insert([foodData])
      .select()
      .single()

    if (error) {
      console.error('Error creating food:', error)
      throw error
    }

    return data
  }

  // Meal plan methods
  static async getMealPlans(coachId: string): Promise<MealPlan[]> {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('coach_id', coachId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching meal plans:', error)
      throw error
    }

    return data || []
  }

  static async createMealPlan(mealPlanData: Omit<MealPlan, 'id' | 'created_at' | 'updated_at' | 'actual_calories' | 'actual_protein' | 'actual_carbs' | 'actual_fat' | 'actual_fiber'>): Promise<MealPlan> {
    // Start with minimal required fields
    const insertData: Record<string, unknown> = {
      name: mealPlanData.name
    }

    // Add optional fields only if they exist
    if (mealPlanData.target_calories !== undefined) {
      insertData.target_calories = mealPlanData.target_calories
    }
    if (mealPlanData.coach_id) {
      insertData.coach_id = mealPlanData.coach_id
    }
    if (mealPlanData.difficulty_level) {
      insertData.difficulty_level = mealPlanData.difficulty_level
    }
    if (mealPlanData.is_active !== undefined) {
      insertData.is_active = mealPlanData.is_active
    }

    const { data, error } = await supabase
      .from('meal_plans')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Error creating meal plan:', error)
      throw error
    }

    return data
  }

  static async updateMealPlan(id: string, updates: Partial<MealPlan>): Promise<MealPlan> {
    const { data, error } = await supabase
      .from('meal_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating meal plan:', error)
      throw error
    }

    return data
  }

  static async deleteMealPlan(id: string): Promise<void> {
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting meal plan:', error)
      throw error
    }
  }

  // Meal item management methods
  static async getMealItems(mealPlanId: string): Promise<MealItem[]> {
    try {
      const { data, error } = await supabase
        .from('meal_plan_items')
        .select(`
          id,
          meal_plan_id,
          food_id,
          meal_type,
          quantity,
          notes,
          created_at,
          foods!inner(id, name, brand, serving_size, serving_unit, calories_per_serving, protein, carbs, fat, fiber, sodium, category, created_at, updated_at)
        `)
        .eq('meal_plan_id', mealPlanId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching meal items:', error);
        throw error; // Re-throw to be caught by caller or handled by UI
      }

      // Transform the data to match our interface
      const transformedData = (data || []).map(item => ({
        ...item,
        food: item.foods as unknown as Food
      })) as MealItem[];
      
      return transformedData;
    } catch (error) {
      console.error('getMealItems failed:', error);
      return [];
    }
  }

  static async addMealItem(mealPlanId: string, mealItemData: Omit<MealItem, 'id' | 'meal_plan_id' | 'created_at'> & { coach_id: string }): Promise<MealItem | null> {
    try {
      const { data, error } = await supabase
        .from('meal_plan_items')
        .insert([{
      meal_plan_id: mealPlanId,
      food_id: mealItemData.food_id,
      meal_type: mealItemData.meal_type,
      quantity: mealItemData.quantity,
      notes: mealItemData.notes,
          coach_id: mealItemData.coach_id
        }])
        .select('*, foods!inner(*)') // Select all fields including the joined food data
        .single();

      if (error) {
        console.error('Error adding meal item:', error);
        throw error; // Re-throw to be caught by caller or handled by UI
      }
      return {
        ...data,
        food: data.foods as unknown as Food
      } as MealItem;
    } catch (error) {
      console.error('addMealItem failed:', error);
      return null;
    }
  }

  static async updateMealItem(mealItemId: string, updates: Partial<MealItem>): Promise<MealItem | null> {
    try {
      const { data, error } = await supabase
        .from('meal_plan_items')
        .update(updates)
        .eq('id', mealItemId)
        .select('*, foods!inner(*)') // Select all fields including the joined food data
        .single();

      if (error) {
        console.error('Error updating meal item:', error);
        throw error; // Re-throw to be caught by caller or handled by UI
      }
      return {
        ...data,
        food: data.foods as unknown as Food
      } as MealItem;
    } catch (error) {
      console.error('updateMealItem failed:', error);
      return null;
    }
  }

  static async deleteMealItem(mealItemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meal_plan_items')
        .delete()
        .eq('id', mealItemId);

      if (error) {
        console.error('Error deleting meal item:', error);
        throw error; // Re-throw to be caught by caller or handled by UI
      }
      return true;
    } catch (error) {
      console.error('deleteMealItem failed:', error);
      return false;
    }
  }

  // Calculate meal totals from food items
  static calculateMealTotals(items: MealItem[]): Omit<Meal, 'meal_type' | 'day_of_week' | 'items'> {
    return items.reduce((totals, item) => {
      if (!item.food) return totals
      
      const multiplier = item.quantity / item.food.serving_size
      return {
        total_calories: totals.total_calories + (item.food.calories_per_serving * multiplier),
        total_protein: totals.total_protein + (item.food.protein * multiplier),
        total_carbs: totals.total_carbs + (item.food.carbs * multiplier),
        total_fat: totals.total_fat + (item.food.fat * multiplier),
        total_fiber: totals.total_fiber + (item.food.fiber * multiplier)
      }
    }, {
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0,
      total_fiber: 0
    })
  }

  // Get meals grouped by type and day
  static async getMeals(mealPlanId: string): Promise<Meal[]> {
    const items = await this.getMealItems(mealPlanId)
    
    // Group items by meal_type and day_of_week
    const groupedMeals = new Map<string, MealItem[]>()
    
    items.forEach(item => {
      // Group by meal_type only since we removed day_of_week
      const key = item.meal_type
      if (!groupedMeals.has(key)) {
        groupedMeals.set(key, [])
      }
      groupedMeals.get(key)!.push(item)
    })
    
    // Convert to Meal objects with calculated totals
    return Array.from(groupedMeals.entries()).map(([meal_type, mealItems]) => {
      const totals = this.calculateMealTotals(mealItems)
      
      return {
        meal_type: meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        day_of_week: undefined, // We removed day_of_week support
        items: mealItems,
        ...totals
      }
    })
  }

  // Meal Plan Assignment functions
  static async assignMealPlanToClients(mealPlanId: string, clientIds: string[], coachId: string): Promise<void> {
    // For each client, deactivate existing active meal plans before assigning new one
    for (const clientId of clientIds) {
      await supabase
        .from('meal_plan_assignments')
        .update({ is_active: false })
        .eq('client_id', clientId)
        .eq('is_active', true)
    }

    const assignments = clientIds.map(clientId => ({
      meal_plan_id: mealPlanId,
      client_id: clientId,
      coach_id: coachId,
      start_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      is_active: true // Ensure assignment is active by default
    }))

    const { error } = await supabase
      .from('meal_plan_assignments')
      .insert(assignments)

    if (error) {
      console.error('Error assigning meal plan:', error)
      throw error
    }

    // Dispatch event to refresh assignment counts
    console.log('📢 Dispatching meal plan assignment event for clients:', clientIds)
    clientIds.forEach(clientId => {
      console.log('📢 Dispatching event for client:', clientId)
      window.dispatchEvent(new CustomEvent('assignmentMade', {
        detail: { clientId, type: 'mealPlan' }
      }))
      
      // Also use localStorage as backup (works across tabs)
      localStorage.setItem('assignmentMade', JSON.stringify({ 
        clientId, 
        type: 'mealPlan',
        timestamp: Date.now()
      }))
    })
  }
}