"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MealPlanService } from "@/lib/mealPlanService";
import { useToast } from "@/components/ui/toast-provider";
import { ArrowLeft } from "lucide-react";

export default function CreateMealPlanPage() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const router = useRouter();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    target_calories: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      addToast({ title: "Required", description: "Please enter a meal plan name.", variant: "destructive" });
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
        router.push(`/coach/nutrition/meal-plans/${mealPlan.id}`);
      }
    } catch (error) {
      console.error("Error creating meal plan:", error);
      addToast({ title: "Error", description: "Error creating meal plan. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="p-4 sm:p-6 pb-32 relative z-10 max-w-2xl mx-auto">
          <div className="flex min-h-11 max-h-12 items-center justify-between gap-2 mb-4">
            <h1 className="text-lg font-semibold fc-text-primary truncate">
              Create meal plan
            </h1>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs px-2 shrink-0"
              onClick={() => router.push("/coach/nutrition")}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-black/5 dark:border-white/5 pt-4 space-y-3"
          >
            <div>
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Name *
              </Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., High protein cutting"
                required
                className="mt-1 h-9 text-sm rounded-lg"
              />
            </div>

            <div>
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Target calories (optional)
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
                className="mt-1 h-9 text-sm rounded-lg"
              />
            </div>

            <div>
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Description (optional)
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Notes…"
                rows={3}
                className="mt-1 text-sm rounded-lg resize-none min-h-[4.5rem]"
              />
            </div>

            <div className="flex gap-2 pt-3 border-t border-black/5 dark:border-white/5 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-sm flex-1"
                onClick={() => router.push("/coach/nutrition")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                size="sm"
                className="h-9 text-sm flex-1 fc-btn fc-btn-primary"
              >
                {loading ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
