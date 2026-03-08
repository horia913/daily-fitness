'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Dumbbell, Plus } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export interface EmptyExerciseStateProps {
  onAddExercise: () => void;
}

export function EmptyExerciseState({ onAddExercise }: EmptyExerciseStateProps) {
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles?.() ?? {};

  return (
    <div
      className={`p-6 border-2 border-dashed ${theme?.border ?? ''} rounded-2xl text-center`}
    >
      <Dumbbell
        className={`w-12 h-12 mx-auto mb-4 ${theme?.textSecondary ?? ''}`}
      />
      <h3 className={`text-lg font-bold ${theme?.text ?? ''} mb-2`}>
        Empty Workout
      </h3>
      <p className={`text-sm ${theme?.textSecondary ?? ''} mb-4`}>
        Start building your workout by adding exercises and
        blocks in any order you want!
      </p>
      <Button
        type="button"
        onClick={onAddExercise}
        className={`${theme?.primary ?? ''} ${theme?.shadow ?? ''} rounded-xl px-6 py-3 hover:scale-105 transition-all duration-200 w-full sm:w-auto justify-center`}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Exercise
      </Button>
    </div>
  );
}
