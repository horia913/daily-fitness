"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";

import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import {
  ChevronLeft,
  Share2,
  Star,
  Zap,
  Edit3,
  Trash2,
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
      return "from-neutral-500 to-neutral-500";
    case "desserts":
      return "from-pink-500 to-rose-500";
    default:
      return "from-neutral-500 to-neutral-500";
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
  const [loadError, setLoadError] = useState<string | null>(null);
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

  if (loadError) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          <div className="relative z-10 min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:px-10 flex items-center justify-center">
            <div className="fc-surface rounded-2xl p-8 text-center max-w-md">
              <p className="fc-text-dim mb-4">{loadError}</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button type="button" onClick={() => { setLoadError(null); setLoading(true); loadFood(); }} className="fc-btn fc-btn-primary">Retry</Button>
                <Button variant="outline" onClick={() => router.push("/client/nutrition")} className="fc-btn fc-btn-secondary"><ChevronLeft className="w-4 h-4 mr-2" />Back</Button>
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
          <div className="relative z-10 min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-4xl">
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

  if (!food) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 min-h-screen px-4 pb-28 pt-20 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-4xl">
              <div className="fc-surface p-10 text-center">
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
  const totalMacro = nutrition.protein + nutrition.carbs + nutrition.fat || 1;
  const proteinPct = totalMacro ? Math.round((nutrition.protein / totalMacro) * 100) : 0;
  const carbsPct = totalMacro ? Math.round((nutrition.carbs / totalMacro) * 100) : 0;
  const fatPct = totalMacro ? Math.round((nutrition.fat / totalMacro) * 100) : 0;

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 min-h-screen px-4 sm:px-6 pb-32 pt-8">
          <div className="mx-auto w-full max-w-xl space-y-6">
            <nav className="flex items-center justify-between mb-6">
              <Link href="/client/nutrition">
                <button type="button" className="w-10 h-10 rounded-full fc-glass border border-[color:var(--fc-glass-border)] flex items-center justify-center fc-text-subtle hover:fc-text-primary transition-colors" aria-label="Back">
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </Link>
              <div className="flex gap-3">
                <button type="button" className="w-10 h-10 rounded-full fc-glass border border-[color:var(--fc-glass-border)] flex items-center justify-center fc-text-subtle" aria-label="Share">
                  <Share2 className="w-5 h-5" />
                </button>
                <button type="button" className="w-10 h-10 rounded-full fc-glass border border-[color:var(--fc-glass-border)] flex items-center justify-center fc-text-subtle" aria-label="Favorite">
                  <Star className="w-5 h-5" />
                </button>
              </div>
            </nav>

            <header className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight fc-text-primary mb-2">{food.name}</h1>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm fc-text-subtle">Serving Size:</span>
                <span className="font-mono text-sm font-bold fc-text-workouts">{foodServingSize} {food.serving_unit}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setFoodServingSize(Math.max(0.1, foodServingSize - 0.1))}>−</Button>
                <span className="w-16 text-center font-mono text-sm font-bold fc-text-primary">{foodServingSize}</span>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setFoodServingSize(foodServingSize + 0.1)}>+</Button>
                <span className="text-sm fc-text-dim">{food.serving_unit}</span>
              </div>
            </header>

            <div className="fc-surface rounded-2xl p-8 text-center border-t-2 border-t-[color:var(--fc-domain-workouts)]/30">
              <div className="text-xs fc-text-subtle font-medium uppercase tracking-widest mb-1">Total Energy</div>
              <div className="flex justify-center items-baseline gap-2">
                <span className="text-4xl font-bold font-mono fc-text-primary">{nutrition.calories}</span>
                <span className="text-xl font-bold fc-text-subtle uppercase">kcal</span>
              </div>
              <div className="mt-4 flex justify-center gap-6">
                <div className="flex items-center gap-1.5 fc-text-success">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">High Protein</span>
                </div>
              </div>
            </div>

            <div className="fc-surface rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest fc-text-subtle mb-6">Macronutrients</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-semibold fc-text-primary">Protein</span>
                    <span className="font-mono text-sm font-bold fc-text-workouts">{nutrition.protein}g <span className="fc-text-dim font-normal">/ {proteinPct}%</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[color:var(--fc-glass-highlight)] overflow-hidden">
                    <div className="h-full rounded-full bg-[color:var(--fc-domain-workouts)]" style={{ width: `${proteinPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-semibold fc-text-primary">Carbohydrates</span>
                    <span className="font-mono text-sm font-bold fc-text-error">{nutrition.carbs}g <span className="fc-text-dim font-normal">/ {carbsPct}%</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[color:var(--fc-glass-highlight)] overflow-hidden">
                    <div className="h-full rounded-full bg-[color:var(--fc-status-error)]" style={{ width: `${carbsPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-semibold fc-text-primary">Fats</span>
                    <span className="font-mono text-sm font-bold fc-text-success">{nutrition.fat}g <span className="fc-text-dim font-normal">/ {fatPct}%</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[color:var(--fc-glass-highlight)] overflow-hidden">
                    <div className="h-full rounded-full bg-[color:var(--fc-status-success)]" style={{ width: `${fatPct}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[color:var(--fc-glass-border)] flex justify-between text-sm fc-text-dim">
                <span>Fiber</span>
                <span className="font-mono">{nutrition.fiber}g</span>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[color:var(--fc-bg-base)] via-[color:var(--fc-bg-base)]/90 to-transparent z-50">
              <div className="max-w-xl mx-auto grid grid-cols-2 gap-4">
                <Link href={`/client/nutrition/foods/create?edit=${food.id}`}>
                  <Button variant="outline" className="w-full h-12 rounded-2xl fc-glass border border-[color:var(--fc-domain-workouts)]/40 fc-text-workouts font-bold uppercase tracking-wider text-sm gap-2">
                    <Edit3 className="w-4 h-4" />
                    Edit Food
                  </Button>
                </Link>
                <Button variant="outline" className="w-full h-12 rounded-2xl border border-[color:var(--fc-status-error)]/40 fc-text-error font-bold uppercase tracking-wider text-sm gap-2 bg-[color:var(--fc-status-error)]/10">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
