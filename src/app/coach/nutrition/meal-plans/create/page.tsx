"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MealPlanService } from "@/lib/mealPlanService";
import { ArrowLeft, ChefHat } from "lucide-react";
import Link from "next/link";

export default function CreateMealPlanPage() {
  const { user } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    target_calories: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a meal plan name.");
      return;
    }

    try {
      setLoading(true);
      if (!user) return;

      const mealPlan = await MealPlanService.createMealPlan({
        name: formData.name,
        target_calories: formData.target_calories
          ? parseInt(formData.target_calories)
          : null,
        coach_id: user.id,
        is_active: true,
      });

      if (mealPlan) {
        // Navigate to the new meal plan's detail page
        router.push(`/coach/nutrition/meal-plans/${mealPlan.id}`);
      }
    } catch (error) {
      console.error("Error creating meal plan:", error);
      alert("Error creating meal plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="coach">
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-green-50 to-teal-100 dark:from-slate-900 dark:via-slate-800 dark:to-teal-900">
        <div className="p-4 sm:p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Link href="/coach/nutrition/meal-plans">
                <Button variant="outline" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className={`text-3xl font-bold ${theme.text}`}>
                  Create Meal Plan
                </h1>
                <p className={`${theme.textSecondary}`}>
                  Create a new nutrition plan for your clients
                </p>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className={`${theme.card} ${theme.shadow} rounded-3xl p-6 sm:p-8 space-y-6`}
            >
              <div className="space-y-2">
                <Label className={`${theme.text} font-semibold`}>
                  Meal Plan Name *
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., High Protein Cutting Plan"
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className={`${theme.text} font-semibold`}>
                  Target Calories (Optional)
                </Label>
                <Input
                  type="number"
                  value={formData.target_calories}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      target_calories: e.target.value,
                    })
                  }
                  placeholder="e.g., 2000"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className={`${theme.text} font-semibold`}>
                  Description (Optional)
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe this meal plan..."
                  rows={4}
                  className="rounded-xl resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Link href="/coach/nutrition/meal-plans" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                >
                  {loading ? "Creating..." : "Create Meal Plan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
