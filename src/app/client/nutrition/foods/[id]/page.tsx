"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
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
  const router = useRouter();
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
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden flex flex-col items-center justify-center min-h-[50vh]">
            <div className="py-8 px-4 text-center w-full">
              <p className="text-sm fc-text-dim mb-1">{loadError}</p>
              <p className="text-xs fc-text-subtle mb-4">Check your connection and try again.</p>
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
                  onClick={() => router.push("/client/nutrition")}
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
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
            <PageSkeleton variant="dashboard" />
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
          <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
            <div className="py-8 px-4 text-center">
              <h2 className="text-sm fc-text-dim font-medium">Food not found</h2>
              <p className="mt-1 text-xs fc-text-subtle">This food item is no longer available.</p>
              <div className="mt-4 flex justify-center">
                <Button
                  className="fc-btn fc-btn-secondary h-10 text-sm"
                  onClick={() => router.push("/client/nutrition")}
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
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 space-y-4 overflow-x-hidden">
          <nav className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push("/client/nutrition")}
              className="w-10 h-10 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft flex items-center justify-center fc-text-dim hover:fc-text-primary transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </nav>

          <header className="mb-1">
            <h1 className="text-xl font-bold fc-text-primary tracking-tight mb-2 break-words">{food.name}</h1>
            {food.brand ? <p className="text-xs fc-text-dim mb-2">{food.brand}</p> : null}
            <p className="text-xs fc-text-dim">
              <span className="fc-text-subtle">·</span> {food.category}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs fc-text-dim">Serving</span>
              <span className="text-sm font-semibold tabular-nums fc-text-primary">
                {foodServingSize} {food.serving_unit}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] min-w-[44px] p-0 border-[color:var(--fc-glass-border)] fc-glass-soft fc-text-primary"
                onClick={() => setFoodServingSize(Math.max(0.1, foodServingSize - 0.1))}
                aria-label="Decrease serving"
              >
                −
              </Button>
              <span className="w-16 text-center font-mono text-sm font-semibold tabular-nums fc-text-primary">
                {foodServingSize}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] min-w-[44px] p-0 border-[color:var(--fc-glass-border)] fc-glass-soft fc-text-primary"
                onClick={() => setFoodServingSize(foodServingSize + 0.1)}
                aria-label="Increase serving"
              >
                +
              </Button>
              <span className="text-sm fc-text-dim">{food.serving_unit}</span>
            </div>
          </header>

          <div className="rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider fc-text-dim mb-2">Energy</p>
            <div className="flex flex-wrap items-end gap-1 mb-3">
              <span className="text-2xl font-semibold tabular-nums fc-text-primary">{nutrition.calories}</span>
              <span className="text-sm font-medium fc-text-dim uppercase tracking-wide pb-0.5">kcal</span>
            </div>
            <div className="flex flex-wrap items-stretch gap-0 rounded-lg border border-[color:var(--fc-glass-border)] overflow-hidden bg-[color:var(--fc-bg-deep)]/50">
              <div className="flex flex-1 min-w-[4.5rem] flex-col items-center justify-center py-2.5 px-2">
                <span className="text-base font-semibold tabular-nums fc-text-primary">{nutrition.protein}</span>
                <span className="text-[10px] uppercase tracking-wider fc-text-dim">Protein g</span>
              </div>
              <div className="w-px self-stretch min-h-[2rem] bg-[color:var(--fc-glass-border)]" />
              <div className="flex flex-1 min-w-[4.5rem] flex-col items-center justify-center py-2.5 px-2">
                <span className="text-base font-semibold tabular-nums fc-text-primary">{nutrition.carbs}</span>
                <span className="text-[10px] uppercase tracking-wider fc-text-dim">Carbs g</span>
              </div>
              <div className="w-px self-stretch min-h-[2rem] bg-[color:var(--fc-glass-border)]" />
              <div className="flex flex-1 min-w-[4.5rem] flex-col items-center justify-center py-2.5 px-2">
                <span className="text-base font-semibold tabular-nums fc-text-primary">{nutrition.fat}</span>
                <span className="text-[10px] uppercase tracking-wider fc-text-dim">Fat g</span>
              </div>
              <div className="w-px self-stretch min-h-[2rem] bg-[color:var(--fc-glass-border)]" />
              <div className="flex flex-1 min-w-[4.5rem] flex-col items-center justify-center py-2.5 px-2">
                <span className="text-base font-semibold tabular-nums fc-text-primary">{nutrition.fiber}</span>
                <span className="text-[10px] uppercase tracking-wider fc-text-dim">Fiber g</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider fc-text-dim mb-4">Macro mix</h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold fc-text-primary tracking-tight">Protein</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-[color:var(--fc-macro-protein,var(--fc-accent-cyan))]">
                    {nutrition.protein}g <span className="fc-text-dim font-normal">/ {proteinPct}%</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[color:var(--fc-glass-border)] overflow-hidden">
                  <div className="h-full rounded-full bg-[color:var(--fc-macro-protein,var(--fc-accent-cyan))]" style={{ width: `${proteinPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold fc-text-primary tracking-tight">Carbohydrates</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-[color:var(--fc-macro-carbs,var(--fc-status-warning))]">
                    {nutrition.carbs}g <span className="fc-text-dim font-normal">/ {carbsPct}%</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[color:var(--fc-glass-border)] overflow-hidden">
                  <div className="h-full rounded-full bg-[color:var(--fc-macro-carbs,var(--fc-status-warning))]" style={{ width: `${carbsPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold fc-text-primary tracking-tight">Fats</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-[color:var(--fc-macro-fat,var(--fc-status-success))]">
                    {nutrition.fat}g <span className="fc-text-dim font-normal">/ {fatPct}%</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[color:var(--fc-glass-border)] overflow-hidden">
                  <div className="h-full rounded-full bg-[color:var(--fc-macro-fat,var(--fc-status-success))]" style={{ width: `${fatPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[color:var(--fc-bg-base)] via-[color:var(--fc-bg-base)]/90 to-transparent z-50">
            <div className="max-w-lg mx-auto w-full">
              <Button
                variant="outline"
                onClick={() => router.push(`/client/nutrition/foods/create?edit=${food.id}`)}
                className="w-full h-11 rounded-lg border-[color-mix(in_srgb,var(--fc-accent-cyan)_30%,transparent)] bg-[color-mix(in_srgb,var(--fc-accent-cyan)_10%,transparent)] text-[color:var(--fc-accent-cyan)] font-semibold text-sm gap-1.5"
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
