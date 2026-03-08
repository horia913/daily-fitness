"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MealPlanService, MealPlan } from "@/lib/mealPlanService";
import { useToast } from "@/components/ui/toast-provider";
import { ArrowLeft, ChefHat } from "lucide-react";
import Link from "next/link";

export default function EditMealPlanPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getThemeStyles, performanceSettings } = useTheme();
  const theme = getThemeStyles();

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
            <div className="max-w-2xl mx-auto">
              <GlassCard elevation={2} className="fc-glass fc-card p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-[color:var(--fc-glass-highlight)] rounded w-1/3"></div>
                  <div className="h-64 bg-[color:var(--fc-glass-highlight)] rounded-2xl"></div>
                </div>
              </GlassCard>
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
            <div className="max-w-2xl mx-auto">
              <GlassCard elevation={2} className="fc-glass fc-card p-10 text-center">
                <h2 className="text-2xl font-bold text-[color:var(--fc-text-primary)] mb-4">
                  Meal Plan Not Found
                </h2>
                <Link href="/coach/nutrition">
                  <Button className="fc-btn fc-btn-primary">Back to Meal Plans</Button>
                </Link>
              </GlassCard>
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
        <div className="p-4 sm:p-6 pb-32">
          <div className="max-w-2xl mx-auto space-y-6">
            <Link href="/coach/nutrition" className="fc-surface inline-flex items-center gap-2 rounded-xl border border-[color:var(--fc-surface-card-border)] px-3 py-2.5 w-fit text-[color:var(--fc-text-primary)] text-sm font-medium">
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Back to Nutrition
            </Link>
            <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <Link href={`/coach/nutrition/meal-plans/${mealPlan.id}`} className="fc-glass fc-card w-10 h-10 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-glass-border)]">
                  <ArrowLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
                </Link>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora-green)]/20 text-[color:var(--fc-accent-green)] shrink-0">
                    <ChefHat className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                      Edit Meal Plan
                    </h1>
                    <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                      Update meal plan details.
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>

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
                  className="flex-1 fc-btn fc-btn-primary"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
