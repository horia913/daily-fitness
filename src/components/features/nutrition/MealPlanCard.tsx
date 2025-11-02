"use client";

import React from "react";
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
  // Different gradient backgrounds for each card - better distribution
  const gradients = [
    "bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30",
    "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30",
    "bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/30",
    "bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/30",
    "bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/30",
    "bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-900/20 dark:to-cyan-900/30",
    "bg-gradient-to-br from-rose-50 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/30",
    "bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/20 dark:to-blue-900/30",
    "bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/30",
    "bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/30",
  ];

  // Create a hash from the entire ID for better distribution
  const hash = mealPlan.id.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  const gradientClass = gradients[Math.abs(hash) % gradients.length];

  return (
    <div
      className={`rounded-3xl shadow-lg border-2 border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all ${gradientClass}`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-md">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {mealPlan.name}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {mealPlan.description || "No description"}
                </p>
              </div>
            </div>
          </div>
          {onEdit && (
            <Button
              onClick={() => onEdit(mealPlan)}
              variant="outline"
              size="icon"
              className="ml-3 rounded-xl h-10 w-10"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between p-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Target Calories
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {mealPlan.target_calories || "Not set"}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl border border-purple-200/50 dark:border-purple-700/50">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Meals
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {mealPlan.meal_count || 0}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl border border-green-200/50 dark:border-green-700/50">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Usage
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {mealPlan.usage_count || 0} clients
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Link
            href={`/coach/nutrition/meal-plans/${mealPlan.id}`}
            className="flex-1"
          >
            <Button
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
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
              className="rounded-xl h-9 w-9 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              <Users className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={() => onDelete(mealPlan.id)}
              variant="outline"
              size="icon"
              className="rounded-xl h-9 w-9 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
