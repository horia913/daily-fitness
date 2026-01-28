"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Flame,
  Target,
  TrendingUp,
  Droplets,
  Plus,
} from "lucide-react";
import Link from "next/link";

interface Food {
  id: string;
  name: string;
  brand: string;
  serving_size: number;
  serving_unit: string;
  calories_per_serving: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  category: string;
}

const getFoodIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case "fruits":
      return "🍎";
    case "vegetables":
      return "🥕";
    case "grains":
      return "🌾";
    case "protein":
      return "🥩";
    case "dairy":
      return "🥛";
    case "snacks":
      return "🍿";
    case "beverages":
      return "🥤";
    case "condiments":
      return "🧂";
    case "desserts":
      return "🍰";
    default:
      return "🍽️";
  }
};

const getFoodColor = (category: string) => {
  switch (category.toLowerCase()) {
    case "fruits":
      return "from-orange-500 to-red-500";
    case "vegetables":
      return "from-green-500 to-emerald-500";
    case "grains":
      return "from-yellow-500 to-amber-500";
    case "protein":
      return "from-red-500 to-pink-500";
    case "dairy":
      return "from-blue-500 to-cyan-500";
    case "snacks":
      return "from-purple-500 to-violet-500";
    case "beverages":
      return "from-cyan-500 to-blue-500";
    case "condiments":
      return "from-gray-500 to-slate-500";
    case "desserts":
      return "from-pink-500 to-rose-500";
    default:
      return "from-slate-500 to-gray-500";
  }
};

const calculateNutritionForServing = (food: Food, servingSize: number) => {
  const multiplier = servingSize / food.serving_size;
  return {
    calories: Math.round(food.calories_per_serving * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
    carbs: Math.round(food.carbs * multiplier * 10) / 10,
    fat: Math.round(food.fat * multiplier * 10) / 10,
    fiber: Math.round(food.fiber * multiplier * 10) / 10,
  };
};

export default function FoodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { performanceSettings } = useTheme();

  const foodId = params.id as string;
  const [food, setFood] = useState<Food | null>(null);
  const [loading, setLoading] = useState(true);
  const [foodServingSize, setFoodServingSize] = useState(1);

  useEffect(() => {
    if (foodId) {
      loadFood();
    }
  }, [foodId]);

  const loadFood = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("foods")
        .select("*")
        .eq("id", foodId)
        .single();

      if (error) throw error;

      if (data) {
        setFood(data as Food);
        setFoodServingSize(data.serving_size || 1);
      }
    } catch (error) {
      console.error("Error loading food:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLog = () => {
    // Store food in sessionStorage to pass to nutrition page
    sessionStorage.setItem(
      "selectedFood",
      JSON.stringify({
        food,
        quantity: foodServingSize,
      })
    );
    router.push("/client/nutrition?tab=manual-log");
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-4xl">
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

  if (!food) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-4xl">
              <div className="fc-glass fc-card p-10 text-center">
                <h2 className="text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                  Food not found
                </h2>
                <p className="mt-2 text-sm text-[color:var(--fc-text-dim)]">
                  This food item is no longer available.
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

  const nutrition = calculateNutritionForServing(food, foodServingSize);

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-4xl space-y-8">
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
              <div className="flex flex-wrap items-center gap-4">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${getFoodColor(
                    food.category
                  )} text-3xl shadow-lg`}
                >
                  {getFoodIcon(food.category)}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[color:var(--fc-text-primary)]">
                    {food.name}
                  </h1>
                  {food.brand && (
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      {food.brand}
                    </p>
                  )}
                  <span className="fc-badge fc-glass-soft mt-2 inline-flex text-[color:var(--fc-text-primary)]">
                    {food.category}
                  </span>
                </div>
              </div>
            </GlassCard>

            <GlassCard elevation={1} className="fc-glass fc-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                    Serving size
                  </h3>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Adjust the serving size to see nutrition totals.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFoodServingSize(Math.max(0.1, foodServingSize - 0.1))
                    }
                    className="fc-btn fc-btn-secondary"
                  >
                    -
                  </Button>
                  <span className="w-20 text-center text-sm font-semibold text-[color:var(--fc-text-primary)]">
                    {foodServingSize}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFoodServingSize(foodServingSize + 0.1)}
                    className="fc-btn fc-btn-secondary"
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="mt-3 text-sm text-[color:var(--fc-text-dim)]">
                {foodServingSize} {food.serving_unit}
              </div>
            </GlassCard>

            <GlassCard
              elevation={2}
              className="fc-glass fc-card p-6 space-y-6"
            >
              <div>
                <h3 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                  Nutritional information
                </h3>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  Macro totals for the selected serving size.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="text-center p-4 rounded-2xl fc-glass-soft">
                  <Flame className="mx-auto mb-2 h-6 w-6 text-[color:var(--fc-domain-challenges)]" />
                  <div className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                    {nutrition.calories}
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    Calories
                  </div>
                </div>
                <div className="text-center p-4 rounded-2xl fc-glass-soft">
                  <Target className="mx-auto mb-2 h-6 w-6 text-[color:var(--fc-domain-meals)]" />
                  <div className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                    {nutrition.protein}g
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    Protein
                  </div>
                </div>
                <div className="text-center p-4 rounded-2xl fc-glass-soft">
                  <TrendingUp className="mx-auto mb-2 h-6 w-6 text-[color:var(--fc-domain-workouts)]" />
                  <div className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                    {nutrition.carbs}g
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    Carbs
                  </div>
                </div>
                <div className="text-center p-4 rounded-2xl fc-glass-soft">
                  <Droplets className="mx-auto mb-2 h-6 w-6 text-[color:var(--fc-domain-habits)]" />
                  <div className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
                    {nutrition.fat}g
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    Fat
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="fc-glass-soft rounded-xl p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    Fiber
                  </div>
                  <div className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                    {nutrition.fiber}g
                  </div>
                </div>
                <div className="fc-glass-soft rounded-xl p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    Base serving
                  </div>
                  <div className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                    {food.serving_size} {food.serving_unit}
                  </div>
                </div>
              </div>
            </GlassCard>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={handleAddToLog}
                className="fc-btn fc-btn-secondary flex-1"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add to Manual Log
              </Button>
              <Link href="/client/nutrition" className="flex-1">
                <Button className="fc-btn fc-btn-primary w-full">Close</Button>
              </Link>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
