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
import {
  mapNutritionPageRpcToPageData,
  type NutritionPageRpcResponse,
  type MappedMeal,
} from "@/lib/nutritionPageDataMapper";
import { applyClientMealOverridesToNutritionRpc } from "@/lib/applyNutritionOverridesForFuel";
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
  const { addToast } = useToast();

  const [nutritionData, setNutritionData] = useState<NutritionData>({
    calories: { consumed: 0, goal: 0 },
    protein: { consumed: 0, goal: 0 },
    carbs: { consumed: 0, goal: 0 },
    fat: { consumed: 0, goal: 0 },
    water: { glasses: 0, goal: 0, ml: 0, goalMl: 0 },
  });

  const [meals, setMeals] = useState<Meal[]>([]);

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
  const [, setAllFoods] = useState<Array<{ id: string; name: string }>>([]);

  const loadStartedAtRef = useRef<number | null>(null);
  const goalsSectionRef = useRef<HTMLDivElement>(null);

  const runMealsLoad = async () => {
    if (!user?.id) return;
    setMealsLoadError(null);
    setLoadingMeals(true);
    loadStartedAtRef.current = Date.now();
    loadGenerationRef.current = (loadGenerationRef.current ?? 0) + 1;
    const loadId = loadGenerationRef.current;
    try {
      await loadTodayMeals(loadId);
    } finally {
      if (loadId === loadGenerationRef.current) {
        setLoadingMeals(false);
        loadStartedAtRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    runMealsLoad();
    return () => {
      loadGenerationRef.current = (loadGenerationRef.current ?? 0) + 1;
      setLoadingMeals(false);
      loadStartedAtRef.current = null;
    };
  }, [user?.id]);

  const loadTodayMeals = async (loadId: number) => {
    if (!user?.id) return;
    const isCurrent = () => loadId === loadGenerationRef.current;
    const today = new Date().toISOString().split("T")[0];

    try {
      setLoadingMeals(true);
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_client_nutrition_page", {
        p_client_id: user.id,
        p_date: today,
      });

      if (rpcError) {
        console.error("[Fuel] get_client_nutrition_page RPC error:", rpcError);
        if (isCurrent()) setMealsLoadError(rpcError.message || "Failed to load nutrition");
        return;
      }

      let rpc = (rpcData ?? null) as NutritionPageRpcResponse | null;
      if (!rpc) {
        if (isCurrent()) {
          setActiveAssignmentId(null);
          setActiveMealPlanInfo(null);
          setActiveAssignments([]);
          setHasActivePlan(false);
          setHasMealsInPlan(false);
          setMeals([]);
          setNutritionGoals([]);
          setNutritionData((prev) => ({ ...prev, calories: { consumed: 0, goal: 0 }, protein: { consumed: 0, goal: 0 }, carbs: { consumed: 0, goal: 0 }, fat: { consumed: 0, goal: 0 } }));
        }
        return;
      }

      rpc = await applyClientMealOverridesToNutritionRpc(rpc);

      const mapped = mapNutritionPageRpcToPageData(rpc);

      if (!isCurrent()) return;
      setHasActivePlan(mapped.hasAssignment);
      setActiveAssignmentId(mapped.assignmentId);
      setActiveMealPlanInfo(mapped.activeMealPlanInfo);
      setActiveAssignments(mapped.activeAssignments as any);
      setHasMealsInPlan(mapped.hasAssignment && mapped.meals.length > 0);
      setNutritionGoals(mapped.nutritionGoals);
      setAllFoods((mapped.allFoods ?? []).map((f) => ({ id: f.id, name: f.name })));
      const complianceRows = mapped.weeklyCompliance ?? [];
      const complianceTrend = complianceRows.map((row) => ({
        label: new Date(`${row.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        date: row.date,
        calories: Number(row.meals_completed ?? 0),
      }));
      setCalorieTrendData(complianceTrend);
      setRecentHistory(
        [...complianceRows]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 7)
          .map((row) => ({
            label: new Date(`${row.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
            date: row.date,
            calories: 0,
            protein: 0,
            completedCount: Number(row.meals_completed ?? 0),
          }))
      );
      setNutritionTrends(
        complianceRows.map((row) => ({
          date: row.date,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          targetCalories: mapped.targetCalories || undefined,
        }))
      );
      setNutritionTrendsTarget(mapped.targetCalories || null);

      // Set water goal state from RPC goals (avoids separate goals query)
      loadWaterGoal(mapped.nutritionGoals);

      // Resolve storage paths to signed URLs for completion photos (non-blocking)
      const mealsWithSignedUrls = await resolveMealPhotoUrls(mapped.meals);
      if (!isCurrent()) return;
      setMeals(mealsWithSignedUrls);

      calculateNutritionTotals(
        mealsWithSignedUrls,
        mapped.targetCalories,
        mapped.targetProtein,
        mapped.targetCarbs,
        mapped.targetFat
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[Fuel] loadTodayMeals ERROR:", error);
      if (isCurrent()) setMealsLoadError(msg || "Failed to load nutrition");
    } finally {
      if (isCurrent()) setLoadingMeals(false);
    }
  };

  /** Resolve completion photo_url storage paths to signed URLs. */
  async function resolveMealPhotoUrls(meals: MappedMeal[]): Promise<Meal[]> {
    const withPhotos = meals.filter((m) => m.logged && m.photoUrl && !/^https?:\/\//i.test(m.photoUrl));
    if (withPhotos.length === 0) return meals;
    const resolved = await Promise.all(
      meals.map(async (m) => {
        if (!m.photoUrl || /^https?:\/\//i.test(m.photoUrl)) return m;
        try {
          const { data, error } = await supabase.storage.from("meal-photos").createSignedUrl(m.photoUrl, 3600);
          if (error || !data?.signedUrl) return { ...m, photoUrl: undefined };
          return { ...m, photoUrl: data.signedUrl };
        } catch {
          return m;
        }
      })
    );
    return resolved;
  }

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
      runMealsLoad();
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
      runMealsLoad();
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
      runMealsLoad();
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
      await runMealsLoad();
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

  /** When goalsFromRpc is provided (from get_client_nutrition_page RPC), use it and skip the goals fetch. */
  const loadWaterGoal = async (goalsFromRpc?: Array<{ id: string; title?: string; target_value?: number | string | null; target_unit?: string | null; current_value?: number | null; progress_percentage?: number | null }>) => {
    if (!user?.id) return;
    if (loadingWaterGoal) return;

    setLoadingWaterGoal(true);
    try {
      let goalsList: Array<{ id: string; title?: string; target_value?: number | string | null; target_unit?: string | null; current_value?: number | null; progress_percentage?: number | null; pillar?: string; category?: string }>;
      if (goalsFromRpc !== undefined) {
        goalsList = goalsFromRpc.map((g) => ({ ...g, pillar: "nutrition" as string, category: "other" as string }));
      } else {
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
          setNutritionData((prev) => ({ ...prev, water: { ...prev.water, goal: 0, goalMl: 0, glasses: 0, ml: 0 } }));
          return;
        }
        goalsList = allGoals || [];
      }

      setActiveGoalsCount(goalsList.length);
      const adherence =
        goalsList.length > 0
          ? Math.round(
              goalsList.reduce((sum: number, g: { progress_percentage?: number | null }) => sum + (g.progress_percentage ?? 0), 0) /
                goalsList.length
            )
          : null;
      setGoalsAdherence(adherence);

      if (goalsFromRpc == null) {
        let nutrition: { id: string; title: string; target_value: number | string | null; target_unit?: string | null; current_value?: number | null; progress_percentage?: number | null; status: string }[] = [];
        const pillarGoals = goalsList.filter((g: { pillar?: string }) => (g.pillar || "") === "nutrition").slice(0, 3);
        if (pillarGoals.length > 0) {
          nutrition = pillarGoals.map((g: any) => ({ id: g.id, title: g.title, target_value: g.target_value, target_unit: g.target_unit, current_value: g.current_value, progress_percentage: g.progress_percentage, status: "active" }));
        } else {
          const nutritionKeywords = ["calorie", "protein", "carb", "fat", "macro", "nutrition", "diet", "food"];
          nutrition = goalsList
            .filter((g: any) => (g.category || "").toLowerCase() === "nutrition" || nutritionKeywords.some((k) => (g.title || "").toLowerCase().includes(k)))
            .filter((g: any) => !(g.title || "").toLowerCase().includes("water intake"))
            .slice(0, 3)
            .map((g: any) => ({ id: g.id, title: g.title, target_value: g.target_value, target_unit: g.target_unit, current_value: g.current_value, progress_percentage: g.progress_percentage, status: "active" }));
        }
        setNutritionGoals(nutrition);
      }

      const goals = goalsList.filter((g: { title?: string }) => (g.title || "").toLowerCase().includes("water intake"));

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
      const targetValue = Number(waterGoal.target_value ?? 0);
      const currentValue = Number(waterGoal.current_value ?? 0); // Today's water intake (in ml)
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
        {mealsLoadError && !loadingMeals && (
          <ClientGlassCard className="p-6">
            <div className="text-center space-y-4">
              <p className="fc-text-primary font-medium">{mealsLoadError}</p>
              <SecondaryButton onClick={() => runMealsLoad()}>Retry</SecondaryButton>
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
                    <span className="font-mono font-medium" style={{ color: "var(--fc-accent-primary)" }}>
                      {Math.round(nutritionData.calories.consumed)} / {nutritionData.calories.goal || "—"} kcal
                    </span>
                  </p>
                  <p className="text-xs fc-text-dim">
                    <span className="text-cyan-400 font-medium">P {Math.round(nutritionData.protein.consumed)}g</span>
                    {" · "}
                    <span className="text-amber-400 font-medium">C {Math.round(nutritionData.carbs.consumed)}g</span>
                    {" · "}
                    <span className="text-emerald-400 font-medium">F {Math.round(nutritionData.fat.consumed)}g</span>
                    {nutritionData.protein.goal != null && (
                      <span className="fc-text-dim">
                        {" "}
                        (target: {nutritionData.protein.goal}g / {nutritionData.carbs.goal ?? "—"}g / {nutritionData.fat.goal ?? "—"}g)
                      </span>
                    )}
                  </p>
                  <div className="mt-3 space-y-2">
                    {[
                      {
                        label: "Protein",
                        cur: nutritionData.protein.consumed,
                        goal: nutritionData.protein.goal,
                        bar: "bg-gradient-to-r from-cyan-600 to-cyan-400",
                      },
                      {
                        label: "Carbs",
                        cur: nutritionData.carbs.consumed,
                        goal: nutritionData.carbs.goal,
                        bar: "bg-gradient-to-r from-amber-600 to-amber-400",
                      },
                      {
                        label: "Fat",
                        cur: nutritionData.fat.consumed,
                        goal: nutritionData.fat.goal,
                        bar: "bg-gradient-to-r from-emerald-600 to-emerald-400",
                      },
                    ].map((row) => {
                      const g = row.goal && row.goal > 0 ? row.goal : 0;
                      const pct = g > 0 ? Math.min(100, (row.cur / g) * 100) : 0;
                      return (
                        <div key={row.label}>
                          <div className="flex justify-between text-[10px] uppercase tracking-wide fc-text-dim mb-0.5">
                            <span>{row.label}</span>
                            <span className="font-mono tabular-nums">
                              {Math.round(row.cur)}
                              {g > 0 ? ` / ${g}g` : ""}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-[color:var(--fc-surface-sunken)] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${row.bar}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                className="w-full fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] backdrop-blur-[8px] shadow-[var(--fc-shadow-card)] p-4 flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[color:var(--fc-accent-cyan)]" />
                  <span className="font-semibold fc-text-primary">Nutrition Trends</span>
                </div>
                {nutritionTrendsOpen ? <ChevronUp className="w-5 h-5 fc-text-dim" /> : <ChevronDown className="w-5 h-5 fc-text-dim" />}
              </button>
              {nutritionTrendsOpen && (
                <div className="fc-surface rounded-b-2xl border border-t-0 border-[color:var(--fc-glass-border)] backdrop-blur-[8px] p-4 mt-0">
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
                                ? "bg-cyan-600 dark:bg-cyan-500 text-white"
                                : m === "carbs"
                                  ? "bg-amber-500 dark:bg-amber-600 text-white"
                                  : "bg-emerald-600 dark:bg-emerald-500 text-white";
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
                                ? "bg-cyan-500/70 dark:bg-cyan-400/70"
                                : nutritionTrendsMetric === "carbs"
                                  ? "bg-amber-500/70 dark:bg-amber-400/70"
                                  : "bg-emerald-500/70 dark:bg-emerald-400/70";
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
