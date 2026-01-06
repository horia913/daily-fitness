"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MealPlanService, MealPlan, Meal } from "@/lib/mealPlanService";
import MealCreator from "@/components/coach/MealCreator";
import { ArrowLeft, Plus, ChefHat, Edit } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function MealPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const mealPlanId = params.id as string;

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMealCreator, setShowMealCreator] = useState(false);

  useEffect(() => {
    if (mealPlanId) {
      loadMealPlan();
      loadMeals();
    }
  }, [mealPlanId]);

  const loadMealPlan = async () => {
    try {
      if (!user) return;
      setLoading(true);

      const mealPlans = await MealPlanService.getMealPlans(user.id);
      const found = mealPlans.find((p) => p.id === mealPlanId);
      setMealPlan(found || null);
    } catch (error) {
      console.error("Error loading meal plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMeals = async () => {
    try {
      console.log("Loading meals for mealPlanId:", mealPlanId);
      
      // Load meals from the meals table (new format - proper meal entities)
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select(`
          *,
          meal_food_items (
            *,
            foods (*)
          )
        `)
        .eq('meal_plan_id', mealPlanId)
        .order('created_at', { ascending: true });

      if (mealsError) {
        console.error("Error loading meals from meals table:", mealsError);
      }

      // Also load from meal_plan_items table (old format for backward compatibility)
      const { data: mealPlanItems, error: itemsError } = await supabase
        .from('meal_plan_items')
        .select(`
          *,
          foods (*)
        `)
        .eq('meal_plan_id', mealPlanId)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error("Error loading meals from meal_plan_items table:", itemsError);
      }

      const allMeals: Meal[] = [];

      // Transform meals from meals table (new format)
      if (mealsData && mealsData.length > 0) {
        const newFormatMeals: Meal[] = mealsData.map((meal: any) => {
          const foodItems = (meal.meal_food_items || []).map((item: any) => ({
            id: item.id,
            meal_plan_id: mealPlanId,
            food_id: item.food_id,
            meal_type: meal.meal_type,
            quantity: item.quantity,
            food: item.foods,
            created_at: item.created_at
          }));

          // Calculate totals
          const totals = foodItems.reduce((acc: any, item: any) => {
            if (!item.food) return acc;
            const multiplier = item.quantity / (item.food.serving_size || 1);
            return {
              total_calories: acc.total_calories + (item.food.calories_per_serving * multiplier),
              total_protein: acc.total_protein + (item.food.protein * multiplier),
              total_carbs: acc.total_carbs + (item.food.carbs * multiplier),
              total_fat: acc.total_fat + (item.food.fat * multiplier),
              total_fiber: acc.total_fiber + (item.food.fiber * multiplier)
            };
          }, {
            total_calories: 0,
            total_protein: 0,
            total_carbs: 0,
            total_fat: 0,
            total_fiber: 0
          });

          return {
            meal_type: meal.meal_type,
            day_of_week: undefined,
            items: foodItems,
            ...totals,
            id: meal.id, // Store meal ID for potential future use
            name: meal.name // Store meal name
          };
        });
        allMeals.push(...newFormatMeals);
      }

      // Transform meal_plan_items (old format) - group by meal_type
      if (mealPlanItems && mealPlanItems.length > 0) {
        // Group items by meal_type
        const groupedItems = new Map<string, any[]>();
        mealPlanItems.forEach((item: any) => {
          const key = item.meal_type;
          if (!groupedItems.has(key)) {
            groupedItems.set(key, []);
          }
          groupedItems.get(key)!.push({
            id: item.id,
            meal_plan_id: mealPlanId,
            food_id: item.food_id,
            meal_type: item.meal_type,
            quantity: item.quantity,
            food: item.foods,
            created_at: item.created_at
          });
        });

        // Convert grouped items to Meal objects
        groupedItems.forEach((items, meal_type) => {
          const totals = items.reduce((acc: any, item: any) => {
            if (!item.food) return acc;
            const multiplier = item.quantity / (item.food.serving_size || 1);
            return {
              total_calories: acc.total_calories + (item.food.calories_per_serving * multiplier),
              total_protein: acc.total_protein + (item.food.protein * multiplier),
              total_carbs: acc.total_carbs + (item.food.carbs * multiplier),
              total_fat: acc.total_fat + (item.food.fat * multiplier),
              total_fiber: acc.total_fiber + (item.food.fiber * multiplier)
            };
          }, {
            total_calories: 0,
            total_protein: 0,
            total_carbs: 0,
            total_fat: 0,
            total_fiber: 0
          });

          allMeals.push({
            meal_type: meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
            day_of_week: undefined,
            items: items,
            ...totals
          });
        });
      }

      console.log("Loaded meals:", allMeals);
      setMeals(allMeals);
    } catch (error) {
      console.error("Error loading meals:", error);
    }
  };

  const handleMealSaved = async () => {
    await loadMeals();
    setShowMealCreator(false);
  };

  if (loading && !mealPlan) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-green-50 to-teal-100 dark:from-slate-900 dark:via-slate-800 dark:to-teal-900">
          <div className="p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!mealPlan) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-green-50 to-teal-100 dark:from-slate-900 dark:via-slate-800 dark:to-teal-900">
          <div className="p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-12">
                <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>
                  Meal Plan Not Found
                </h2>
                <Link href="/coach/nutrition/meal-plans">
                  <Button className="rounded-xl">Back to Meal Plans</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-green-50 to-teal-100 dark:from-slate-900 dark:via-slate-800 dark:to-teal-900">
        <div className="p-4 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Link href="/coach/nutrition/meal-plans">
                <Button variant="outline" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className={`text-3xl font-bold ${theme.text}`}>
                    {mealPlan.name}
                  </h1>
                  <Link
                    href={`/coach/nutrition/meal-plans/${mealPlan.id}/edit`}
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
                <p className={`${theme.textSecondary} mt-1`}>
                  {mealPlan.description || "No description"}
                </p>
                {mealPlan.target_calories && (
                  <p className={`${theme.textSecondary} mt-1`}>
                    Target: {mealPlan.target_calories} calories
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowMealCreator(true)}
                className="rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Meal
              </Button>
            </div>

            {/* Meals List */}
            <div className={`${theme.card} ${theme.shadow} rounded-3xl p-6`}>
              {meals.length === 0 ? (
                <div className="text-center py-12">
                  <ChefHat className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                  <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>
                    No meals added yet
                  </h3>
                  <p className={`${theme.textSecondary} mb-6`}>
                    Start building your meal plan by adding individual meals.
                  </p>
                  <Button
                    onClick={() => setShowMealCreator(true)}
                    className="rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Meal
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {meals.map((meal, index) => {
                    // Different gradient backgrounds for meal cards
                    const mealGradients = [
                      "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/20",
                      "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/20",
                      "bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/10 dark:to-violet-900/20",
                      "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/20",
                    ];
                    const mealGradientClass =
                      mealGradients[index % mealGradients.length];

                    return (
                      <Card
                        key={(meal as any).id || index}
                        className={`${mealGradientClass} ${theme.shadow} rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-md hover:shadow-lg transition-shadow duration-200`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {(meal as any).name && (
                                <h3 className={`font-semibold ${theme.text} text-lg mb-2`}>
                                  {(meal as any).name}
                                </h3>
                              )}
                              <div className="flex items-center gap-3 mb-3">
                                <Badge className="bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50">
                                  {meal.meal_type}
                                </Badge>
                                {meal.day_of_week && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-slate-300 dark:border-slate-600"
                                  >
                                    Day {meal.day_of_week}
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-5 gap-3 text-sm mb-3">
                                <div className="text-center p-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg">
                                  <div className={`font-bold ${theme.text}`}>
                                    {Math.round(meal.total_calories)}
                                  </div>
                                  <div
                                    className={`text-xs ${theme.textSecondary}`}
                                  >
                                    Calories
                                  </div>
                                </div>
                                <div className="text-center p-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg">
                                  <div className="font-bold text-green-600 dark:text-green-400">
                                    {Math.round(meal.total_protein)}g
                                  </div>
                                  <div
                                    className={`text-xs ${theme.textSecondary}`}
                                  >
                                    Protein
                                  </div>
                                </div>
                                <div className="text-center p-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg">
                                  <div className="font-bold text-blue-600 dark:text-blue-400">
                                    {Math.round(meal.total_carbs)}g
                                  </div>
                                  <div
                                    className={`text-xs ${theme.textSecondary}`}
                                  >
                                    Carbs
                                  </div>
                                </div>
                                <div className="text-center p-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg">
                                  <div className="font-bold text-yellow-600 dark:text-yellow-400">
                                    {Math.round(meal.total_fat)}g
                                  </div>
                                  <div
                                    className={`text-xs ${theme.textSecondary}`}
                                  >
                                    Fat
                                  </div>
                                </div>
                                <div className="text-center p-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg">
                                  <div className="font-bold text-purple-600 dark:text-purple-400">
                                    {Math.round(meal.total_fiber)}g
                                  </div>
                                  <div
                                    className={`text-xs ${theme.textSecondary}`}
                                  >
                                    Fiber
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3">
                                <p
                                  className={`text-sm ${theme.textSecondary} mb-2`}
                                >
                                  {meal.items.length} food item
                                  {meal.items.length !== 1 ? "s" : ""}
                                </p>
                                {meal.items.length > 0 && (
                                  <div className="space-y-1">
                                    {meal.items.map((item, itemIndex) => (
                                      <div
                                        key={itemIndex}
                                        className="flex items-center justify-between text-xs bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg p-2 border border-slate-200/40 dark:border-slate-600/40"
                                      >
                                        <span
                                          className={`${theme.text} font-medium`}
                                        >
                                          {item.food?.name || "Unknown Food"}
                                        </span>
                                        <span className={theme.textSecondary}>
                                          {item.quantity}g
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meal Creator Modal */}
      {showMealCreator && (
        <MealCreator
          mealPlanId={mealPlanId}
          onClose={() => setShowMealCreator(false)}
          onSave={handleMealSaved}
        />
      )}
    </ProtectedRoute>
  );
}
