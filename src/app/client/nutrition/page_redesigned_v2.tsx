"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { NutritionRing } from "@/components/ui/NutritionRing";
import { MacroBars } from "@/components/ui/MacroBars";
import { WaterTracker } from "@/components/ui/WaterTracker";
import { Button } from "@/components/ui/button";
import {
  Apple,
  Coffee,
  Plus,
  ChevronRight,
  TrendingUp,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface NutritionData {
  calories: { consumed: number; goal: number };
  protein: { consumed: number; goal: number };
  carbs: { consumed: number; goal: number };
  fat: { consumed: number; goal: number };
  water: { glasses: number; goal: number };
}

interface Meal {
  id: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  emoji: string;
  items: Array<{ name: string; calories: number }>;
  logged: boolean;
}

interface NutritionInsight {
  type: "success" | "warning" | "info";
  message: string;
  icon: string;
}

function NutritionDashboardContent() {
  const { user } = useAuth();
  const { theme, getSemanticColor, performanceSettings } = useTheme();
  const isDark = theme === "dark";

  const [nutritionData, setNutritionData] = useState<NutritionData>({
    calories: { consumed: 1450, goal: 2200 },
    protein: { consumed: 98, goal: 150 },
    carbs: { consumed: 180, goal: 250 },
    fat: { consumed: 45, goal: 70 },
    water: { glasses: 5, goal: 8 },
  });

  const [meals, setMeals] = useState<Meal[]>([
    {
      id: "1",
      type: "breakfast",
      name: "Breakfast",
      emoji: "🍳",
      items: [
        { name: "Oatmeal with berries", calories: 350 },
        { name: "Protein shake", calories: 200 },
      ],
      logged: true,
    },
    {
      id: "2",
      type: "lunch",
      name: "Lunch",
      emoji: "🥗",
      items: [
        { name: "Grilled chicken salad", calories: 450 },
        { name: "Brown rice", calories: 200 },
      ],
      logged: true,
    },
    {
      id: "3",
      type: "dinner",
      name: "Dinner",
      emoji: "🍽️",
      items: [],
      logged: false,
    },
    {
      id: "4",
      type: "snack",
      name: "Snacks",
      emoji: "🍎",
      items: [{ name: "Apple with peanut butter", calories: 250 }],
      logged: true,
    },
  ]);

  const [insights, setInsights] = useState<NutritionInsight[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Generate smart nutrition insights
  useEffect(() => {
    generateInsights();
  }, [nutritionData]);

  const generateInsights = () => {
    const newInsights: NutritionInsight[] = [];
    const { calories, protein, carbs } = nutritionData;

    // Calorie insight
    const calorieProgress = (calories.consumed / calories.goal) * 100;
    if (calorieProgress < 50) {
      newInsights.push({
        type: "warning",
        message: `You are ${
          calories.goal - calories.consumed
        } calories below your goal. Make sure to fuel your workouts!`,
        icon: "⚡",
      });
    } else if (calorieProgress >= 90 && calorieProgress <= 110) {
      newInsights.push({
        type: "success",
        message: "Perfect! You are right on track with your calorie target.",
        icon: "🎯",
      });
    }

    // Protein insight
    const proteinProgress = (protein.consumed / protein.goal) * 100;
    if (proteinProgress >= 80) {
      newInsights.push({
        type: "success",
        message: "Great protein intake! This will help with muscle recovery.",
        icon: "💪",
      });
    } else if (proteinProgress < 50) {
      newInsights.push({
        type: "info",
        message: `Consider adding ${Math.ceil(
          (protein.goal - protein.consumed) / 30
        )} more protein-rich meals today.`,
        icon: "🥩",
      });
    }

    // Hydration insight
    if (nutritionData.water.glasses >= nutritionData.water.goal) {
      newInsights.push({
        type: "success",
        message: "Excellent hydration! Your body will thank you.",
        icon: "💧",
      });
    }

    setInsights(newInsights);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate data fetch
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleWaterChange = (glasses: number) => {
    setNutritionData((prev) => ({
      ...prev,
      water: { ...prev.water, glasses },
    }));
  };

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      {performanceSettings.particles && <FloatingParticles />}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="mb-8">
          <GlassCard elevation={1} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1
                  className="text-3xl font-bold mb-1"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Nutrition Tracking
                </h1>
                <p
                  className="text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <Link href="/client/nutrition/log">
                <Button
                  variant="default"
                  size="lg"
                  className="flex items-center gap-2"
                  style={{
                    background: getSemanticColor("success").gradient,
                    boxShadow: `0 4px 12px ${
                      getSemanticColor("success").primary
                    }30`,
                  }}
                >
                  <Plus className="w-5 h-5" />
                  <span
                    className="font-semibold"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Log Food
                  </span>
                </Button>
              </Link>
            </div>
          </GlassCard>
        </div>

        {/* Smart Insights */}
        {insights.length > 0 && (
          <GlassCard elevation={2} className="p-4 mb-6">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isDark
                    ? "rgba(255, 167, 38, 0.15)"
                    : "rgba(255, 167, 38, 0.1)",
                }}
              >
                <Lightbulb
                  className="w-5 h-5"
                  style={{ color: getSemanticColor("warning").primary }}
                />
              </div>
              <div className="flex-1">
                <h3
                  className="font-semibold mb-2"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Smart Insights
                </h3>
                <div className="space-y-2">
                  {insights.map((insight, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 rounded-lg"
                      style={{
                        background: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.03)",
                      }}
                    >
                      <span className="text-xl flex-shrink-0">
                        {insight.icon}
                      </span>
                      <p
                        className="text-sm"
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.8)"
                            : "rgba(0,0,0,0.8)",
                        }}
                      >
                        {insight.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Calorie Ring */}
          <div className="lg:col-span-1">
            <GlassCard elevation={2} className="p-6">
              <h2
                className="text-lg font-semibold mb-4"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Today&apos;s Calories
              </h2>
              <NutritionRing
                consumed={nutritionData.calories.consumed}
                goal={nutritionData.calories.goal}
              />
            </GlassCard>
          </div>

          {/* Macros and Water */}
          <div className="lg:col-span-2 space-y-6">
            {/* Macros */}
            <GlassCard elevation={2} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Macros
                </h2>
                <button
                  className="text-sm font-medium flex items-center gap-1 hover:underline"
                  style={{ color: getSemanticColor("trust").primary }}
                >
                  Adjust Goals
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <MacroBars
                protein={nutritionData.protein}
                carbs={nutritionData.carbs}
                fat={nutritionData.fat}
              />
            </GlassCard>

            {/* Water Tracker */}
            <GlassCard elevation={2} className="p-6">
              <WaterTracker
                glasses={nutritionData.water.glasses}
                goal={nutritionData.water.goal}
                onChange={handleWaterChange}
              />
            </GlassCard>
          </div>
        </div>

        {/* Meals Section */}
        <GlassCard elevation={2} className="p-6">
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
          >
            Today&apos;s Meals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="p-4 rounded-lg border transition-all hover:shadow-md"
                style={{
                  background: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.02)",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{meal.emoji}</span>
                  <div className="flex-1">
                    <h3
                      className="font-semibold"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(0,0,0,0.9)",
                      }}
                    >
                      {meal.name}
                    </h3>
                    {meal.logged && meal.items.length > 0 && (
                      <p
                        className="text-sm"
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(0,0,0,0.5)",
                        }}
                      >
                        {meal.items.reduce(
                          (sum, item) => sum + item.calories,
                          0
                        )}{" "}
                        cal
                      </p>
                    )}
                  </div>
                </div>

                {meal.logged && meal.items.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {meal.items.slice(0, 2).map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <span
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.7)"
                              : "rgba(0,0,0,0.7)",
                          }}
                        >
                          {item.name}
                        </span>
                        <span
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.5)"
                              : "rgba(0,0,0,0.5)",
                          }}
                        >
                          {item.calories} cal
                        </span>
                      </div>
                    ))}
                    {meal.items.length > 2 && (
                      <p
                        className="text-sm"
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(0,0,0,0.5)",
                        }}
                      >
                        +{meal.items.length - 2} more items
                      </p>
                    )}
                  </div>
                ) : (
                  <p
                    className="text-sm mb-3"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.5)",
                    }}
                  >
                    No food logged yet
                  </p>
                )}

                {/* Quick Add Suggestions */}
                {!meal.logged && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {meal.type === "breakfast" && (
                      <>
                        <button
                          className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                          style={{
                            background: isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.05)",
                            color: isDark ? "#fff" : "#1A1A1A",
                          }}
                        >
                          ☕ Coffee
                        </button>
                        <button
                          className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                          style={{
                            background: isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.05)",
                            color: isDark ? "#fff" : "#1A1A1A",
                          }}
                        >
                          🥐 Croissant
                        </button>
                      </>
                    )}
                    {meal.type === "lunch" && (
                      <>
                        <button
                          className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                          style={{
                            background: isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.05)",
                            color: isDark ? "#fff" : "#1A1A1A",
                          }}
                        >
                          🥗 Salad
                        </button>
                        <button
                          className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                          style={{
                            background: isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.05)",
                            color: isDark ? "#fff" : "#1A1A1A",
                          }}
                        >
                          🍗 Chicken
                        </button>
                      </>
                    )}
                    {meal.type === "dinner" && (
                      <>
                        <button
                          className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                          style={{
                            background: isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.05)",
                            color: isDark ? "#fff" : "#1A1A1A",
                          }}
                        >
                          🍖 Steak
                        </button>
                        <button
                          className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                          style={{
                            background: isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.05)",
                            color: isDark ? "#fff" : "#1A1A1A",
                          }}
                        >
                          🥦 Veggies
                        </button>
                      </>
                    )}
                    {meal.type === "snack" && (
                      <>
                        <button
                          className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                          style={{
                            background: isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.05)",
                            color: isDark ? "#fff" : "#1A1A1A",
                          }}
                        >
                          🍎 Apple
                        </button>
                        <button
                          className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                          style={{
                            background: isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.05)",
                            color: isDark ? "#fff" : "#1A1A1A",
                          }}
                        >
                          🥜 Nuts
                        </button>
                      </>
                    )}
                  </div>
                )}

                <Button variant="ghost" size="sm" className="w-full">
                  {meal.logged ? "Add More" : `Log ${meal.name}`}
                </Button>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export default function NutritionDashboard() {
  return (
    <ProtectedRoute>
      <NutritionDashboardContent />
    </ProtectedRoute>
  );
}
