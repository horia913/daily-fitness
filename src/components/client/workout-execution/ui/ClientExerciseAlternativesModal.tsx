"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import WorkoutTemplateService, {
  type ExerciseAlternative,
} from "@/lib/workoutTemplateService";

const REASON_LABEL: Record<ExerciseAlternative["reason"], string> = {
  equipment: "Equipment",
  difficulty: "Difficulty",
  injury: "Injury",
  preference: "Preference",
};

const REASON_BADGE: Record<ExerciseAlternative["reason"], string> = {
  equipment:
    "rounded-full border border-cyan-500/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium uppercase text-cyan-300",
  difficulty:
    "rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-300",
  injury:
    "rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-medium uppercase text-red-300",
  preference:
    "rounded-full border border-gray-500/30 bg-gray-500/15 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-300",
};

export interface ClientExerciseAlternativesModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: { id: string; name: string };
  onSelect: (
    alternativeExerciseId: string,
    alternativeExerciseName: string,
  ) => void;
  /** When set (e.g. test page), skips fetch and shows this list */
  demoAlternatives?: ExerciseAlternative[];
}

export default function ClientExerciseAlternativesModal({
  isOpen,
  onClose,
  exercise,
  onSelect,
  demoAlternatives,
}: ClientExerciseAlternativesModalProps) {
  const [alternatives, setAlternatives] = useState<ExerciseAlternative[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (demoAlternatives !== undefined) {
      setAlternatives(demoAlternatives);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setAlternatives([]);
    WorkoutTemplateService.getExerciseAlternatives(exercise.id)
      .then((data) => {
        if (!cancelled) setAlternatives(data ?? []);
      })
      .catch(() => {
        if (!cancelled) setAlternatives([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, exercise.id, demoAlternatives]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[min(85vh,32rem)] w-full max-w-sm overflow-y-auto rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-cyan-300">
            SWAP EXERCISE
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-cyan-100 transition-colors hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-sm text-gray-400">
          Currently: {exercise.name}
        </p>

        <div className="my-3 h-px bg-cyan-500/15" />

        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Loading alternatives…
          </p>
        ) : alternatives.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            No alternatives configured for this exercise. Ask your coach to add
            some.
          </p>
        ) : (
          <div className="space-y-2">
            {alternatives.map((alt) => {
              const name =
                alt.alternative_exercise?.name?.trim() ||
                "Alternative exercise";
              return (
                <button
                  key={alt.id}
                  type="button"
                  onClick={() =>
                    onSelect(alt.alternative_exercise_id, name)
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{name}</p>
                      {alt.notes?.trim() ? (
                        <p className="mt-1 text-xs text-gray-400">
                          {alt.notes.trim()}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`inline-flex flex-shrink-0 self-start ${REASON_BADGE[alt.reason]}`}
                    >
                      {REASON_LABEL[alt.reason]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-gray-800 py-3 text-sm text-gray-300 transition-colors hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
