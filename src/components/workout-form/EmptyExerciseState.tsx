'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export interface EmptyExerciseStateProps {
  onAddExercise: () => void;
}

export function EmptyExerciseState({ onAddExercise }: EmptyExerciseStateProps) {
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
        <Plus className="w-3.5 h-3.5 mr-1" />
        Add exercise
      </Button>
    </div>
  );
}
