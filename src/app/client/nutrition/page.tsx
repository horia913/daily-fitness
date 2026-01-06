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
}

function NutritionDashboardContent() {
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [nutritionData, setNutritionData] = useState<NutritionData>({
    // Start with zero actual intake; goals are static defaults
    calories: { consumed: 0, goal: 2200 },
    protein: { consumed: 0, goal: 150 },
    carbs: { consumed: 0, goal: 250 },
    fat: { consumed: 0, goal: 70 },
    water: { glasses: 0, goal: 8, ml: 0, goalMl: 3000 }, // 8 glasses = 3000ml (375ml per glass)
  });

  const [meals, setMeals] = useState<Meal[]>([
    {
      id: "1",
      type: "breakfast",
      name: "Breakfast",
      emoji: "🍳",
      items: [],
      logged: false,
    },
    {
      id: "2",
      type: "lunch",
      name: "Lunch",
      emoji: "🥗",
      items: [],
      logged: false,
    },
    {
      id: "3",
      type: "dinner",
      name: "Dinner",
      emoji: "🍽️",
      items: [],
      logged: false,
    },
    {
      id: "4",
      type: "snack",
      name: "Snacks",
      emoji: "🍎",
      items: [],
      logged: false,
    },
  ]);

  const [uploadingMeal, setUploadingMeal] = useState<string | null>(null);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [hasActivePlan, setHasActivePlan] = useState<boolean | null>(null);
  const [hasMealsInPlan, setHasMealsInPlan] = useState<boolean | null>(null);

  // Load today's meal logs
  useEffect(() => {
    if (user) {
      loadTodayMeals();
    }
  }, [user]);

  const loadTodayMeals = async () => {
    if (!user?.id) return;

    try {
      setLoadingMeals(true);
      const today = new Date().toISOString().split("T")[0];

      // STEP 1: Get active meal plan assignment with meal plan details
      const { data: assignment, error: assignmentError } = await supabase
        .from("meal_plan_assignments")
        .select(
          `
          meal_plan_id,
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
        .maybeSingle();

      if (assignmentError || !assignment) {
        // No active plan – clear meals and zero out today's intake
        setHasActivePlan(false);
        setMeals([]);
        setNutritionData((prev) => ({
          ...prev,
          calories: { ...prev.calories, consumed: 0, goal: 2200 },
          protein: { ...prev.protein, consumed: 0, goal: 150 },
          carbs: { ...prev.carbs, consumed: 0, goal: 250 },
          fat: { ...prev.fat, consumed: 0, goal: 70 },
        }));
        setLoadingMeals(false);
        return;
      }

      setHasActivePlan(true);

      // Extract meal plan targets (use defaults if not set)
      const mealPlan = assignment.meal_plans as any;
      const targetCalories = mealPlan?.target_calories || 2200;
      const targetProtein = mealPlan?.target_protein || 150;
      const targetCarbs = mealPlan?.target_carbs || 250;
      const targetFat = mealPlan?.target_fat || 70;

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
        // Active plan but no meals -> zero intake, but keep meal plan targets
        setNutritionData((prev) => ({
          ...prev,
          calories: { consumed: 0, goal: targetCalories },
          protein: { consumed: 0, goal: targetProtein },
          carbs: { consumed: 0, goal: targetCarbs },
          fat: { consumed: 0, goal: targetFat },
        }));
        setLoadingMeals(false);
        return;
      }

      setHasMealsInPlan(true);

      const mealsWithData: Meal[] = [];

      // STEP 3: For each meal, get foods and today's completion
      for (const meal of planMeals) {
        // 3a: Get meal food items
        const { data: foodItems, error: foodError } = await supabase
          .from("meal_food_items")
          .select("id, quantity, unit, food_id")
          .eq("meal_id", meal.id);

        if (foodError) {
          console.error("Error fetching meal food items:", foodError);
        }

        let mappedFoodItems: MealFoodItem[] = [];
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        if (foodItems && foodItems.length > 0) {
          for (const item of foodItems as any[]) {
            // 3b: Get food details from foods table
            const { data: foodData, error: foodDetailsError } = await supabase
              .from("foods")
              .select(
                "id, name, serving_size, serving_unit, calories_per_serving, protein, carbs, fat"
              )
              .eq("id", item.food_id)
              .maybeSingle();

            if (foodDetailsError) {
              console.error("Error fetching food details:", foodDetailsError);
              continue;
            }

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
        }

        // 3c: Get today's photo log for this meal (from meal_photo_logs table)
        const { data: photoLogs } = await supabase
          .from("meal_photo_logs")
          .select("*")
          .eq("meal_id", meal.id)
          .eq("client_id", user.id)
          .eq("log_date", today);

        // Backward compatibility: also check meal_completions if no photo log
        const { data: completions } =
          photoLogs && photoLogs.length > 0
            ? { data: null }
            : await supabase
                .from("meal_completions")
                .select("*")
                .eq("meal_id", meal.id)
                .eq("client_id", user.id)
                .gte("completed_at", `${today}T00:00:00`)
                .lt("completed_at", `${today}T23:59:59`);

        // Use photo logs first, fall back to completions
        const hasPhotoLog = photoLogs && photoLogs.length > 0;
        const hasCompletion = completions && completions.length > 0;

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
            ? photoLogs[0].photo_url
            : hasCompletion
            ? completions[0].photo_url
            : undefined,
          logged_at: hasPhotoLog
            ? photoLogs[0].created_at
            : hasCompletion
            ? completions[0].completed_at
            : undefined,
        });
      }

      // Update nutrition totals based on all meals
      const totalCalories = mealsWithData.reduce(
        (sum, meal) =>
          sum +
          meal.items.reduce((itemSum, item) => itemSum + item.calories, 0),
        0
      );
      const totalProtein = mealsWithData.reduce(
        (sum, meal) =>
          sum + meal.items.reduce((itemSum, item) => itemSum + item.protein, 0),
        0
      );
      const totalCarbs = mealsWithData.reduce(
        (sum, meal) =>
          sum + meal.items.reduce((itemSum, item) => itemSum + item.carbs, 0),
        0
      );
      const totalFat = mealsWithData.reduce(
        (sum, meal) =>
          sum + meal.items.reduce((itemSum, item) => itemSum + item.fat, 0),
        0
      );

      setNutritionData((prev) => ({
        ...prev,
        calories: { consumed: totalCalories, goal: targetCalories },
        protein: { consumed: totalProtein, goal: targetProtein },
        carbs: { consumed: totalCarbs, goal: targetCarbs },
        fat: { consumed: totalFat, goal: targetFat },
      }));

      setMeals(mealsWithData);
    } catch (error) {
      console.error("Error loading meals:", error);
    } finally {
      setLoadingMeals(false);
    }
  };

  const handleWaterGlassClick = (targetGlasses: number) => {
    setNutritionData((prev) => {
      // If clicking the same number of glasses, remove one
      const newGlasses =
        targetGlasses === prev.water.glasses
          ? Math.max(prev.water.glasses - 1, 0)
          : targetGlasses;
      const newMl = newGlasses * 375; // 375ml per glass
      return {
        ...prev,
        water: {
          ...prev.water,
          glasses: newGlasses,
          ml: newMl,
        },
      };
    });
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
          setMeals((prev) =>
            prev.map((meal) =>
              meal.id === mealId
                ? {
                    ...meal,
                    logged: true,
                    photoUrl: result.photoLog!.photo_url,
                    logged_at: result.photoLog!.created_at,
                  }
                : meal
            )
          );
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
            <h1
              className={`text-3xl font-bold tracking-tight ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Nutrition Tracking
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-sm font-medium uppercase tracking-widest ${
                  isDark ? "text-neutral-400" : "text-neutral-600"
                }`}
              >
                {formattedDate}
              </span>
              {hasActivePlan && meals.length > 0 && (
                <>
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isDark ? "bg-neutral-600" : "bg-neutral-400"
                    }`}
                  ></span>
                  <span
                    className={`text-sm font-semibold ${
                      isDark ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    {getLoggedMealsCount()} of {meals.length} meals logged
                  </span>
                </>
              )}
            </div>
          </div>
          <Link href="/client/nutrition/log">
            <Button
              className="h-12 px-8 rounded-xl flex items-center justify-center gap-2 font-semibold bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/40 transition-all"
              style={{
                boxShadow: isDark
                  ? "0 4px 16px rgba(239, 68, 68, 0.3)"
                  : "0 4px 12px rgba(239, 68, 68, 0.2)",
              }}
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
                Daily Goal: {nutritionData.water.goalMl.toLocaleString()}ml (
                {nutritionData.water.goal} glasses)
              </p>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2">
              {/* Interactive glasses - show 10 total (8 goal + 2 extra for tracking beyond) */}
              {Array.from({ length: 10 }).map((_, index) => {
                const isActive = index < nutritionData.water.glasses;
                return (
                  <button
                    key={index}
                    onClick={() => handleWaterGlassClick(index + 1)}
                    className={`p-2 rounded-lg transition-all ${
                      isActive
                        ? "bg-blue-500/10 text-blue-400 active:scale-90"
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
