'use client';

import React from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import wt from '@/components/coach/workouts/workoutTemplateEditV1.module.css';

export interface EmptyExerciseStateProps {
  onAddExercise: () => void;
  visualVariant?: 'default' | 'coachV1';
}

export function EmptyExerciseState({ onAddExercise, visualVariant = 'default' }: EmptyExerciseStateProps) {
  if (visualVariant === 'coachV1') {
    return (
      <div className={wt.emptyExercises}>
        <div className={wt.emptyIconTile}>
          <PlusCircle className="w-6 h-6" strokeWidth={2} />
        </div>
        <div className={wt.emptyTitle}>No exercises yet</div>
        <p className={wt.emptyBody}>
          Add your first exercise to start building this template. Pick from any of 11 set types.
        </p>
        <button type="button" className={wt.btnLimePrimary} onClick={onAddExercise}>
          <PlusCircle className="w-4 h-4" strokeWidth={2} />
          Add exercise
        </button>
      </div>
    );
  }

  return (
    <div className="border border-dashed border-[color:var(--fc-glass-border)] rounded-lg p-4 text-center">
      <p className="text-xs text-[color:var(--fc-text-dim)] mb-3">
        No exercises yet. Add blocks in any order.
      </p>
      <Button
        type="button"
        size="sm"
        onClick={onAddExercise}
        className="h-8 text-xs px-3 rounded-lg"
      >
        <PlusCircle className="w-3.5 h-3.5 mr-1" />
        Add exercise
      </Button>
    </div>
  );
}
