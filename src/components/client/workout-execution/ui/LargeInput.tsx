"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LargeInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
  unit?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  showStepper?: boolean;
  stepAmount?: number;
}

export function LargeInput({
  label,
  value,
  onChange,
  type = "number",
  placeholder = "0",
  step = "0.5",
  min,
  max,
  unit,
  autoFocus = false,
  disabled = false,
  className = "",
  showStepper = false,
  stepAmount,
}: LargeInputProps) {
  const parsedMin = min !== undefined ? parseFloat(min) : undefined;
  const parsedMax = max !== undefined ? parseFloat(max) : undefined;
  const numericStep =
    typeof stepAmount === "number"
      ? stepAmount
      : step
      ? parseFloat(step)
      : 1;
  const decimals = Number.isFinite(numericStep)
    ? Math.max(0, (numericStep.toString().split(".")[1] || "").length)
    : 0;
  const formatValue = (next: number) =>
    decimals > 0 ? next.toFixed(decimals) : String(Math.round(next));
  const handleStep = (direction: 1 | -1) => {
    if (disabled) return;
    const current = value === "" ? 0 : parseFloat(value);
    const safeCurrent = Number.isFinite(current) ? current : 0;
    const delta = Number.isFinite(numericStep) ? numericStep : 1;
    let next = safeCurrent + delta * direction;
    if (Number.isFinite(parsedMin)) {
      next = Math.max(parsedMin as number, next);
    }
    if (Number.isFinite(parsedMax)) {
      next = Math.min(parsedMax as number, next);
    }
    onChange(formatValue(next));
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? (
        <Label className="text-xs font-semibold fc-text-dim uppercase tracking-wider">
          {label}
          {unit && (
            <span className="fc-text-dim ml-1 normal-case">
              ({unit})
            </span>
          )}
        </Label>
      ) : null}
      <div className="flex flex-col gap-2">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          step={step}
          min={min}
          max={max}
          autoFocus={autoFocus}
          disabled={disabled}
          className="text-2xl sm:text-3xl p-3 sm:p-4 text-center font-bold font-mono h-14 sm:h-16 border-2 rounded-xl fc-text-primary w-full"
          style={{
            background: 'var(--fc-surface-card)',
            borderColor: 'var(--fc-surface-card-border)',
          }}
        />
        {showStepper && (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-lg sm:text-xl font-semibold fc-text-dim transition-all active:scale-95"
              style={{
                background: 'var(--fc-surface-sunken)',
                border: '1px solid var(--fc-surface-card-border)',
              }}
              onClick={() => handleStep(-1)}
              disabled={disabled}
              aria-label={`${label || "Value"} decrease`}
            >
              –
            </button>
            <button
              type="button"
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-lg sm:text-xl font-semibold fc-text-dim transition-all active:scale-95"
              style={{
                background: 'var(--fc-surface-sunken)',
                border: '1px solid var(--fc-surface-card-border)',
              }}
              onClick={() => handleStep(1)}
              disabled={disabled}
              aria-label={`${label || "Value"} increase`}
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
