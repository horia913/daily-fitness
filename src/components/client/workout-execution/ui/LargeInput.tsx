"use client";

import React, { useState } from "react";
import { Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlateCalculatorInline } from "./PlateCalculatorInline";

interface LargeInputProps {
  label?: string;
  /** Shown under the field (e.g. full rep range when default is lower bound). */
  hint?: string;
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
  plateCalculatorEnabled?: boolean;
  barKg?: number;
}

export function LargeInput({
  label,
  hint,
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
  plateCalculatorEnabled = false,
  barKg = 20,
}: LargeInputProps) {
  const [plateOpen, setPlateOpen] = useState(false);
  const parsedMin = min !== undefined ? parseFloat(min) : undefined;
  const parsedMax = max !== undefined ? parseFloat(max) : undefined;
  const numericStep =
    typeof stepAmount === "number" ? stepAmount : step ? parseFloat(step) : 1;
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
  const numericValue = parseFloat(value);
  const effectiveWeight = Number.isFinite(numericValue) ? numericValue : 0;

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? (
        <Label className="text-xs font-medium uppercase tracking-wider text-gray-400">
          {label}
          {unit && (
            <span className="ml-1 font-normal normal-case text-gray-500">({unit})</span>
          )}
        </Label>
      ) : null}
      <div className="flex flex-col gap-2">
        <div className="relative">
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
            className="min-h-[64px] border p-3 text-center text-3xl font-bold font-mono rounded-xl fc-text-primary w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-0 focus-visible:border-cyan-500/60"
            style={{
              background: "var(--fc-surface-sunken)",
              border: "1px solid var(--fc-surface-card-border)",
            }}
          />
          {plateCalculatorEnabled ? (
            <button
              type="button"
              onClick={() => setPlateOpen((v) => !v)}
              className="absolute right-2 top-2 rounded-md p-1.5 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              aria-label="Toggle plate calculator"
              title="Plate calculator"
            >
              <Calculator
                className={`h-[14px] w-[14px] ${plateOpen ? "text-cyan-300" : "text-gray-400"}`}
              />
            </button>
          ) : null}
        </div>
        {plateCalculatorEnabled && plateOpen ? (
          <PlateCalculatorInline weightKg={effectiveWeight} barKg={barKg} />
        ) : null}
        {hint ? (
          <p className="text-center text-xs text-gray-500">{hint}</p>
        ) : null}
        {showStepper && (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl text-lg sm:text-xl font-semibold fc-text-dim transition-all active:scale-95"
              style={{
                background: "var(--fc-surface-sunken)",
                border: "1px solid var(--fc-surface-card-border)",
              }}
              onClick={() => handleStep(-1)}
              disabled={disabled}
              aria-label={`${label || "Value"} decrease`}
            >
              –
            </button>
            <button
              type="button"
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl text-lg sm:text-xl font-semibold fc-text-dim transition-all active:scale-95"
              style={{
                background: "var(--fc-surface-sunken)",
                border: "1px solid var(--fc-surface-card-border)",
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
