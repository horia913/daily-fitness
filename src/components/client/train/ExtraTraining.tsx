"use client";

import React, { useState, useMemo } from "react";
import { ClientGlassCard } from "@/components/client-ui";
import { Button } from "@/components/ui/button";
import { Dumbbell, Zap, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
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
      <h3 className="text-sm font-bold fc-text-primary mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-orange-500 dark:text-orange-400" />
        Extra Training
      </h3>

      <div className="flex flex-col gap-3">
        {visible.map((workout) => {
          const cat =
            templateCategories?.get(workout.templateId) ?? "";
          const accent = getCategoryAccent(cat);
          return (
            <Link key={workout.id} href={`/client/workouts/${workout.id}/start`}>
              <ClientGlassCard
                className={cn(
                  "p-4 hover:opacity-90 transition-all cursor-pointer bg-[color:var(--fc-glass-base)] backdrop-blur-none border-[color:var(--fc-glass-border-strong)] border-l-2",
                  accent.border,
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      accent.iconBg,
                    )}
                  >
                    <Dumbbell className={cn("w-5 h-5", accent.text)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold fc-text-primary mb-0.5 break-words">
                      {workout.name}
                    </h4>
                    <p className="text-xs fc-text-dim">
                      {workout.exerciseCount > 0 ? `${workout.exerciseCount} exercises` : "Workout"} · ~{workout.estimatedDuration || 45} min
                    </p>
                  </div>
                </div>
              </ClientGlassCard>
            </Link>
          );
        })}
      </div>

      {!showAll && hiddenCount > 0 && (
        <Button
          type="button"
          variant="outline"
          className="w-full mt-3 h-11 rounded-xl border-[color:var(--fc-glass-border)] fc-text-primary font-semibold gap-2"
          onClick={() => setShowAll(true)}
        >
          <ChevronDown className="w-4 h-4 text-cyan-400" />
          Show more ({hiddenCount} more)
        </Button>
      )}
      {showAll && workouts.length > INITIAL_VISIBLE && (
        <Button
          type="button"
          variant="ghost"
          className="w-full mt-2 h-10 rounded-xl fc-text-dim text-sm gap-1"
          onClick={() => setShowAll(false)}
        >
          <ChevronUp className="w-4 h-4" />
          Show less
        </Button>
      )}
    </div>
  );
}
