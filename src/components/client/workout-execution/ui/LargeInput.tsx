"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LargeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  step?: string;
  unit?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

export function LargeInput({
  label,
  value,
  onChange,
  type = "number",
  placeholder = "0",
  step = "0.5",
  unit,
  autoFocus = false,
  disabled = false,
  className = "",
}: LargeInputProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {unit && (
          <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
            ({unit})
          </span>
        )}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        autoFocus={autoFocus}
        disabled={disabled}
        className="text-3xl p-4 text-center font-bold h-16 border-2 focus:border-blue-500 dark:focus:border-blue-400"
      />
    </div>
  );
}
