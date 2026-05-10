"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Button } from "@/components/ui/button";
import { Eyebrow, IconButton } from "@/components/client-ui";
import {
  Droplet,
  BarChart3,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  Bell,
  Plus,
  Clock,
  Target,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ClientPageShell } from "@/components/client-ui";
import { cn } from "@/lib/utils";
import { GoalWizard } from "@/components/goals/GoalWizard";
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
import { FuelDaySummaryCard } from "@/app/client/nutrition/FuelDaySummaryCard";
import fuelStyles from "@/app/client/nutrition/fuelPage.module.css";

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

function formatFuelDateShort(d: Date = new Date()): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function NutritionDashboardContent() {
  const { user, profile } = useAuth();
  const router = useRouter();
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

  const getAvatarUrl = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    if (profile?.first_name) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.first_name}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || "User"}`;
  };

  /** TODO(product): wire unread state when notifications backend exists. */
  const hasUnreadNotifications = false;
  const notificationsHref = "/client";

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
      await runMealsLoad();
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
        goalsList = goalsFromRpc.map((g) => ({
          ...g,
          pillar: (g as { pillar?: string }).pillar ?? "nutrition",
        }));
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
            category: "nutrition",
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

  const fuelChipBase =
    "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.1em] border shrink-0 transition-colors";
  const fuelChipActive = "bg-[color-mix(in_srgb,var(--fc-accent-cyan)_20%,transparent)] text-[color:var(--fc-accent-cyan)] border-[color-mix(in_srgb,var(--fc-accent-cyan)_30%,transparent)]";
  const fuelChipInactive = "fc-glass-soft fc-text-dim border-[color:var(--fc-glass-border)]";

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      <ClientPageShell className="max-w-lg mx-auto flex flex-col overflow-x-hidden px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
        <header className={fuelStyles.topbar}>
          <button
            type="button"
            className={fuelStyles.avatarBtn}
            onClick={() => {
              window.location.href = "/client/me";
            }}
            aria-label="Open profile"
          >
            <img src={getAvatarUrl()} alt="" />
          </button>
          <IconButton
            size="md"
            variant="ghost"
            className="btn-ghost-icon shrink-0 border-transparent"
            aria-label="Notifications"
            showDot={hasUnreadNotifications}
            onClick={() => {
              window.location.href = notificationsHref;
            }}
          >
            <Bell className="h-5 w-5 fc-text-dim" strokeWidth={1.5} />
          </IconButton>
        </header>
        <header className={fuelStyles.pageHeader}>
          <div className={fuelStyles.headerLeft}>
            <div className={fuelStyles.todayEyebrowWrap}>
              <Eyebrow tone="lime" dashboardEyebrow>
                Today · {formatFuelDateShort()}
              </Eyebrow>
            </div>
            <h1 className={fuelStyles.fuelTitle}>Fuel</h1>
          </div>
          <div className={fuelStyles.headerActions}>
            <button
              type="button"
              className={fuelStyles.pillAddFood}
              onClick={() => router.push("/client/nutrition/foods/create")}
            >
              <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
              Add food
            </button>
            <button
              type="button"
              className={fuelStyles.pillHistory}
              onClick={() => router.push("/client/progress/nutrition")}
            >
              <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              History
            </button>
          </div>
        </header>
        {nutritionGoals.length === 0 && !loadingMeals && (
          <div className={fuelStyles.goalPrompt}>
            <div className={fuelStyles.goalPromptInner}>
              <div className={fuelStyles.goalPromptIcon} aria-hidden>
                <Target className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={fuelStyles.goalPromptTitle}>No goals set</p>
                <p className={fuelStyles.goalPromptSub}>Track your nutrition with personalized targets</p>
              </div>
              <button type="button" className={fuelStyles.goalPromptCta} onClick={() => setShowAddGoalModal(true)}>
                Set up →
              </button>
            </div>
          </div>
        )}
        {mealsLoadError && !loadingMeals && (
          <div className="py-8 px-4 text-center">
            <p className="text-sm fc-text-dim mb-1">{mealsLoadError}</p>
            <p className="text-xs fc-text-subtle mb-4">Tap retry to reload today&apos;s plan.</p>
            <Button
              type="button"
              variant="fc-secondary"
              className="mx-auto h-10 w-full max-w-xs"
              onClick={() => runMealsLoad()}
            >
              Retry
            </Button>
          </div>
        )}
        {loadingMeals ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-3 animate-pulse space-y-2"
              >
                <div className="h-3 rounded w-1/2 bg-white/10" />
                <div className="h-16 rounded-lg bg-white/10" />
              </div>
            ))}
          </div>
        ) : !hasActivePlan ? (
          <>
            <div className="py-8 px-4 text-center rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft">
              <UtensilsCrossed className="mx-auto mb-3 h-10 w-10 fc-text-subtle" aria-hidden />
              <p className="text-sm fc-text-dim mb-1">No meal plan</p>
              <p className="text-xs fc-text-dim">Ask your coach to assign a meal plan.</p>
            </div>
          </>
        ) : (
          <>
            {/* Plan picker: compact dropdown when client has multiple active plans (Phase N4) */}
            {activeAssignments.length > 1 && (
              <section>
                <label
                  htmlFor="fuel-plan-picker"
                  className="text-[10px] font-bold uppercase tracking-wider fc-text-dim mb-2 block"
                >
                  Today&apos;s plan
                </label>
                <select
                  id="fuel-plan-picker"
                  value={activeAssignmentId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) handlePlanSelect(id);
                  }}
                  className="w-full h-11 min-h-[44px] px-3 rounded-lg border border-[color:var(--fc-glass-border)] fc-glass-soft text-sm font-medium fc-text-primary appearance-none cursor-pointer"
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

            <FuelDaySummaryCard
              planName={activeMealPlanInfo?.name ?? "Meal Plan"}
              dateLabel={formatFuelDateShort()}
              loggedMeals={meals.filter((m) => m.logged).length}
              totalMeals={meals.length}
              caloriesConsumed={nutritionData.calories.consumed}
              caloriesGoal={nutritionData.calories.goal}
              protein={{ consumed: nutritionData.protein.consumed, goal: nutritionData.protein.goal }}
              carbs={{ consumed: nutritionData.carbs.consumed, goal: nutritionData.carbs.goal }}
              fat={{ consumed: nutritionData.fat.consumed, goal: nutritionData.fat.goal }}
            />

            <section className={fuelStyles.waterCard} aria-label="Water intake">
              <div className={fuelStyles.waterHead}>
                <div className={fuelStyles.waterHeadLeft}>
                  <Droplet className="h-4 w-4 shrink-0 text-[color:var(--fc-accent-cyan)]" aria-hidden />
                  <span className={fuelStyles.waterLabel}>Water</span>
                </div>
                <div className={fuelStyles.waterVal}>
                  <span className={fuelStyles.waterCurrent}>{nutritionData.water.ml.toLocaleString()}</span>
                  <span className={fuelStyles.waterSep}>/</span>
                  <span className={fuelStyles.waterTarget}>
                    {nutritionData.water.goalMl > 0 ? nutritionData.water.goalMl.toLocaleString() : "—"}
                  </span>
                  <span className={fuelStyles.waterUnit}>mL</span>
                </div>
              </div>
              <div className={fuelStyles.dropletRow}>
                {Array.from({ length: Math.min(displayedWaterGlasses, 16) }).map((_, index) => {
                  const isActive = index < nutritionData.water.glasses;
                  const glassNumber = index + 1;
                  const isGoalGlass = glassNumber <= waterGoalGlasses;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleWaterGlassClick(glassNumber)}
                      className={cn(
                        fuelStyles.dropletBtn,
                        isActive ? fuelStyles.dropletBtnActive : fuelStyles.dropletBtnInactive,
                        isActive &&
                          isGoalGlass &&
                          "ring-1 ring-[color:color-mix(in_srgb,var(--fc-accent-cyan)_35%,transparent)]"
                      )}
                      aria-label={isActive ? `Water ${glassNumber}, logged` : `Log water glass ${glassNumber}`}
                    >
                      <Droplet className="h-4 w-4" />
                    </button>
                  );
                })}
                {displayedWaterGlasses < 16 && nutritionData.water.glasses >= displayedWaterGlasses && (
                  <button
                    type="button"
                    onClick={() => handleWaterGlassClick(nutritionData.water.glasses + 1)}
                    className={fuelStyles.waterAddBtn}
                  >
                    <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Add
                  </button>
                )}
              </div>
            </section>

            {hasMealsInPlan && (
              <section className={fuelStyles.mealsStack}>
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
                      onOpenMealDetails={() => router.push(`/client/nutrition/meals/${meal.id}`)}
                      onFoodClick={(foodId) => router.push(`/client/nutrition/foods/${foodId}`)}
                    />
                  );
                })}
              </section>
            )}

            {hasActivePlan && hasMealsInPlan === false && !loadingMeals && (
              <div className="py-8 px-4 text-center">
                <p className="text-sm fc-text-dim">No meals in this plan yet.</p>
                <p className="text-xs fc-text-subtle mt-1">Your coach can add meals to this plan.</p>
              </div>
            )}

            <section className={fuelStyles.trendsCard}>
              <button
                type="button"
                onClick={() => setNutritionTrendsOpen((o) => !o)}
                className={fuelStyles.trendsHead}
              >
                <div className={fuelStyles.trendsHeadLeft}>
                  <BarChart3 className="h-3.5 w-3.5 shrink-0 text-[color:var(--fc-text-dim)]" aria-hidden />
                  <span className={fuelStyles.trendsTitle}>Nutrition trends</span>
                </div>
                {nutritionTrendsOpen ? (
                  <ChevronUp className="h-5 w-5 shrink-0 fc-text-dim" aria-hidden />
                ) : (
                  <ChevronDown className="h-5 w-5 shrink-0 fc-text-dim" aria-hidden />
                )}
              </button>
              {!nutritionTrendsOpen ? (
                <div className={fuelStyles.trendsEmpty}>
                  <p className={fuelStyles.trendsEmptyPrimary}>Start logging meals to see trends</p>
                  <p className={fuelStyles.trendsEmptySecondary}>Your last 30 days will appear here</p>
                </div>
              ) : null}
              {nutritionTrendsOpen && (
                <div className={fuelStyles.trendsBody}>
                  {nutritionTrends.length === 0 ? (
                    <div className={fuelStyles.trendsEmpty}>
                      <p className={fuelStyles.trendsEmptyPrimary}>Start logging meals to see trends</p>
                      <p className={fuelStyles.trendsEmptySecondary}>Your last 30 days will appear here</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wider fc-text-subtle mb-2">Metric</p>
                      <div className="-mx-1 px-1 mb-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        <div className="flex flex-wrap gap-2 min-w-min">
                          {(["calories", "protein", "carbs", "fat"] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setNutritionTrendsMetric(m)}
                              className={cn(
                                fuelChipBase,
                                nutritionTrendsMetric === m ? fuelChipActive : fuelChipInactive
                              )}
                            >
                              {m === "calories" ? "Calories" : m === "protein" ? "Protein" : m === "carbs" ? "Carbs" : "Fat"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative h-40 flex items-end gap-0.5">
                        {nutritionTrends.map((day) => {
                          const val = day[nutritionTrendsMetric];
                          const maxVal = Math.max(...nutritionTrends.map((d) => d[nutritionTrendsMetric]), 1);
                          const height = (val / maxVal) * 100;
                          const barClass =
                            nutritionTrendsMetric === "calories"
                              ? "bg-[color:var(--fc-accent-cyan)]/70"
                              : nutritionTrendsMetric === "protein"
                                ? "bg-[color:var(--fc-macro-protein,var(--fc-accent-cyan))]/70"
                                : nutritionTrendsMetric === "carbs"
                                  ? "bg-[color:var(--fc-macro-carbs,#fbbf24)]/70"
                                  : "bg-[color:var(--fc-macro-fat,#34d399)]/70";
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
                      <p className="text-xs fc-text-subtle mt-2">
                        Last 30 days · {nutritionTrendsMetric === "calories" ? "kcal" : "g"}
                      </p>
                      {(() => {
                        const last7 = nutritionTrends.slice(-7);
                        const weekAvg = last7.length > 0
                          ? Math.round(last7.reduce((s, d) => s + d[nutritionTrendsMetric], 0) / last7.length)
                          : 0;
                        const target = nutritionTrendsMetric === "calories" ? nutritionTrendsTarget : null;
                        return (
                          <p className="text-sm fc-text-dim mt-1">
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

        {!loadingMeals && (
          <p className={fuelStyles.footerNote}>
            All portions are for raw / uncooked ingredients
          </p>
        )}

        {nutritionGoals.length > 0 && (
          <section id="fuel-goals-section">
            <div className="rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-base font-semibold fc-text-primary tracking-tight">
                  Goals
                  <span className="fc-text-subtle font-normal ml-1 text-sm">
                    ·{" "}
                    {Math.round(
                      nutritionGoals.reduce((s, g) => s + (g.progress_percentage ?? 0), 0) / nutritionGoals.length
                    )}
                    % adherence
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => router.push("/client/goals")}
                  className="text-sm font-medium text-[color:var(--fc-accent-cyan)] hover:underline min-h-[44px] px-1"
                >
                  Manage
                </button>
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
                className="w-full mt-3 min-h-11 h-11 rounded-lg border-[color-mix(in_srgb,var(--fc-accent-cyan)_30%,transparent)] text-[color:var(--fc-accent-cyan)] bg-[color-mix(in_srgb,var(--fc-accent-cyan)_5%,transparent)] hover:bg-[color-mix(in_srgb,var(--fc-accent-cyan)_15%,transparent)]"
              >
                + Add goal
              </Button>
            </div>
          </section>
        )}
        <GoalWizard
          open={showAddGoalModal}
          onClose={() => setShowAddGoalModal(false)}
          initialCategory="nutrition"
          onSuccess={() => loadWaterGoal()}
        />
      </ClientPageShell>
    </AnimatedBackground>
  );
}

export default function NutritionDashboard() {
  return (
    <ProtectedRoute requiredRole="client">
      <NutritionDashboardContent />
    </ProtectedRoute>
  );
}
