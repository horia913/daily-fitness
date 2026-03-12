"use client";

import React, { useState, useEffect, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Button } from "@/components/ui/button";
import { Droplet, BarChart3, ChevronDown, ChevronUp, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ClientPageShell,
  ClientGlassCard,
  PrimaryButton,
  SecondaryButton,
} from "@/components/client-ui";
import { AddGoalModal } from "@/components/goals/AddGoalModal";
import { CompactGoalCard } from "@/components/goals/CompactGoalCard";
import { useToast } from "@/components/ui/toast-provider";
import {
  completeMeal,
  addPhotoToCompletion,
  undoCompletion,
  getTodayPlanSelection,
  selectPlanForToday,
} from "@/lib/mealCompletionService";
import MealCardWithOptions from "@/components/client/MealCardWithOptions";
import { EmptyState } from "@/components/ui/EmptyState";

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
  options?: MealOptionDisplay[];
  loggedOptionId?: string;
}

interface MealFoodItemDisplay {
  food: { id: string; name: string; serving_size: number; serving_unit: string };
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealOptionDisplay {
  id: string;
  name: string;
  order_index: number;
  items: MealFoodItemDisplay[];
  totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
}

function NutritionDashboardContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const router = useRouter();
  const { addToast } = useToast();

  const [nutritionData, setNutritionData] = useState<NutritionData>({
    calories: { consumed: 0, goal: 0 },
    protein: { consumed: 0, goal: 0 },
    carbs: { consumed: 0, goal: 0 },
    fat: { consumed: 0, goal: 0 },
    water: { glasses: 0, goal: 0, ml: 0, goalMl: 0 },
  });

  const [meals, setMeals] = useState<Meal[]>([]);

  const NUTRITION_LOAD_TIMEOUT_MS = 20000;
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [mealsLoadError, setMealsLoadError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);
  const [hasActivePlan, setHasActivePlan] = useState<boolean | null>(null);
  const [hasMealsInPlan, setHasMealsInPlan] = useState<boolean | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  /** All active assignments (for plan picker when >1). Phase N4. */
  const [activeAssignments, setActiveAssignments] = useState<Array<{
    id: string;
    meal_plan_id: string;
    label?: string | null;
    meal_plans: { id: string; name: string; target_calories?: number; notes?: string } | null;
  }>>([]);
  const [activeMealPlanInfo, setActiveMealPlanInfo] = useState<{
    mealPlanId: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    description?: string;
  } | null>(null);
  const [waterGoalGlasses, setWaterGoalGlasses] = useState<number>(0);
  const [displayedWaterGlasses, setDisplayedWaterGlasses] = useState<number>(1); // Start with 1, expand as needed
  const [waterGoalId, setWaterGoalId] = useState<string | null>(null); // Store goal id for updates
  const [loadingWaterGoal, setLoadingWaterGoal] = useState(false); // Prevent duplicate goal creation

  // E4.1 — Real data for sections 4, 5, 7
  const [nutritionGoals, setNutritionGoals] = useState<{
    id: string;
    title: string;
    target_value: number | string | null;
    target_unit?: string | null;
    current_value?: number | null;
    progress_percentage?: number | null;
    status: string;
  }[]>([]);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [activeGoalsCount, setActiveGoalsCount] = useState(0);
  const [goalsAdherence, setGoalsAdherence] = useState<number | null>(null);
  const [calorieTrendData, setCalorieTrendData] = useState<{ label: string; date: string; calories: number }[]>([]);
  const [recentHistory, setRecentHistory] = useState<
    { label: string; date: string; calories: number; protein: number; completedCount: number }[]
  >([]);
  /** Last 30 days for Nutrition Trends chart */
  const [nutritionTrends, setNutritionTrends] = useState<
    { date: string; calories: number; protein: number; carbs: number; fat: number; targetCalories?: number }[]
  >([]);
  const [nutritionTrendsTarget, setNutritionTrendsTarget] = useState<number | null>(null);
  const [nutritionTrendsMetric, setNutritionTrendsMetric] = useState<"calories" | "protein" | "carbs" | "fat">("calories");
  const [nutritionTrendsOpen, setNutritionTrendsOpen] = useState(false);

  const loadStartedAtRef = useRef<number | null>(null);
  const goalsSectionRef = useRef<HTMLDivElement>(null);

  const runMealsLoadWithTimeout = async () => {
    if (!user?.id) return;
    setMealsLoadError(null);
    setLoadingMeals(true);
    loadStartedAtRef.current = Date.now();
    loadGenerationRef.current = (loadGenerationRef.current ?? 0) + 1;
    const loadId = loadGenerationRef.current;
    try {
      // On retry (after an error), refresh auth so a stale token doesn't cause the same failure
      if (mealsLoadError) {
        try {
          await Promise.race([
            supabase.auth.refreshSession(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("refresh_timeout")), 3000)
            ),
          ]);
        } catch {
          // Proceed with load even if refresh fails or times out
        }
      }
      await Promise.race([
        loadTodayMeals(loadId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), NUTRITION_LOAD_TIMEOUT_MS)
        ),
      ]);
    } catch (err) {
      if (loadId !== loadGenerationRef.current) return;
      setMealsLoadError(
        err instanceof Error && err.message === "timeout"
          ? "Loading took too long. Check your connection."
          : "Could not load nutrition. Please try again."
      );
    } finally {
      if (loadId === loadGenerationRef.current) {
        setLoadingMeals(false);
        loadStartedAtRef.current = null;
      }
    }
    if (loadId === loadGenerationRef.current) {
      loadWaterGoal();
      loadNutritionHistory(loadId);
      loadNutritionTrends(loadId);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    runMealsLoadWithTimeout();
    return () => {
      loadGenerationRef.current = (loadGenerationRef.current ?? 0) + 1;
      setLoadingMeals(false);
      loadStartedAtRef.current = null;
    };
  }, [user?.id]);

  const loadTodayMeals = async (loadId: number) => {
    if (!user?.id) return;
    const isCurrent = () => loadId === loadGenerationRef.current;

    try {
      setLoadingMeals(true);
      const today = new Date().toISOString().split("T")[0];

      // STEP 1 (Phase N4): Load ALL active assignments + today's plan selection
      const [
        { data: assignmentsData, error: assignmentError },
        { data: todaySelectionRow },
      ] = await Promise.all([
        supabase
          .from("meal_plan_assignments")
          .select(
            `
            id,
            meal_plan_id,
            start_date,
            end_date,
            is_active,
            label,
            meal_plans (
              id,
              name,
              notes,
              target_calories,
              target_protein,
              target_carbs,
              target_fat
            )
          `
          )
          .eq("client_id", user.id)
          .eq("is_active", true)
          .lte("start_date", today)
          .or(`end_date.is.null,end_date.gte.${today}`)
          .order("created_at", { ascending: true }),
        supabase
          .from("client_daily_plan_selection")
          .select("meal_plan_assignment_id")
          .eq("client_id", user.id)
          .eq("date", today)
          .maybeSingle(),
      ]);

      if (assignmentError) {
        console.error("Error loading meal plan assignments:", assignmentError);
      }

      const assignmentsList = assignmentsData ?? [];
      const todaySelectionId = todaySelectionRow?.meal_plan_assignment_id ?? null;

      if (assignmentsList.length === 0) {
        if (!isCurrent()) return;
        setActiveAssignmentId(null);
        setActiveMealPlanInfo(null);
        setActiveAssignments([]);
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

      if (!isCurrent()) return;
      setActiveAssignments(assignmentsList as any);

      // Effective assignment: today's selection if valid, else first assignment
      const selectedId =
        todaySelectionId && assignmentsList.some((a: { id: string }) => a.id === todaySelectionId)
          ? todaySelectionId
          : assignmentsList[0].id;
      const assignment = assignmentsList.find((a: { id: string }) => a.id === selectedId) ?? assignmentsList[0];

      setHasActivePlan(true);
      setActiveAssignmentId(assignment.id);
      const mealPlan = assignment.meal_plans as any;
      setActiveMealPlanInfo({
        mealPlanId: assignment.meal_plan_id,
        name: mealPlan?.name || "Active Meal Plan",
        startDate: assignment.start_date || null,
        endDate: assignment.end_date || null,
        description: mealPlan?.notes || undefined,
      });

      // Extract meal plan targets (use 0 if not set - no defaults)
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
        if (!isCurrent()) return;
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

      if (!isCurrent()) return;
      setHasMealsInPlan(true);

      const mealsWithData: Meal[] = [];

      // STEP 3: OPTIMIZED - Batch 1: items that only need mealIds (parallel)
      const mealIds = planMeals.map(m => m.id);

      const [
        { data: allFoodItems, error: foodError },
        { data: allMealOptions, error: optionsError },
        { data: allCompletions },
      ] = await Promise.all([
        supabase.from("meal_food_items").select("id, quantity, unit, food_id, meal_id, meal_option_id").in("meal_id", mealIds),
        supabase.from("meal_options").select("*").in("meal_id", mealIds).order("order_index", { ascending: true }),
        supabase.from("meal_completions").select("*").in("meal_id", mealIds).eq("client_id", user.id).eq("date", today),
      ]);

      if (foodError) {
        console.error("Error fetching meal food items:", foodError);
      }
      if (optionsError) {
        console.error("Error fetching meal options:", optionsError);
      }

      // Batch 2: foods (depends on meal_food_items for unique food IDs)
      const uniqueFoodIds = [...new Set((allFoodItems || []).map((item: any) => item.food_id).filter(Boolean))];
      const { data: allFoods, error: foodsError } = await supabase
        .from("foods")
        .select("id, name, serving_size, serving_unit, calories_per_serving, protein, carbs, fat")
        .in("id", uniqueFoodIds);

      if (foodsError) {
        console.error("Error fetching foods:", foodsError);
      }

      const foodMap = new Map((allFoods || []).map((food: any) => [food.id, food]));

      const optionsByMealMap = new Map<string, any[]>();
      (allMealOptions || []).forEach((opt: any) => {
        if (!optionsByMealMap.has(opt.meal_id)) {
          optionsByMealMap.set(opt.meal_id, []);
        }
        optionsByMealMap.get(opt.meal_id)!.push(opt);
      });

      // Resolve private storage paths to signed URLs for display (graceful fallback)
      const completionsWithSignedUrls = await Promise.all(
        (allCompletions || []).map(async (comp: any) => {
          const raw = comp?.photo_url as string | null | undefined;
          if (!raw) return comp;
          // If this already looks like a URL, keep it (backwards compat)
          if (/^https?:\/\//i.test(raw)) return comp;
          try {
            const { data, error } = await supabase.storage
              .from("meal-photos")
              .createSignedUrl(raw, 3600);
            if (error || !data?.signedUrl) return { ...comp, photo_url: null };
            return { ...comp, photo_url: data.signedUrl };
          } catch {
            return { ...comp, photo_url: null };
          }
        })
      );

      const completionMap = new Map(
        completionsWithSignedUrls.map((comp: any) => [comp.meal_id, comp])
      );

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

        const completion = completionMap.get(meal.id) || null;

        // When completed with a specific option, use that option's items for display and macro sum
        if (completion?.meal_option_id && mealOptionsDisplay.length > 0) {
          const chosenOption = mealOptionsDisplay.find((o) => o.id === completion.meal_option_id);
          if (chosenOption) {
            mappedFoodItems = chosenOption.items;
            totalCalories = chosenOption.totals.calories;
            totalProtein = chosenOption.totals.protein;
            totalCarbs = chosenOption.totals.carbs;
            totalFat = chosenOption.totals.fat;
          }
        }

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
          logged: !!completion,
          photoUrl: completion?.photo_url ?? undefined,
          logged_at: completion?.completed_at ?? undefined,
          options: mealOptionsDisplay.length > 0 ? mealOptionsDisplay : undefined,
          loggedOptionId: completion?.meal_option_id ?? undefined,
        });
      }

      // Update nutrition totals based on LOGGED meals only (only if this load is still current)
      if (!isCurrent()) return;
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
      if (isCurrent()) {
        setLoadingMeals(false);
      }
    }
  };

  const todayStr = () => new Date().toISOString().split("T")[0];

  const scrollToGoalsSection = () => {
    goalsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const adherenceColor = (pct: number) =>
    pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-red-400";

  const handleMarkComplete = async (mealId: string, optionId: string | null) => {
    if (!user?.id) {
      addToast({
        title: "Cannot complete meal",
        description: "Please sign in and try again.",
        variant: "destructive",
      });
      return;
    }
    if (!activeAssignmentId) {
      addToast({
        title: "Cannot complete meal",
        description: "No active meal plan. Please refresh the page or ask your coach to assign a plan.",
        variant: "destructive",
      });
      return;
    }
    try {
      await completeMeal({
        clientId: user.id,
        mealId,
        mealOptionId: optionId,
        mealPlanAssignmentId: activeAssignmentId,
        date: todayStr(),
      });
      runMealsLoadWithTimeout();
    } catch (e) {
      addToast({
        title: "Could not complete meal",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUndo = async (mealId: string) => {
    if (!user?.id) return;
    try {
      await undoCompletion(user.id, mealId, todayStr());
      runMealsLoadWithTimeout();
    } catch (e) {
      addToast({
        title: "Could not undo",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  /** Phase N4: Switch today's plan selection and reload meals for that plan. */
  const handlePlanSelect = async (assignmentId: string) => {
    if (!user?.id || assignmentId === activeAssignmentId) return;
    try {
      await selectPlanForToday(user.id, assignmentId, todayStr());
      runMealsLoadWithTimeout();
    } catch (e) {
      addToast({
        title: "Could not switch plan",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddPhoto = async (mealId: string, file: File) => {
    if (!user?.id) return;
    try {
      await addPhotoToCompletion(user.id, mealId, todayStr(), file);
      await runMealsLoadWithTimeout();
      addToast({
        title: "Photo added",
        description: "Your meal photo has been saved.",
        variant: "default",
      });
    } catch (e) {
      addToast({
        title: "Photo upload failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      throw e;
    }
  };

  const loadWaterGoal = async () => {
    if (!user?.id) return;
    if (loadingWaterGoal) return; // Prevent duplicate calls
    
    setLoadingWaterGoal(true);
    try {
      // Single query: fetch ALL active goals, then derive water + nutrition in JS (deduplicated)
      const { data: allGoals, error } = await supabase
        .from("goals")
        .select("id, title, target_value, target_unit, current_value, category, progress_percentage, pillar")
        .eq("client_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading goals:", error);
        setWaterGoalId(null);
        setWaterGoalGlasses(0);
        setDisplayedWaterGlasses(1);
        setNutritionGoals([]);
        setActiveGoalsCount(0);
        setGoalsAdherence(null);
        setNutritionData((prev) => ({
          ...prev,
          water: { ...prev.water, goal: 0, goalMl: 0, glasses: 0, ml: 0 },
        }));
        return;
      }

      const goalsList = allGoals || [];
      setActiveGoalsCount(goalsList.length);
      const adherence =
        goalsList.length > 0
          ? Math.round(
              goalsList.reduce((sum: number, g: { progress_percentage?: number | null }) => sum + (g.progress_percentage ?? 0), 0) /
                goalsList.length
            )
          : null;
      setGoalsAdherence(adherence);

      // Filter for water goal (first Water Intake match)
      const goals = goalsList.filter((g: { title?: string }) =>
        (g.title || "").toLowerCase().includes("water intake")
      );

      // Nutrition goals: prefer pillar=nutrition; fallback to category/keyword for legacy
      let nutrition: { id: string; title: string; target_value: number | string | null; target_unit?: string | null; current_value?: number | null; progress_percentage?: number | null; status: string }[] = [];
      const pillarGoals = goalsList.filter((g: { pillar?: string }) => (g.pillar || "") === "nutrition").slice(0, 3);
      if (pillarGoals.length > 0) {
        nutrition = pillarGoals.map((g: { id: string; title: string; target_value: number | string | null; target_unit?: string | null; current_value?: number | null; progress_percentage?: number | null; status?: string }) => ({
          id: g.id,
          title: g.title,
          target_value: g.target_value,
          target_unit: g.target_unit,
          current_value: g.current_value,
          progress_percentage: g.progress_percentage,
          status: g.status ?? "active",
        }));
      } else {
        const nutritionKeywords = ["calorie", "protein", "carb", "fat", "macro", "nutrition", "diet", "food"];
        nutrition = goalsList
          .filter(
            (g: { category?: string; title?: string }) =>
              (g.category || "").toLowerCase() === "nutrition" ||
              nutritionKeywords.some((k) => (g.title || "").toLowerCase().includes(k))
          )
          .filter((g: { title?: string }) => !(g.title || "").toLowerCase().includes("water intake"))
          .slice(0, 3)
          .map((g: { id: string; title: string; target_value: number | string | null; target_unit?: string | null; current_value?: number | null; progress_percentage?: number | null; status?: string }) => ({
            id: g.id,
            title: g.title,
            target_value: g.target_value,
            target_unit: g.target_unit,
            current_value: g.current_value,
            progress_percentage: g.progress_percentage,
            status: g.status ?? "active",
          }));
      }
      setNutritionGoals(nutrition);

      if (!goals || goals.length === 0) {
        // No water goal configured - create one automatically with default values
        const defaultTargetLiters = 3; // 3 liters (8 glasses) default goal
        const defaultTargetMl = defaultTargetLiters * 1000;
        
        const { data: newGoal, error: createError } = await supabase
          .from("goals")
          .insert({
            client_id: user.id,
            title: "Water Intake",
            description: "Daily water intake goal",
            category: "other",
            pillar: "nutrition",
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
          setActiveGoalsCount(0);
          setGoalsAdherence(null);
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
        setActiveGoalsCount(1);
        setGoalsAdherence(0);
        setNutritionData((prev) => ({
          ...prev,
          water: {
            glasses: 0,
            goal: displayGoalGlasses,
            ml: 0,
            goalMl: defaultTargetMl,
          },
        }));
        setLoadingWaterGoal(false);
        return;
      }

      const waterGoal = goals[0];
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
      setDisplayedWaterGlasses(1);
      setNutritionData((prev) => ({
        ...prev,
        water: { ...prev.water, goal: 0, goalMl: 0, glasses: 0, ml: 0 },
      }));
    } finally {
      setLoadingWaterGoal(false);
    }
  };

  // E4.1: Load last 7 days nutrition history for Calorie Trend + Nutrition History (3 queries)
  const loadNutritionHistory = async (loadId: number) => {
    if (!user?.id) return;
    const isCurrent = () => loadId === loadGenerationRef.current;

    const today = new Date().toISOString().split("T")[0];
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const sevenDaysAgo = d.toISOString().split("T")[0];

    try {
      // Phase N5: Single source of truth — meal_completions only (no meal_photo_logs)
      const { data: completions } = await supabase
        .from("meal_completions")
        .select("date, completed_at, meal_id")
        .eq("client_id", user.id)
        .gte("date", sevenDaysAgo)
        .lte("date", today);

      const allMealIds = [...new Set((completions || []).map((c: { meal_id: string }) => c.meal_id))];

      const mealIdToCalories = new Map<string, number>();
      const proteinByMeal = new Map<string, number>();

      if (allMealIds.length > 0) {
        const { data: mfi } = await supabase
          .from("meal_food_items")
          .select("meal_id, quantity, foods(calories_per_serving, serving_size, protein)")
          .in("meal_id", allMealIds);

        for (const item of mfi || []) {
          const row = item as { meal_id: string; quantity: number; foods: { calories_per_serving?: number; serving_size?: number; protein?: number } | null };
          const f = row.foods;
          const servingSize = f?.serving_size || 1;
          const mult = row.quantity / servingSize;
          const cal = ((f?.calories_per_serving || 0) * mult) || 0;
          const prot = ((f?.protein || 0) * mult) || 0;
          const mid = row.meal_id;
          mealIdToCalories.set(mid, (mealIdToCalories.get(mid) || 0) + cal);
          proteinByMeal.set(mid, (proteinByMeal.get(mid) || 0) + prot);
        }
      }

      const dateToData = new Map<
        string,
        { calories: number; protein: number; completedCount: number }
      >();

      for (const c of completions || []) {
        const row = c as { date?: string; completed_at: string; meal_id: string };
        const dateStr = row.date || row.completed_at.split("T")[0];
        const mid = row.meal_id;
        const existing = dateToData.get(dateStr) || { calories: 0, protein: 0, completedCount: 0 };
        dateToData.set(dateStr, {
          calories: existing.calories + (mealIdToCalories.get(mid) || 0),
          protein: existing.protein + (proteinByMeal.get(mid) || 0),
          completedCount: existing.completedCount + 1,
        });
      }

      const sortedDates = Array.from(dateToData.keys()).sort();
      const trend = sortedDates.map((dateStr) => ({
        label: new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        date: dateStr,
        calories: dateToData.get(dateStr)?.calories || 0,
      }));

      const history = sortedDates
        .slice(-7)
        .reverse()
        .map((dateStr) => {
          const v = dateToData.get(dateStr)!;
          return {
            label: new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
            date: dateStr,
            calories: Math.round(v.calories),
            protein: Math.round(v.protein),
            completedCount: v.completedCount,
          };
        });

      if (isCurrent()) {
        setCalorieTrendData(trend);
        setRecentHistory(history);
      }
    } catch (err) {
      console.error("Error loading nutrition history:", err);
      if (isCurrent()) {
        setCalorieTrendData([]);
        setRecentHistory([]);
      }
    }
  };

  const loadNutritionTrends = async (loadId: number) => {
    if (!user?.id) return;
    const isCurrent = () => loadId === loadGenerationRef.current;
    const today = new Date().toISOString().split("T")[0];
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const thirtyDaysAgo = d.toISOString().split("T")[0];
    try {
      const { data: completions } = await supabase
        .from("meal_completions")
        .select("date, completed_at, meal_id")
        .eq("client_id", user.id)
        .gte("date", thirtyDaysAgo)
        .lte("date", today);
      const allMealIds = [...new Set((completions || []).map((c: { meal_id: string }) => c.meal_id))];
      const mealIdToMacros = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
      if (allMealIds.length > 0) {
        const { data: mfi } = await supabase
          .from("meal_food_items")
          .select("meal_id, quantity, foods(calories_per_serving, serving_size, protein, carbs, fat)")
          .in("meal_id", allMealIds);
        for (const item of mfi || []) {
          const row = item as {
            meal_id: string;
            quantity: number;
            foods: { calories_per_serving?: number; serving_size?: number; protein?: number; carbs?: number; fat?: number } | null;
          };
          const f = row.foods;
          const servingSize = f?.serving_size || 1;
          const mult = row.quantity / servingSize;
          const cal = ((f?.calories_per_serving || 0) * mult) || 0;
          const prot = ((f?.protein || 0) * mult) || 0;
          const carb = ((f?.carbs || 0) * mult) || 0;
          const fatVal = ((f?.fat || 0) * mult) || 0;
          const mid = row.meal_id;
          const existing = mealIdToMacros.get(mid) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
          mealIdToMacros.set(mid, {
            calories: existing.calories + cal,
            protein: existing.protein + prot,
            carbs: existing.carbs + carb,
            fat: existing.fat + fatVal,
          });
        }
      }
      const dateToData = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
      for (const c of completions || []) {
        const row = c as { date?: string; completed_at: string; meal_id: string };
        const dateStr = row.date || row.completed_at.split("T")[0];
        const mid = row.meal_id;
        const macros = mealIdToMacros.get(mid) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
        const existing = dateToData.get(dateStr) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
        dateToData.set(dateStr, {
          calories: existing.calories + macros.calories,
          protein: existing.protein + macros.protein,
          carbs: existing.carbs + macros.carbs,
          fat: existing.fat + macros.fat,
        });
      }
      let targetCal: number | null = null;
      try {
        const { getClientNutritionGoals } = await import("@/lib/nutritionLogService");
        const goals = await getClientNutritionGoals(user.id);
        if (goals?.calories) targetCal = goals.calories;
      } catch {
        // ignore
      }
      if (targetCal != null && isCurrent()) setNutritionTrendsTarget(targetCal);
      const sortedDates = Array.from(dateToData.keys()).sort();
      const trendRows = sortedDates.map((dateStr) => {
        const v = dateToData.get(dateStr)!;
        return {
          date: dateStr,
          calories: Math.round(v.calories),
          protein: Math.round(v.protein),
          carbs: Math.round(v.carbs),
          fat: Math.round(v.fat),
          targetCalories: targetCal ?? undefined,
        };
      });
      if (isCurrent()) setNutritionTrends(trendRows);
    } catch (err) {
      console.error("Error loading nutrition trends:", err);
      if (isCurrent()) setNutritionTrends([]);
    }
  };

  const handleWaterGlassClick = async (targetGlasses: number) => {
    if (!user?.id || !waterGoalId) {
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
      
      // Update UI state immediately (optimistic update)
      setNutritionData((prev) => ({
        ...prev,
        water: { ...prev.water, glasses: newGlasses, ml: newMl },
      }));

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
        addToast({ title: "Error", description: "Failed to save water intake. Please try again.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error in handleWaterGlassClick:", error);
      addToast({ title: "Error", description: "Failed to save water intake. Please try again.", variant: "destructive" });
    }
  };

  // Helper: items to show as chips (from meal.items or first option)
  const getDisplayItems = (meal: Meal): MealFoodItem[] => {
    if (meal.items && meal.items.length > 0) return meal.items;
    const opt = meal.options?.[0];
    return opt?.items ?? [];
  };

  // Helper function to get meal calories
  const getMealCalories = (meal: Meal): number => {
    return meal.items.reduce((sum, item) => sum + item.calories, 0);
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
    // Sum macros from completed (logged) meals only; each meal's items reflect chosen option when logged
    const loggedMeals = mealsArray.filter((m) => m.logged);
    const totalCalories = loggedMeals.reduce(
      (sum, meal) => sum + meal.items.reduce((itemSum, item) => itemSum + item.calories, 0),
      0
    );
    const totalProtein = loggedMeals.reduce(
      (sum, meal) => sum + meal.items.reduce((itemSum, item) => itemSum + item.protein, 0),
      0
    );
    const totalCarbs = loggedMeals.reduce(
      (sum, meal) => sum + meal.items.reduce((itemSum, item) => itemSum + item.carbs, 0),
      0
    );
    const totalFat = loggedMeals.reduce(
      (sum, meal) => sum + meal.items.reduce((itemSum, item) => itemSum + item.fat, 0),
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

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <ClientPageShell className="max-w-3xl flex flex-col gap-6 overflow-x-hidden px-4 sm:px-6">
        {/* Load error */}
        {mealsLoadError && !loadingMeals && (
          <ClientGlassCard className="p-6">
            <div className="text-center space-y-4">
              <p className="fc-text-primary font-medium">{mealsLoadError}</p>
              <SecondaryButton
                onClick={() => {
                  setMealsLoadError(null);
                  setLoadingMeals(true);
                  runMealsLoadWithTimeout();
                }}
              >
                Retry
              </SecondaryButton>
            </div>
          </ClientGlassCard>
        )}

        {loadingMeals ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="fc-surface rounded-2xl p-6 animate-pulse">
                <div className="h-4 rounded w-1/2 mb-4" style={{ background: "var(--fc-surface-sunken)" }} />
                <div className="h-24 rounded" style={{ background: "var(--fc-surface-sunken)" }} />
              </div>
            ))}
          </div>
        ) : !hasActivePlan ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold fc-text-primary">Fuel</h1>
                <button
                  type="button"
                  onClick={scrollToGoalsSection}
                  className="text-xs fc-text-dim hover:fc-text-primary transition-colors text-left mt-0.5 block"
                >
                  {activeGoalsCount > 0 ? (
                    <>
                      · {activeGoalsCount} goal{activeGoalsCount !== 1 ? "s" : ""}
                      {goalsAdherence != null && (
                        <span className={`ml-1 ${adherenceColor(goalsAdherence)}`}>
                          · {goalsAdherence}% adherence
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      · No goals set —{" "}
                      <span className="text-[color:var(--fc-accent-cyan)] hover:underline">Set your first goal ↓</span>
                    </>
                  )}
                </button>
              </div>
              <Link href="/client/progress/nutrition" className="text-sm fc-text-dim hover:fc-text-primary transition-colors shrink-0">
                History
              </Link>
            </div>
            <ClientGlassCard className="p-8">
              <EmptyState
                icon={UtensilsCrossed}
                title="No meal plan"
                description="Ask your coach to assign a meal plan"
              />
            </ClientGlassCard>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold fc-text-primary">Fuel</h1>
                <button
                  type="button"
                  onClick={scrollToGoalsSection}
                  className="text-xs fc-text-dim hover:fc-text-primary transition-colors text-left mt-0.5 block"
                >
                  {activeGoalsCount > 0 ? (
                    <>
                      · {activeGoalsCount} goal{activeGoalsCount !== 1 ? "s" : ""}
                      {goalsAdherence != null && (
                        <span className={`ml-1 ${adherenceColor(goalsAdherence)}`}>
                          · {goalsAdherence}% adherence
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      · No goals set —{" "}
                      <span className="text-[color:var(--fc-accent-cyan)] hover:underline">Set your first goal ↓</span>
                    </>
                  )}
                </button>
              </div>
              <Link href="/client/progress/nutrition" className="text-sm fc-text-dim hover:fc-text-primary transition-colors shrink-0">
                History
              </Link>
            </div>

            {/* Plan picker: compact dropdown when client has multiple active plans (Phase N4) */}
            {activeAssignments.length > 1 && (
              <section>
                <label htmlFor="fuel-plan-picker" className="text-sm font-medium fc-text-primary mb-1.5 block">
                  Today&apos;s Plan
                </label>
                <select
                  id="fuel-plan-picker"
                  value={activeAssignmentId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) handlePlanSelect(id);
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[color:var(--fc-surface-card-border)] fc-glass bg-[color:var(--fc-surface)] fc-text-primary text-sm font-medium appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                    paddingRight: "36px",
                  }}
                >
                  {activeAssignments.map((a) => {
                    const plan = a.meal_plans;
                    const name = plan?.name ?? "Meal Plan";
                    const kcal = plan?.target_calories ?? 0;
                    const labelPart = a.label?.trim() ? ` (${a.label})` : "";
                    return (
                      <option key={a.id} value={a.id}>
                        {name}{kcal ? ` - ${kcal}kcal` : ""}{labelPart}
                      </option>
                    );
                  })}
                </select>
              </section>
            )}

            {/* FuelHeader: plan name, date, progress ring, daily macros */}
            <section>
              <ClientGlassCard className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h2 className="text-base font-semibold fc-text-primary">
                      {activeMealPlanInfo?.name ?? "Meal Plan"}
                    </h2>
                    <p className="text-xs fc-text-dim font-mono">
                      {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-[color:var(--fc-accent-cyan)]/50 bg-[color:var(--fc-glass-highlight)]">
                    <span className="text-lg font-bold fc-text-primary">
                      {meals.filter((m) => m.logged).length}/{meals.length}
                    </span>
                  </div>
                </div>
                <div className="text-sm fc-text-dim space-y-1">
                  <p>
                    <span className="font-mono font-medium text-blue-500 dark:text-blue-400">
                      {Math.round(nutritionData.calories.consumed)} / {nutritionData.calories.goal || "—"} kcal
                    </span>
                  </p>
                  <p className="text-xs fc-text-dim">
                    <span className="text-rose-500 dark:text-rose-400">P {Math.round(nutritionData.protein.consumed)}g</span>
                    {" · "}
                    <span className="text-amber-500 dark:text-amber-400">C {Math.round(nutritionData.carbs.consumed)}g</span>
                    {" · "}
                    <span className="text-purple-500 dark:text-purple-400">F {Math.round(nutritionData.fat.consumed)}g</span>
                    {nutritionData.protein.goal != null && (
                      <span className="fc-text-dim">
                        {" "}
                        (target: {nutritionData.protein.goal}g / {nutritionData.carbs.goal ?? "—"}g / {nutritionData.fat.goal ?? "—"}g)
                      </span>
                    )}
                  </p>
                </div>
              </ClientGlassCard>
            </section>

            {/* Water — compact strip: label + progress, then glasses + Add (mobile-first) */}
            <section className="px-0">
              <ClientGlassCard className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-medium fc-text-primary flex items-center gap-1.5">
                    <Droplet className="w-4 h-4 text-[color:var(--fc-accent-cyan)]" />
                    Water
                  </span>
                  <span className="text-sm font-mono text-cyan-500 dark:text-cyan-400 shrink-0">
                    {nutritionData.water.ml.toLocaleString()} / {nutritionData.water.goalMl > 0 ? nutritionData.water.goalMl.toLocaleString() : "—"} mL
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {Array.from({ length: Math.min(displayedWaterGlasses, 16) }).map((_, index) => {
                    const isActive = index < nutritionData.water.glasses;
                    const glassNumber = index + 1;
                    const isGoalGlass = glassNumber <= waterGoalGlasses;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleWaterGlassClick(glassNumber)}
                        className={`min-h-[44px] min-w-[44px] p-1.5 rounded-lg transition-all flex items-center justify-center ${
                          isActive
                            ? isGoalGlass
                              ? "bg-[color:var(--fc-accent-cyan)]/20 text-[color:var(--fc-accent-cyan)] active:scale-95"
                              : "bg-[color:var(--fc-accent-cyan)]/10 text-[color:var(--fc-accent-cyan)] active:scale-95"
                            : "bg-[color:var(--fc-glass-highlight)] text-[color:var(--fc-text-dim)]"
                        }`}
                      >
                        <Droplet className="w-5 h-5" />
                      </button>
                    );
                  })}
                  {displayedWaterGlasses < 16 && nutritionData.water.glasses >= displayedWaterGlasses && (
                    <button
                      type="button"
                      onClick={() => handleWaterGlassClick(nutritionData.water.glasses + 1)}
                      className="min-h-[44px] px-3 rounded-lg bg-[color:var(--fc-glass-highlight)] text-[color:var(--fc-text-dim)] text-sm font-medium flex items-center gap-1"
                    >
                      <span>+</span>
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </ClientGlassCard>
            </section>

            {/* Meal cards — full width, proper padding for mobile */}
            {hasMealsInPlan && (
              <section className="space-y-4 w-full min-w-0">
                {meals.map((meal) => {
                  const displayMeal = {
                    id: meal.id,
                    name: meal.name,
                    meal_type: meal.type,
                    emoji: meal.emoji,
                    options: meal.options ?? [],
                    legacyItems: meal.items,
                    logged: meal.logged,
                    loggedOptionId: meal.loggedOptionId,
                    photoUrl: meal.photoUrl,
                    logged_at: meal.logged_at,
                  };
                  return (
                    <MealCardWithOptions
                      key={meal.id}
                      meal={displayMeal}
                      clientId={user?.id ?? ""}
                      onMarkComplete={handleMarkComplete}
                      onUndo={() => handleUndo(meal.id)}
                      onAddPhoto={handleAddPhoto}
                    />
                  );
                })}
              </section>
            )}

            {hasActivePlan && hasMealsInPlan === false && !loadingMeals && (
              <ClientGlassCard className="p-6 text-center">
                <p className="text-sm fc-text-dim">No meals in this plan yet.</p>
              </ClientGlassCard>
            )}

            <p className="text-xs fc-text-dim text-center py-2">
              All portions are for raw/uncooked ingredients.
            </p>

            {/* Nutrition Trends — collapsible */}
            <section className="w-full">
              <button
                type="button"
                onClick={() => setNutritionTrendsOpen((o) => !o)}
                className="w-full fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-4 flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[color:var(--fc-accent-cyan)]" />
                  <span className="font-semibold fc-text-primary">Nutrition Trends</span>
                </div>
                {nutritionTrendsOpen ? <ChevronUp className="w-5 h-5 fc-text-dim" /> : <ChevronDown className="w-5 h-5 fc-text-dim" />}
              </button>
              {nutritionTrendsOpen && (
                <div className="fc-surface rounded-b-2xl border border-t-0 border-[color:var(--fc-surface-card-border)] p-4 mt-0">
                  {nutritionTrends.length === 0 ? (
                    <p className="text-sm fc-text-dim py-6 text-center">Start logging meals to see trends.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(["calories", "protein", "carbs", "fat"] as const).map((m) => {
                          const selectedBg =
                            m === "calories"
                              ? "bg-blue-500 dark:bg-blue-600 text-white"
                              : m === "protein"
                                ? "bg-rose-500 dark:bg-rose-600 text-white"
                                : m === "carbs"
                                  ? "bg-amber-500 dark:bg-amber-600 text-white"
                                  : "bg-purple-500 dark:bg-purple-600 text-white";
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setNutritionTrendsMetric(m)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                nutritionTrendsMetric === m ? selectedBg : "fc-glass-soft fc-text-dim hover:fc-text-primary"
                              }`}
                            >
                              {m === "calories" ? "Calories" : m === "protein" ? "Protein" : m === "carbs" ? "Carbs" : "Fat"}
                            </button>
                          );
                        })}
                      </div>
                      <div className="relative h-40 flex items-end gap-0.5">
                        {nutritionTrends.map((day) => {
                          const val = day[nutritionTrendsMetric];
                          const maxVal = Math.max(...nutritionTrends.map((d) => d[nutritionTrendsMetric]), 1);
                          const height = (val / maxVal) * 100;
                          const barClass =
                            nutritionTrendsMetric === "calories"
                              ? "bg-blue-500/70 dark:bg-blue-400/70"
                              : nutritionTrendsMetric === "protein"
                                ? "bg-rose-500/70 dark:bg-rose-400/70"
                                : nutritionTrendsMetric === "carbs"
                                  ? "bg-amber-500/70 dark:bg-amber-400/70"
                                  : "bg-purple-500/70 dark:bg-purple-400/70";
                          return (
                            <div key={day.date} className="flex-1 min-w-0 flex flex-col items-center" title={`${day.date}: ${val}`}>
                              <div
                                className={`w-full rounded-t hover:opacity-90 transition-opacity ${barClass}`}
                                style={{ height: `${Math.max(height, val > 0 ? 4 : 0)}%`, minHeight: val > 0 ? "4px" : "0" }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs fc-text-dim mt-2">
                        Last 30 days · {nutritionTrendsMetric === "calories" ? "kcal" : "g"}
                      </p>
                      {(() => {
                        const last7 = nutritionTrends.slice(-7);
                        const weekAvg = last7.length > 0
                          ? Math.round(last7.reduce((s, d) => s + d[nutritionTrendsMetric], 0) / last7.length)
                          : 0;
                        const target = nutritionTrendsMetric === "calories" ? nutritionTrendsTarget : null;
                        return (
                          <p className="text-sm fc-text-primary mt-1">
                            This week avg: {weekAvg.toLocaleString()}{nutritionTrendsMetric === "calories" ? " cal" : " g"}
                            {target != null && nutritionTrendsMetric === "calories" && ` (target: ${target.toLocaleString()})`}
                          </p>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {/* Goals section — always at bottom for header scroll target */}
        <section ref={goalsSectionRef} id="fuel-goals-section">
          {nutritionGoals.length === 0 ? (
            <ClientGlassCard className="p-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <span className="text-3xl" aria-hidden>🎯</span>
                <h3 className="text-lg font-semibold fc-text-primary">Set Your Goals</h3>
                <p className="text-sm fc-text-dim max-w-sm">
                  Track nutrition, hydration, and wellness goals to stay on top of your progress.
                </p>
                <Button
                  onClick={() => setShowAddGoalModal(true)}
                  className="min-h-[44px] px-6 rounded-xl bg-[color:var(--fc-accent-cyan)] hover:opacity-90 text-white font-semibold"
                >
                  + Set Up My Goals
                </Button>
              </div>
            </ClientGlassCard>
          ) : (
            <ClientGlassCard className="p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold fc-text-primary">
                  Goals
                  {nutritionGoals.length > 0 && (
                    <span className="fc-text-dim font-normal ml-1">
                      · {Math.round(nutritionGoals.reduce((s, g) => s + (g.progress_percentage ?? 0), 0) / nutritionGoals.length)}% adherence
                    </span>
                  )}
                </h3>
                <Link
                  href="/client/goals"
                  className="text-sm font-medium text-[color:var(--fc-accent-cyan)] hover:underline"
                >
                  Manage
                </Link>
              </div>
              <div className="flex flex-wrap gap-3">
                {nutritionGoals.slice(0, 3).map((g) => (
                  <CompactGoalCard key={g.id} goal={g} />
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddGoalModal(true)}
                className="w-full mt-3 min-h-[44px] rounded-xl border-[color:var(--fc-accent-cyan)]/50 text-[color:var(--fc-accent-cyan)] hover:bg-[color:var(--fc-accent-cyan)]/10"
              >
                + Add goal
              </Button>
            </ClientGlassCard>
          )}
        </section>
        <AddGoalModal
          open={showAddGoalModal}
          onClose={() => setShowAddGoalModal(false)}
          pillar="nutrition"
          onSuccess={() => loadWaterGoal()}
        />
      </ClientPageShell>
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
