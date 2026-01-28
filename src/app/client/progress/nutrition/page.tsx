"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface MealFoodItem {
  id: string;
  quantity: number;
  unit: string | null;
  food: {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
}

interface MealCompletion {
  id: string;
  meal_id: string;
  client_id: string;
  completed_at: string;
  photo_url?: string | null;
  notes?: string | null;
}

interface Meal {
  id: string;
  name: string;
  meal_type: MealType;
  order_index: number | null;
  notes?: string | null;
  foodItems: MealFoodItem[];
  completion?: MealCompletion;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface MealPlanAssignment {
  id: string;
  coach_id: string;
  client_id: string;
  meal_plan_id: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

const mealEmoji: Record<MealType, string> = {
  breakfast: "🌅",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};

function formatNumber(value: number, digits = 0) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0";
}

export default function NutritionPage() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

  const [loading, setLoading] = useState(true);
  const [uploadingMealId, setUploadingMealId] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<MealPlanAssignment | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dailyTotals = useMemo(() => {
    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.totals.calories,
        protein: acc.protein + meal.totals.protein,
        carbs: acc.carbs + meal.totals.carbs,
        fat: acc.fat + meal.totals.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [meals]);

  const loggedMeals = meals.filter((meal) => meal.completion).length;

  useEffect(() => {
    const loadNutrition = async () => {
      if (!user?.id) return;
      setLoading(true);
      setErrorMessage(null);

      try {
        // 1) Get active meal plan assignment
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("meal_plan_assignments")
          .select(
            "id, coach_id, client_id, meal_plan_id, start_date, end_date, is_active, notes"
          )
          .eq("client_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (assignmentError) {
          throw assignmentError;
        }

        if (!assignmentData) {
          setAssignment(null);
          setMeals([]);
          setLoading(false);
          return;
        }

        setAssignment(assignmentData as MealPlanAssignment);

        // 2) Fetch all meals for this plan
        const { data: mealsData, error: mealsError } = await supabase
          .from("meals")
          .select(
            `
            id,
            meal_plan_id,
            name,
            meal_type,
            order_index,
            notes,
            meal_food_items(
              id,
              quantity,
              unit,
              food:foods(
                id,
                name,
                calories,
                protein,
                carbs,
                fat
              )
            )
          `
          )
          .eq("meal_plan_id", assignmentData.meal_plan_id)
          .order("order_index", { ascending: true });

        if (mealsError) {
          throw mealsError;
        }

        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        // 3) Fetch today's completions
        const { data: completions, error: completionsError } = await supabase
          .from("meal_completions")
          .select("id, meal_id, client_id, completed_at, photo_url, notes")
          .eq("client_id", user.id)
          .gte("completed_at", startOfDay.toISOString())
          .lte("completed_at", endOfDay.toISOString());

        if (completionsError) {
          throw completionsError;
        }

        const completionMap = new Map<string, MealCompletion>();
        (completions || []).forEach((c: any) => {
          completionMap.set(c.meal_id, c as MealCompletion);
        });

        // 4) Build meals with totals
        const builtMeals: Meal[] =
          mealsData?.map((meal: any) => {
            const foodItems = (meal.meal_food_items || []) as MealFoodItem[];
            const totals = foodItems.reduce(
              (acc, item) => {
                const calories =
                  (item.food?.calories || 0) * (item.quantity || 0);
                const protein =
                  (item.food?.protein || 0) * (item.quantity || 0);
                const carbs = (item.food?.carbs || 0) * (item.quantity || 0);
                const fat = (item.food?.fat || 0) * (item.quantity || 0);
                return {
                  calories: acc.calories + calories,
                  protein: acc.protein + protein,
                  carbs: acc.carbs + carbs,
                  fat: acc.fat + fat,
                };
              },
              { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );

            return {
              id: meal.id,
              name: meal.name,
              meal_type: meal.meal_type as MealType,
              order_index: meal.order_index,
              notes: meal.notes,
              foodItems,
              completion: completionMap.get(meal.id),
              totals,
              emoji: mealEmoji[meal.meal_type as MealType] || "🍽️",
            };
          }) || [];

        setMeals(builtMeals);
      } catch (err: any) {
        console.error("Error loading nutrition data:", err);
        setErrorMessage(err?.message || "Failed to load nutrition data.");
      } finally {
        setLoading(false);
      }
    };

    loadNutrition();
  }, [user]);

  const handleUpload = async (mealId: string) => {
    if (!user?.id) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploadingMealId(mealId);
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${mealId}/${fileName}`;

        // Upload to meal-photos bucket (must exist in Supabase)
        const { error: uploadError } = await supabase.storage
          .from("meal-photos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("meal-photos").getPublicUrl(filePath);

        // Check if there's an existing completion for today for this meal
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const existing = meals.find((m) => m.id === mealId)?.completion;

        if (existing) {
          // Update existing completion
          const { error: updateError } = await supabase
            .from("meal_completions")
            .update({
              photo_url: publicUrl,
              completed_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (updateError) throw updateError;
        } else {
          // Insert new completion
          const { error: insertError } = await supabase
            .from("meal_completions")
            .insert({
              meal_id: mealId,
              client_id: user.id,
              completed_at: new Date().toISOString(),
              photo_url: publicUrl,
            });

          if (insertError) throw insertError;
        }

        // Reload data
        setUploadingMealId(null);
        window.location.reload();
      } catch (err: any) {
        console.error("Error uploading meal photo:", err);
        alert("Failed to upload photo. Please try again.");
        setUploadingMealId(null);
      }
    };

    input.click();
  };

  const renderDailySummary = () => (
    <GlassCard elevation={2} className="fc-glass fc-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[color:var(--fc-text-primary)]">
            Daily Summary
          </h2>
          <p className="text-sm text-[color:var(--fc-text-dim)]">
            {loggedMeals} of {meals.length} meals logged today
          </p>
        </div>
        <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
          {formatNumber(dailyTotals.calories, 0)} kcal total
        </span>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryItem label="Calories" value={`${formatNumber(dailyTotals.calories, 0)} kcal`} />
        <SummaryItem label="Protein" value={`${formatNumber(dailyTotals.protein, 0)} g`} />
        <SummaryItem label="Carbs" value={`${formatNumber(dailyTotals.carbs, 0)} g`} />
        <SummaryItem label="Fat" value={`${formatNumber(dailyTotals.fat, 0)} g`} />
      </div>
    </GlassCard>
  );

  const renderMeals = () => {
    if (!assignment) {
      return (
        <GlassCard elevation={2} className="fc-glass fc-card p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--fc-status-warning)]/15 text-[color:var(--fc-status-warning)]">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
              No active meal plan assigned.
            </p>
            <p className="text-sm text-[color:var(--fc-text-dim)]">
              Contact your coach to get a plan scheduled.
            </p>
          </div>
        </GlassCard>
      );
    }

    if (meals.length === 0) {
      return (
        <GlassCard elevation={2} className="fc-glass fc-card p-8 text-center">
          <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
            This meal plan has no meals assigned.
          </p>
          <p className="text-sm text-[color:var(--fc-text-dim)]">
            Ask your coach to add meals to your plan.
          </p>
        </GlassCard>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {meals.map((meal) => {
          const isLogged = !!meal.completion;
          return (
            <GlassCard
              key={meal.id}
              elevation={2}
              className="fc-glass fc-card p-5 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {mealEmoji[meal.meal_type] || "🍽️"}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                      {meal.name}
                    </h3>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      {meal.meal_type.charAt(0).toUpperCase() +
                        meal.meal_type.slice(1)}
                    </p>
                  </div>
                </div>
                <span
                  className={`fc-badge ${
                    isLogged
                      ? "bg-[color:var(--fc-status-success)]/15 text-[color:var(--fc-status-success)]"
                      : "bg-[color:var(--fc-status-warning)]/15 text-[color:var(--fc-status-warning)]"
                  }`}
                >
                  {isLogged ? "Logged" : "Not Logged"}
                </span>
              </div>

              {meal.completion?.photo_url && (
                <div className="rounded-xl overflow-hidden border border-[color:var(--fc-glass-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={meal.completion.photo_url}
                    alt={`${meal.name} photo`}
                    className="w-full h-40 object-cover"
                  />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                  Foods
                </p>
                {meal.foodItems.length === 0 ? (
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    No food items assigned to this meal
                  </p>
                ) : (
                  <div className="space-y-2">
                    {meal.foodItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between border-b border-[color:var(--fc-glass-border)] pb-2"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-[color:var(--fc-text-primary)]">
                            {item.food?.name || "Unknown Food"}
                          </p>
                          <p className="text-xs mt-1 text-[color:var(--fc-text-dim)]">
                            {item.quantity} {item.unit || "serving"}
                          </p>
                        </div>
                        <div className="text-right ml-3 text-xs text-[color:var(--fc-text-dim)]">
                          <div className="font-semibold text-sm text-[color:var(--fc-text-primary)]">
                            {formatNumber(
                              (item.food?.calories || 0) * item.quantity,
                              0
                            )}{" "}
                            cal
                          </div>
                          <div>
                            P:
                            {formatNumber(
                              (item.food?.protein || 0) * item.quantity,
                              0
                            )}
                            g | C:
                            {formatNumber(
                              (item.food?.carbs || 0) * item.quantity,
                              0
                            )}
                            g | F:
                            {formatNumber(
                              (item.food?.fat || 0) * item.quantity,
                              0
                            )}
                            g
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl px-4 py-3 bg-[color:var(--fc-glass-soft)] border border-[color:var(--fc-glass-border)]">
                <div className="flex items-center justify-between text-sm font-semibold text-[color:var(--fc-text-primary)]">
                  <span>Meal Totals</span>
                  <span>{formatNumber(meal.totals.calories, 0)} cal</span>
                </div>
                <div className="mt-2 text-xs text-[color:var(--fc-text-dim)]">
                  P:{formatNumber(meal.totals.protein, 0)}g | C:
                  {formatNumber(meal.totals.carbs, 0)}g | F:
                  {formatNumber(meal.totals.fat, 0)}g
                </div>
              </div>

              <Button
                disabled={uploadingMealId === meal.id}
                onClick={() => handleUpload(meal.id)}
                className="w-full flex items-center justify-center gap-2 text-white fc-btn fc-btn-primary"
              >
                {uploadingMealId === meal.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    {meal.completion ? `Update Photo` : `Log ${meal.name}`}
                  </>
                )}
              </Button>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
            <GlassCard elevation={2} className="fc-glass fc-card p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 rounded bg-[color:var(--fc-glass-highlight)] w-1/3" />
                <div className="h-4 rounded bg-[color:var(--fc-glass-highlight)] w-1/2" />
                <div className="h-24 rounded bg-[color:var(--fc-glass-highlight)]" />
              </div>
            </GlassCard>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10 space-y-6">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <Link href="/client/progress">
                  <Button variant="ghost" size="icon" className="fc-btn fc-btn-ghost h-10 w-10">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    Progress Hub
                  </span>
                  <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                    Nutrition Tracker
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    View assigned meals and log photos for today.
                  </p>
                </div>
              </div>
              {errorMessage && (
                <div className="fc-glass-soft fc-card px-4 py-3 text-sm text-[color:var(--fc-status-error)] border border-[color:var(--fc-status-error)]/30 max-w-md">
                  {errorMessage}
                </div>
              )}
            </div>
          </GlassCard>

          {renderDailySummary()}

          {renderMeals()}
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="fc-glass-soft fc-card px-4 py-3">
      <p className="text-sm text-[color:var(--fc-text-subtle)] mb-1">{label}</p>
      <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
        {value}
      </p>
    </div>
  );
}
