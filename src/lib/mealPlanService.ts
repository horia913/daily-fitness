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

// ============================================================================
// Meal Options Types
// ============================================================================

export interface MealOption {
  id: string
  meal_id: string
  name: string
  order_index: number
  created_at: string
}

export interface MealFoodItem {
  id: string
  meal_id: string
  meal_option_id: string | null  // NULL for legacy meals without options
  food_id: string
  quantity: number
  unit: string
  created_at: string
  food?: Food  // populated when fetching
}

export interface MacroTotals {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export interface MealOptionWithFoods extends MealOption {
  food_items: MealFoodItem[]
  totals: MacroTotals
}

export interface MealWithOptions {
  id: string
  meal_plan_id: string
  name: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  order_index: number
  notes?: string
  created_at: string
  updated_at: string
  options: MealOptionWithFoods[]  // Empty array = legacy meal without options
  // For legacy meals, food items are at meal level (no options)
  legacy_food_items?: MealFoodItem[]
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

  // ============================================================================
  // Meal Options Methods
  // ============================================================================

  /**
   * Get all options for a meal
   */
  static async getMealOptions(mealId: string): Promise<MealOption[]> {
    const { data, error } = await supabase
      .from('meal_options')
      .select('*')
      .eq('meal_id', mealId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching meal options:', error)
      throw error
    }

    return data || []
  }

  /**
   * Get a meal with all its options and food items
   */
  static async getMealWithOptions(mealId: string): Promise<MealWithOptions | null> {
    try {
      console.log('[getMealWithOptions] Starting for mealId:', mealId)
      
      // Fetch the meal
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .select('*')
        .eq('id', mealId)
        .single()

      console.log('[getMealWithOptions] Meal result:', { meal, mealError })

      if (mealError || !meal) {
        console.error('Error fetching meal:', mealError)
        return null
      }

      // Fetch all options for this meal
      console.log('[getMealWithOptions] Fetching options...')
      const { data: options, error: optionsError } = await supabase
        .from('meal_options')
        .select('*')
        .eq('meal_id', mealId)
        .order('order_index', { ascending: true })

      console.log('[getMealWithOptions] Options result:', { options, optionsError })

      if (optionsError) {
        console.error('Error fetching meal options:', optionsError)
        throw optionsError
      }

      // Fetch all food items for this meal (both legacy and option-based)
      console.log('[getMealWithOptions] Fetching food items...')
      const { data: allFoodItems, error: foodError } = await supabase
        .from('meal_food_items')
        .select(`
          *,
          foods (*)
        `)
        .eq('meal_id', mealId)

      console.log('[getMealWithOptions] Food items result:', { count: allFoodItems?.length, foodError })

      if (foodError) {
        console.error('Error fetching meal food items:', foodError)
        throw foodError
      }

      // Transform food items
      const transformedFoodItems: MealFoodItem[] = (allFoodItems || []).map(item => ({
        id: item.id,
        meal_id: item.meal_id,
        meal_option_id: item.meal_option_id,
        food_id: item.food_id,
        quantity: item.quantity,
        unit: item.unit,
        created_at: item.created_at,
        food: item.foods as Food
      }))

      // Separate legacy items (no option) from option-based items
      const legacyFoodItems = transformedFoodItems.filter(item => item.meal_option_id === null)
      const optionFoodItems = transformedFoodItems.filter(item => item.meal_option_id !== null)

      // Build options with their food items and totals
      const optionsWithFoods: MealOptionWithFoods[] = (options || []).map(option => {
        const optionItems = optionFoodItems.filter(item => item.meal_option_id === option.id)
        const totals = this.calculateFoodItemTotals(optionItems)
        
        return {
          ...option,
          food_items: optionItems,
          totals
        }
      })

      console.log('[getMealWithOptions] Returning data:', {
        mealId: meal.id,
        optionsCount: optionsWithFoods.length,
        legacyItemsCount: legacyFoodItems.length
      })

      return {
        ...meal,
        options: optionsWithFoods,
        legacy_food_items: legacyFoodItems.length > 0 ? legacyFoodItems : undefined
      }
    } catch (error) {
      console.error('Error in getMealWithOptions:', error)
      return null
    }
  }

  /**
   * Create a new meal option
   * If this is the first option for a meal with existing food items,
   * automatically migrate those items to a "Default" option first.
   */
  static async createMealOption(mealId: string, name: string): Promise<MealOption> {
    console.log('[createMealOption] Starting for mealId:', mealId, 'name:', name)
    
    // Check if meal has existing options
    const existingOptions = await this.getMealOptions(mealId)
    console.log('[createMealOption] Existing options:', existingOptions.length)
    
    // If no existing options, check for legacy food items and migrate them
    if (existingOptions.length === 0) {
      console.log('[createMealOption] No existing options, checking for legacy items...')
      await this.migrateLegacyFoodsToDefaultOption(mealId)
      // Re-fetch options after migration
      const optionsAfterMigration = await this.getMealOptions(mealId)
      console.log('[createMealOption] Options after migration:', optionsAfterMigration.length)
      if (optionsAfterMigration.length > 0) {
        // Default option was created, so this new option goes after it
        const nextIndex = optionsAfterMigration.length
        console.log('[createMealOption] Creating new option at index:', nextIndex)
        const { data, error } = await supabase
          .from('meal_options')
          .insert([{ meal_id: mealId, name, order_index: nextIndex }])
          .select()
          .single()

        if (error) {
          console.error('[createMealOption] Error creating meal option:', error)
          throw error
        }
        console.log('[createMealOption] Created option:', data)
        return data
      }
    }

    // Create the new option with the next order_index
    const nextIndex = existingOptions.length
    console.log('[createMealOption] Creating new option at index:', nextIndex)
    const { data, error } = await supabase
      .from('meal_options')
      .insert([{ meal_id: mealId, name, order_index: nextIndex }])
      .select()
      .single()

    if (error) {
      console.error('[createMealOption] Error creating meal option:', error)
      throw error
    }

    console.log('[createMealOption] Created option:', data)
    return data
  }

  /**
   * Update a meal option
   */
  static async updateMealOption(optionId: string, updates: Partial<Pick<MealOption, 'name' | 'order_index'>>): Promise<MealOption> {
    const { data, error } = await supabase
      .from('meal_options')
      .update(updates)
      .eq('id', optionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating meal option:', error)
      throw error
    }

    return data
  }

  /**
   * Delete a meal option and all its food items
   * Cannot delete if it's the only option (would leave meal in invalid state)
   */
  static async deleteMealOption(optionId: string): Promise<boolean> {
    try {
      // Get the option to find its meal_id
      const { data: option, error: fetchError } = await supabase
        .from('meal_options')
        .select('meal_id')
        .eq('id', optionId)
        .single()

      if (fetchError || !option) {
        console.error('Error fetching option for deletion:', fetchError)
        return false
      }

      // Check how many options exist for this meal
      const { count, error: countError } = await supabase
        .from('meal_options')
        .select('*', { count: 'exact', head: true })
        .eq('meal_id', option.meal_id)

      if (countError) {
        console.error('Error counting options:', countError)
        return false
      }

      // Cannot delete if it's the only option
      if (count && count <= 1) {
        console.error('Cannot delete the only option for a meal')
        return false
      }

      // Delete the option (CASCADE will delete food items)
      const { error: deleteError } = await supabase
        .from('meal_options')
        .delete()
        .eq('id', optionId)

      if (deleteError) {
        console.error('Error deleting meal option:', deleteError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteMealOption:', error)
      return false
    }
  }

  /**
   * Add a food item to a meal option
   */
  static async addFoodToOption(
    mealId: string,
    optionId: string,
    foodId: string,
    quantity: number,
    unit: string
  ): Promise<MealFoodItem | null> {
    try {
      const { data, error } = await supabase
        .from('meal_food_items')
        .insert([{
          meal_id: mealId,
          meal_option_id: optionId,
          food_id: foodId,
          quantity,
          unit
        }])
        .select(`
          *,
          foods (*)
        `)
        .single()

      if (error) {
        console.error('Error adding food to option:', error)
        throw error
      }

      return {
        id: data.id,
        meal_id: data.meal_id,
        meal_option_id: data.meal_option_id,
        food_id: data.food_id,
        quantity: data.quantity,
        unit: data.unit,
        created_at: data.created_at,
        food: data.foods as Food
      }
    } catch (error) {
      console.error('Error in addFoodToOption:', error)
      return null
    }
  }

  /**
   * Remove a food item from an option
   */
  static async removeFoodFromOption(foodItemId: string): Promise<boolean> {
    const { error } = await supabase
      .from('meal_food_items')
      .delete()
      .eq('id', foodItemId)

    if (error) {
      console.error('Error removing food from option:', error)
      return false
    }

    return true
  }

  /**
   * Update a food item quantity/unit in an option
   */
  static async updateFoodInOption(
    foodItemId: string,
    updates: { quantity?: number; unit?: string }
  ): Promise<MealFoodItem | null> {
    try {
      const { data, error } = await supabase
        .from('meal_food_items')
        .update(updates)
        .eq('id', foodItemId)
        .select(`
          *,
          foods (*)
        `)
        .single()

      if (error) {
        console.error('Error updating food in option:', error)
        throw error
      }

      return {
        id: data.id,
        meal_id: data.meal_id,
        meal_option_id: data.meal_option_id,
        food_id: data.food_id,
        quantity: data.quantity,
        unit: data.unit,
        created_at: data.created_at,
        food: data.foods as Food
      }
    } catch (error) {
      console.error('Error in updateFoodInOption:', error)
      return null
    }
  }

  /**
   * Migrate legacy food items (meal_option_id = NULL) to a "Default" option.
   * Called automatically when the first option is added to a meal with existing foods.
   */
  static async migrateLegacyFoodsToDefaultOption(mealId: string): Promise<MealOption | null> {
    try {
      // Check if there are any legacy food items (meal_option_id = NULL)
      const { data: legacyItems, error: fetchError } = await supabase
        .from('meal_food_items')
        .select('id')
        .eq('meal_id', mealId)
        .is('meal_option_id', null)

      if (fetchError) {
        console.error('Error checking legacy food items:', fetchError)
        return null
      }

      // No legacy items to migrate
      if (!legacyItems || legacyItems.length === 0) {
        return null
      }

      // Create a "Default" option
      const { data: defaultOption, error: createError } = await supabase
        .from('meal_options')
        .insert([{ meal_id: mealId, name: 'Default', order_index: 0 }])
        .select()
        .single()

      if (createError || !defaultOption) {
        console.error('Error creating Default option:', createError)
        return null
      }

      // Update all legacy food items to belong to the Default option
      const legacyItemIds = legacyItems.map(item => item.id)
      const { error: updateError } = await supabase
        .from('meal_food_items')
        .update({ meal_option_id: defaultOption.id })
        .in('id', legacyItemIds)

      if (updateError) {
        console.error('Error migrating legacy food items:', updateError)
        // Rollback: delete the default option
        await supabase.from('meal_options').delete().eq('id', defaultOption.id)
        return null
      }

      console.log(`Migrated ${legacyItems.length} legacy food items to Default option for meal ${mealId}`)
      return defaultOption
    } catch (error) {
      console.error('Error in migrateLegacyFoodsToDefaultOption:', error)
      return null
    }
  }

  /**
   * Check if a meal has options
   */
  static async mealHasOptions(mealId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('meal_options')
      .select('*', { count: 'exact', head: true })
      .eq('meal_id', mealId)

    if (error) {
      console.error('Error checking meal options:', error)
      return false
    }

    return (count || 0) > 0
  }

  /**
   * Get option count for a meal (max 5 allowed)
   */
  static async getMealOptionCount(mealId: string): Promise<number> {
    const { count, error } = await supabase
      .from('meal_options')
      .select('*', { count: 'exact', head: true })
      .eq('meal_id', mealId)

    if (error) {
      console.error('Error counting meal options:', error)
      return 0
    }

    return count || 0
  }

  /**
   * Calculate macro totals from food items
   */
  static calculateFoodItemTotals(items: MealFoodItem[]): MacroTotals {
    return items.reduce((totals, item) => {
      if (!item.food) return totals
      
      const multiplier = item.quantity / (item.food.serving_size || 1)
      return {
        calories: totals.calories + (item.food.calories_per_serving * multiplier),
        protein: totals.protein + (item.food.protein * multiplier),
        carbs: totals.carbs + (item.food.carbs * multiplier),
        fat: totals.fat + (item.food.fat * multiplier),
        fiber: totals.fiber + (item.food.fiber * multiplier)
      }
    }, {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    })
  }

  /**
   * Reorder options for a meal
   */
  static async reorderMealOptions(mealId: string, optionIds: string[]): Promise<boolean> {
    try {
      // Update each option's order_index
      for (let i = 0; i < optionIds.length; i++) {
        const { error } = await supabase
          .from('meal_options')
          .update({ order_index: i })
          .eq('id', optionIds[i])
          .eq('meal_id', mealId) // Safety check

        if (error) {
          console.error('Error reordering option:', error)
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Error in reorderMealOptions:', error)
      return false
    }
  }
}