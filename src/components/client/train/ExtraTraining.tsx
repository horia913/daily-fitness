"use client";

import React from "react";
import { ClientGlassCard } from "@/components/client-ui";
import { Dumbbell, Zap } from "lucide-react";
import Link from "next/link";

interface ExtraWorkout {
  id: string;
  name: string;
  exerciseCount: number;
  estimatedDuration: number;
  templateId: string;
}

interface ExtraTrainingProps {
  workouts: ExtraWorkout[];
}

export function ExtraTraining({ workouts }: ExtraTrainingProps) {
  if (workouts.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold fc-text-primary mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-orange-500 dark:text-orange-400" />
        Extra Training
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {workouts.map((workout) => (
          <Link key={workout.id} href={`/client/workouts/${workout.id}/start`}>
            <ClientGlassCard className="p-4 hover:opacity-80 transition-all cursor-pointer">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "color-mix(in srgb, var(--fc-domain-workouts) 12%, transparent)" }}
              >
                <Dumbbell className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              </div>
              <h4 className="text-sm font-bold fc-text-primary mb-0.5 truncate">
                {workout.name}
              </h4>
              <p className="text-xs fc-text-dim">
                {workout.exerciseCount > 0 ? `${workout.exerciseCount} exercises` : "Workout"} · ~{workout.estimatedDuration || 45} min
              </p>
            </ClientGlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
