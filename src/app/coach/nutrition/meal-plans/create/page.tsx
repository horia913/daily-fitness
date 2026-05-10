"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
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
    target_protein: "",
    target_carbs: "",
    target_fat: "",
    description: "",
  });

  const parseOptionalMacro = (raw: string): number | undefined => {
    const t = raw.trim();
    if (!t) return undefined;
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : undefined;
  };

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
          ? parseInt(formData.target_calories, 10)
          : undefined,
        target_protein: parseOptionalMacro(formData.target_protein),
        target_carbs: parseOptionalMacro(formData.target_carbs),
        target_fat: parseOptionalMacro(formData.target_fat),
        description: formData.description.trim() || undefined,
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
        <CoachPageShell widthVariant="form-2xl" className="p-4 pb-[var(--fc-bottom-safe-area)] sm:p-6">
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
            className="border-t border-[color:var(--fc-glass-border)] pt-4 space-y-3"
          >
            <div>
              <Label className="text-xs font-medium uppercase tracking-wide fc-text-dim">
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
              <Label className="text-xs font-medium uppercase tracking-wide fc-text-dim">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wide fc-text-dim">
                  Target protein g (optional)
                </Label>
                <Input
                  inputMode="decimal"
                  value={formData.target_protein}
                  onChange={(e) =>
                    setFormData({ ...formData, target_protein: e.target.value })
                  }
                  placeholder="e.g., 150"
                  className="mt-1 h-9 text-sm rounded-lg"
                />
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wide fc-text-dim">
                  Target carbs g (optional)
                </Label>
                <Input
                  inputMode="decimal"
                  value={formData.target_carbs}
                  onChange={(e) =>
                    setFormData({ ...formData, target_carbs: e.target.value })
                  }
                  placeholder="e.g., 200"
                  className="mt-1 h-9 text-sm rounded-lg"
                />
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wide fc-text-dim">
                  Target fat g (optional)
                </Label>
                <Input
                  inputMode="decimal"
                  value={formData.target_fat}
                  onChange={(e) =>
                    setFormData({ ...formData, target_fat: e.target.value })
                  }
                  placeholder="e.g., 65"
                  className="mt-1 h-9 text-sm rounded-lg"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium uppercase tracking-wide fc-text-dim">
                Notes (optional)
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Coach-facing notes…"
                rows={3}
                className="mt-1 text-sm rounded-lg resize-none min-h-[4.5rem]"
              />
            </div>

            <div className="flex gap-2 pt-3 border-t border-[color:var(--fc-glass-border)] mt-4">
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
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
