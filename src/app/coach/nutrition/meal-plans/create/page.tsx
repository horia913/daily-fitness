"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MealPlanService } from "@/lib/mealPlanService";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import Link from "next/link";

export default function CreateMealPlanPage() {
  const { user } = useAuth();
  const { getThemeStyles, performanceSettings } = useTheme();
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
          : undefined,
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
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="p-4 sm:p-6 md:p-8 pb-32 relative z-10">
          <div className="max-w-4xl mx-auto space-y-6">
            <header className="flex items-center justify-between mb-8">
              <Link
                href="/coach/nutrition"
                className="fc-glass fc-card w-10 h-10 flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
              >
                <ArrowLeft className="w-5 h-5 fc-text-primary" />
              </Link>
              <div className="text-center flex-1 px-4">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight fc-text-primary">
                  Create Meal Plan
                </h1>
                <p className="text-sm fc-text-dim mt-1">
                  Design a bespoke nutrition protocol
                </p>
              </div>
              <button
                type="button"
                className="fc-glass fc-card w-10 h-10 flex items-center justify-center rounded-full fc-text-dim"
                aria-label="More options"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </header>

            <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-8">
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
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
                <Link href="/coach/nutrition" className="flex-1">
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
                  className="flex-1 fc-btn fc-btn-primary"
                >
                  {loading ? "Creating..." : "Create Meal Plan"}
                </Button>
              </div>
            </form>
            </GlassCard>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
