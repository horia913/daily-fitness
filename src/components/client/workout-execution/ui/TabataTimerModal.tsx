"use client";

import React from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/button";

interface ExerciseInSet {
  exercise_id: string;
}

interface IntervalSet {
  exercises: ExerciseInSet[];
}

interface TabataTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sets: IntervalSet[];
  totalRounds: number;
  exerciseLookup: Record<string, { name: string }>;
  onComplete?: () => void;
}

export function TabataTimerModal({
  isOpen,
  onClose,
  sets,
  totalRounds,
  exerciseLookup,
  onComplete,
}: TabataTimerModalProps) {
  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Tabata Timer</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {totalRounds} rounds • {sets.length} sets
        </div>
        <div className="max-h-64 overflow-auto space-y-2">
          {sets.map((set, setIndex) => (
            <div key={setIndex} className="rounded border p-2">
              <div className="text-xs font-medium mb-1">Set {setIndex + 1}</div>
              <div className="text-xs">
                {(set.exercises ?? [])
                  .map((ex) => exerciseLookup[ex.exercise_id]?.name ?? "Exercise")
                  .join(", ")}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onComplete}>Complete</Button>
        </div>
      </div>
      </div>
    </ModalPortal>
  );
}
