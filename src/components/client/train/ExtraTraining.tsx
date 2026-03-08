"use client";

import React from "react";
import { ClientGlassCard } from "@/components/client-ui";
import { Dumbbell, ChevronRight } from "lucide-react";
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold fc-text-primary">Extra Training</h3>
      </div>

      <div className="space-y-3">
        {workouts.map((workout) => (
          <Link key={workout.id} href={`/client/workouts/${workout.id}/start`}>
            <ClientGlassCard className="p-4 flex items-center justify-between gap-4 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[color-mix(in_srgb,var(--fc-domain-workouts)_12%,transparent)]">
                  <Dumbbell className="w-5 h-5 fc-text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold fc-text-primary mb-0.5 truncate">
                    {workout.name}
                  </h4>
                  <p className="text-xs fc-text-dim">
                    {workout.exerciseCount > 0 ? `${workout.exerciseCount} exercises` : "Workout"} • ~{workout.estimatedDuration || 45} min
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 fc-text-dim flex-shrink-0" />
            </ClientGlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
