"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Coffee, Apple, Utensils, Zap } from "lucide-react";
import Link from "next/link";

interface MealItem {
  id: string;
  meal_id: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories_per_unit: number;
  protein_per_unit: number;
  carbs_per_unit: number;
  fat_per_unit: number;
  order_index: number;
}

interface Meal {
  id: string;
  meal_plan_id: string;
  name: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  notes?: string;
  order_index: number;
  meal_items?: MealItem[];
}

const getMealIcon = (mealType: string) => {
  switch (mealType) {
    case "breakfast":
      return Coffee;
    case "lunch":
      return Apple;
    case "dinner":
      return Utensils;
    case "snack":
      return Zap;
    default:
      return Utensils;
  }
};

const getMealTypeColor = (mealType: string) => {
  switch (mealType) {
    case "breakfast":
      return "bg-orange-500";
    case "lunch":
      return "bg-green-500";
    case "dinner":
      return "bg-blue-500";
    case "snack":
      return "bg-purple-500";
    default:
      return "bg-gray-500";
  }
};

export default function MealDetailPage() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

  const mealId = params.id as string;
  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading before attempting to load meal data
    if (authLoading) {
      // Still loading auth, wait
      return;
    }

    if (!mealId) {
      setLoading(false);
      return;
    }

    if (!user?.id) {
      // Auth finished but no user - stop loading
      console.error("No user available after auth loaded");
      setLoading(false);
      return;
    }

    // All conditions met, load meal
    loadMeal();
  }, [mealId, user?.id, authLoading]);

  const loadMeal = async () => {
    try {
      setLoading(true);

      // Ensure user is available
      if (!user?.id) {
        console.error("User not available");
        setLoading(false);
        return;
      }

      // Parse meal ID - format is "mealType-meal_plan_id" (e.g., "breakfast-c034da40-3956-44f8-b157-69ed2da6ccf9")
      // UUIDs have a fixed format with 5 parts separated by dashes: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      // So we need to find where the meal type ends (first dash) and the UUID starts (next dash)
      const firstDashIndex = mealId.indexOf("-");
      if (firstDashIndex === -1) {
        throw new Error("Invalid meal ID format");
      }

      const mealType = mealId.substring(0, firstDashIndex) as
        | "breakfast"
        | "lunch"
        | "dinner"
        | "snack";
      const mealPlanId = mealId.substring(firstDashIndex + 1); // Everything after first dash is the UUID

      // Validate meal type
      if (!["breakfast", "lunch", "dinner", "snack"].includes(mealType)) {
        throw new Error("Invalid meal type");
      }

      // Load meal plan assignment to get meal_plan_id (fallback if mealPlanId from URL is invalid)
      // Use limit(1) instead of single() in case there are multiple assignments
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("meal_plan_assignments")
        .select("meal_plan_id")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assignmentError) {
        console.error("Error loading meal plan assignment:", assignmentError);
        // Don't throw, try to use mealPlanId from URL
      }

      // Use meal_plan_id from assignment as it's the source of truth
      const targetMealPlanId = assignmentData?.meal_plan_id || mealPlanId;

      if (!targetMealPlanId) {
        throw new Error("No active meal plan assignment found");
      }

      // Load meal_plan_items for this meal type and meal plan
      const { data: mealPlanItems, error: itemsError } = await supabase
        .from("meal_plan_items")
        .select(
          `
          *,
          food:foods(*)
        `
        )
        .eq("meal_plan_id", targetMealPlanId)
        .eq("meal_type", mealType);

      if (itemsError) {
        console.error("Error loading meal plan items:", itemsError);
        throw itemsError;
      }

      if (!mealPlanItems || mealPlanItems.length === 0) {
        setLoading(false);
        return;
      }

      // Construct meal items from meal_plan_items
      const servingSize = mealPlanItems[0]?.food?.serving_size || 100;
      const mealItems: MealItem[] = mealPlanItems.map((item: any) => ({
        id: item.id,
        meal_id: mealId,
        food_name: item.food?.name || "Unknown Food",
        quantity: item.quantity,
        unit: item.food?.serving_unit || "g",
        calories_per_unit: (item.food?.calories_per_serving || 0) / servingSize,
        protein_per_unit: (item.food?.protein || 0) / servingSize,
        carbs_per_unit: (item.food?.carbs || 0) / servingSize,
        fat_per_unit: (item.food?.fat || 0) / servingSize,
        order_index: item.order_index || 0,
      }));

      // Construct meal object
      const constructedMeal: Meal = {
        id: mealId,
        meal_plan_id: targetMealPlanId,
        name: mealType.charAt(0).toUpperCase() + mealType.slice(1),
        meal_type: mealType,
        order_index: 0,
        meal_items: mealItems,
      };

      setMeal(constructedMeal);
    } catch (error) {
      console.error("Error loading meal:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-5xl">
              <div className="fc-glass fc-card p-6 sm:p-10">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 w-40 rounded-full bg-[color:var(--fc-glass-highlight)]" />
                  <div className="h-10 rounded-2xl bg-[color:var(--fc-glass-highlight)]" />
                  <div className="h-48 rounded-3xl bg-[color:var(--fc-glass-highlight)]" />
                </div>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!meal) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-5xl">
              <div className="fc-glass fc-card p-10 text-center">
                <h2 className="text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                  Meal not found
                </h2>
                <p className="mt-2 text-sm text-[color:var(--fc-text-dim)]">
                  This meal is not available or has been removed.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link href="/client/nutrition">
                    <Button className="fc-btn fc-btn-secondary">
                      Back to Nutrition
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  const Icon = getMealIcon(meal.meal_type);
  const colorClass = getMealTypeColor(meal.meal_type);
  const mealItems = meal.meal_items ?? [];
  const mealTotals = mealItems.reduce(
    (acc, item) => {
      acc.calories += item.quantity * item.calories_per_unit;
      acc.protein += item.quantity * item.protein_per_unit;
      acc.carbs += item.quantity * item.carbs_per_unit;
      acc.fat += item.quantity * item.fat_per_unit;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const totalCalories = Math.round(mealTotals.calories);
  const totalProtein = Math.round(mealTotals.protein);
  const totalCarbs = Math.round(mealTotals.carbs);
  const totalFat = Math.round(mealTotals.fat);
  const macroCalories = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;
  const proteinPercent =
    macroCalories > 0 ? (totalProtein * 4) / macroCalories : 0;
  const carbsPercent = macroCalories > 0 ? (totalCarbs * 4) / macroCalories : 0;
  const fatPercent = macroCalories > 0 ? (totalFat * 9) / macroCalories : 0;

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-5xl space-y-8">
            <div className="flex items-center gap-3">
              <Link href="/client/nutrition">
                <Button
                  variant="outline"
                  size="icon"
                  className="fc-btn fc-btn-secondary h-10 w-10 rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                Nutrition
              </span>
            </div>

            <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colorClass}`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                      {meal.name}
                    </h1>
                    <p className="text-sm capitalize text-[color:var(--fc-text-dim)]">
                      {meal.meal_type}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="fc-glass-soft fc-card p-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                      Calories
                    </div>
                    <div className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                      {totalCalories}
                    </div>
                  </div>
                  <div className="fc-glass-soft fc-card p-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                      Protein
                    </div>
                    <div className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                      {totalProtein}g
                    </div>
                  </div>
                  <div className="fc-glass-soft fc-card p-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                      Carbs
                    </div>
                    <div className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                      {totalCarbs}g
                    </div>
                  </div>
                  <div className="fc-glass-soft fc-card p-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                      Fat
                    </div>
                    <div className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                      {totalFat}g
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            {mealItems.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <section className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-[color:var(--fc-text-primary)]">
                      Ingredients
                    </h3>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Per-item breakdown with macro split.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {mealItems.map((item) => {
                      const itemCalories = Math.round(
                        item.quantity * item.calories_per_unit
                      );
                      const itemProtein = Math.round(
                        item.quantity * item.protein_per_unit
                      );
                      const itemCarbs = Math.round(
                        item.quantity * item.carbs_per_unit
                      );
                      const itemFat = Math.round(
                        item.quantity * item.fat_per_unit
                      );
                      const itemMacroCalories =
                        itemProtein * 4 + itemCarbs * 4 + itemFat * 9;
                      const itemProteinPercent =
                        itemMacroCalories > 0
                          ? (itemProtein * 4) / itemMacroCalories
                          : 0;
                      const itemCarbsPercent =
                        itemMacroCalories > 0
                          ? (itemCarbs * 4) / itemMacroCalories
                          : 0;
                      const itemFatPercent =
                        itemMacroCalories > 0
                          ? (itemFat * 9) / itemMacroCalories
                          : 0;

                      return (
                        <div key={item.id} className="fc-glass fc-card p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                                {item.food_name}
                              </h4>
                              <p className="text-sm text-[color:var(--fc-text-dim)]">
                                {item.quantity}
                                {item.unit}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                              {itemCalories} cal
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-[96px_1fr] gap-4">
                            <div className="flex items-center justify-center">
                              <div className="relative h-20 w-20">
                                <div className="relative h-full w-full overflow-hidden rounded-full">
                                  <div
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                      background: `conic-gradient(
                                        #3b82f6 0deg ${itemProteinPercent * 360}deg,
                                        #eab308 ${itemProteinPercent * 360}deg ${
                                        (itemProteinPercent + itemCarbsPercent) * 360
                                      }deg,
                                        #f97316 ${
                                          (itemProteinPercent + itemCarbsPercent) *
                                          360
                                        }deg 360deg
                                      )`,
                                    }}
                                  />
                                  <div className="absolute inset-2 rounded-full bg-[color:var(--fc-bg-basalt)] flex items-center justify-center">
                                    <div className="text-center">
                                      <div className="text-xs font-semibold text-[color:var(--fc-text-primary)]">
                                        {itemCalories}
                                      </div>
                                      <div className="text-[10px] text-[color:var(--fc-text-dim)]">
                                        cal
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                <div className="flex-1">
                                  <div className="text-xs font-semibold text-[color:var(--fc-text-primary)]">
                                    Protein
                                  </div>
                                  <div className="text-xs text-[color:var(--fc-text-dim)]">
                                    {itemProtein}g
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                                <div className="flex-1">
                                  <div className="text-xs font-semibold text-[color:var(--fc-text-primary)]">
                                    Carbs
                                  </div>
                                  <div className="text-xs text-[color:var(--fc-text-dim)]">
                                    {itemCarbs}g
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                                <div className="flex-1">
                                  <div className="text-xs font-semibold text-[color:var(--fc-text-primary)]">
                                    Fat
                                  </div>
                                  <div className="text-xs text-[color:var(--fc-text-dim)]">
                                    {itemFat}g
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <GlassCard elevation={2} className="fc-glass fc-card p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                        Meal totals
                      </h3>
                      <p className="text-sm text-[color:var(--fc-text-dim)]">
                        Macro distribution for the full meal.
                      </p>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="relative h-40 w-40">
                        <div className="relative h-full w-full overflow-hidden rounded-full">
                          <div
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: `conic-gradient(
                                #3b82f6 0deg ${proteinPercent * 360}deg,
                                #eab308 ${proteinPercent * 360}deg ${
                                (proteinPercent + carbsPercent) * 360
                              }deg,
                                #f97316 ${
                                  (proteinPercent + carbsPercent) * 360
                                }deg 360deg
                              )`,
                            }}
                          />
                          <div className="absolute inset-4 rounded-full bg-[color:var(--fc-bg-basalt)] flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-xl font-semibold text-[color:var(--fc-text-primary)]">
                                {totalCalories}
                              </div>
                              <div className="text-xs text-[color:var(--fc-text-dim)]">
                                calories
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm font-semibold text-[color:var(--fc-text-primary)]">
                            <span>Protein</span>
                            <span>{totalProtein}g</span>
                          </div>
                          <div className="text-xs text-[color:var(--fc-text-dim)]">
                            {macroCalories > 0
                              ? Math.round((totalProtein * 4 * 100) / macroCalories)
                              : 0}
                            % of calories
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-yellow-400" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm font-semibold text-[color:var(--fc-text-primary)]">
                            <span>Carbs</span>
                            <span>{totalCarbs}g</span>
                          </div>
                          <div className="text-xs text-[color:var(--fc-text-dim)]">
                            {macroCalories > 0
                              ? Math.round((totalCarbs * 4 * 100) / macroCalories)
                              : 0}
                            % of calories
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-orange-500" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm font-semibold text-[color:var(--fc-text-primary)]">
                            <span>Fat</span>
                            <span>{totalFat}g</span>
                          </div>
                          <div className="text-xs text-[color:var(--fc-text-dim)]">
                            {macroCalories > 0
                              ? Math.round((totalFat * 9 * 100) / macroCalories)
                              : 0}
                            % of calories
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            ) : (
              <div className="fc-glass fc-card p-12 text-center">
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  No ingredients added yet.
                </p>
              </div>
            )}

            {meal.notes && (
              <GlassCard elevation={1} className="fc-glass fc-card p-6">
                <h3 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                  Notes
                </h3>
                <p className="mt-2 text-sm text-[color:var(--fc-text-dim)] leading-relaxed">
                  {meal.notes}
                </p>
              </GlassCard>
            )}
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
