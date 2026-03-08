"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MealPlanService, MealPlan, Meal } from "@/lib/mealPlanService";
import MealCreator from "@/components/coach/MealCreator";
import MealOptionEditor from "@/components/coach/MealOptionEditor";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import { ArrowLeft, Plus, ChefHat, Edit, Settings2, X, Zap } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function MealPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getThemeStyles, performanceSettings } = useTheme();
  const theme = getThemeStyles();

  const mealPlanId = params.id as string;

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMealCreator, setShowMealCreator] = useState(false);
  const [editingMealOptions, setEditingMealOptions] = useState<{ id: string; name: string } | null>(null);

  // Sum option-1 macro totals across all loaded meals
  const dailyTotals = useMemo(() => {
    if (meals.length === 0) return null;
    return {
      calories: meals.reduce((s, m) => s + m.total_calories, 0),
      protein:  meals.reduce((s, m) => s + m.total_protein,  0),
      carbs:    meals.reduce((s, m) => s + m.total_carbs,    0),
      fat:      meals.reduce((s, m) => s + m.total_fat,      0),
      fiber:    meals.reduce((s, m) => s + m.total_fiber,    0),
    };
  }, [meals]);

  // Wait for both mealPlanId and user before loading — on a hard refresh,
  // user is null until the auth context resolves, so we must not fire early.
  const mealPlanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mealPlanId || !user) return;
    if (mealPlanTimeoutRef.current) clearTimeout(mealPlanTimeoutRef.current);
    mealPlanTimeoutRef.current = setTimeout(() => {
      mealPlanTimeoutRef.current = null;
      setLoading(false);
    }, 20_000);
    Promise.all([loadMealPlan(), loadMeals()]).finally(() => {
      if (mealPlanTimeoutRef.current) {
        clearTimeout(mealPlanTimeoutRef.current);
        mealPlanTimeoutRef.current = null;
      }
    });
    return () => {
      if (mealPlanTimeoutRef.current) {
        clearTimeout(mealPlanTimeoutRef.current);
        mealPlanTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealPlanId, user]);

  const loadMealPlan = async () => {
    try {
      setLoading(true);
      // Query the specific plan directly — no need to fetch all plans
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("id", mealPlanId)
        .single();

      if (error) {
        console.error("Error loading meal plan:", error);
        setMealPlan(null);
      } else {
        setMealPlan(data as MealPlan);
      }
    } catch (error) {
      console.error("Error loading meal plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMeals = async () => {
    try {
      // ----------------------------------------------------------------
      // IMPORTANT: Do NOT use deep nested joins like
      //   meals(*,meal_food_items(*,foods(*)))
      // The meal_food_items RLS policy evaluates a subquery per row,
      // which causes statement timeouts with even moderate row counts.
      //
      // Instead we use 4 lightweight batch queries and join in JS.
      // We also only load Option 1's food items so calorie totals are
      // per-option, not the sum of all options.
      // ----------------------------------------------------------------

      // Step 1: Load meals (no joins)
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('id, name, meal_type, order_index, created_at')
        .eq('meal_plan_id', mealPlanId)
        .order('order_index', { ascending: true });

      if (mealsError) {
        console.error("Error loading meals:", mealsError);
        setMeals([]);
        return;
      }

      if (!mealsData || mealsData.length === 0) {
        // Fall back to legacy meal_plan_items table
        const { data: legacyItems } = await supabase
          .from('meal_plan_items')
          .select('*, foods(*)')
          .eq('meal_plan_id', mealPlanId)
          .order('created_at', { ascending: true });

        if (!legacyItems || legacyItems.length === 0) { setMeals([]); return; }

        const grouped = new Map<string, any[]>();
        legacyItems.forEach((item: any) => {
          if (!grouped.has(item.meal_type)) grouped.set(item.meal_type, []);
          grouped.get(item.meal_type)!.push({ ...item, food: item.foods });
        });
        const legacy: Meal[] = [];
        grouped.forEach((items, meal_type) => {
          const totals = items.reduce((acc: any, item: any) => {
            if (!item.food) return acc;
            const m = item.quantity / (item.food.serving_size || 1);
            return {
              total_calories: acc.total_calories + item.food.calories_per_serving * m,
              total_protein: acc.total_protein + item.food.protein * m,
              total_carbs: acc.total_carbs + item.food.carbs * m,
              total_fat: acc.total_fat + item.food.fat * m,
              total_fiber: acc.total_fiber + (item.food.fiber || 0) * m,
            };
          }, { total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0, total_fiber: 0 });
          legacy.push({ meal_type: meal_type as any, day_of_week: undefined, items, ...totals });
        });
        setMeals(legacy);
        return;
      }

      const mealIds = mealsData.map((m: any) => m.id);

      // Step 2: Load first option per meal in one batch
      const { data: optionsData } = await supabase
        .from('meal_options')
        .select('id, meal_id, name, order_index')
        .in('meal_id', mealIds)
        .order('order_index', { ascending: true });

      const firstOptionByMeal = new Map<string, string>();
      (optionsData ?? []).forEach((opt: any) => {
        if (!firstOptionByMeal.has(opt.meal_id)) firstOptionByMeal.set(opt.meal_id, opt.id);
      });
      const firstOptionIds = Array.from(firstOptionByMeal.values());

      // Step 3: Load food items for option 1 only — avoids multiplying calories
      let itemsByMeal = new Map<string, any[]>();
      if (firstOptionIds.length > 0) {
        const { data: foodItemsData } = await supabase
          .from('meal_food_items')
          .select('id, meal_id, meal_option_id, food_id, quantity, unit')
          .in('meal_option_id', firstOptionIds);

        // Step 4: Load all unique foods in one batch
        const foodIds = [...new Set((foodItemsData ?? []).map((fi: any) => fi.food_id))] as string[];
        let foodsById = new Map<string, any>();
        if (foodIds.length > 0) {
          const { data: foodsData } = await supabase
            .from('foods')
            .select('id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, calories_per_serving, protein, carbs, fat, fiber, serving_size')
            .in('id', foodIds);
          foodsById = new Map((foodsData ?? []).map((f: any) => [f.id, f]));
        }

        (foodItemsData ?? []).forEach((item: any) => {
          if (!itemsByMeal.has(item.meal_id)) itemsByMeal.set(item.meal_id, []);
          itemsByMeal.get(item.meal_id)!.push({ ...item, food: foodsById.get(item.food_id) || null });
        });
      }

      // Build Meal objects using only Option 1's macros
      const allMeals: Meal[] = mealsData.map((meal: any) => {
        const items = itemsByMeal.get(meal.id) ?? [];
        const totals = items.reduce((acc: any, item: any) => {
          const food = item.food;
          if (!food) return acc;
          // Prefer per-100g macros (generator format) — quantity is stored in grams
          if (food.calories_per_100g != null) {
            const ratio = item.quantity / 100;
            return {
              total_calories: acc.total_calories + food.calories_per_100g * ratio,
              total_protein: acc.total_protein + (food.protein_per_100g || 0) * ratio,
              total_carbs: acc.total_carbs + (food.carbs_per_100g || 0) * ratio,
              total_fat: acc.total_fat + (food.fat_per_100g || 0) * ratio,
              total_fiber: acc.total_fiber + (food.fiber_per_100g || 0) * ratio,
            };
          }
          // Legacy fallback: per-serving macros
          const m = item.quantity / (food.serving_size || 1);
          return {
            total_calories: acc.total_calories + (food.calories_per_serving || 0) * m,
            total_protein: acc.total_protein + (food.protein || 0) * m,
            total_carbs: acc.total_carbs + (food.carbs || 0) * m,
            total_fat: acc.total_fat + (food.fat || 0) * m,
            total_fiber: acc.total_fiber + (food.fiber || 0) * m,
          };
        }, { total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0, total_fiber: 0 });

        return {
          id: meal.id,
          name: meal.name,
          meal_type: meal.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          day_of_week: undefined,
          items,
          ...totals,
        };
      });

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
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
              <GlassCard elevation={2} className="fc-glass fc-card p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-[color:var(--fc-glass-highlight)] rounded w-1/3"></div>
                  <div className="h-64 bg-[color:var(--fc-glass-highlight)] rounded-2xl"></div>
                </div>
              </GlassCard>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!mealPlan) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
              <GlassCard elevation={2} className="fc-glass fc-card p-10 text-center">
                <h2 className="text-2xl font-bold text-[color:var(--fc-text-primary)] mb-4">
                  Meal Plan Not Found
                </h2>
                <Link href="/coach/nutrition">
                  <Button className="fc-btn fc-btn-primary">Back to Meal Plans</Button>
                </Link>
              </GlassCard>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="p-4 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Link href="/coach/nutrition" className="fc-surface inline-flex items-center gap-2 rounded-xl border border-[color:var(--fc-surface-card-border)] px-3 py-2.5 w-fit text-[color:var(--fc-text-primary)] text-sm font-medium">
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Back to Nutrition
            </Link>
            <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
              <div className="flex items-start gap-4">
                <Link href="/coach/nutrition" className="fc-glass fc-card w-10 h-10 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-glass-border)]">
                  <ArrowLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora-green)]/20 text-[color:var(--fc-accent-green)] shrink-0">
                        <ChefHat className="w-6 h-6" />
                      </div>
                      <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                        {mealPlan.name}
                      </h1>
                    </div>
                    <Link href={`/coach/nutrition/meal-plans/${mealPlan.id}/edit`}>
                      <Button variant="ghost" size="icon" className="fc-btn fc-btn-ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                  <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                    {mealPlan.description || "No description"}
                  </p>
                  {mealPlan.target_calories && (
                    <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                      Target: {mealPlan.target_calories} calories
                    </p>
                  )}
                  {/* Raw portions notice — shown for generated plans */}
                  {(mealPlan as any).generated_config && (
                    <p className="text-xs mt-2 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium w-fit">
                      🥩 All portions are for <strong>raw / uncooked</strong> ingredients
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* Daily totals summary — derived from Option 1 of each meal */}
            {dailyTotals && (
              <GlassCard elevation={2} className="fc-glass fc-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-[color:var(--fc-accent)]" />
                  <span className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                    Daily Totals
                    <span className="text-xs font-normal text-[color:var(--fc-text-dim)] ml-2">(Option 1 of each meal)</span>
                  </span>
                  {mealPlan?.target_calories && (
                    <span className="text-xs text-[color:var(--fc-text-dim)] ml-auto">
                      target: {mealPlan.target_calories.toLocaleString()} kcal
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "kcal",    value: dailyTotals.calories, color: "text-[color:var(--fc-accent)]",    unit: "" },
                    { label: "Protein", value: dailyTotals.protein,  color: "text-green-500",                   unit: "g" },
                    { label: "Carbs",   value: dailyTotals.carbs,    color: "text-blue-500",                    unit: "g" },
                    { label: "Fat",     value: dailyTotals.fat,      color: "text-yellow-500",                  unit: "g" },
                    { label: "Fiber",   value: dailyTotals.fiber,    color: "text-purple-500",                  unit: "g" },
                  ].map(({ label, value, color, unit }) => (
                    <div key={label} className="text-center p-2.5 fc-surface rounded-xl border border-[color:var(--fc-surface-card-border)]">
                      <div className={`text-base font-bold ${color}`}>
                        {label === "kcal"
                          ? Math.round(value).toLocaleString()
                          : Math.round(value)}
                        <span className="text-xs font-normal ml-0.5">{unit}</span>
                      </div>
                      <div className="text-[10px] text-[color:var(--fc-text-dim)] font-medium uppercase tracking-wide mt-0.5">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowMealCreator(true)}
                className="fc-btn fc-btn-primary"
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
                    className="fc-btn fc-btn-primary"
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
                              
                              {/* Edit Options Button */}
                              {(meal as any).id && (
                                <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingMealOptions({ 
                                      id: (meal as any).id, 
                                      name: (meal as any).name || meal.meal_type 
                                    })}
                                    className="w-full justify-center gap-2 rounded-lg"
                                  >
                                    <Settings2 className="w-4 h-4" />
                                    Manage Options
                                  </Button>
                                </div>
                              )}
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
      </AnimatedBackground>

      {/* Meal Creator Modal */}
      {showMealCreator && (
        <MealCreator
          mealPlanId={mealPlanId}
          onClose={() => setShowMealCreator(false)}
          onSave={handleMealSaved}
        />
      )}

      {/* Meal Options Editor Modal */}
      {editingMealOptions && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setEditingMealOptions(null); loadMeals(); } }}
        >
          <div className={`${theme.card} fc-glass fc-card rounded-3xl border ${theme.border} max-w-3xl max-h-[90vh] w-full overflow-hidden`}>
            {/* Modal Header */}
            <div className={`sticky top-0 ${theme.card} fc-glass border-b ${theme.border} px-6 py-4 flex items-center justify-between`}>
              <div>
                <h2 className={`text-xl font-bold ${theme.text}`}>
                  Meal Options
                </h2>
                <p className={`text-sm ${theme.textSecondary}`}>
                  {editingMealOptions.name}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setEditingMealOptions(null); loadMeals(); }}
                className="h-10 w-10 rounded-xl"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <MealOptionEditor
                mealId={editingMealOptions.id}
                mealPlanId={mealPlanId}
                onOptionsChange={() => {
                  // No-op: reloading on every options state change causes
                  // an infinite re-render loop because MealOptionEditor
                  // fires this callback on initial mount as well.
                  // The meal summary will refresh next time the modal closes.
                }}
              />
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
