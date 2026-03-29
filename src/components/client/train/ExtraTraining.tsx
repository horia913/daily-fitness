"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dumbbell, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { getCategoryAccent } from "@/lib/workoutCategoryColors";
import { cn } from "@/lib/utils";

const INITIAL_VISIBLE = 3;

interface ExtraWorkout {
  id: string;
  name: string;
  exerciseCount: number;
  estimatedDuration: number;
  templateId: string;
}

interface ExtraTrainingProps {
  workouts: ExtraWorkout[];
  /** template_id → workout_templates.category text */
  templateCategories?: Map<string, string>;
}

export function ExtraTraining({
  workouts,
  templateCategories,
}: ExtraTrainingProps) {
  const [showAll, setShowAll] = useState(false);

  const visible = useMemo(() => {
    if (showAll || workouts.length <= INITIAL_VISIBLE) return workouts;
    return workouts.slice(0, INITIAL_VISIBLE);
  }, [workouts, showAll]);

  const hiddenCount = workouts.length - INITIAL_VISIBLE;

  if (workouts.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold fc-text-primary">
        <Zap className="h-4 w-4 text-orange-500 dark:text-orange-400" />
        Extra Training
      </h3>

      <div className="flex flex-col divide-y divide-white/5 border-y border-white/5">
        {visible.map((workout) => {
          const cat = templateCategories?.get(workout.templateId) ?? "";
          const accent = getCategoryAccent(cat);
          return (
            <button
              key={workout.id}
              type="button"
              className={cn(
                "flex min-h-[52px] w-full items-center gap-3 border-l-2 bg-transparent px-1 py-3 text-left transition-colors hover:bg-white/[0.02] sm:px-0",
                accent.border,
              )}
              onClick={() => {
                window.location.href = `/client/workouts/${workout.id}/details`;
              }}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  accent.iconBg,
                )}
              >
                <Dumbbell className={cn("h-5 w-5", accent.text)} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="break-words text-sm font-bold fc-text-primary">
                  {workout.name}
                </h4>
                <p className="text-xs fc-text-dim">
                  {workout.exerciseCount > 0
                    ? `${workout.exerciseCount} exercises`
                    : "Workout"}{" "}
                  · ~{workout.estimatedDuration || 45} min
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {!showAll && hiddenCount > 0 && (
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-11 w-full gap-2 rounded-xl border-[color:var(--fc-glass-border)] font-semibold fc-text-primary"
          onClick={() => setShowAll(true)}
        >
          <ChevronDown className="h-4 w-4 text-cyan-400" />
          Show more ({hiddenCount} more)
        </Button>
      )}
      {showAll && workouts.length > INITIAL_VISIBLE && (
        <Button
          type="button"
          variant="ghost"
          className="mt-2 h-10 w-full gap-1 rounded-xl text-sm fc-text-dim"
          onClick={() => setShowAll(false)}
        >
          <ChevronUp className="h-4 w-4" />
          Show less
        </Button>
      )}
    </div>
  );
}
