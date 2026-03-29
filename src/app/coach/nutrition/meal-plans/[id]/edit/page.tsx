"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MealPlanService, MealPlan } from "@/lib/mealPlanService";
import { useToast } from "@/components/ui/toast-provider";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditMealPlanPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

  const mealPlanId = params.id as string;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    target_calories: "",
    description: "",
  });

  const editMealPlanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mealPlanId || !user) return;
    if (editMealPlanTimeoutRef.current) clearTimeout(editMealPlanTimeoutRef.current);
    editMealPlanTimeoutRef.current = setTimeout(() => {
      editMealPlanTimeoutRef.current = null;
      setLoading(false);
    }, 20_000);
    loadMealPlan().finally(() => {
      if (editMealPlanTimeoutRef.current) {
        clearTimeout(editMealPlanTimeoutRef.current);
        editMealPlanTimeoutRef.current = null;
      }
    });
    return () => {
      if (editMealPlanTimeoutRef.current) {
        clearTimeout(editMealPlanTimeoutRef.current);
        editMealPlanTimeoutRef.current = null;
      }
    };
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
      addToast({ title: "Required", description: "Please enter a meal plan name.", variant: "destructive" });
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
      addToast({ title: "Error", description: "Error updating meal plan. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="p-4 sm:p-6">
            <div className="max-w-2xl mx-auto p-4 animate-pulse space-y-3">
              <div className="h-8 bg-[color:var(--fc-glass-highlight)] rounded w-1/3"></div>
              <div className="h-48 bg-[color:var(--fc-glass-highlight)] rounded-lg"></div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!mealPlan) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="p-4 sm:p-6">
            <div className="max-w-2xl mx-auto p-4 text-center space-y-3">
              <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                Meal plan not found
              </h2>
              <Link href="/coach/nutrition">
                <Button size="sm" className="fc-btn fc-btn-primary">Back</Button>
              </Link>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="p-4 sm:p-6 pb-32 max-w-2xl mx-auto">
          <div className="flex min-h-11 max-h-12 items-center justify-between gap-2 mb-4">
            <h1 className="text-lg font-semibold text-[color:var(--fc-text-primary)] truncate">
              Edit meal plan
            </h1>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs px-2 shrink-0"
              onClick={() => router.push(`/coach/nutrition/meal-plans/${mealPlan.id}`)}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Button>
          </div>
          <p className="text-xs text-[color:var(--fc-text-dim)] truncate -mt-2 mb-3">
            {mealPlan.name}
          </p>

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
              <Link href={`/coach/nutrition/meal-plans/${mealPlan.id}`} className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-9 text-sm"
                >
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={saving}
                size="sm"
                className="flex-1 h-9 text-sm fc-btn fc-btn-primary"
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
