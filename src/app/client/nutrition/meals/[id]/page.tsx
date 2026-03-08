"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";

import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { ChevronLeft, Coffee, Apple, Utensils, Zap, Edit3, Trash2, CheckCircle2 } from "lucide-react";
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
      return "bg-amber-500";
    case "lunch":
      return "bg-[color:var(--fc-domain-meals)]";
    case "dinner":
      return "bg-violet-500";
    case "snack":
      return "bg-[color:var(--fc-accent-cyan)]";
    default:
      return "bg-[color:var(--fc-text-subtle)]";
  }
};

export default function MealDetailPage() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

  const mealId = params.id as string;
  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      setLoadError(null);
      if (!user?.id) {
        setLoading(false);
        return;
      }

      await withTimeout(
        (async () => {
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
      })(),
        30000,
        "timeout"
      );
    } catch (error) {
      console.error("Error loading meal:", error);
      setLoadError(error instanceof Error ? error.message : "Failed to load meal");
    } finally {
      setLoading(false);
    }
  };

  if (loadError) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          <div className="relative z-10 min-h-screen px-4 pb-32 pt-20 sm:px-6 lg:px-10 flex items-center justify-center">
            <div className="fc-surface rounded-2xl p-8 text-center max-w-md">
              <p className="fc-text-dim mb-4">{loadError}</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button type="button" onClick={() => { setLoadError(null); setLoading(true); loadMeal(); }} className="fc-btn fc-btn-primary">Retry</Button>
                <Button asChild variant="outline" className="fc-btn fc-btn-secondary"><Link href="/client/nutrition"><ChevronLeft className="w-4 h-4 mr-2" />Back to Nutrition</Link></Button>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-32 pt-20 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-5xl">
                <div className="fc-surface p-6 sm:p-10">
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
          <div className="relative z-10 min-h-screen px-4 pb-32 pt-20 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-5xl">
              <div className="fc-surface p-10 text-center">
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
        <div className="relative z-10 min-h-screen pb-32">
          <nav className="absolute top-6 left-6 z-20">
            <Link href="/client/nutrition">
              <button type="button" className="w-12 h-12 rounded-2xl fc-glass border border-[color:var(--fc-glass-border)] flex items-center justify-center fc-text-primary hover:fc-glass-soft transition-colors" aria-label="Back">
                <ChevronLeft className="w-6 h-6" />
              </button>
            </Link>
          </nav>

          <div className="relative h-48 sm:h-56 bg-gradient-to-b from-[color:var(--fc-glass-highlight)] to-[color:var(--fc-bg-base)] rounded-b-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--fc-bg-base)] via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex items-center gap-3 mb-2">
                <span className={`${getMealTypeColor(meal.meal_type)}/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${getMealTypeColor(meal.meal_type)}/30 text-[color:var(--fc-text-primary)]`}>
                  {meal.meal_type}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight fc-text-primary">
                {meal.name}
              </h1>
            </div>
          </div>

          <main className="px-4 sm:px-6 -mt-6 relative z-10 max-w-2xl mx-auto">
            <div className="fc-surface rounded-3xl p-6 border border-[color:var(--fc-surface-card-border)] space-y-8">
              <div className="flex justify-between items-center border-b border-[color:var(--fc-glass-border)] pb-6">
                <div>
                  <p className="text-[10px] fc-text-subtle uppercase tracking-widest font-bold mb-1">Meal</p>
                  <p className="text-lg font-semibold font-mono fc-text-primary">{meal.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] fc-text-subtle uppercase tracking-widest font-bold mb-1">Status</p>
                  <p className="fc-text-success flex items-center gap-1.5 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Logged
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-6">
                  <h3 className="text-xl font-bold fc-text-primary">Macronutrients</h3>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono fc-text-primary">{totalCalories}</span>
                    <span className="fc-text-dim text-sm ml-1">kcal</span>
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="fc-text-workouts font-medium flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[color:var(--fc-domain-workouts)]" /> Protein
                      </span>
                      <span className="font-mono">{totalProtein}g <span className="fc-text-dim text-xs">/ {Math.round(proteinPercent * 100)}%</span></span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[color:var(--fc-glass-highlight)] overflow-hidden">
                      <div className="h-full rounded-full bg-[color:var(--fc-domain-workouts)] transition-all" style={{ width: `${Math.round(proteinPercent * 100)}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="fc-text-success font-medium flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[color:var(--fc-status-success)]" /> Carbs
                      </span>
                      <span className="font-mono">{totalCarbs}g <span className="fc-text-dim text-xs">/ {Math.round(carbsPercent * 100)}%</span></span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[color:var(--fc-glass-highlight)] overflow-hidden">
                      <div className="h-full rounded-full bg-[color:var(--fc-status-success)] transition-all" style={{ width: `${Math.round(carbsPercent * 100)}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="fc-text-error font-medium flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[color:var(--fc-status-error)]" /> Fats
                      </span>
                      <span className="font-mono">{totalFat}g <span className="fc-text-dim text-xs">/ {Math.round(fatPercent * 100)}%</span></span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[color:var(--fc-glass-highlight)] overflow-hidden">
                      <div className="h-full rounded-full bg-[color:var(--fc-status-error)] transition-all" style={{ width: `${Math.round(fatPercent * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                        <div key={item.id} className="fc-surface p-4">
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
                                        var(--fc-domain-workouts) 0deg ${itemProteinPercent * 360}deg,
                                        var(--fc-status-success) ${itemProteinPercent * 360}deg ${
                                        (itemProteinPercent + itemCarbsPercent) * 360
                                      }deg,
                                        var(--fc-status-error) ${
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
                                <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--fc-domain-workouts)]" />
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
                                <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--fc-status-success)]" />
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
                                <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--fc-status-error)]" />
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

                <div className="fc-surface rounded-2xl p-6">
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
                                var(--fc-domain-workouts) 0deg ${proteinPercent * 360}deg,
                                var(--fc-status-success) ${proteinPercent * 360}deg ${
                                (proteinPercent + carbsPercent) * 360
                              }deg,
                                var(--fc-status-error) ${
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
                        <div className="h-3 w-3 rounded-full bg-[color:var(--fc-domain-workouts)]" />
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
                        <div className="h-3 w-3 rounded-full bg-[color:var(--fc-status-success)]" />
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
                        <div className="h-3 w-3 rounded-full bg-[color:var(--fc-status-error)]" />
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
                </div>
              </div>
            ) : (
              <div className="fc-surface p-12 text-center">
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  No ingredients added yet.
                </p>
              </div>
            )}

            {meal.notes && (
              <div className="fc-surface rounded-2xl p-6">
                <h3 className="text-lg font-semibold fc-text-primary">Notes</h3>
                <p className="mt-2 text-sm fc-text-dim leading-relaxed">{meal.notes}</p>
              </div>
            )}
          </main>

          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[color:var(--fc-bg-base)] via-[color:var(--fc-bg-base)]/95 to-transparent z-50 pointer-events-none">
            <div className="max-w-2xl mx-auto grid grid-cols-2 gap-4 pointer-events-auto">
              <Button variant="outline" className="h-12 rounded-2xl fc-glass border font-semibold gap-2">
                <Edit3 className="w-5 h-5" />
                Edit Details
              </Button>
              <Button variant="outline" className="h-12 rounded-2xl border-[color:var(--fc-status-error)]/40 fc-text-error font-semibold gap-2 bg-[color:var(--fc-status-error)]/10">
                <Trash2 className="w-5 h-5" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
