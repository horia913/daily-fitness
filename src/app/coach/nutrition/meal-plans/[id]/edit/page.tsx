"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MealPlanService, MealPlan } from "@/lib/mealPlanService";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditMealPlanPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  const mealPlanId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    target_calories: "",
    description: "",
  });

  useEffect(() => {
    if (mealPlanId && user) {
      loadMealPlan();
    }
  }, [mealPlanId, user]);

  const loadMealPlan = async () => {
    try {
      if (!user) return;
      setLoading(true);

      const mealPlans = await MealPlanService.getMealPlans(user.id);
      const found = mealPlans.find((p) => p.id === mealPlanId);

      if (found) {
        setMealPlan(found);
        setFormData({
          name: found.name || "",
          target_calories: found.target_calories?.toString() || "",
          description: found.description || "",
        });
      }
    } catch (error) {
      console.error("Error loading meal plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a meal plan name.");
      return;
    }

    if (!mealPlan) return;

    try {
      setSaving(true);

      await MealPlanService.updateMealPlan(mealPlan.id, {
        name: formData.name,
        description: formData.description,
        target_calories: formData.target_calories
          ? parseInt(formData.target_calories)
          : undefined,
      });

      // Navigate back to detail page
      router.push(`/coach/nutrition/meal-plans/${mealPlan.id}`);
    } catch (error) {
      console.error("Error updating meal plan:", error);
      alert("Error updating meal plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
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

  if (!mealPlan) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-green-50 to-teal-100 dark:from-slate-900 dark:via-slate-800 dark:to-teal-900">
          <div className="p-4 sm:p-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center py-12">
                <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>
                  Meal Plan Not Found
                </h2>
                <Link href="/coach/nutrition/meal-plans">
                  <Button className="rounded-xl">Back to Meal Plans</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-green-50 to-teal-100 dark:from-slate-900 dark:via-slate-800 dark:to-teal-900">
        <div className="p-4 sm:p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Link href={`/coach/nutrition/meal-plans/${mealPlan.id}`}>
                <Button variant="outline" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className={`text-3xl font-bold ${theme.text}`}>
                  Edit Meal Plan
                </h1>
                <p className={`${theme.textSecondary}`}>
                  Update meal plan details
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
                <Link
                  href={`/coach/nutrition/meal-plans/${mealPlan.id}`}
                  className="flex-1"
                >
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
                  disabled={saving}
                  className="flex-1 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
