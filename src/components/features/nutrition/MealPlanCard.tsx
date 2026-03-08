"use client";

import React from "react";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { MealPlan } from "@/lib/mealPlanService";
import { Edit, Users, Trash2, ChefHat } from "lucide-react";
import Link from "next/link";

interface MealPlanCardProps {
  mealPlan: MealPlan;
  onEdit?: (mealPlan: MealPlan) => void;
  onDelete?: (id: string) => void;
  onAssign?: (mealPlan: MealPlan) => void;
}

export default function MealPlanCard({
  mealPlan,
  onEdit,
  onDelete,
  onAssign,
}: MealPlanCardProps) {
  const mealCount = mealPlan.meal_count ?? 0;
  const usageCount = mealPlan.usage_count ?? 0;

  const hasComputed = mealPlan.computed_calories != null;
  const calories = Math.round(mealPlan.computed_calories ?? mealPlan.target_calories ?? 0);
  const protein = Math.round(mealPlan.computed_protein ?? mealPlan.target_protein ?? 0);
  const carbs = Math.round(mealPlan.computed_carbs ?? mealPlan.target_carbs ?? 0);
  const fat = Math.round(mealPlan.computed_fat ?? mealPlan.target_fat ?? 0);

  const eyebrow = `MEAL PLAN · ${mealCount} MEAL${mealCount !== 1 ? "S" : ""}`;
  const subtitle = hasComputed
    ? `${calories.toLocaleString()} kcal · ${protein}g P · ${carbs}g C · ${fat}g F`
    : mealPlan.target_calories
      ? `${mealPlan.target_calories.toLocaleString()} kcal target`
      : undefined;

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-[color:var(--fc-glass-soft)] border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)]">
          {mealCount} meal{mealCount !== 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-[color:var(--fc-glass-soft)] border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)]">
          {usageCount} client{usageCount !== 1 ? "s" : ""} assigned
        </span>
        {mealPlan.generated_config ? (
          <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-[color:var(--fc-aurora-green)]/10 text-[color:var(--fc-domain-meals)] border border-[color:var(--fc-aurora-green)]/20 font-medium">
            Generated
          </span>
        ) : null}
      </div>
    </>
  );

  return (
    <AppCard
      variant="coach"
      accentColor="var(--fc-domain-meals)"
      eyebrow={eyebrow}
      eyebrowIcon={<ChefHat className="w-4 h-4" />}
      title={mealPlan.name}
      subtitle={subtitle}
      actions={
        <>
          <Link href={`/coach/nutrition/meal-plans/${mealPlan.id}`} className="flex-1">
            <Button
              className="w-full rounded-xl bg-[color:var(--fc-surface-card)] border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)] hover:bg-[color:var(--fc-glass-soft)] hover:border-[color:var(--fc-glass-border-strong)] fc-press"
              size="sm"
            >
              Manage Meals
            </Button>
          </Link>
          {onAssign && (
            <Button
              onClick={() => onAssign(mealPlan)}
              variant="outline"
              size="icon"
              className="rounded-xl h-9 w-9 border-[color:var(--fc-status-success)] text-[color:var(--fc-status-success)] hover:bg-[color:var(--fc-status-success)]/10"
            >
              <Users className="w-4 h-4" />
            </Button>
          )}
          {onEdit && (
            <Button
              onClick={() => onEdit(mealPlan)}
              variant="outline"
              size="icon"
              className="rounded-xl h-9 w-9"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={() => onDelete(mealPlan.id)}
              variant="outline"
              size="icon"
              className="rounded-xl h-9 w-9 border-[color:var(--fc-status-error)] text-[color:var(--fc-status-error)] hover:bg-[color:var(--fc-status-error)]/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </>
      }
    >
      {body}
    </AppCard>
  );
}
