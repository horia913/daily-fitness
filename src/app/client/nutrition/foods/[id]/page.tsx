"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ClientPageShell } from "@/components/client-ui";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";

import { supabase } from "@/lib/supabase";
import { ChevronLeft, Edit3 } from "lucide-react";

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
  const { performanceSettings } = useTheme();

  const foodId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [food, setFood] = useState<Food | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [foodServingSize, setFoodServingSize] = useState(1);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!foodId) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
      setLoadError("Loading took too long. Tap Retry to try again.");
    }, 20_000);
    loadFood().finally(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
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

  if (loadError) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden flex flex-col items-center justify-center min-h-[50vh]">
            <div className="py-8 px-4 text-center w-full">
              <p className="text-sm text-gray-400 mb-1">{loadError}</p>
              <p className="text-xs text-gray-500 mb-4">Check your connection and try again.</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button
                  type="button"
                  onClick={() => {
                    setLoadError(null);
                    setLoading(true);
                    loadFood();
                  }}
                  className="fc-btn fc-btn-primary"
                >
                  Retry
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = "/client/nutrition";
                  }}
                  className="fc-btn fc-btn-secondary"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
            <div className="animate-pulse space-y-3">
              <div className="h-9 w-9 rounded-xl bg-white/10" />
              <div className="h-7 max-w-[240px] rounded-lg bg-white/10" />
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-3">
                <div className="h-4 w-24 rounded bg-white/10" />
                <div className="h-8 w-32 rounded bg-white/10" />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
                <div className="h-3 w-full rounded bg-white/10" />
                <div className="h-3 w-full rounded bg-white/10" />
                <div className="h-3 w-5/6 rounded bg-white/10" />
              </div>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!food) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
            <div className="py-8 px-4 text-center">
              <h2 className="text-sm text-gray-400 font-medium">Food not found</h2>
              <p className="mt-1 text-xs text-gray-500">This food item is no longer available.</p>
              <div className="mt-4 flex justify-center">
                <Button
                  className="fc-btn fc-btn-secondary h-10 text-sm"
                  onClick={() => {
                    window.location.href = "/client/nutrition";
                  }}
                >
                  Back to Nutrition
                </Button>
              </div>
            </div>
          </ClientPageShell>
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
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-32 pt-6 space-y-4 overflow-x-hidden">
          <nav className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/client/nutrition";
              }}
              className="w-10 h-10 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </nav>

          <header className="mb-1">
            <h1 className="text-xl font-bold text-white tracking-tight mb-2 break-words">{food.name}</h1>
            {food.brand ? <p className="text-xs text-gray-500 mb-2">{food.brand}</p> : null}
            <p className="text-xs text-gray-500">
              <span className="text-gray-600">·</span> {food.category}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-500">Serving</span>
              <span className="text-sm font-semibold tabular-nums text-white">
                {foodServingSize} {food.serving_unit}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] min-w-[44px] p-0 border-white/10 bg-white/[0.04] text-white"
                onClick={() => setFoodServingSize(Math.max(0.1, foodServingSize - 0.1))}
              >
                −
              </Button>
              <span className="w-16 text-center font-mono text-sm font-semibold tabular-nums text-white">
                {foodServingSize}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] min-w-[44px] p-0 border-white/10 bg-white/[0.04] text-white"
                onClick={() => setFoodServingSize(foodServingSize + 0.1)}
              >
                +
              </Button>
              <span className="text-sm text-gray-500">{food.serving_unit}</span>
            </div>
          </header>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Energy</p>
            <div className="flex flex-wrap items-end gap-1 mb-3">
              <span className="text-2xl font-semibold tabular-nums text-white">{nutrition.calories}</span>
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide pb-0.5">kcal</span>
            </div>
            <div className="flex flex-wrap items-stretch gap-0 rounded-lg border border-white/10 overflow-hidden bg-black/20">
              <div className="flex flex-1 min-w-[4.5rem] flex-col items-center justify-center py-2.5 px-2">
                <span className="text-base font-semibold tabular-nums text-white">{nutrition.protein}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500">Protein g</span>
              </div>
              <div className="w-px self-stretch min-h-[2rem] bg-white/10" />
              <div className="flex flex-1 min-w-[4.5rem] flex-col items-center justify-center py-2.5 px-2">
                <span className="text-base font-semibold tabular-nums text-white">{nutrition.carbs}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500">Carbs g</span>
              </div>
              <div className="w-px self-stretch min-h-[2rem] bg-white/10" />
              <div className="flex flex-1 min-w-[4.5rem] flex-col items-center justify-center py-2.5 px-2">
                <span className="text-base font-semibold tabular-nums text-white">{nutrition.fat}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500">Fat g</span>
              </div>
              <div className="w-px self-stretch min-h-[2rem] bg-white/10" />
              <div className="flex flex-1 min-w-[4.5rem] flex-col items-center justify-center py-2.5 px-2">
                <span className="text-base font-semibold tabular-nums text-white">{nutrition.fiber}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500">Fiber g</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-4">Macro mix</h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold text-white tracking-tight">Protein</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-cyan-300/90">
                    {nutrition.protein}g <span className="text-gray-500 font-normal">/ {proteinPct}%</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-cyan-500/60" style={{ width: `${proteinPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold text-white tracking-tight">Carbohydrates</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-amber-300/90">
                    {nutrition.carbs}g <span className="text-gray-500 font-normal">/ {carbsPct}%</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500/50" style={{ width: `${carbsPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold text-white tracking-tight">Fats</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-emerald-300/90">
                    {nutrition.fat}g <span className="text-gray-500 font-normal">/ {fatPct}%</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500/50" style={{ width: `${fatPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[color:var(--fc-bg-base)] via-[color:var(--fc-bg-base)]/90 to-transparent z-50">
            <div className="max-w-lg mx-auto w-full">
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = `/client/nutrition/foods/create?edit=${food.id}`;
                }}
                className="w-full h-11 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-semibold text-sm gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit food
              </Button>
            </div>
          </div>
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
