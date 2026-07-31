"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/client-ui";
import {
  Droplet,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  UtensilsCrossed,
  Plus,
  Clock,
  Target,
  Info,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ClientPageShell } from "@/components/client-ui";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast-provider";
import {
  completeMeal,
  undoCompletion,
  selectPlanForToday,
  addPhotoToCompletion,
} from "@/lib/mealCompletionService";
import type { MappedMeal } from "@/lib/nutritionPageDataMapper";
import { fetchClientNutritionPage } from "@/lib/clientNutritionPageData";
import { FuelDaySummaryCard } from "@/app/client/nutrition/FuelDaySummaryCard";
import MealCardWithOptions from "@/components/client/MealCardWithOptions";
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

interface MealOptionDisplay {
  id: string;
  name: string;
  order_index: number;
  items: MealFoodItemDisplay[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

type WaterState = {
  glasses: number;
  goal: number;
  ml: number;
  goalMl: number;
};

type FuelQueryData = {
  mapped: Awaited<
    ReturnType<typeof fetchClientNutritionPage>
  >["mapped"];
  meals: Meal[];
};

function formatFuelDateShort(d: Date = new Date()): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Resolve completion photo_url storage paths to signed URLs. */
async function resolveMealPhotoUrls(meals: MappedMeal[]): Promise<Meal[]> {
  const withPhotos = meals.filter(
    (m) => m.logged && m.photoUrl && !/^https?:\/\//i.test(m.photoUrl),
  );
  if (withPhotos.length === 0) return meals as Meal[];
  const resolved = await Promise.all(
    meals.map(async (m) => {
      if (!m.photoUrl || /^https?:\/\//i.test(m.photoUrl)) return m;
      try {
        const { data, error } = await supabase.storage
          .from("meal-photos")
          .createSignedUrl(m.photoUrl, 3600);
        if (error || !data?.signedUrl) return { ...m, photoUrl: undefined };
        return { ...m, photoUrl: data.signedUrl };
      } catch {
        return m;
      }
    }),
  );
  return resolved as Meal[];
}

function sumLoggedMacros(mealsArray: Meal[]) {
  const loggedMeals = mealsArray.filter((m) => m.logged);
  return {
    calories: loggedMeals.reduce(
      (sum, meal) =>
        sum + meal.items.reduce((itemSum, item) => itemSum + item.calories, 0),
      0,
    ),
    protein: loggedMeals.reduce(
      (sum, meal) =>
        sum + meal.items.reduce((itemSum, item) => itemSum + item.protein, 0),
      0,
    ),
    carbs: loggedMeals.reduce(
      (sum, meal) =>
        sum + meal.items.reduce((itemSum, item) => itemSum + item.carbs, 0),
      0,
    ),
    fat: loggedMeals.reduce(
      (sum, meal) =>
        sum + meal.items.reduce((itemSum, item) => itemSum + item.fat, 0),
      0,
    ),
  };
}

function NutritionDashboardContent() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const todayUtc = new Date().toISOString().split("T")[0];

  const [water, setWater] = useState<WaterState>({
    glasses: 0,
    goal: 0,
    ml: 0,
    goalMl: 0,
  });
  const [waterGoalGlasses, setWaterGoalGlasses] = useState<number>(0);
  const [displayedWaterGlasses, setDisplayedWaterGlasses] = useState<number>(1);
  const [waterGoalId, setWaterGoalId] = useState<string | null>(null);
  const [loadingWaterGoal, setLoadingWaterGoal] = useState(false);

  const [activeGoalsCount, setActiveGoalsCount] = useState(0);
  const [goalsAdherence, setGoalsAdherence] = useState<number | null>(null);
  const [nutritionTrendsMetric, setNutritionTrendsMetric] = useState<
    "calories" | "protein" | "carbs" | "fat"
  >("calories");
  const [nutritionTrendsOpen, setNutritionTrendsOpen] = useState(false);

  const nutritionQuery = useQuery({
    queryKey: ["client-nutrition", user?.id, todayUtc],
    queryFn: async (): Promise<FuelQueryData> => {
      const { mapped } = await fetchClientNutritionPage(user!.id, todayUtc);
      if (!mapped) {
        return { mapped: null, meals: [] };
      }
      const meals = await resolveMealPhotoUrls(mapped.meals);
      return { mapped, meals };
    },
    enabled: !!user?.id,
  });

  const mapped = nutritionQuery.data?.mapped ?? null;
  const meals = nutritionQuery.data?.meals ?? [];
  const loadingMeals = nutritionQuery.isLoading;
  const mealsLoadError = nutritionQuery.isError
    ? nutritionQuery.error instanceof Error
      ? nutritionQuery.error.message
      : "Failed to load nutrition"
    : null;

  const hasActivePlan = mapped == null ? (nutritionQuery.isSuccess ? false : null) : mapped.hasAssignment;
  const hasMealsInPlan =
    mapped == null
      ? nutritionQuery.isSuccess
        ? false
        : null
      : mapped.hasAssignment && mapped.meals.length > 0;
  const activeAssignmentId = mapped?.assignmentId ?? null;
  const activeAssignments = mapped?.activeAssignments ?? [];
  const activeMealPlanInfo = mapped?.activeMealPlanInfo ?? null;
  const nutritionGoals = mapped?.nutritionGoals ?? [];

  const calorieTrendData = useMemo(() => {
    const complianceRows = mapped?.weeklyCompliance ?? [];
    return complianceRows.map((row) => ({
      label: new Date(`${row.date}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      date: row.date,
      calories: Number(row.meals_completed ?? 0),
    }));
  }, [mapped?.weeklyCompliance]);

  const nutritionTrends = useMemo(() => {
    const complianceRows = mapped?.weeklyCompliance ?? [];
    return complianceRows.map((row) => ({
      date: row.date,
      calories: Number(row.meals_completed ?? 0),
      protein: 0,
      carbs: 0,
      fat: 0,
      targetCalories: mapped?.targetCalories || undefined,
    }));
  }, [mapped?.weeklyCompliance, mapped?.targetCalories]);

  const nutritionTrendsTarget = mapped?.targetCalories || null;

  const nutritionData: NutritionData = useMemo(() => {
    const totals = sumLoggedMacros(meals);
    return {
      calories: {
        consumed: totals.calories,
        goal: mapped?.targetCalories ?? 0,
      },
      protein: {
        consumed: totals.protein,
        goal: mapped?.targetProtein ?? 0,
      },
      carbs: {
        consumed: totals.carbs,
        goal: mapped?.targetCarbs ?? 0,
      },
      fat: {
        consumed: totals.fat,
        goal: mapped?.targetFat ?? 0,
      },
      water,
    };
  }, [meals, mapped, water]);

  const getAvatarUrl = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    if (profile?.first_name) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.first_name}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || "User"}`;
  };

  const todayStr = () => new Date().toISOString().split("T")[0];

  const invalidateNutritionCaches = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["client-nutrition", user?.id],
    });
    await queryClient.invalidateQueries({
      queryKey: ["home-fuel-glance", user?.id],
    });
  };

  /** When goalsFromRpc is provided (from get_client_nutrition_page RPC), use it and skip the goals fetch. */
  const loadWaterGoal = async (
    goalsFromRpc?: Array<{
      id: string;
      title?: string;
      target_value?: number | string | null;
      target_unit?: string | null;
      current_value?: number | null;
      progress_percentage?: number | null;
    }>,
  ) => {
    if (!user?.id) return;
    if (loadingWaterGoal) return;

    setLoadingWaterGoal(true);
    try {
      let goalsList: Array<{
        id: string;
        title?: string;
        target_value?: number | string | null;
        target_unit?: string | null;
        current_value?: number | null;
        progress_percentage?: number | null;
        pillar?: string;
        category?: string;
      }>;
      if (goalsFromRpc !== undefined) {
        goalsList = goalsFromRpc.map((g) => ({
          ...g,
          pillar: (g as { pillar?: string }).pillar ?? "nutrition",
        }));
      } else {
        const { data: allGoals, error } = await supabase
          .from("goals")
          .select(
            "id, title, target_value, target_unit, current_value, category, progress_percentage, pillar",
          )
          .eq("client_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false });
        if (error) {
          console.error("Error loading goals:", error);
          setWaterGoalId(null);
          setWaterGoalGlasses(0);
          setDisplayedWaterGlasses(1);
          setWater((prev) => ({
            ...prev,
            goal: 0,
            goalMl: 0,
            glasses: 0,
            ml: 0,
          }));
          return;
        }
        goalsList = allGoals || [];
      }

      setActiveGoalsCount(
        goalsList.filter(
          (g) => !(g.title || "").toLowerCase().includes("water intake"),
        ).length,
      );
      const nonWater = goalsList.filter(
        (g) => !(g.title || "").toLowerCase().includes("water intake"),
      );
      const adherence =
        nonWater.length > 0
          ? Math.round(
              nonWater.reduce(
                (sum: number, g: { progress_percentage?: number | null }) =>
                  sum + (g.progress_percentage ?? 0),
                0,
              ) / nonWater.length,
            )
          : null;
      setGoalsAdherence(adherence);

      const goals = goalsList.filter((g: { title?: string }) =>
        (g.title || "").toLowerCase().includes("water intake"),
      );

      if (!goals || goals.length === 0) {
        const defaultTargetLiters = 3;
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
          setWater((prev) => ({
            ...prev,
            goal: 0,
            goalMl: 0,
            glasses: 0,
            ml: 0,
          }));
          return;
        }

        const goalGlasses = Math.ceil(defaultTargetMl / 375);
        const displayGoalGlasses = Math.min(goalGlasses, 16);

        setWaterGoalId(newGoal.id);
        setWaterGoalGlasses(displayGoalGlasses);
        setDisplayedWaterGlasses(Math.max(displayGoalGlasses, 1));
        setActiveGoalsCount(
          goalsList.filter(
            (g) => !(g.title || "").toLowerCase().includes("water intake"),
          ).length,
        );
        setGoalsAdherence(null);
        setWater({
          glasses: 0,
          goal: displayGoalGlasses,
          ml: 0,
          goalMl: defaultTargetMl,
        });
        setLoadingWaterGoal(false);
        return;
      }

      const waterGoal = goals[0];
      setWaterGoalId(waterGoal.id);
      const targetValue = Number(waterGoal.target_value ?? 0);
      const currentValue = Number(waterGoal.current_value ?? 0);
      const unit = waterGoal.target_unit?.toLowerCase() || "liters";

      let goalMl = 0;
      if (unit === "liters" || unit === "l") {
        goalMl = targetValue * 1000;
      } else if (unit === "glasses") {
        goalMl = targetValue * 375;
      } else if (unit === "ml" || unit === "milliliters") {
        goalMl = targetValue;
      } else {
        goalMl = targetValue * 1000;
      }

      const goalGlasses = Math.ceil(goalMl / 375);
      const displayGoalGlasses = Math.min(goalGlasses, 16);

      setWaterGoalGlasses(displayGoalGlasses);

      const currentGlasses = Math.floor(currentValue / 375);
      const currentMl = currentValue;

      setDisplayedWaterGlasses(Math.max(displayGoalGlasses, currentGlasses, 1));

      setWater({
        glasses: currentGlasses,
        goal: displayGoalGlasses,
        ml: currentMl,
        goalMl: goalMl,
      });
    } catch (error) {
      console.error("Error loading water goal:", error);
      setWaterGoalId(null);
      setWaterGoalGlasses(0);
      setDisplayedWaterGlasses(1);
      setWater((prev) => ({
        ...prev,
        goal: 0,
        goalMl: 0,
        glasses: 0,
        ml: 0,
      }));
    } finally {
      setLoadingWaterGoal(false);
    }
  };

  useEffect(() => {
    if (!nutritionQuery.isSuccess || !user?.id) return;
    void loadWaterGoal(nutritionGoals);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload water when nutrition query data updates
  }, [nutritionQuery.dataUpdatedAt, user?.id]);

  const handleToggleMealComplete = async (meal: Meal) => {
    if (!user?.id) {
      addToast({
        title: "Cannot complete meal",
        description: "Please sign in and try again.",
        variant: "destructive",
      });
      return;
    }
    if (meal.logged) {
      try {
        await undoCompletion(user.id, meal.id, todayStr());
        await invalidateNutritionCaches();
      } catch (e) {
        addToast({
          title: "Could not undo",
          description: e instanceof Error ? e.message : "Please try again.",
          variant: "destructive",
        });
      }
      return;
    }
    if (!activeAssignmentId) {
      addToast({
        title: "Cannot complete meal",
        description:
          "No active meal plan. Please refresh the page or ask your coach to assign a plan.",
        variant: "destructive",
      });
      return;
    }
    const optionId =
      meal.loggedOptionId ?? meal.options?.[0]?.id ?? null;
    try {
      await completeMeal({
        clientId: user.id,
        mealId: meal.id,
        mealOptionId: optionId,
        mealPlanAssignmentId: activeAssignmentId,
        date: todayStr(),
      });
      await invalidateNutritionCaches();
    } catch (e) {
      addToast({
        title: "Could not complete meal",
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
      await invalidateNutritionCaches();
    } catch (e) {
      addToast({
        title: "Could not switch plan",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleWaterGlassClick = async (targetGlasses: number) => {
    if (!user?.id || !waterGoalId) {
      setWater((prev) => {
        const maxGlasses = 16;
        let newGlasses =
          targetGlasses === prev.glasses
            ? Math.max(prev.glasses - 1, 0)
            : Math.min(targetGlasses, maxGlasses);

        if (newGlasses > displayedWaterGlasses && newGlasses <= maxGlasses) {
          setDisplayedWaterGlasses(newGlasses);
        }

        const newMl = newGlasses * 375;
        return { ...prev, glasses: newGlasses, ml: newMl };
      });
      return;
    }

    try {
      const oldGlasses = water.glasses;
      const oldMl = water.ml;

      const maxGlasses = 16;
      let newGlasses =
        targetGlasses === oldGlasses
          ? Math.max(oldGlasses - 1, 0)
          : Math.min(targetGlasses, maxGlasses);

      if (newGlasses > displayedWaterGlasses && newGlasses <= maxGlasses) {
        setDisplayedWaterGlasses(newGlasses);
      }

      const newMl = newGlasses * 375;

      setWater((prev) => ({
        ...prev,
        glasses: newGlasses,
        ml: newMl,
      }));

      const { error: updateError } = await supabase
        .from("goals")
        .update({
          current_value: newMl,
          progress_percentage:
            waterGoalGlasses > 0
              ? Math.min((newGlasses / waterGoalGlasses) * 100, 100)
              : 0,
          status:
            waterGoalGlasses > 0 && newGlasses >= waterGoalGlasses
              ? "completed"
              : "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", waterGoalId)
        .select("id, current_value");

      if (updateError) {
        console.error("Error updating water intake:", updateError);
        setWater((prev) => ({
          ...prev,
          glasses: oldGlasses,
          ml: oldMl,
        }));
        addToast({
          title: "Error",
          description: "Failed to save water intake. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleWaterGlassClick:", error);
      addToast({
        title: "Error",
        description: "Failed to save water intake. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMarkComplete = async (
    mealId: string,
    optionId: string | null,
  ) => {
    const meal = meals.find((m) => m.id === mealId);
    if (!meal) return;
    const patchedMeal: Meal = {
      ...meal,
      loggedOptionId: optionId ?? meal.loggedOptionId ?? undefined,
    };
    await handleToggleMealComplete(patchedMeal);
  };

  const handleUndo = async (meal: Meal) => {
    await handleToggleMealComplete({ ...meal, logged: true });
  };

  const handleAddPhoto = async (mealId: string, file: File) => {
    if (!user?.id) return;
    try {
      await addPhotoToCompletion(user.id, mealId, todayStr(), file);
      await invalidateNutritionCaches();
      addToast({
        title: "Photo added",
        description: "Your meal photo has been saved.",
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

  const fuelChipBase =
    "px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.12em] border shrink-0 transition-colors [font-family:var(--f-mono)] bg-transparent";
  const fuelChipActive =
    "text-[color:var(--fc-accent)] border-[color-mix(in_srgb,var(--fc-accent)_40%,transparent)]";
  const fuelChipInactive =
    "fc-text-dim border-[color:var(--fc-glass-border)]";

  const waterLiters = nutritionData.water.ml / 1000;
  const waterGoalLiters = nutritionData.water.goalMl / 1000;
  const hasTrendData = calorieTrendData.some((d) => d.calories > 0);
  const dropletCount = Math.min(
    Math.max(displayedWaterGlasses, waterGoalGlasses, 8),
    16,
  );

  return (
      <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto flex flex-col overflow-x-hidden px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
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
        </header>
        <header className={fuelStyles.pageHeader}>
          <div className={fuelStyles.headerLeft}>
            <div className={fuelStyles.todayEyebrowWrap}>
              <Eyebrow tone="action" dashboardEyebrow>
                Today · {formatFuelDateShort()}
              </Eyebrow>
            </div>
            <h1 className={fuelStyles.fuelTitle}>Fuel</h1>
          </div>
          <div className={fuelStyles.headerActions}>
            <button
              type="button"
              className={fuelStyles.pillHistory}
                  onClick={() => router.push("/client/nutrition/progress")}
            >
              <Clock
                className="h-3.5 w-3.5 shrink-0"
                strokeWidth={2}
                aria-hidden
              />
              History
            </button>
          </div>
        </header>
        {mealsLoadError && !loadingMeals && (
          <div className="py-8 px-4 text-center">
            <p className="text-sm fc-text-dim mb-1">{mealsLoadError}</p>
            <p className="text-xs fc-text-subtle mb-4">
              Tap retry to reload today&apos;s plan.
            </p>
            <Button
              type="button"
              variant="fc-secondary"
              className="mx-auto h-10 w-full max-w-xs"
              onClick={() => void nutritionQuery.refetch()}
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
                className="rounded-xl border border-[color:var(--fc-glass-border)] bg-transparent p-3 animate-pulse space-y-2"
              >
                <div className="h-3 rounded w-1/2 bg-white/10" />
                <div className="h-16 rounded-lg bg-white/10" />
              </div>
            ))}
          </div>
        ) : !hasActivePlan ? (
          <>
            <div className="py-8 px-4 text-center rounded-xl border border-[color:var(--fc-glass-border)] bg-transparent">
              <UtensilsCrossed
                className="mx-auto mb-3 h-10 w-10 fc-text-subtle"
                aria-hidden
              />
              <p className="text-sm fc-text-dim mb-1">No meal plan</p>
              <p className="text-xs fc-text-dim">
                Ask your coach to assign a meal plan.
              </p>
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
                  className="w-full h-11 min-h-[44px] px-3 rounded-lg border border-[color:var(--fc-glass-border)] bg-transparent text-sm font-medium fc-text-primary appearance-none cursor-pointer"
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
                        {name}
                        {kcal ? ` - ${kcal}kcal` : ""}
                        {labelPart}
                      </option>
                    );
                  })}
                </select>
              </section>
            )}

            <FuelDaySummaryCard
              planName={activeMealPlanInfo?.name ?? "Meal Plan"}
              loggedMeals={meals.filter((m) => m.logged).length}
              totalMeals={meals.length}
              caloriesConsumed={nutritionData.calories.consumed}
              caloriesGoal={nutritionData.calories.goal}
              protein={{
                consumed: nutritionData.protein.consumed,
                goal: nutritionData.protein.goal,
              }}
              carbs={{
                consumed: nutritionData.carbs.consumed,
                goal: nutritionData.carbs.goal,
              }}
              fat={{
                consumed: nutritionData.fat.consumed,
                goal: nutritionData.fat.goal,
              }}
            />

            <section className={fuelStyles.waterCard} aria-label="Water intake">
              <div className={fuelStyles.waterHead}>
                <div className={fuelStyles.waterHeadLeft}>
                  <span className={fuelStyles.waterLabel}>
                    <Droplet
                      className="h-[15px] w-[15px] shrink-0 text-[color:var(--fc-group-c,#22d3ee)]"
                      aria-hidden
                    />
                    Water
                  </span>
                </div>
                <div className={fuelStyles.waterVal}>
                  <span className={fuelStyles.waterCurrent}>
                    {waterGoalLiters > 0
                      ? waterLiters.toFixed(1)
                      : waterLiters > 0
                        ? waterLiters.toFixed(1)
                        : "0.0"}
                  </span>
                  <span className={fuelStyles.waterSep}>/</span>
                  <span className={fuelStyles.waterTarget}>
                    {waterGoalLiters > 0 ? waterGoalLiters.toFixed(1) : "—"}
                  </span>
                  <span className={fuelStyles.waterUnit}>L</span>
                </div>
              </div>
              <div className={fuelStyles.dropletRow}>
                {Array.from({ length: dropletCount }).map((_, index) => {
                  const isActive = index < nutritionData.water.glasses;
                  const glassNumber = index + 1;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleWaterGlassClick(glassNumber)}
                      className={cn(
                        fuelStyles.dropletBtn,
                        isActive
                          ? fuelStyles.dropletBtnActive
                          : fuelStyles.dropletBtnInactive,
                      )}
                      aria-label={
                        isActive
                          ? `Water ${glassNumber}, logged`
                          : `Log water glass ${glassNumber}`
                      }
                    >
                      <Droplet className="h-[13px] w-[13px]" />
                    </button>
                  );
                })}
                {dropletCount < 16 &&
                  nutritionData.water.glasses >= dropletCount && (
                    <button
                      type="button"
                      onClick={() =>
                        handleWaterGlassClick(nutritionData.water.glasses + 1)
                      }
                      className={fuelStyles.waterAddBtn}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Add
                    </button>
                  )}
              </div>
            </section>

            {hasMealsInPlan && (
              <section>
                <div className={fuelStyles.sectionEyebrow}>Today&apos;s meals</div>
                <div className={fuelStyles.mealsStack}>
                  {meals.map((meal) => (
                    <MealCardWithOptions
                      key={meal.id}
                      meal={{
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
                      }}
                      clientId={user?.id ?? ""}
                      onMarkComplete={(mealId, optionId) =>
                        void handleMarkComplete(mealId, optionId)
                      }
                      onUndo={() => void handleUndo(meal)}
                      onAddPhoto={handleAddPhoto}
                      onFoodClick={(foodId) =>
                        router.push(`/client/nutrition/foods/${foodId}`)
                      }
                      collapsible
                    />
                  ))}
                </div>
                <div className={fuelStyles.portionBanner}>
                  <Info
                    className="h-[13px] w-[13px] shrink-0 text-[color:var(--fc-group-c,#22d3ee)]"
                    aria-hidden
                  />
                  All portions are for raw / uncooked ingredients
                </div>
              </section>
            )}

            {hasActivePlan && hasMealsInPlan === false && !loadingMeals && (
              <div className="py-8 px-4 text-center">
                <p className="text-sm fc-text-dim">
                  No meals in this plan yet.
                </p>
                <p className="text-xs fc-text-subtle mt-1">
                  Your coach can add meals to this plan.
                </p>
              </div>
            )}

            {hasTrendData && (
            <section className={fuelStyles.trendsCard}>
              <button
                type="button"
                onClick={() => setNutritionTrendsOpen((o) => !o)}
                className={fuelStyles.trendsHead}
              >
                <div className={fuelStyles.trendsHeadLeft}>
                  <BarChart3
                    className="h-3.5 w-3.5 shrink-0 text-[color:var(--fc-text-dim)]"
                    aria-hidden
                  />
                  <span className={fuelStyles.trendsTitle}>
                    Nutrition trends
                  </span>
                </div>
                {nutritionTrendsOpen ? (
                  <ChevronUp
                    className="h-5 w-5 shrink-0 fc-text-dim"
                    aria-hidden
                  />
                ) : (
                  <ChevronDown
                    className="h-5 w-5 shrink-0 fc-text-dim"
                    aria-hidden
                  />
                )}
              </button>
              {nutritionTrendsOpen && (
                <div className={fuelStyles.trendsBody}>
                  <>
                      <p className="text-[10px] font-bold uppercase tracking-wider fc-text-subtle mb-2">
                        Metric
                      </p>
                      <div className="-mx-1 px-1 mb-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        <div className="flex flex-wrap gap-2 min-w-min">
                          {(
                            ["calories", "protein", "carbs", "fat"] as const
                          ).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setNutritionTrendsMetric(m)}
                              className={cn(
                                fuelChipBase,
                                nutritionTrendsMetric === m
                                  ? fuelChipActive
                                  : fuelChipInactive,
                              )}
                            >
                              {m === "calories"
                                ? "Calories"
                                : m === "protein"
                                  ? "Protein"
                                  : m === "carbs"
                                    ? "Carbs"
                                    : "Fat"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative h-40 flex items-end gap-0.5">
                        {nutritionTrends.map((day) => {
                          const val = day[nutritionTrendsMetric];
                          const maxVal = Math.max(
                            ...nutritionTrends.map(
                              (d) => d[nutritionTrendsMetric],
                            ),
                            1,
                          );
                          const height = (val / maxVal) * 100;
                          return (
                            <div
                              key={day.date}
                              className="flex-1 min-w-0 flex flex-col items-center"
                              title={`${day.date}: ${val}`}
                            >
                              <div
                                className="w-full rounded-t bg-[color:var(--fc-accent)]/70 hover:opacity-90 transition-opacity"
                                style={{
                                  height: `${Math.max(height, val > 0 ? 4 : 0)}%`,
                                  minHeight: val > 0 ? "4px" : "0",
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs fc-text-subtle mt-2">
                        Last 30 days ·{" "}
                        {nutritionTrendsMetric === "calories" ? "meals" : "g"}
                      </p>
                    </>
                </div>
              )}
            </section>
            )}
          </>
        )}

        <div className={fuelStyles.sectionEyebrow}>More</div>
        <button
          type="button"
          className={fuelStyles.linkRow}
          style={{ ["--h" as string]: "var(--fc-accent)" }}
          onClick={() => router.push("/client/nutrition/progress")}
        >
          <span className={fuelStyles.linkIcon} aria-hidden>
            <TrendingUp className="h-3.5 w-3.5" />
          </span>
          <span className={fuelStyles.linkBody}>
            <div className={fuelStyles.linkName}>Nutrition history</div>
            <div className={fuelStyles.linkSub}>
              Adherence, trends &amp; macro split
            </div>
          </span>
          <ChevronRight className={cn(fuelStyles.linkChevron, "h-3.5 w-3.5")} />
        </button>
        <button
          type="button"
          className={fuelStyles.linkRow}
          style={{ ["--h" as string]: "var(--fc-status-success)" }}
          onClick={() => router.push("/client/goals")}
        >
          <span className={fuelStyles.linkIcon} aria-hidden>
            <Target className="h-3.5 w-3.5" />
          </span>
          <span className={fuelStyles.linkBody}>
            <div className={fuelStyles.linkName}>Nutrition goals</div>
            <div className={fuelStyles.linkSub}>
              {goalsAdherence != null
                ? `${goalsAdherence}% adherence this week`
                : activeGoalsCount > 0
                  ? `${activeGoalsCount} active`
                  : "Set targets & track adherence"}
            </div>
          </span>
          {activeGoalsCount > 0 ? (
            <span className={fuelStyles.linkVal}>{activeGoalsCount}</span>
          ) : null}
          <ChevronRight className={cn(fuelStyles.linkChevron, "h-3.5 w-3.5")} />
        </button>
      </ClientPageShell>
  );
}

export default function NutritionDashboard() {
  return (
    <ProtectedRoute requiredRole="client">
      <NutritionDashboardContent />
    </ProtectedRoute>
  );
}
