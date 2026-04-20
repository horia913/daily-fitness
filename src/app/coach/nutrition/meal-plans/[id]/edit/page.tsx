"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { MealPlanService, MealPlan } from "@/lib/mealPlanService";
import { useToast } from "@/components/ui/toast-provider";
import { ArrowLeft, ChefHat } from "lucide-react";
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
    target_protein: "",
    target_carbs: "",
    target_fat: "",
    description: "",
  });

  /** Empty string clears the column in the database (`null`). */
  const macroToNullable = (raw: string): number | null => {
    const t = raw.trim();
    if (!t) return null;
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : null;
  };

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
          target_protein:
            found.target_protein != null ? String(found.target_protein) : "",
          target_carbs:
            found.target_carbs != null ? String(found.target_carbs) : "",
          target_fat: found.target_fat != null ? String(found.target_fat) : "",
          description: found.notes ?? found.description ?? "",
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
        description: formData.description.trim(),
        target_calories: formData.target_calories
          ? parseInt(formData.target_calories, 10)
          : undefined,
        target_protein: macroToNullable(formData.target_protein),
        target_carbs: macroToNullable(formData.target_carbs),
        target_fat: macroToNullable(formData.target_fat),
      });

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
          <CoachPageShell widthVariant="form-2xl" className="p-4 pb-32 sm:p-6">
            <PageSkeleton variant="form" />
          </CoachPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!mealPlan) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <CoachPageShell widthVariant="form-2xl" className="p-4 pb-32 sm:p-6">
            <EmptyState
              icon={ChefHat}
              title="Meal plan not found"
              description="This plan may have been deleted."
              action={{ label: "Back to meal plans", href: "/coach/nutrition/meal-plans" }}
              variant="compact"
            />
          </CoachPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell widthVariant="form-2xl" className="p-4 pb-32 sm:p-6">
          <div className="flex min-h-11 items-center justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <h1 className="text-lg font-semibold text-[color:var(--fc-text-primary)] truncate">
                Edit meal plan
              </h1>
              <p className="text-xs text-[color:var(--fc-text-dim)] truncate">
                {mealPlan.name}
              </p>
            </div>
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

          <p className="mt-3 text-xs fc-text-dim leading-relaxed">
            Meals and options are edited on the plan detail page. This screen is for plan name, targets, and notes only.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full h-10 rounded-xl border-[color:var(--fc-glass-border)] text-sm font-medium"
            onClick={() => router.push(`/coach/nutrition/meal-plans/${mealPlan.id}`)}
          >
            Open plan detail to edit meals
          </Button>

          <form
            onSubmit={handleSubmit}
            className="border-t border-[color:var(--fc-glass-border)] pt-4 mt-4 space-y-3"
          >
            <div>
              <Label className="text-xs font-medium uppercase tracking-wide fc-text-dim">
                Name *
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, target_calories: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Coach-facing notes…"
                rows={3}
                className="mt-1 text-sm rounded-lg resize-none min-h-[4.5rem]"
              />
            </div>

            <div className="flex gap-2 pt-3 border-t border-[color:var(--fc-glass-border)] mt-4">
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
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
