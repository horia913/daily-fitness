"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import MealCardWithOptions from "@/components/client/MealCardWithOptions";
import {
  completeMeal,
  addPhotoToCompletion,
  undoCompletion,
} from "@/lib/mealCompletionService";
import { fetchClientNutritionPage } from "@/lib/clientNutritionPageData";
import { supabase } from "@/lib/supabase";
import type { MappedMeal } from "@/lib/nutritionPageDataMapper";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

async function resolvePhotoUrl(meal: MappedMeal): Promise<MappedMeal> {
  if (!meal.photoUrl || /^https?:\/\//i.test(meal.photoUrl)) return meal;
  try {
    const { data, error } = await supabase.storage
      .from("meal-photos")
      .createSignedUrl(meal.photoUrl, 3600);
    if (error || !data?.signedUrl) return { ...meal, photoUrl: undefined };
    return { ...meal, photoUrl: data.signedUrl };
  } catch {
    return meal;
  }
}

function MealDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const mealId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [meal, setMeal] = useState<MappedMeal | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id || !mealId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const { mapped } = await fetchClientNutritionPage(user.id, todayStr());
      if (!mapped?.hasAssignment) {
        setMeal(null);
        setAssignmentId(null);
        setLoadError("No active meal plan.");
        return;
      }
      const found = mapped.meals.find((m) => m.id === mealId) ?? null;
      if (!found) {
        setMeal(null);
        setLoadError("Meal not found.");
        return;
      }
      setAssignmentId(mapped.assignmentId);
      setMeal(await resolvePhotoUrl(found));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load meal");
      setMeal(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, mealId]);

  useEffect(() => {
    if (!authLoading && user?.id) void load();
    if (!authLoading && !user) setLoading(false);
  }, [authLoading, user, load]);

  const handleMarkComplete = async (
    id: string,
    optionId: string | null,
  ) => {
    if (!user?.id || !assignmentId) return;
    try {
      await completeMeal({
        clientId: user.id,
        mealId: id,
        mealOptionId: optionId,
        mealPlanAssignmentId: assignmentId,
        date: todayStr(),
      });
      await load();
    } catch (e) {
      addToast({
        title: "Could not complete meal",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUndo = async () => {
    if (!user?.id || !meal) return;
    try {
      await undoCompletion(user.id, meal.id, todayStr());
      await load();
    } catch (e) {
      addToast({
        title: "Could not undo",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddPhoto = async (id: string, file: File) => {
    if (!user?.id) return;
    try {
      await addPhotoToCompletion(user.id, id, todayStr(), file);
      await load();
      addToast({
        title: "Photo added",
        description: "Your meal photo has been saved.",
        variant: "default",
      });
    } catch (e) {
      addToast({
        title: "Photo upload failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      throw e;
    }
  };

  if (authLoading || loading) {
    return (
      <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
        <PageSkeleton variant="list" />
      </ClientPageShell>
    );
  }

  if (!meal) {
    return (
      <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
        <button
          type="button"
          onClick={() => router.push("/client/nutrition")}
          className="w-10 h-10 rounded-xl border border-[color:var(--fc-glass-border)] bg-transparent flex items-center justify-center fc-text-primary mb-4"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="rounded-xl border border-[color:var(--fc-glass-border)] bg-transparent p-4 text-sm">
          <h2 className="text-lg font-semibold fc-text-primary">
            {loadError ?? "Meal not found"}
          </h2>
          <div className="mt-4">
            <Button
              className="fc-btn fc-btn-secondary h-10 text-sm"
              onClick={() => router.push("/client/nutrition")}
            >
              Back to Fuel
            </Button>
          </div>
        </div>
      </ClientPageShell>
    );
  }

  return (
    <ClientPageShell className="max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
      <nav className="mb-3">
        <button
          type="button"
          onClick={() => router.push("/client/nutrition")}
          className="w-10 h-10 rounded-xl border border-[color:var(--fc-glass-border)] bg-transparent flex items-center justify-center fc-text-primary"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </nav>
      <MealCardWithOptions
        meal={{
          id: meal.id,
          name: meal.name,
          meal_type: meal.type,
          emoji: meal.emoji,
          options: meal.options ?? [],
          legacyItems: meal.items,
          logged: meal.logged,
          loggedOptionId: meal.loggedOptionId,
          photoUrl: meal.photoUrl,
          logged_at: meal.logged_at,
        }}
        clientId={user?.id ?? ""}
        onMarkComplete={handleMarkComplete}
        onUndo={handleUndo}
        onAddPhoto={handleAddPhoto}
        onFoodClick={(foodId) =>
          router.push(`/client/nutrition/foods/${foodId}`)
        }
      />
    </ClientPageShell>
  );
}

export default function MealDetailPage() {
  return (
    <ProtectedRoute requiredRole="client">
      <MealDetailContent />
    </ProtectedRoute>
  );
}
