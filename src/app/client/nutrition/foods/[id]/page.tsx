"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const { user } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

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
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-green-50 to-teal-100 dark:from-slate-900 dark:via-slate-800 dark:to-teal-900">
          <div className="p-4 sm:p-6">
            <div className="max-w-2xl mx-auto">
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

  if (!food) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-green-50 to-teal-100 dark:from-slate-900 dark:via-slate-800 dark:to-teal-900">
          <div className="p-4 sm:p-6">
            <div className="max-w-2xl mx-auto text-center py-12">
              <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>
                Food Not Found
              </h2>
              <Link href="/client/nutrition">
                <Button className="rounded-xl">Back to Nutrition</Button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const nutrition = calculateNutritionForServing(food, foodServingSize);

  return (
    <ProtectedRoute requiredRole="client">
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-green-50 to-teal-100 dark:from-slate-900 dark:via-slate-800 dark:to-teal-900">
        <div className="p-4 sm:p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Link href="/client/nutrition">
                <Button variant="outline" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getFoodColor(
                  food.category
                )} flex items-center justify-center text-3xl shadow-lg`}
              >
                {getFoodIcon(food.category)}
              </div>
              <div className="flex-1">
                <h1 className={`text-3xl font-bold ${theme.text}`}>
                  {food.name}
                </h1>
                {food.brand && (
                  <p className={`${theme.textSecondary}`}>{food.brand}</p>
                )}
                <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 mt-1">
                  {food.category}
                </Badge>
              </div>
            </div>

            {/* Serving Size Selector */}
            <div
              className={`${theme.card} rounded-3xl p-6 border-2 border-slate-200 dark:border-slate-700`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-lg font-semibold ${theme.text}`}>
                  Serving Size
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFoodServingSize(Math.max(0.1, foodServingSize - 0.1))
                    }
                    className="rounded-xl"
                  >
                    -
                  </Button>
                  <span className="w-20 text-center font-semibold">
                    {foodServingSize}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFoodServingSize(foodServingSize + 0.1)}
                    className="rounded-xl"
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className={`text-sm ${theme.textSecondary}`}>
                {foodServingSize} {food.serving_unit}
              </div>
            </div>

            {/* Nutritional Information */}
            <div
              className={`${theme.card} rounded-3xl p-6 border-2 border-slate-200 dark:border-slate-700 space-y-6`}
            >
              <h3 className={`text-lg font-semibold ${theme.text}`}>
                Nutritional Information
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                  <Flame className="w-6 h-6 text-red-600 dark:text-red-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {nutrition.calories}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    Calories
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                  <Target className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {nutrition.protein}g
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Protein
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                  <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {nutrition.carbs}g
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    Carbs
                  </div>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl">
                  <Droplets className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {nutrition.fat}g
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    Fat
                  </div>
                </div>
              </div>

              {/* Additional Nutrients */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className={`text-sm ${theme.textSecondary}`}>Fiber</div>
                  <div className={`text-lg font-semibold ${theme.text}`}>
                    {nutrition.fiber}g
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className={`text-sm ${theme.textSecondary}`}>
                    Base Serving Size
                  </div>
                  <div className={`text-lg font-semibold ${theme.text}`}>
                    {food.serving_size} {food.serving_unit}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleAddToLog}
                className="flex-1 rounded-2xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to Manual Log
              </Button>
              <Link href="/client/nutrition" className="flex-1">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white rounded-2xl">
                  Close
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
