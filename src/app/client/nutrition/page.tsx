"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { NutritionRing } from "@/components/ui/NutritionRing";
import { MacroBars } from "@/components/ui/MacroBars";
import { WaterTracker } from "@/components/ui/WaterTracker";
import { Button } from "@/components/ui/button";
import {
  Apple,
  Coffee,
  Plus,
  ChevronRight,
  TrendingUp,
  Lightbulb,
  Camera,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface NutritionData {
  calories: { consumed: number; goal: number };
  protein: { consumed: number; goal: number };
  carbs: { consumed: number; goal: number };
  fat: { consumed: number; goal: number };
  water: { glasses: number; goal: number };
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

interface NutritionInsight {
  type: "success" | "warning" | "info";
  message: string;
  icon: string;
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
    water: { glasses: 0, goal: 8 },
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

  const [insights, setInsights] = useState<NutritionInsight[]>([]);
  const [refreshing, setRefreshing] = useState(false);
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

  // Generate smart nutrition insights - only when there's an active plan
  useEffect(() => {
    if (hasActivePlan === true) {
      generateInsights();
    } else {
      setInsights([]); // Clear insights when no active plan
    }
  }, [nutritionData, hasActivePlan]);

  const loadTodayMeals = async () => {
    if (!user?.id) return;

    try {
      setLoadingMeals(true);
      const today = new Date().toISOString().split("T")[0];

      // STEP 1: Get active meal plan assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from("meal_plan_assignments")
        .select("meal_plan_id")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (assignmentError || !assignment) {
        // No active plan – clear meals and zero out today's intake
        setHasActivePlan(false);
        setMeals([]);
        setNutritionData((prev) => ({
          ...prev,
          calories: { ...prev.calories, consumed: 0 },
          protein: { ...prev.protein, consumed: 0 },
          carbs: { ...prev.carbs, consumed: 0 },
          fat: { ...prev.fat, consumed: 0 },
        }));
        setLoadingMeals(false);
        return;
      }

      setHasActivePlan(true);

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
        // Active plan but no meals -> zero intake
        setNutritionData((prev) => ({
          ...prev,
          calories: { ...prev.calories, consumed: 0 },
          protein: { ...prev.protein, consumed: 0 },
          carbs: { ...prev.carbs, consumed: 0 },
          fat: { ...prev.fat, consumed: 0 },
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

        // 3c: Get today's completion for this meal
        const { data: completions } = await supabase
          .from("meal_completions")
          .select("*")
          .eq("meal_id", meal.id)
          .eq("client_id", user.id)
          .gte("completed_at", `${today}T00:00:00`)
          .lt("completed_at", `${today}T23:59:59`);

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
          logged: !!(completions && completions.length > 0),
          photoUrl:
            completions && completions.length > 0
              ? completions[0].photo_url
              : undefined,
          logged_at:
            completions && completions.length > 0
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
        calories: { ...prev.calories, consumed: totalCalories },
        protein: { ...prev.protein, consumed: totalProtein },
        carbs: { ...prev.carbs, consumed: totalCarbs },
        fat: { ...prev.fat, consumed: totalFat },
      }));

      setMeals(mealsWithData);
    } catch (error) {
      console.error("Error loading meals:", error);
    } finally {
      setLoadingMeals(false);
    }
  };

  const generateInsights = () => {
    // Don't generate insights if there's no active plan
    if (hasActivePlan !== true) {
      setInsights([]);
      return;
    }

    const newInsights: NutritionInsight[] = [];
    const { calories, protein, carbs } = nutritionData;

    // Calorie insight
    const calorieProgress = (calories.consumed / calories.goal) * 100;
    if (calorieProgress < 50) {
      newInsights.push({
        type: "warning",
        message: `You are ${
          calories.goal - calories.consumed
        } calories below your goal. Make sure to fuel your workouts!`,
        icon: "⚡",
      });
    } else if (calorieProgress >= 90 && calorieProgress <= 110) {
      newInsights.push({
        type: "success",
        message: "Perfect! You are right on track with your calorie target.",
        icon: "🎯",
      });
    }

    // Protein insight
    const proteinProgress = (protein.consumed / protein.goal) * 100;
    if (proteinProgress >= 80) {
      newInsights.push({
        type: "success",
        message: "Great protein intake! This will help with muscle recovery.",
        icon: "💪",
      });
    } else if (proteinProgress < 50) {
      newInsights.push({
        type: "info",
        message: `Consider adding ${Math.ceil(
          (protein.goal - protein.consumed) / 30
        )} more protein-rich meals today.`,
        icon: "🥩",
      });
    }

    // Hydration insight
    if (nutritionData.water.glasses >= nutritionData.water.goal) {
      newInsights.push({
        type: "success",
        message: "Excellent hydration! Your body will thank you.",
        icon: "💧",
      });
    }

    setInsights(newInsights);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate data fetch
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleGlassAdded = () => {
    setNutritionData((prev) => ({
      ...prev,
      water: {
        ...prev.water,
        glasses: Math.min(prev.water.glasses + 1, prev.water.goal),
      },
    }));
  };

  const handleGlassRemoved = () => {
    setNutritionData((prev) => ({
      ...prev,
      water: { ...prev.water, glasses: Math.max(prev.water.glasses - 1, 0) },
    }));
  };

  const handleMealPhotoUpload = async (mealId: string, mealType: string) => {
    if (!user) return;

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
        // Upload to Supabase storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${mealType}_${Date.now()}.${fileExt}`;
        const filePath = `meal-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("meal-photos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Error uploading meal photo:", uploadError);
          alert("Failed to upload photo. Please try again.");
          setUploadingMeal(null);
          return;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("meal-photos").getPublicUrl(filePath);

        // Here you would typically save the meal log to your database
        // For now, we'll just update the local state
        setMeals((prev) =>
          prev.map((meal) =>
            meal.id === mealId
              ? {
                  ...meal,
                  logged: true,
                  photoUrl: publicUrl,
                }
              : meal
          )
        );

        // TODO: Save meal log to database with photo URL
        // await supabase.from('meal_logs').insert({
        //   client_id: user.id,
        //   meal_type: mealType,
        //   photo_url: publicUrl,
        //   logged_at: new Date().toISOString(),
        // });

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

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="mb-8">
          <GlassCard elevation={1} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1
                  className="text-3xl font-bold mb-1"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Nutrition Tracking
                </h1>
                <p
                  className="text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <Link href="/client/nutrition/log">
                <Button
                  variant="default"
                  size="lg"
                  className="flex items-center gap-2"
                  style={{
                    background: getSemanticColor("success").gradient,
                    boxShadow: `0 4px 12px ${
                      getSemanticColor("success").primary
                    }30`,
                  }}
                >
                  <Plus className="w-5 h-5" />
                  <span
                    className="font-semibold"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Log Food
                  </span>
                </Button>
              </Link>
            </div>
          </GlassCard>
        </div>

        {/* Smart Insights - only show when there's an active plan */}
        {!loadingMeals && hasActivePlan === true && insights.length > 0 && (
          <GlassCard elevation={2} className="p-4 mb-6">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isDark
                    ? "rgba(255, 167, 38, 0.15)"
                    : "rgba(255, 167, 38, 0.1)",
                }}
              >
                <Lightbulb
                  className="w-5 h-5"
                  style={{ color: getSemanticColor("warning").primary }}
                />
              </div>
              <div className="flex-1">
                <h3
                  className="font-semibold mb-2"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Smart Insights
                </h3>
                <div className="space-y-2">
                  {insights.map((insight, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 rounded-lg"
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.03)",
                      }}
                    >
                      <span className="text-xl flex-shrink-0">
                        {insight.icon}
                      </span>
                      <p
                        className="text-sm"
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.8)"
                            : "rgba(0,0,0,0.8)",
                        }}
                      >
                        {insight.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Set Goal Button - show when no active plan */}
        {!loadingMeals && hasActivePlan === false && (
          <GlassCard elevation={2} className="p-6 mb-6">
            <div className="text-center">
              <div className="mb-4">
                <h2
                  className="text-xl font-semibold mb-2"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  No Nutrition Goals Set
                </h2>
                <p
                  className="text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                  }}
                >
                  Set your nutrition goals to start tracking your progress
                </p>
              </div>
              <Link href="/client/goals">
                <Button
                  variant="default"
                  size="lg"
                  className="flex items-center gap-2 mx-auto"
                  style={{
                    background: getSemanticColor("success").gradient,
                    boxShadow: `0 4px 12px ${
                      getSemanticColor("success").primary
                    }30`,
                  }}
                >
                  <TrendingUp className="w-5 h-5" />
                  <span
                    className="font-semibold"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Set Nutrition Goals
                  </span>
                </Button>
              </Link>
            </div>
          </GlassCard>
        )}

        {/* Main Content Grid - only show summary if there is an active meal plan */}
        {loadingMeals ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <GlassCard elevation={2} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-24 bg-slate-200 rounded" />
              </div>
            </GlassCard>
            <GlassCard elevation={2} className="p-6 lg:col-span-2">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-20 bg-slate-200 rounded" />
              </div>
            </GlassCard>
          </div>
        ) : hasActivePlan ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Calorie Ring */}
            <div className="lg:col-span-1">
              <GlassCard elevation={2} className="p-6">
                <h2
                  className="text-lg font-semibold mb-4"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Today&apos;s Calories
                </h2>
                <NutritionRing
                  consumed={nutritionData.calories.consumed}
                  goal={nutritionData.calories.goal}
                />
              </GlassCard>
            </div>

            {/* Macros */}
            <div className="lg:col-span-2">
              <GlassCard elevation={2} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Macros
                  </h2>
                  <button
                    className="text-sm font-medium flex items-center gap-1 hover:underline"
                    style={{ color: getSemanticColor("trust").primary }}
                  >
                    Adjust Goals
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <MacroBars
                  protein={nutritionData.protein}
                  carbs={nutritionData.carbs}
                  fat={nutritionData.fat}
                />
              </GlassCard>
            </div>
          </div>
        ) : null}

        {/* Meals Section - Main Element */}
        <GlassCard elevation={2} className="p-6 mb-6">
          <h2
            className="text-2xl font-bold mb-4"
            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
          >
            Today&apos;s Meals
          </h2>

          {/* Empty states */}
          {!loadingMeals &&
            (hasActivePlan === false || hasMealsInPlan === false) && (
              <p
                className="text-sm mb-2"
                style={{
                  color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                }}
              >
                {hasActivePlan === false
                  ? "No active meal plan assigned. Contact your coach to set one up."
                  : "Your active meal plan has no meals configured yet."}
              </p>
            )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="p-4 rounded-lg border transition-all hover:shadow-md"
                style={{
                  background: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.02)",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{meal.emoji}</span>
                  <div className="flex-1">
                    <h3
                      className="font-semibold"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(0,0,0,0.9)",
                      }}
                    >
                      {meal.name}
                    </h3>
                    {meal.logged && meal.items.length > 0 && (
                      <p
                        className="text-sm"
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(0,0,0,0.5)",
                        }}
                      >
                        {meal.items.reduce(
                          (sum, item) => sum + item.calories,
                          0
                        )}{" "}
                        cal
                      </p>
                    )}
                  </div>
                </div>

                {meal.photoUrl && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <img
                      src={meal.photoUrl}
                      alt={`${meal.name} photo`}
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}

                {meal.logged && meal.items.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {meal.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between text-sm py-2 border-b"
                        style={{
                          borderColor: isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.1)",
                        }}
                      >
                        <div className="flex-1">
                          <span
                            className="font-medium block"
                            style={{
                              color: isDark
                                ? "rgba(255,255,255,0.9)"
                                : "rgba(0,0,0,0.9)",
                            }}
                          >
                            {item.food?.name || "Unknown Food"}
                          </span>
                          <span
                            className="text-xs mt-1 block"
                            style={{
                              color: isDark
                                ? "rgba(255,255,255,0.6)"
                                : "rgba(0,0,0,0.6)",
                            }}
                          >
                            {item.quantity}{" "}
                            {item.food?.serving_unit || "serving"}
                            {item.quantity !== 1 ? "s" : ""}
                            {item.food?.serving_size &&
                              ` (${item.food.serving_size}g per serving)`}
                          </span>
                        </div>
                        <div className="text-right ml-4">
                          <span
                            className="font-semibold block"
                            style={{
                              color: isDark
                                ? "rgba(255,255,255,0.9)"
                                : "rgba(0,0,0,0.9)",
                            }}
                          >
                            {item.calories} cal
                          </span>
                          <span
                            className="text-xs mt-1 block"
                            style={{
                              color: isDark
                                ? "rgba(255,255,255,0.6)"
                                : "rgba(0,0,0,0.6)",
                            }}
                          >
                            P:{item.protein}g C:{item.carbs}g F:{item.fat}g
                          </span>
                        </div>
                      </div>
                    ))}
                    <div
                      className="mt-3 pt-3 text-sm font-semibold flex justify-between items-center"
                      style={{
                        borderTop: `2px solid ${
                          isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"
                        }`,
                        color: isDark
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(0,0,0,0.9)",
                      }}
                    >
                      <span>Total:</span>
                      <span>
                        {meal.items.reduce(
                          (sum, item) => sum + item.calories,
                          0
                        )}{" "}
                        cal | P:{" "}
                        {meal.items.reduce(
                          (sum, item) => sum + item.protein,
                          0
                        )}
                        g | C:{" "}
                        {meal.items.reduce((sum, item) => sum + item.carbs, 0)}g
                        | F:{" "}
                        {meal.items.reduce((sum, item) => sum + item.fat, 0)}g
                      </span>
                    </div>
                  </div>
                ) : meal.logged && meal.photoUrl ? (
                  <div className="mb-3">
                    <p
                      className="text-sm text-center mb-2"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(0,0,0,0.7)",
                      }}
                    >
                      Meal photo uploaded - awaiting analysis
                    </p>
                  </div>
                ) : (
                  <p
                    className="text-sm mb-3 text-center"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.5)",
                    }}
                  >
                    No food logged yet
                  </p>
                )}

                <Button
                  variant="default"
                  size="lg"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => handleMealPhotoUpload(meal.id, meal.type)}
                  disabled={uploadingMeal === meal.id}
                  style={{
                    background: meal.logged
                      ? isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)"
                      : getSemanticColor("success").gradient,
                    color: meal.logged
                      ? isDark
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.7)"
                      : "#fff",
                  }}
                >
                  {uploadingMeal === meal.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : meal.logged ? (
                    <>
                      <Camera className="w-5 h-5" />
                      <span>Update Photo</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      <span>Log {meal.name} with Photo</span>
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Water Tracker - Moved After Meals */}
        <GlassCard elevation={2} className="p-6">
          <WaterTracker
            glasses={nutritionData.water.glasses}
            goal={nutritionData.water.goal}
            onGlassAdded={handleGlassAdded}
            onGlassRemoved={handleGlassRemoved}
          />
        </GlassCard>
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
