import React from "react";
import { LargeInput } from "../LargeInput";

interface WeightRepsFieldProps {
  label: string;
  weight: string;
  reps: string;
  onWeightChange: (value: string) => void;
  onRepsChange: (value: string) => void;
  repsHint?: string;
  disabled?: boolean;
}

export function WeightRepsInlineFields({
  weight,
  reps,
  onWeightChange,
  onRepsChange,
  repsHint,
  disabled,
}: Omit<WeightRepsFieldProps, "label">) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <LargeInput
        label="Weight"
        unit="kg"
        value={weight}
        onChange={onWeightChange}
        placeholder="—"
        step="0.5"
        showStepper
        stepAmount={2.5}
        density="compact"
        disabled={disabled}
      />
      <LargeInput
        label="Reps"
        hint={repsHint}
        value={reps}
        onChange={onRepsChange}
        placeholder="—"
        step="1"
        showStepper
        stepAmount={1}
        density="compact"
        disabled={disabled}
      />
    </div>
  );
}

export function WeightRepsStackedField({
  label,
  weight,
  reps,
  onWeightChange,
  onRepsChange,
  repsHint,
  disabled,
}: WeightRepsFieldProps) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 px-2 py-2">
      <p className="mb-1.5 truncate text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <LargeInput
          label="Weight"
          unit="kg"
          value={weight}
          onChange={onWeightChange}
          placeholder="—"
          step="0.5"
          showStepper
          stepAmount={2.5}
          density="compact"
          disabled={disabled}
        />
        <LargeInput
          label="Reps"
          hint={repsHint}
          value={reps}
          onChange={onRepsChange}
          placeholder="—"
          step="1"
          showStepper
          stepAmount={1}
          density="compact"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
