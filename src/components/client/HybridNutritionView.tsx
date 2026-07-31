"use client";

// DEPRECATED: Scheduled for removal after Phase N3 nutrition redesign. No longer used on client Fuel page.

import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { ClientGlassCard } from "@/components/client-ui";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronUp, Droplet } from "lucide-react";
import { getClientNutritionGoals, updateDailyLog } from "@/lib/nutritionLogService";
import { getDayEntries, deleteEntry, type FoodLogEntry } from "@/lib/foodLogService";
import { FoodLogEntry as FoodLogEntryComponent } from "./FoodLogEntry";
import { QuickFoodSearch } from "./QuickFoodSearch";
import AddFoodModal from "@/components/nutrition/AddFoodModal";

// Types compatible with nutrition page Meal structure
interface MealFoodItem {
  food: { id: string; name: string; serving_size: number; serving_unit: string };
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealOptionWithTotals {
  id: string;
  name: string;
  order_index: number;
  items: MealFoodItem[];
  totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
}

export interface HybridMeal {
  id: string;
  type: string;
  name: string;
  emoji: string;
  items: MealFoodItem[];
  logged: boolean;
  photoUrl?: string;
  logged_at?: string;
  options?: MealOptionWithTotals[];
  loggedOptionId?: string;
}

interface MacroProgress {
  consumed: number;
  goal: number;
  remaining: number;
  percentage: number;
}

interface HybridNutritionViewProps {
  clientId: string;
  meals: HybridMeal[];
  loadingMeals: boolean;
  onRefetchMeals: () => void;
  waterMl?: number;
  waterGoalMl?: number;
}

function getLoggedMealMacros(meal: HybridMeal): { calories: number; protein: number; carbs: number; fat: number } {
  if (!meal.logged) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  if (meal.loggedOptionId && meal.options?.length) {
    const opt = meal.options.find((o) => o.id === meal.loggedOptionId);
    if (opt) return { ...opt.totals, fiber: 0 } as { calories: number; protein: number; carbs: number; fat: number };
  }
  const cal = meal.items.reduce((s, i) => s + i.calories, 0);
  const protein = meal.items.reduce((s, i) => s + i.protein, 0);
  const carbs = meal.items.reduce((s, i) => s + i.carbs, 0);
  const fat = meal.items.reduce((s, i) => s + i.fat, 0);
  return { calories: cal, protein, carbs, fat };
}

function getDisplayItems(meal: HybridMeal): MealFoodItem[] {
  if (meal.items?.length) return meal.items;
  const opt = meal.options?.[0];
  return opt?.items ?? [];
}

function getMealCalories(meal: HybridMeal): number {
  return meal.items.reduce((sum, item) => sum + item.calories, 0);
}

// Reusable progress ring (mirrors GoalBasedNutritionView)
function MacroProgressRing({
  consumed,
  goal,
  remaining,
  percentage,
  label,
  unit,
  size,
  strokeWidth,
  color,
}: {
  consumed: number;
  goal: number;
  remaining: number;
  percentage: number;
  label: string;
  unit: string;
  size: number;
  strokeWidth: number;
  color: string;
}) {
  const { isDark } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)"}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-bold font-mono fc-text-primary">{Math.round(consumed)}</div>
            <div className="text-xs fc-text-dim">/ {Math.round(goal)} {unit}</div>
          </div>
        </div>
      </div>
      <div className="mt-2 text-center">
        <div className="text-sm font-semibold fc-text-primary">{label}</div>
        {remaining > 0 && <div className="text-xs fc-text-dim mt-0.5">{Math.round(remaining)} {unit} remaining</div>}
        {remaining <= 0 && <div className="text-xs fc-text-dim mt-0.5">Goal reached!</div>}
      </div>
    </div>
  );
}

export function HybridNutritionView({
  clientId,
  meals,
  loadingMeals,
  onRefetchMeals,
  waterMl = 0,
  waterGoalMl = 0,
}: HybridNutritionViewProps) {
  const [goals, setGoals] = useState<{ calories?: number; protein?: number; carbs?: number; fat?: number } | null>(null);
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [selectedMealIdForAdd, setSelectedMealIdForAdd] = useState<string | null>(null);
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [showAdditionalFoodSearch, setShowAdditionalFoodSearch] = useState(false);
  const [additionalFoodMealSlot, setAdditionalFoodMealSlot] = useState<string>("afternoon_snack");
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const fromMealPlan = meals.reduce(
    (acc, m) => {
      const mac = getLoggedMealMacros(m);
      acc.calories += mac.calories;
      acc.protein += mac.protein;
      acc.carbs += mac.carbs;
      acc.fat += mac.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const mealsLoggedCount = meals.filter((m) => m.logged).length;

  const fromAdditional = entries.reduce(
    (acc, e) => {
      acc.calories += e.calories;
      acc.protein += e.protein_g;
      acc.carbs += e.carbs_g;
      acc.fat += e.fat_g;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const totalCal = fromMealPlan.calories + fromAdditional.calories;
  const totalProtein = fromMealPlan.protein + fromAdditional.protein;
  const totalCarbs = fromMealPlan.carbs + fromAdditional.carbs;
  const totalFat = fromMealPlan.fat + fromAdditional.fat;

  const macroProgress: Record<string, MacroProgress> = {
    calories: {
      consumed: totalCal,
      goal: goals?.calories ?? 0,
      remaining: Math.max((goals?.calories ?? 0) - totalCal, 0),
      percentage: goals?.calories ? Math.min((totalCal / goals.calories) * 100, 100) : 0,
    },
    protein: {
      consumed: totalProtein,
      goal: goals?.protein ?? 0,
      remaining: Math.max((goals?.protein ?? 0) - totalProtein, 0),
      percentage: goals?.protein ? Math.min((totalProtein / goals.protein) * 100, 100) : 0,
    },
    carbs: {
      consumed: totalCarbs,
      goal: goals?.carbs ?? 0,
      remaining: Math.max((goals?.carbs ?? 0) - totalCarbs, 0),
      percentage: goals?.carbs ? Math.min((totalCarbs / goals.carbs) * 100, 100) : 0,
    },
    fat: {
      consumed: totalFat,
      goal: goals?.fat ?? 0,
      remaining: Math.max((goals?.fat ?? 0) - totalFat, 0),
      percentage: goals?.fat ? Math.min((totalFat / goals.fat) * 100, 100) : 0,
    },
  };

  const getProgressColor = (pct: number) => (pct >= 90 && pct <= 110 ? "#22C55E" : pct > 120 ? "#EF4444" : "#EAB308");

  const loadGoalsAndEntries = useCallback(async () => {
    if (!clientId) return;
    setLoadingGoals(true);
    try {
      const [g, e] = await Promise.all([
        getClientNutritionGoals(clientId),
        getDayEntries(clientId, today),
      ]);
      setGoals(g ?? null);
      setEntries(e ?? []);
      await updateDailyLog(clientId, today);
    } catch (err) {
      console.error("HybridNutritionView load error:", err);
    } finally {
      setLoadingGoals(false);
    }
  }, [clientId, today]);

  useEffect(() => {
    loadGoalsAndEntries();
  }, [loadGoalsAndEntries]);

  useEffect(() => {
    const h = () => loadGoalsAndEntries();
    window.addEventListener("foodEntryUpdated", h);
    return () => window.removeEventListener("foodEntryUpdated", h);
  }, [loadGoalsAndEntries]);

  const handleAdditionalFoodAdded = useCallback(() => {
    loadGoalsAndEntries();
    setShowAdditionalFoodSearch(false);
  }, [loadGoalsAndEntries]);

  const handleDeleteEntry = useCallback(
    async (entryId: string) => {
      try {
        await deleteEntry(entryId, clientId, today);
        await loadGoalsAndEntries();
      } catch (e) {
        console.error("Delete entry error:", e);
      }
    },
    [clientId, today, loadGoalsAndEntries]
  );

  const loading = loadingMeals || loadingGoals;
  if (loading && !goals) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  if (!goals || Object.keys(goals).length === 0) {
    return (
      <ClientGlassCard className="p-8 text-center">
        <p className="fc-text-dim">Macro goals are not set. Reach out to your coach to enable hybrid tracking.</p>
      </ClientGlassCard>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* A) Goal Progress Rings — combined from meal plan + additional food */}
        <ClientGlassCard className="p-6">
          <div className="space-y-6">
            {goals.calories != null && goals.calories > 0 && (
              <div className="flex flex-col items-center">
                <MacroProgressRing
                  consumed={macroProgress.calories.consumed}
                  goal={macroProgress.calories.goal}
                  remaining={macroProgress.calories.remaining}
                  percentage={macroProgress.calories.percentage}
                  label="Calories"
                  unit="kcal"
                  size={180}
                  strokeWidth={16}
                  color={getProgressColor(macroProgress.calories.percentage)}
                />
              </div>
            )}
            {(goals.protein != null || goals.carbs != null || goals.fat != null) && (
              <div className="grid grid-cols-3 gap-4">
                {goals.protein != null && goals.protein > 0 && (
                  <MacroProgressRing
                    consumed={macroProgress.protein.consumed}
                    goal={macroProgress.protein.goal}
                    remaining={macroProgress.protein.remaining}
                    percentage={macroProgress.protein.percentage}
                    label="Protein"
                    unit="g"
                    size={100}
                    strokeWidth={8}
                    color={getProgressColor(macroProgress.protein.percentage)}
                  />
                )}
                {goals.carbs != null && goals.carbs > 0 && (
                  <MacroProgressRing
                    consumed={macroProgress.carbs.consumed}
                    goal={macroProgress.carbs.goal}
                    remaining={macroProgress.carbs.remaining}
                    percentage={macroProgress.carbs.percentage}
                    label="Carbs"
                    unit="g"
                    size={100}
                    strokeWidth={8}
                    color={getProgressColor(macroProgress.carbs.percentage)}
                  />
                )}
                {goals.fat != null && goals.fat > 0 && (
                  <MacroProgressRing
                    consumed={macroProgress.fat.consumed}
                    goal={macroProgress.fat.goal}
                    remaining={macroProgress.fat.remaining}
                    percentage={macroProgress.fat.percentage}
                    label="Fat"
                    unit="g"
                    size={100}
                    strokeWidth={8}
                    color={getProgressColor(macroProgress.fat.percentage)}
                  />
                )}
              </div>
            )}
          </div>
        </ClientGlassCard>

        {/* B) Today's Meal Plan — Your Coach's Plan */}
        <section>
          <h2 className="text-base font-semibold fc-text-primary mb-3">Your Coach&apos;s Plan</h2>
          <ClientGlassCard className="p-4">
            {loadingMeals ? (
              <div className="animate-pulse space-y-3">
                <div className="h-12 rounded bg-white/10" />
                <div className="h-12 rounded bg-white/10" />
              </div>
            ) : meals.length === 0 ? (
              <p className="text-sm text-center fc-text-dim py-4">No meals in your plan today.</p>
            ) : (
              <div className="space-y-3">
                {meals.map((meal) => {
                  const mealCal = getMealCalories(meal);
                  const displayItems = getDisplayItems(meal);
                  const loggedMacros = getLoggedMealMacros(meal);
                  const hasContribution = meal.logged && (loggedMacros.calories > 0 || loggedMacros.protein > 0);
                  return (
                    <div
                      key={meal.id}
                      className="border-b border-[color:var(--fc-glass-border)] last:border-0 pb-3 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg">{meal.emoji}</span>
                          <div>
                            <span className="text-sm font-medium fc-text-primary">{meal.name}</span>
                            {mealCal > 0 && (
                              <span className="text-xs fc-text-dim ml-2">{Math.round(mealCal)} kcal</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMealIdForAdd(meal.id);
                            setIsAddFoodOpen(true);
                          }}
                          className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[color:var(--fc-accent)]/20 hover:bg-[color:var(--fc-accent)]/30 text-[color:var(--fc-accent)] transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {hasContribution && (
                        <p className="text-xs fc-text-dim mt-1 ml-7">
                          +{Math.round(loggedMacros.calories)} cal, +{Math.round(loggedMacros.protein)}g protein
                        </p>
                      )}
                      {displayItems.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 ml-7">
                          {displayItems.map((item, idx) => (
                            <span
                              key={item.food?.id ?? `item-${idx}`}
                              className="text-xs px-2 py-0.5 rounded-lg bg-white/5 fc-text-dim"
                            >
                              {item.food?.name || "Unknown"} {item.quantity > 1 ? `×${item.quantity}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ClientGlassCard>
        </section>

        {/* C) Additional Food — secondary */}
        <section>
          <h2 className="text-sm font-semibold fc-text-dim mb-2">Additional Food</h2>
          <p className="text-xs fc-text-dim mb-3">Snacks, substitutions, or extras that count toward your targets.</p>
          <ClientGlassCard className="p-4">
            <div className="space-y-2">
              {entries.length === 0 ? (
                <p className="text-sm fc-text-dim py-2">No extra food logged yet.</p>
              ) : (
                entries.map((entry) => (
                  <FoodLogEntryComponent
                    key={entry.id}
                    entry={entry}
                    onDelete={() => handleDeleteEntry(entry.id)}
                  />
                ))
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => {
                  setAdditionalFoodMealSlot("afternoon_snack");
                  setShowAdditionalFoodSearch(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Log Food
              </Button>
            </div>
          </ClientGlassCard>
        </section>

        {/* D) Daily Summary — collapsible */}
        <ClientGlassCard className="p-4">
          <button
            type="button"
            className="w-full flex items-center justify-between text-left"
            onClick={() => setSummaryExpanded((e) => !e)}
          >
            <span className="text-sm font-semibold fc-text-primary">Daily summary</span>
            {summaryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {summaryExpanded && (
            <div className="mt-4 space-y-3 pt-3 border-t border-[color:var(--fc-glass-border)]">
              <p className="text-sm fc-text-dim">
                From meal plan: {Math.round(fromMealPlan.calories)} cal ({mealsLoggedCount} meals logged)
              </p>
              <p className="text-sm fc-text-dim">
                Additional food: {Math.round(fromAdditional.calories)} cal ({entries.length} items)
              </p>
              <p className="text-sm font-medium fc-text-primary">
                Total: {Math.round(totalCal)} / {(goals.calories ?? 0).toLocaleString()} cal target
              </p>
              {waterGoalMl > 0 && (
                <div className="flex items-center gap-2 text-sm fc-text-dim">
                  <Droplet className="w-4 h-4" />
                  <span>
                    Water: {waterMl.toLocaleString()} / {waterGoalMl.toLocaleString()} ml
                  </span>
                </div>
              )}
            </div>
          )}
        </ClientGlassCard>
      </div>

      {selectedMealIdForAdd && (
        <AddFoodModal
          open={isAddFoodOpen}
          onClose={() => {
            setIsAddFoodOpen(false);
            setSelectedMealIdForAdd(null);
          }}
          mealId={selectedMealIdForAdd}
          onFoodAdded={() => {
            onRefetchMeals();
            loadGoalsAndEntries();
            setIsAddFoodOpen(false);
            setSelectedMealIdForAdd(null);
          }}
        />
      )}

      {showAdditionalFoodSearch && (
        <QuickFoodSearch
          isOpen={showAdditionalFoodSearch}
          onClose={() => setShowAdditionalFoodSearch(false)}
          mealSlot={additionalFoodMealSlot as "breakfast" | "morning_snack" | "lunch" | "afternoon_snack" | "dinner" | "evening_snack"}
          clientId={clientId}
          onFoodAdded={handleAdditionalFoodAdded}
        />
      )}
    </>
  );
}
