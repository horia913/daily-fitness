"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Button } from "@/components/ui/button";
import { Plus, Camera, CheckCircle, Droplet, Image, Info } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { uploadMealPhoto } from "@/lib/mealPhotoService";
import MealCardWithOptions, { 
  type MealWithOptionsDisplay, 
  type MealOptionDisplay, 
  type MealFoodItemDisplay 
} from "@/components/client/MealCardWithOptions";

interface NutritionData {
  calories: { consumed: number; goal: number };
  protein: { consumed: number; goal: number };
  carbs: { consumed: number; goal: number };
  fat: { consumed: number; goal: number };
  water: { glasses: number; goal: number; ml: number; goalMl: number };
}

interface MealFoodItem {
  food: {
    id: string;
    name: string;
    serving_size: number;
    serving_unit: string;
  };
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  id: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  emoji: string;
  items: MealFoodItem[];
  logged: boolean;
  photoUrl?: string;
  logged_at?: string;
  // Meal Options support
  options?: MealOptionDisplay[];
  loggedOptionId?: string;
}

function NutritionDashboardContent() {
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [nutritionData, setNutritionData] = useState<NutritionData>({
    calories: { consumed: 0, goal: 0 },
    protein: { consumed: 0, goal: 0 },
    carbs: { consumed: 0, goal: 0 },
    fat: { consumed: 0, goal: 0 },
    water: { glasses: 0, goal: 0, ml: 0, goalMl: 0 },
  });

  const [meals, setMeals] = useState<Meal[]>([]);

  const [uploadingMeal, setUploadingMeal] = useState<string | null>(null);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [hasActivePlan, setHasActivePlan] = useState<boolean | null>(null);
  const [hasMealsInPlan, setHasMealsInPlan] = useState<boolean | null>(null);
  const [waterGoalGlasses, setWaterGoalGlasses] = useState<number>(0);
  const [displayedWaterGlasses, setDisplayedWaterGlasses] = useState<number>(1); // Start with 1, expand as needed
  const [waterGoalId, setWaterGoalId] = useState<string | null>(null); // Store goal id for updates
  const [loadingWaterGoal, setLoadingWaterGoal] = useState(false); // Prevent duplicate goal creation

  // Load today's meal logs and water goal
  useEffect(() => {
    if (user) {
      loadTodayMeals();
      loadWaterGoal();
    }
  }, [user]);

  const loadTodayMeals = async () => {
    if (!user?.id) return;

    try {
      setLoadingMeals(true);
      const today = new Date().toISOString().split("T")[0];

      // STEP 1: Get active meal plan assignment with meal plan details
      // Check for active assignments that are within date range (or no end_date)
      // Use .limit(1) instead of .maybeSingle() to handle multiple active assignments
      const { data: assignmentsData, error: assignmentError } = await supabase
        .from("meal_plan_assignments")
        .select(
          `
          meal_plan_id,
          start_date,
          end_date,
          is_active,
          meal_plans (
            id,
            target_calories,
            target_protein,
            target_carbs,
            target_fat
          )
        `
        )
        .eq("client_id", user.id)
        .eq("is_active", true)
        .lte("start_date", today) // Assignment has started
        .or(`end_date.is.null,end_date.gte.${today}`) // No end date OR hasn't ended yet
        .order("start_date", { ascending: false })
        .limit(1); // Get only the most recent active assignment

      // Extract the first assignment (most recent) or null if none found
      const assignment = assignmentsData && assignmentsData.length > 0 ? assignmentsData[0] : null;

      if (assignmentError) {
        console.error("Error loading meal plan assignment:", assignmentError);
        console.error("Assignment error details:", {
          message: assignmentError.message,
          details: assignmentError.details,
          hint: assignmentError.hint,
          code: assignmentError.code
        });
      }

      // Debug: Log assignment query result
      console.log("Meal plan assignment query result:", {
        hasAssignment: !!assignment,
        assignment,
        today,
        error: assignmentError
      });

      if (assignmentError || !assignment) {
        console.log("No active meal plan assignment found for client:", user.id);
        // No active plan – clear meals and zero out today's intake
        setHasActivePlan(false);
        setMeals([]);
        setNutritionData((prev) => ({
          ...prev,
          calories: { consumed: 0, goal: 0 },
          protein: { consumed: 0, goal: 0 },
          carbs: { consumed: 0, goal: 0 },
          fat: { consumed: 0, goal: 0 },
        }));
        setLoadingMeals(false);
        return;
      }

      setHasActivePlan(true);

      // Extract meal plan targets (use 0 if not set - no defaults)
      const mealPlan = assignment.meal_plans as any;
      const targetCalories = mealPlan?.target_calories || 0;
      const targetProtein = mealPlan?.target_protein || 0;
      const targetCarbs = mealPlan?.target_carbs || 0;
      const targetFat = mealPlan?.target_fat || 0;

      // STEP 2: Get all meals in the active meal plan
      const { data: planMeals, error: mealsError } = await supabase
        .from("meals")
        .select("*")
        .eq("meal_plan_id", assignment.meal_plan_id)
        .order("order_index", { ascending: true });

      if (mealsError || !planMeals || planMeals.length === 0) {
        console.error("Error fetching meals or no meals in plan:", mealsError);
        setHasMealsInPlan(false);
        setMeals([]);
        // Active plan but no meals -> zero intake, use meal plan targets (may be 0)
        setNutritionData((prev) => ({
          ...prev,
          calories: { consumed: 0, goal: targetCalories || 0 },
          protein: { consumed: 0, goal: targetProtein || 0 },
          carbs: { consumed: 0, goal: targetCarbs || 0 },
          fat: { consumed: 0, goal: targetFat || 0 },
        }));
        setLoadingMeals(false);
        return;
      }

      setHasMealsInPlan(true);

      const mealsWithData: Meal[] = [];

      // STEP 3: OPTIMIZED - Batch fetch all data at once instead of N+1 queries
      const mealIds = planMeals.map(m => m.id);

      // 3a: Batch fetch ALL meal food items for all meals at once (including meal_option_id)
      const { data: allFoodItems, error: foodError } = await supabase
        .from("meal_food_items")
        .select("id, quantity, unit, food_id, meal_id, meal_option_id")
        .in("meal_id", mealIds);

      if (foodError) {
        console.error("Error fetching meal food items:", foodError);
      }

      // 3b: Batch fetch ALL foods at once (get unique food IDs)
      const uniqueFoodIds = [...new Set((allFoodItems || []).map((item: any) => item.food_id).filter(Boolean))];
      const { data: allFoods, error: foodsError } = await supabase
        .from("foods")
        .select("id, name, serving_size, serving_unit, calories_per_serving, protein, carbs, fat")
        .in("id", uniqueFoodIds);

      if (foodsError) {
        console.error("Error fetching foods:", foodsError);
      }

      // Create a map for quick food lookup
      const foodMap = new Map((allFoods || []).map((food: any) => [food.id, food]));

      // 3c: Batch fetch ALL meal options for all meals at once
      const { data: allMealOptions, error: optionsError } = await supabase
        .from("meal_options")
        .select("*")
        .in("meal_id", mealIds)
        .order("order_index", { ascending: true });

      if (optionsError) {
        console.error("Error fetching meal options:", optionsError);
      }

      // Create a map of meal options grouped by meal_id
      const optionsByMealMap = new Map<string, any[]>();
      (allMealOptions || []).forEach((opt: any) => {
        if (!optionsByMealMap.has(opt.meal_id)) {
          optionsByMealMap.set(opt.meal_id, []);
        }
        optionsByMealMap.get(opt.meal_id)!.push(opt);
      });

      // 3d: Batch fetch ALL photo logs for all meals at once (including meal_option_id)
      const { data: allPhotoLogs } = await supabase
        .from("meal_photo_logs")
        .select("*")
        .in("meal_id", mealIds)
        .eq("client_id", user.id)
        .eq("log_date", today);

      // 3e: Batch fetch ALL completions for all meals at once (backward compatibility)
      const { data: allCompletions } = await supabase
        .from("meal_completions")
        .select("*")
        .in("meal_id", mealIds)
        .eq("client_id", user.id)
        .gte("completed_at", `${today}T00:00:00`)
        .lt("completed_at", `${today}T23:59:59`);

      // Create maps for quick lookup
      const photoLogMap = new Map((allPhotoLogs || []).map((log: any) => [log.meal_id, log]));
      const completionMap = new Map((allCompletions || []).map((comp: any) => [comp.meal_id, comp]));

      // STEP 4: Process meals with batched data
      for (const meal of planMeals) {
        // Get food items for this meal from batched data
        const foodItems = (allFoodItems || []).filter((item: any) => item.meal_id === meal.id);
        
        // Get options for this meal
        const mealOptions = optionsByMealMap.get(meal.id) || [];
        const hasOptions = mealOptions.length > 0;

        // Build options with their food items
        let mealOptionsDisplay: MealOptionDisplay[] = [];
        
        if (hasOptions) {
          // Meal has options - group food items by option
          mealOptionsDisplay = mealOptions.map((option: any) => {
            const optionFoodItems = foodItems.filter((item: any) => item.meal_option_id === option.id);
            
            let optionItems: MealFoodItemDisplay[] = [];
            let optionCalories = 0;
            let optionProtein = 0;
            let optionCarbs = 0;
            let optionFat = 0;
            
            for (const item of optionFoodItems as any[]) {
              const foodData = foodMap.get(item.food_id);
              if (foodData) {
                const servingSize = foodData.serving_size || 1;
                const multiplier = item.quantity / servingSize;
                const calories = (foodData.calories_per_serving || 0) * multiplier;
                const protein = (foodData.protein || 0) * multiplier;
                const carbs = (foodData.carbs || 0) * multiplier;
                const fat = (foodData.fat || 0) * multiplier;
                
                optionCalories += calories;
                optionProtein += protein;
                optionCarbs += carbs;
                optionFat += fat;
                
                optionItems.push({
                  food: {
                    id: foodData.id,
                    name: foodData.name,
                    serving_size: foodData.serving_size,
                    serving_unit: foodData.serving_unit,
                  },
                  quantity: item.quantity,
                  calories,
                  protein,
                  carbs,
                  fat,
                });
              }
            }
            
            return {
              id: option.id,
              name: option.name,
              order_index: option.order_index,
              items: optionItems,
              totals: {
                calories: optionCalories,
                protein: optionProtein,
                carbs: optionCarbs,
                fat: optionFat,
                fiber: 0, // Not tracked in display
              }
            };
          });
        }

        // Build legacy food items (for meals without options)
        let mappedFoodItems: MealFoodItem[] = [];
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        // For legacy meals (no options), use items with meal_option_id = null
        const legacyFoodItems = hasOptions 
          ? [] 
          : foodItems.filter((item: any) => !item.meal_option_id);

        if (legacyFoodItems.length > 0) {
          for (const item of legacyFoodItems as any[]) {
            const foodData = foodMap.get(item.food_id);

            if (foodData) {
              const servingSize = foodData.serving_size || 1;
              const multiplier = item.quantity / servingSize;

              const calories =
                (foodData.calories_per_serving || 0) * multiplier;
              const protein = (foodData.protein || 0) * multiplier;
              const carbs = (foodData.carbs || 0) * multiplier;
              const fat = (foodData.fat || 0) * multiplier;

              totalCalories += calories;
              totalProtein += protein;
              totalCarbs += carbs;
              totalFat += fat;

              mappedFoodItems.push({
                food: {
                  id: foodData.id,
                  name: foodData.name,
                  serving_size: foodData.serving_size,
                  serving_unit: foodData.serving_unit,
                },
                quantity: item.quantity,
                calories,
                protein,
                carbs,
                fat,
              });
            }
          }
        } else if (hasOptions && mealOptionsDisplay.length > 0) {
          // If meal has options, use the first option's totals for the summary
          totalCalories = mealOptionsDisplay[0].totals.calories;
          totalProtein = mealOptionsDisplay[0].totals.protein;
          totalCarbs = mealOptionsDisplay[0].totals.carbs;
          totalFat = mealOptionsDisplay[0].totals.fat;
          mappedFoodItems = mealOptionsDisplay[0].items;
        }

        // Get photo log/completion from maps (no query needed!)
        const photoLog = photoLogMap.get(meal.id) || null;
        const completion = completionMap.get(meal.id) || null;

        // Use photo logs first, fall back to completions (from maps)
        const hasPhotoLog = photoLog !== null;
        const hasCompletion = !hasPhotoLog && completion !== null;

        mealsWithData.push({
          id: meal.id,
          type: meal.meal_type,
          name: meal.name,
          emoji:
            meal.meal_type === "breakfast"
              ? "🍳"
              : meal.meal_type === "lunch"
              ? "🥗"
              : meal.meal_type === "dinner"
              ? "🍽️"
              : "🍎",
          items: mappedFoodItems,
          logged: !!(hasPhotoLog || hasCompletion),
          photoUrl: hasPhotoLog
            ? photoLog.photo_url
            : hasCompletion
            ? completion?.photo_url
            : undefined,
          logged_at: hasPhotoLog
            ? photoLog.created_at
            : hasCompletion
            ? completion?.completed_at
            : undefined,
          // Meal Options support
          options: mealOptionsDisplay.length > 0 ? mealOptionsDisplay : undefined,
          loggedOptionId: hasPhotoLog ? photoLog.meal_option_id : undefined,
        });
      }

      // Update nutrition totals based on LOGGED meals only
      // Set meals state
      setMeals(mealsWithData);

      // Calculate totals from meals array and update goals
      calculateNutritionTotals(
        mealsWithData,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat
      );
    } catch (error) {
      console.error("Error loading meals:", error);
    } finally {
      setLoadingMeals(false);
    }
  };

  const loadWaterGoal = async () => {
    if (!user?.id) return;
    if (loadingWaterGoal) return; // Prevent duplicate calls
    
    setLoadingWaterGoal(true);
    try {
      // Fetch active water intake goal from goals table (including current_value for today's intake)
      const { data: goals, error } = await supabase
        .from("goals")
        .select("id, target_value, target_unit, current_value")
        .eq("client_id", user.id)
        .eq("status", "active")
        .ilike("title", "%Water Intake%")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error loading water goal:", error);
        // If no goal found or error, set goal to 0
        setWaterGoalId(null);
        setWaterGoalGlasses(0);
        setDisplayedWaterGlasses(1); // Show at least 1 glass even if no goal
        setNutritionData((prev) => ({
          ...prev,
          water: { ...prev.water, goal: 0, goalMl: 0, glasses: 0, ml: 0 },
        }));
        return;
      }

      if (!goals || goals.length === 0) {
        // No water goal configured - create one automatically with default values
        console.log("No water goal found - creating default water goal");
        const defaultTargetLiters = 3; // 3 liters (8 glasses) default goal
        const defaultTargetMl = defaultTargetLiters * 1000;
        
        const { data: newGoal, error: createError } = await supabase
          .from("goals")
          .insert({
            client_id: user.id,
            title: "Water Intake",
            description: "Daily water intake goal",
            category: "other",
            target_value: defaultTargetLiters,
            target_unit: "liters",
            current_value: 0,
            status: "active",
            priority: "medium",
            start_date: new Date().toISOString().split("T")[0],
            progress_percentage: 0,
          })
          .select("id, target_value, target_unit, current_value")
          .single();

        if (createError) {
          console.error("Error creating water goal:", createError);
          setWaterGoalId(null);
          setWaterGoalGlasses(0);
          setDisplayedWaterGlasses(1);
          setNutritionData((prev) => ({
            ...prev,
            water: { ...prev.water, goal: 0, goalMl: 0, glasses: 0, ml: 0 },
          }));
          return;
        }

        // Use the newly created goal
        const goalGlasses = Math.ceil(defaultTargetMl / 375); // 8 glasses
        const displayGoalGlasses = Math.min(goalGlasses, 16);
        
        setWaterGoalId(newGoal.id);
        setWaterGoalGlasses(displayGoalGlasses);
        setDisplayedWaterGlasses(Math.max(displayGoalGlasses, 1));
        setNutritionData((prev) => ({
          ...prev,
          water: {
            glasses: 0,
            goal: displayGoalGlasses,
            ml: 0,
            goalMl: defaultTargetMl,
          },
        }));
        console.log("Water goal created successfully:", newGoal.id);
        setLoadingWaterGoal(false);
        return;
      }

      const waterGoal = goals[0];
      console.log("Water goal loaded:", waterGoal.id, "current_value:", waterGoal.current_value);
      setWaterGoalId(waterGoal.id); // Store goal id for updates
      const targetValue = waterGoal.target_value || 0;
      const currentValue = waterGoal.current_value || 0; // Today's water intake (in ml)
      const unit = waterGoal.target_unit?.toLowerCase() || "liters";

      // Convert target_value to milliliters and glasses based on unit
      let goalMl = 0;
      if (unit === "liters" || unit === "l") {
        goalMl = targetValue * 1000; // Convert liters to ml
      } else if (unit === "glasses") {
        goalMl = targetValue * 375; // 375ml per glass
      } else if (unit === "ml" || unit === "milliliters") {
        goalMl = targetValue; // Already in ml
      } else {
        // Default: assume liters
        goalMl = targetValue * 1000;
      }

      const goalGlasses = Math.ceil(goalMl / 375); // Round up to nearest glass
      
      // Cap at 16 glasses (6000ml) for display, but allow tracking up to 16
      const displayGoalGlasses = Math.min(goalGlasses, 16);

      setWaterGoalGlasses(displayGoalGlasses);
      
      // Convert current_value (ml) to glasses for display
      const currentGlasses = Math.floor(currentValue / 375); // 375ml per glass
      const currentMl = currentValue;
      
      // Initialize displayed glasses to max of goal, current, or 1
      setDisplayedWaterGlasses(Math.max(displayGoalGlasses, currentGlasses, 1));
      
      setNutritionData((prev) => ({
        ...prev,
        water: {
          glasses: currentGlasses,
          goal: displayGoalGlasses,
          ml: currentMl,
          goalMl: goalMl,
        },
      }));
    } catch (error) {
      console.error("Error loading water goal:", error);
      setWaterGoalId(null);
      setWaterGoalGlasses(0);
      setDisplayedWaterGlasses(1); // Show at least 1 glass even if no goal
      setNutritionData((prev) => ({
        ...prev,
        water: { ...prev.water, goal: 0, goalMl: 0, glasses: 0, ml: 0 },
      }));
    } finally {
      setLoadingWaterGoal(false);
    }
  };

  const handleWaterGlassClick = async (targetGlasses: number) => {
    console.log("handleWaterGlassClick called with:", targetGlasses, "waterGoalId:", waterGoalId, "user:", user?.id);
    
    if (!user?.id || !waterGoalId) {
      console.log("No goal configured - updating UI state only");
      // No goal configured, just update UI state
      setNutritionData((prev) => {
        const maxGlasses = 16;
        let newGlasses =
          targetGlasses === prev.water.glasses
            ? Math.max(prev.water.glasses - 1, 0)
            : Math.min(targetGlasses, maxGlasses);
        
        if (newGlasses > displayedWaterGlasses && newGlasses <= maxGlasses) {
          setDisplayedWaterGlasses(newGlasses);
        }
        
        const newMl = newGlasses * 375;
        return {
          ...prev,
          water: { ...prev.water, glasses: newGlasses, ml: newMl },
        };
      });
      return;
    }

    try {
      console.log("Saving water intake to database...");
      // Store old value for error revert
      const oldGlasses = nutritionData.water.glasses;
      const oldMl = nutritionData.water.ml;
      
      // Allow tracking up to 16 glasses (6000ml max)
      const maxGlasses = 16;
      // If clicking the same number of glasses, remove one
      let newGlasses =
        targetGlasses === oldGlasses
          ? Math.max(oldGlasses - 1, 0)
          : Math.min(targetGlasses, maxGlasses); // Cap at 16 glasses
      
      // Expand displayed glasses if user clicks beyond current display (up to 16)
      if (newGlasses > displayedWaterGlasses && newGlasses <= maxGlasses) {
        setDisplayedWaterGlasses(newGlasses);
      }
      
      const newMl = newGlasses * 375; // 375ml per glass
      
      console.log("Updating UI state - newGlasses:", newGlasses, "newMl:", newMl);
      // Update UI state immediately (optimistic update)
      setNutritionData((prev) => ({
        ...prev,
        water: { ...prev.water, glasses: newGlasses, ml: newMl },
      }));

      console.log("Saving to database - goalId:", waterGoalId, "newMl:", newMl);
      // Save to database (goals table current_value in ml)
      const { data: updateData, error: updateError } = await supabase
        .from("goals")
        .update({
          current_value: newMl, // Store in ml
          progress_percentage: waterGoalGlasses > 0 
            ? Math.min((newGlasses / waterGoalGlasses) * 100, 100)
            : 0,
          status: waterGoalGlasses > 0 && newGlasses >= waterGoalGlasses ? "completed" : "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", waterGoalId)
        .select("id, current_value");

      if (updateError) {
        console.error("Error updating water intake:", updateError);
        // Revert UI state on error (restore old values)
        setNutritionData((prev) => ({
          ...prev,
          water: { ...prev.water, glasses: oldGlasses, ml: oldMl },
        }));
        alert("Failed to save water intake. Please try again.");
      } else {
        console.log("Water intake saved successfully! Response:", updateData);
        if (!updateData || updateData.length === 0) {
          console.warn("Update succeeded but no rows were updated - goal might not exist or permissions issue");
        } else {
          console.log("Updated goal:", updateData[0]);
        }
      }
    } catch (error) {
      console.error("Error in handleWaterGlassClick:", error);
      alert("Failed to save water intake. Please try again.");
    }
  };

  // Helper function to build meal description from food items
  const getMealDescription = (meal: Meal): string => {
    if (meal.items.length === 0) return "";
    return meal.items
      .map((item) => item.food?.name || "Unknown Food")
      .join(", ");
  };

  // Helper function to get meal calories
  const getMealCalories = (meal: Meal): number => {
    return meal.items.reduce((sum, item) => sum + item.calories, 0);
  };

  // Helper function to format time from timestamp
  const formatTime = (timestamp?: string): string => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Helper function to get logged meals count
  const getLoggedMealsCount = (): number => {
    return meals.filter((m) => m.logged).length;
  };

  // Helper function to calculate and update nutrition totals from meals array
  // If goals are provided, updates them; otherwise preserves existing goals from state
  const calculateNutritionTotals = (
    mealsArray: Meal[],
    targetCalories?: number,
    targetProtein?: number,
    targetCarbs?: number,
    targetFat?: number
  ) => {
    const totalCalories = mealsArray.reduce(
      (sum, meal) =>
        meal.logged
          ? sum + meal.items.reduce((itemSum, item) => itemSum + item.calories, 0)
          : sum,
      0
    );
    const totalProtein = mealsArray.reduce(
      (sum, meal) =>
        meal.logged
          ? sum + meal.items.reduce((itemSum, item) => itemSum + item.protein, 0)
          : sum,
      0
    );
    const totalCarbs = mealsArray.reduce(
      (sum, meal) =>
        meal.logged
          ? sum + meal.items.reduce((itemSum, item) => itemSum + item.carbs, 0)
          : sum,
      0
    );
    const totalFat = mealsArray.reduce(
      (sum, meal) =>
        meal.logged
          ? sum + meal.items.reduce((itemSum, item) => itemSum + item.fat, 0)
          : sum,
      0
    );

    // Update nutrition data
    // If goals provided, use them; otherwise preserve existing goals from state
    setNutritionData((prev) => ({
      ...prev,
      calories: {
        consumed: totalCalories,
        goal: targetCalories !== undefined ? targetCalories : prev.calories.goal,
      },
      protein: {
        consumed: totalProtein,
        goal: targetProtein !== undefined ? targetProtein : prev.protein.goal,
      },
      carbs: {
        consumed: totalCarbs,
        goal: targetCarbs !== undefined ? targetCarbs : prev.carbs.goal,
      },
      fat: {
        consumed: totalFat,
        goal: targetFat !== undefined ? targetFat : prev.fat.goal,
      },
    }));
  };

  const handleMealPhotoUpload = async (mealId: string, mealType: string) => {
    if (!user) return;

    // Check if already logged today for THIS SPECIFIC MEAL
    const meal = meals.find((m) => m.id === mealId);
    if (meal?.logged) {
      alert(
        `Photo already uploaded for ${meal.name} today. Each meal can have one photo per day.`
      );
      return;
    }

    // Create a file input element
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment"; // Use camera on mobile

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploadingMeal(mealId);

      try {
        // Use mealPhotoService to handle upload with constraint enforcement
        const today = new Date().toISOString().split("T")[0];
        const result = await uploadMealPhoto(user.id, mealId, file, today);

        if (!result.success) {
          console.error("Upload failed:", result.error);
          if (
            result.error?.includes("already logged") ||
            result.error?.includes("UNIQUE")
          ) {
            alert(
              `Photo already uploaded for ${
                meal?.name || "this meal"
              } today. Each meal can have one photo per day.`
            );
          } else {
            alert(result.error || "Failed to upload photo. Please try again.");
          }
          setUploadingMeal(null);
          return;
        }

        // Update local state with the logged photo
        if (result.photoLog) {
          setMeals((prev) => {
            const updated = prev.map((meal) =>
              meal.id === mealId
                ? {
                    ...meal,
                    logged: true,
                    photoUrl: result.photoLog!.photo_url,
                    logged_at: result.photoLog!.created_at,
                  }
                : meal
            );
            // Recalculate nutrition totals automatically after meal is logged
            calculateNutritionTotals(updated);
            return updated;
          });
        }

        alert("Meal photo uploaded successfully!");
      } catch (error) {
        console.error("Error processing meal photo:", error);
        alert("Failed to process photo. Please try again.");
      } finally {
        setUploadingMeal(null);
      }
    };

    input.click();
  };

  // Crystal card style helper
  const crystalCardStyle: React.CSSProperties = {
    background: isDark
      ? "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)"
      : "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: isDark
      ? "1px solid rgba(255,255,255,0.1)"
      : "1px solid rgba(0,0,0,0.1)",
    borderRadius: "24px",
    position: "relative" as const,
    overflow: "hidden" as const,
  };

  // Calculate calorie percentage for ring
  const caloriePercent =
    nutritionData.calories.goal > 0
      ? Math.min(
          (nutritionData.calories.consumed / nutritionData.calories.goal) * 100,
          100
        )
      : 0;
  const calorieRemaining = Math.max(
    0,
    nutritionData.calories.goal - nutritionData.calories.consumed
  );

  // Calculate macro percentages
  const proteinPercent =
    nutritionData.protein.goal > 0
      ? Math.min(
          (nutritionData.protein.consumed / nutritionData.protein.goal) * 100,
          100
        )
      : 0;
  const carbsPercent =
    nutritionData.carbs.goal > 0
      ? Math.min(
          (nutritionData.carbs.consumed / nutritionData.carbs.goal) * 100,
          100
        )
      : 0;
  const fatPercent =
    nutritionData.fat.goal > 0
      ? Math.min(
          (nutritionData.fat.consumed / nutritionData.fat.goal) * 100,
          100
        )
      : 0;

  // Format date
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <div className="relative z-10 container mx-auto px-6 md:px-8 py-6 md:py-8 pb-32 max-w-6xl">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] fc-text-dim mb-2">
              Nutrition Overview
            </p>
            <h1 className="text-3xl font-bold tracking-tight fc-text-primary">
              Nutrition Tracking
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium uppercase tracking-widest fc-text-dim">
                {formattedDate}
              </span>
              {hasActivePlan && meals.length > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                  <span className="text-sm font-semibold fc-text-meals">
                    {getLoggedMealsCount()} of {meals.length} meals logged
                  </span>
                </>
              )}
            </div>
          </div>
          <Link href="/client/nutrition/foods/create">
            <Button
              variant="success"
              className="h-12 px-8 rounded-xl flex items-center justify-center gap-2 font-semibold w-full md:w-auto"
            >
              <Plus className="w-5 h-5" />
              Log Food
            </Button>
          </Link>
        </header>

        {/* No Meal Plan Message */}
        {!loadingMeals && hasActivePlan === false && (
          <div style={crystalCardStyle} className="p-6 mb-8">
            <div className="text-center">
              <h2
                className={`text-xl font-semibold mb-2 ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                No Meal Plan Assigned
              </h2>
              <p
                className={`text-sm ${
                  isDark ? "text-neutral-400" : "text-neutral-600"
                }`}
              >
                Contact your coach to get a meal plan assigned to start tracking
                your nutrition.
              </p>
            </div>
          </div>
        )}

        {/* Nutrition Summary Grid - only show if there is an active meal plan */}
        {loadingMeals ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div style={crystalCardStyle} className="p-6">
              <div className="animate-pulse space-y-3">
                <div
                  className={`h-4 rounded w-1/2 ${
                    isDark ? "bg-white/10" : "bg-slate-200"
                  }`}
                />
                <div
                  className={`h-24 rounded ${
                    isDark ? "bg-white/10" : "bg-slate-200"
                  }`}
                />
              </div>
            </div>
            <div style={crystalCardStyle} className="p-6">
              <div className="animate-pulse space-y-3">
                <div
                  className={`h-4 rounded w-1/3 ${
                    isDark ? "bg-white/10" : "bg-slate-200"
                  }`}
                />
                <div
                  className={`h-20 rounded ${
                    isDark ? "bg-white/10" : "bg-slate-200"
                  }`}
                />
              </div>
            </div>
          </div>
        ) : hasActivePlan ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Calorie Ring Card */}
            <div
              style={crystalCardStyle}
              className="p-6 flex items-center justify-between"
            >
              <div className="flex-1">
                <h3
                  className={`text-xl font-semibold mb-1 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Calories
                </h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span
                    className={`text-3xl font-bold font-mono ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {Math.round(
                      nutritionData.calories.consumed
                    ).toLocaleString()}
                  </span>
                  <span
                    className={`text-sm font-mono ${
                      isDark ? "text-neutral-500" : "text-neutral-500"
                    }`}
                  >
                    / {nutritionData.calories.goal.toLocaleString()} kcal
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Info className="w-4 h-4" />
                  {calorieRemaining.toLocaleString()} kcal remaining
                </div>
              </div>
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={
                      isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
                    }
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="url(#blueGrad)"
                    strokeWidth="10"
                    strokeDasharray={`${264 * (caloriePercent / 100)} 264`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    className="transition-all duration-800 ease-in-out"
                    style={{
                      transform: "rotate(-90deg)",
                      transformOrigin: "50% 50%",
                    }}
                  />
                  <defs>
                    <linearGradient
                      id="blueGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" style={{ stopColor: "#3B82F6" }} />
                      <stop offset="100%" style={{ stopColor: "#2DD4BF" }} />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-bold text-lg font-mono">
                  {Math.round(caloriePercent)}%
                </div>
              </div>
            </div>

            {/* Macro Progress Card */}
            <div style={crystalCardStyle} className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3
                  className={`text-xl font-semibold ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Daily Macros
                </h3>
                <button
                  className={`text-xs font-bold uppercase tracking-widest hover:underline ${
                    isDark ? "text-blue-400" : "text-blue-600"
                  }`}
                >
                  Adjust Goals
                </button>
              </div>
              <div className="space-y-5">
                {/* Protein */}
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span
                      className={
                        isDark ? "text-neutral-300" : "text-neutral-700"
                      }
                    >
                      Protein{" "}
                      <span
                        className={
                          isDark ? "text-neutral-500" : "text-neutral-500"
                        }
                      >
                        ({Math.round(nutritionData.protein.consumed)}g /{" "}
                        {nutritionData.protein.goal}g)
                      </span>
                    </span>
                    <span
                      className={`font-bold font-mono ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {Math.round(proteinPercent)}%
                    </span>
                  </div>
                  <div
                    className={`h-1.5 rounded ${
                      isDark ? "bg-white/5" : "bg-black/5"
                    } overflow-hidden`}
                  >
                    <div
                      className="h-full bg-blue-500 rounded transition-all duration-1000 ease-out"
                      style={{ width: `${proteinPercent}%` }}
                    />
                  </div>
                </div>
                {/* Carbs */}
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span
                      className={
                        isDark ? "text-neutral-300" : "text-neutral-700"
                      }
                    >
                      Carbs{" "}
                      <span
                        className={
                          isDark ? "text-neutral-500" : "text-neutral-500"
                        }
                      >
                        ({Math.round(nutritionData.carbs.consumed)}g /{" "}
                        {nutritionData.carbs.goal}g)
                      </span>
                    </span>
                    <span
                      className={`font-bold font-mono ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {Math.round(carbsPercent)}%
                    </span>
                  </div>
                  <div
                    className={`h-1.5 rounded ${
                      isDark ? "bg-white/5" : "bg-black/5"
                    } overflow-hidden`}
                  >
                    <div
                      className="h-full bg-red-500 rounded transition-all duration-1000 ease-out"
                      style={{ width: `${carbsPercent}%` }}
                    />
                  </div>
                </div>
                {/* Fats */}
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span
                      className={
                        isDark ? "text-neutral-300" : "text-neutral-700"
                      }
                    >
                      Fats{" "}
                      <span
                        className={
                          isDark ? "text-neutral-500" : "text-neutral-500"
                        }
                      >
                        ({Math.round(nutritionData.fat.consumed)}g /{" "}
                        {nutritionData.fat.goal}g)
                      </span>
                    </span>
                    <span
                      className={`font-bold font-mono ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {Math.round(fatPercent)}%
                    </span>
                  </div>
                  <div
                    className={`h-1.5 rounded ${
                      isDark ? "bg-white/5" : "bg-black/5"
                    } overflow-hidden`}
                  >
                    <div
                      className="h-full bg-yellow-500 rounded transition-all duration-1000 ease-out"
                      style={{ width: `${fatPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Meals Section */}
        {hasActivePlan && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2
                  className={`text-xl font-semibold ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Today&apos;s Meals
                </h2>
                <p
                  className={`text-xs mt-1 uppercase tracking-tighter ${
                    isDark ? "text-neutral-400" : "text-neutral-500"
                  }`}
                >
                  Upload 1 photo per meal for accountability
                </p>
              </div>
              <Camera
                className={`w-6 h-6 ${
                  isDark ? "text-neutral-600" : "text-neutral-400"
                }`}
              />
            </div>

            {/* Empty state */}
            {!loadingMeals && hasMealsInPlan === false && (
              <div style={crystalCardStyle} className="p-6">
                <p
                  className={`text-sm text-center ${
                    isDark ? "text-neutral-400" : "text-neutral-600"
                  }`}
                >
                  Your active meal plan has no meals configured yet.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {meals.map((meal) => {
                const mealCalories = getMealCalories(meal);
                const mealDescription = getMealDescription(meal);
                const mealTime = formatTime(meal.logged_at);

                // Use MealCardWithOptions for meals with options
                if (meal.options && meal.options.length > 0) {
                  return (
                    <MealCardWithOptions
                      key={meal.id}
                      meal={{
                        id: meal.id,
                        name: meal.name,
                        meal_type: meal.type,
                        emoji: meal.emoji,
                        options: meal.options,
                        logged: meal.logged,
                        loggedOptionId: meal.loggedOptionId,
                        photoUrl: meal.photoUrl,
                        logged_at: meal.logged_at,
                      }}
                      clientId={user?.id || ''}
                      onMealLogged={(mealId, optionId, photoUrl) => {
                        // Update local state when meal is logged
                        setMeals((prev) => {
                          const updated = prev.map((m) =>
                            m.id === mealId
                              ? {
                                  ...m,
                                  logged: true,
                                  photoUrl: photoUrl,
                                  loggedOptionId: optionId || undefined,
                                  logged_at: new Date().toISOString(),
                                }
                              : m
                          );
                          // Recalculate nutrition totals
                          calculateNutritionTotals(updated);
                          return updated;
                        });
                      }}
                    />
                  );
                }

                // Legacy rendering for meals without options
                return (
                  <div
                    key={meal.id}
                    style={crystalCardStyle}
                    className={`flex flex-col h-full ${
                      meal.logged && meal.photoUrl ? "" : "justify-between"
                    }`}
                  >
                    {meal.logged && meal.photoUrl ? (
                      <>
                        {/* Logged Meal with Photo */}
                        <div className="p-5 border-b border-white/5">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{meal.emoji}</span>
                              <h3
                                className={`text-lg font-bold ${
                                  isDark ? "text-white" : "text-slate-900"
                                }`}
                              >
                                {meal.name}
                              </h3>
                            </div>
                            <span
                              className={`text-sm font-bold font-mono ${
                                isDark ? "text-neutral-400" : "text-neutral-500"
                              }`}
                            >
                              {Math.round(mealCalories)} kcal
                            </span>
                          </div>
                          {mealDescription && (
                            <p
                              className={`text-xs mt-1 ${
                                isDark ? "text-neutral-500" : "text-neutral-500"
                              }`}
                            >
                              {mealDescription}
                            </p>
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
                            <div
                              className={`bg-green-500/20 backdrop-blur-md border border-green-500/30 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1`}
                            >
                              <CheckCircle className="w-3 h-3" />
                              {meal.type === "breakfast"
                                ? "Breakfast"
                                : meal.type === "lunch"
                                ? "Lunch"
                                : meal.type === "dinner"
                                ? "Dinner"
                                : "Snack"}{" "}
                              Logged
                            </div>
                            {mealTime && (
                              <span
                                className={`text-[10px] font-mono ${
                                  isDark
                                    ? "text-neutral-300"
                                    : "text-neutral-200"
                                }`}
                              >
                                {mealTime}
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Unlogged Meal */}
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{meal.emoji}</span>
                              <h3
                                className={`text-lg font-bold ${
                                  isDark ? "text-neutral-100" : "text-slate-900"
                                }`}
                              >
                                {meal.name}
                              </h3>
                            </div>
                            <span
                              className={`text-sm font-bold font-mono ${
                                isDark ? "text-neutral-400" : "text-neutral-500"
                              }`}
                            >
                              Not Logged
                            </span>
                          </div>
                          {mealDescription && (
                            <p
                              className={`text-xs mt-1 ${
                                isDark ? "text-neutral-500" : "text-neutral-500"
                              }`}
                            >
                              {mealDescription}
                            </p>
                          )}
                        </div>

                        <div className="mt-8 mb-4 flex flex-col items-center justify-center py-8 bg-white/5 rounded-2xl border border-dashed border-white/10 mx-5">
                          <Image
                            className={`w-8 h-8 mb-2 ${
                              isDark ? "text-neutral-700" : "text-neutral-400"
                            }`}
                          />
                          <p
                            className={`text-xs italic ${
                              isDark ? "text-neutral-500" : "text-neutral-500"
                            }`}
                          >
                            No photo uploaded yet
                          </p>
                        </div>

                        <div className="px-5 pb-5">
                          <Button
                            onClick={() =>
                              handleMealPhotoUpload(meal.id, meal.type)
                            }
                            disabled={uploadingMeal === meal.id}
                            className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/40 transition-all"
                            style={{
                              boxShadow: isDark
                                ? "0 4px 16px rgba(16, 185, 129, 0.2)"
                                : "0 4px 12px rgba(16, 185, 129, 0.2)",
                            }}
                          >
                            {uploadingMeal === meal.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Camera className="w-5 h-5" />
                                Upload{" "}
                                {meal.type === "breakfast"
                                  ? "Breakfast"
                                  : meal.type === "lunch"
                                  ? "Lunch"
                                  : meal.type === "dinner"
                                  ? "Dinner"
                                  : "Snack"}{" "}
                                Photo
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Water Tracker */}
        <section className="mb-12">
          <div
            style={crystalCardStyle}
            className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div>
              <h3
                className={`text-xl font-semibold mb-1 ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Hydration
              </h3>
              <p
                className={`text-sm ${
                  isDark ? "text-neutral-400" : "text-neutral-500"
                }`}
              >
                {nutritionData.water.goalMl > 0 ? (
                  <>Daily Goal: {nutritionData.water.goalMl.toLocaleString()}ml ({nutritionData.water.goal} glasses)</>
                ) : (
                  <>No water goal configured. Set your goal in the Habits page.</>
                )}
              </p>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2">
              {/* Interactive glasses - show goal number initially, expand dynamically up to 16 (6000ml) */}
              {Array.from({ length: Math.min(displayedWaterGlasses, 16) }).map((_, index) => {
                const isActive = index < nutritionData.water.glasses;
                const glassNumber = index + 1;
                const isGoalGlass = glassNumber <= waterGoalGlasses;
                return (
                  <button
                    key={index}
                    onClick={() => handleWaterGlassClick(glassNumber)}
                    className={`p-2 rounded-lg transition-all ${
                      isActive
                        ? isGoalGlass
                          ? "bg-blue-500/10 text-blue-400 active:scale-90"
                          : "bg-blue-500/5 text-blue-300 active:scale-90"
                        : "bg-white/5 text-neutral-600 hover:bg-white/10"
                    }`}
                    style={{
                      transform: isActive
                        ? "translateY(-4px) scale(1.1)"
                        : "none",
                    }}
                  >
                    <Droplet className="w-6 h-6" />
                  </button>
                );
              })}
              {/* Show + button if we're at displayed limit but haven't reached max */}
              {displayedWaterGlasses < 16 && nutritionData.water.glasses >= displayedWaterGlasses && (
                <button
                  onClick={() => handleWaterGlassClick(nutritionData.water.glasses + 1)}
                  className="p-2 rounded-lg transition-all bg-white/5 text-neutral-600 hover:bg-white/10 active:scale-90 flex items-center gap-1"
                >
                  <Droplet className="w-6 h-6" />
                  <span className="text-xs">+</span>
                </button>
              )}
            </div>
            <div className="text-right">
              <div
                className={`text-xl font-bold font-mono ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                {nutritionData.water.ml.toLocaleString()}ml
              </div>
              <div
                className={`text-[10px] uppercase font-bold tracking-widest ${
                  isDark ? "text-neutral-500" : "text-neutral-500"
                }`}
              >
                Logged
              </div>
            </div>
          </div>
        </section>
      </div>
    </AnimatedBackground>
  );
}

export default function NutritionDashboard() {
  return (
    <ProtectedRoute>
      <NutritionDashboardContent />
    </ProtectedRoute>
  );
}
