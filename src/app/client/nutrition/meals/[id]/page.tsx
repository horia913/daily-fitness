"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { getThemeStyles, performanceSettings } = useTheme();
  const theme = getThemeStyles();

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
          <div className="min-h-screen">
          <div className="p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
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
          <div className="min-h-screen">
          <div className="p-4 sm:p-6">
            <div className="max-w-4xl mx-auto text-center py-12">
              <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>
                Meal Not Found
              </h2>
              <Link href="/client/nutrition">
                <Button className="rounded-xl">Back to Nutrition</Button>
              </Link>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  const Icon = getMealIcon(meal.meal_type);
  const colorClass = getMealTypeColor(meal.meal_type);

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen">
        <div className="p-4 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Link href="/client/nutrition">
                <Button variant="outline" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div
                className={`p-3 rounded-2xl ${colorClass} flex items-center justify-center`}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className={`text-3xl font-bold ${theme.text}`}>
                  {meal.name}
                </h1>
                <p className={`${theme.textSecondary} capitalize`}>
                  {meal.meal_type}
                </p>
              </div>
            </div>

            {/* Meal Items */}
            {meal.meal_items && meal.meal_items.length > 0 ? (
              <div className="space-y-6">
                <div>
                  <h3 className={`text-xl font-semibold ${theme.text} mb-4`}>
                    Ingredients
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {meal.meal_items.map((item) => {
                      const totalCalories = Math.round(
                        item.quantity * item.calories_per_unit
                      );
                      const totalProtein = Math.round(
                        item.quantity * item.protein_per_unit
                      );
                      const totalCarbs = Math.round(
                        item.quantity * item.carbs_per_unit
                      );
                      const totalFat = Math.round(
                        item.quantity * item.fat_per_unit
                      );

                      // Calculate calories from macros
                      const proteinCals = totalProtein * 4;
                      const carbsCals = totalCarbs * 4;
                      const fatCals = totalFat * 9;
                      const macroCals = proteinCals + carbsCals + fatCals;

                      // Calculate percentages
                      const proteinPercent =
                        macroCals > 0 ? (proteinCals / macroCals) * 100 : 0;
                      const carbsPercent =
                        macroCals > 0 ? (carbsCals / macroCals) * 100 : 0;
                      const fatPercent =
                        macroCals > 0 ? (fatCals / macroCals) * 100 : 0;

                      return (
                        <div
                          key={item.id}
                          className={`${theme.card} border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4
                              className={`text-lg font-semibold ${theme.text}`}
                            >
                              {item.food_name}
                            </h4>
                            <span
                              className={`${theme.textSecondary} font-medium`}
                            >
                              {item.quantity}
                              {item.unit}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {/* Mini Pie Chart */}
                            <div className="flex items-center justify-center">
                              {macroCals > 0 ? (
                                <div className="relative w-20 h-20">
                                  <div className="relative w-full h-full rounded-full overflow-hidden">
                                    <div
                                      className="absolute inset-0 rounded-full"
                                      style={{
                                        background: `conic-gradient(
                                          #3b82f6 0deg ${
                                            proteinPercent * 3.6
                                          }deg,
                                          #eab308 ${proteinPercent * 3.6}deg ${
                                          (proteinPercent + carbsPercent) * 3.6
                                        }deg,
                                          #f97316 ${
                                            (proteinPercent + carbsPercent) *
                                            3.6
                                          }deg 360deg
                                        )`,
                                      }}
                                    />
                                    <div className="absolute inset-2 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center">
                                      <div className="text-center">
                                        <div
                                          className={`text-sm font-bold ${theme.text}`}
                                        >
                                          {totalCalories}
                                        </div>
                                        <div
                                          className={`text-xs ${theme.textSecondary}`}
                                        >
                                          cal
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                  <div className="text-center">
                                    <div
                                      className={`text-sm font-bold ${theme.text}`}
                                    >
                                      {totalCalories}
                                    </div>
                                    <div
                                      className={`text-xs ${theme.textSecondary}`}
                                    >
                                      cal
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Macro Breakdown */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <div className="flex-1">
                                  <div
                                    className={`text-xs font-semibold ${theme.text}`}
                                  >
                                    Protein
                                  </div>
                                  <div
                                    className={`text-xs ${theme.textSecondary}`}
                                  >
                                    {totalProtein}g
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                <div className="flex-1">
                                  <div
                                    className={`text-xs font-semibold ${theme.text}`}
                                  >
                                    Carbs
                                  </div>
                                  <div
                                    className={`text-xs ${theme.textSecondary}`}
                                  >
                                    {totalCarbs}g
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <div className="flex-1">
                                  <div
                                    className={`text-xs font-semibold ${theme.text}`}
                                  >
                                    Fat
                                  </div>
                                  <div
                                    className={`text-xs ${theme.textSecondary}`}
                                  >
                                    {totalFat}g
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Meal Totals */}
                <div className="border-t-2 border-slate-200 dark:border-slate-700 pt-6">
                  <h3 className={`text-xl font-semibold ${theme.text} mb-4`}>
                    Meal Totals
                  </h3>
                  <div
                    className={`${theme.card} rounded-3xl p-6 border-2 border-slate-200 dark:border-slate-700`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Pie Chart */}
                      <div className="flex items-center justify-center">
                        {(() => {
                          const totalCalories = Math.round(
                            meal.meal_items!.reduce(
                              (sum, item) =>
                                sum + item.quantity * item.calories_per_unit,
                              0
                            )
                          );
                          const totalProtein = Math.round(
                            meal.meal_items!.reduce(
                              (sum, item) =>
                                sum + item.quantity * item.protein_per_unit,
                              0
                            )
                          );
                          const totalCarbs = Math.round(
                            meal.meal_items!.reduce(
                              (sum, item) =>
                                sum + item.quantity * item.carbs_per_unit,
                              0
                            )
                          );
                          const totalFat = Math.round(
                            meal.meal_items!.reduce(
                              (sum, item) =>
                                sum + item.quantity * item.fat_per_unit,
                              0
                            )
                          );

                          const proteinCals = totalProtein * 4;
                          const carbsCals = totalCarbs * 4;
                          const fatCals = totalFat * 9;
                          const macroCals = proteinCals + carbsCals + fatCals;

                          const proteinPercent =
                            (proteinCals / macroCals) * 100;
                          const carbsPercent = (carbsCals / macroCals) * 100;
                          const fatPercent = (fatCals / macroCals) * 100;

                          return (
                            <div className="relative w-40 h-40">
                              <div className="relative w-full h-full rounded-full overflow-hidden">
                                <div
                                  className="absolute inset-0 rounded-full"
                                  style={{
                                    background: `conic-gradient(
                                      #3b82f6 0deg ${proteinPercent * 3.6}deg,
                                      #eab308 ${proteinPercent * 3.6}deg ${
                                      (proteinPercent + carbsPercent) * 3.6
                                    }deg,
                                      #f97316 ${
                                        (proteinPercent + carbsPercent) * 3.6
                                      }deg 360deg
                                    )`,
                                  }}
                                />
                                <div className="absolute inset-4 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center">
                                  <div className="text-center">
                                    <div
                                      className={`text-xl font-bold ${theme.text}`}
                                    >
                                      {totalCalories}
                                    </div>
                                    <div
                                      className={`text-xs ${theme.textSecondary}`}
                                    >
                                      calories
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Macro Breakdown */}
                      <div className="space-y-3">
                        {(() => {
                          const totalCalories = Math.round(
                            meal.meal_items!.reduce(
                              (sum, item) =>
                                sum + item.quantity * item.calories_per_unit,
                              0
                            )
                          );
                          const totalProtein = Math.round(
                            meal.meal_items!.reduce(
                              (sum, item) =>
                                sum + item.quantity * item.protein_per_unit,
                              0
                            )
                          );
                          const totalCarbs = Math.round(
                            meal.meal_items!.reduce(
                              (sum, item) =>
                                sum + item.quantity * item.carbs_per_unit,
                              0
                            )
                          );
                          const totalFat = Math.round(
                            meal.meal_items!.reduce(
                              (sum, item) =>
                                sum + item.quantity * item.fat_per_unit,
                              0
                            )
                          );

                          return (
                            <>
                              <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-center">
                                    <span
                                      className={`text-sm font-semibold ${theme.text}`}
                                    >
                                      Protein
                                    </span>
                                    <span
                                      className={`text-base font-bold ${theme.text}`}
                                    >
                                      {totalProtein}g
                                    </span>
                                  </div>
                                  <div
                                    className={`text-xs ${theme.textSecondary}`}
                                  >
                                    {Math.round(
                                      ((totalProtein * 4) / totalCalories) * 100
                                    )}
                                    % of calories
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-center">
                                    <span
                                      className={`text-sm font-semibold ${theme.text}`}
                                    >
                                      Carbs
                                    </span>
                                    <span
                                      className={`text-base font-bold ${theme.text}`}
                                    >
                                      {totalCarbs}g
                                    </span>
                                  </div>
                                  <div
                                    className={`text-xs ${theme.textSecondary}`}
                                  >
                                    {Math.round(
                                      ((totalCarbs * 4) / totalCalories) * 100
                                    )}
                                    % of calories
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-center">
                                    <span
                                      className={`text-sm font-semibold ${theme.text}`}
                                    >
                                      Fat
                                    </span>
                                    <span
                                      className={`text-base font-bold ${theme.text}`}
                                    >
                                      {totalFat}g
                                    </span>
                                  </div>
                                  <div
                                    className={`text-xs ${theme.textSecondary}`}
                                  >
                                    {Math.round(
                                      ((totalFat * 9) / totalCalories) * 100
                                    )}
                                    % of calories
                                  </div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`${theme.card} rounded-3xl p-12 text-center border-2 border-slate-200 dark:border-slate-700`}
              >
                <p className={`${theme.textSecondary}`}>
                  No ingredients added yet.
                </p>
              </div>
            )}

            {/* Notes */}
            {meal.notes && (
              <div
                className={`${theme.card} rounded-3xl p-6 border-2 border-slate-200 dark:border-slate-700`}
              >
                <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>
                  Notes
                </h3>
                <p className={`${theme.textSecondary} leading-relaxed`}>
                  {meal.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
