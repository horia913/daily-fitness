"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface LargeInputProps {
  label: string;
  unit?: string;
  value: string | number;
  onChange?: (value: string) => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  disabled?: boolean;
  /** `decimal` → text input + decimal keypad (no native number spinners). */
  inputType?: "number" | "decimal";
  /** Native-style mode when not using `inputType`. */
  type?: "text" | "number";
  hint?: string;
  showStepper?: boolean;
  className?: string;
  placeholder?: string;
  step?: string;
  stepAmount?: number;
  min?: string;
  max?: string;
  autoFocus?: boolean;
  /** Tighter chrome for narrow modals (e.g. gym console log set). */
  density?: "default" | "compact";
}

function resolveInputType(
  type: LargeInputProps["type"],
  inputType: LargeInputProps["inputType"],
): "text" | "number" {
  if (inputType === "number") return "number";
  if (inputType === "decimal") return "text";
  return type ?? "number";
}

export function LargeInput({
  label,
  unit,
  value,
  onChange,
  onIncrement,
  onDecrement,
  disabled = false,
  inputType,
  type = "number",
  hint,
  showStepper = true,
  className = "",
  placeholder = "0",
  step = "0.5",
  stepAmount,
  min,
  max,
  autoFocus = false,
  density = "default",
}: LargeInputProps) {
  const stringValue =
    value === null || value === undefined ? "" : String(value);
  const resolvedType = resolveInputType(type, inputType);
  const parsedMin = min !== undefined ? parseFloat(min) : undefined;
  const parsedMax = max !== undefined ? parseFloat(max) : undefined;
  const numericStep =
    typeof stepAmount === "number" ? stepAmount : step ? parseFloat(step) : 1;
  const decimals = Number.isFinite(numericStep)
    ? Math.max(0, (numericStep.toString().split(".")[1] || "").length)
    : 0;
  const formatValue = (next: number) =>
    decimals > 0 ? next.toFixed(decimals) : String(Math.round(next));

  const emitChange = onChange ?? (() => {});

  const handleStep = (direction: 1 | -1) => {
    if (disabled) return;
    if (direction === 1 && onIncrement) {
      onIncrement();
      return;
    }
    if (direction === -1 && onDecrement) {
      onDecrement();
      return;
    }
    const current = stringValue === "" ? 0 : parseFloat(stringValue);
    const safeCurrent = Number.isFinite(current) ? current : 0;
    const delta = Number.isFinite(numericStep) ? numericStep : 1;
    let next = safeCurrent + delta * direction;
    if (Number.isFinite(parsedMin)) {
      next = Math.max(parsedMin as number, next);
    }
    if (Number.isFinite(parsedMax)) {
      next = Math.min(parsedMax as number, next);
    }
    emitChange(formatValue(next));
  };

  const hasLabel = Boolean(label?.trim());
  const showTopRow = hasLabel || Boolean(unit);

  const showRightColumn =
    showStepper || Boolean(onIncrement) || Boolean(onDecrement);

  const incrementDisabled = disabled || (!showStepper && !onIncrement);
  const decrementDisabled = disabled || (!showStepper && !onDecrement);

  const isCompact = density === "compact";
  const padX = isCompact ? "px-3" : "px-[14px]";
  const padY = isCompact ? "py-2.5" : "py-[12px]";
  const numClass = isCompact
    ? "text-[26px] font-bold leading-none tracking-[-0.02em]"
    : "text-[30px] font-bold leading-none tracking-[-0.02em]";
  const stepperCol = isCompact ? "w-6" : "w-[26px]";
  /* fc-logset-step-btn: excluded from mobile.css 44×44 min touch rule so column width matches */
  const stepBtn = isCompact
    ? "fc-logset-step-btn box-border grid h-[18px] w-6 min-h-0 min-w-0 max-h-[18px] max-w-6 shrink-0 place-items-center rounded-[6px] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.06)] text-[12px] font-semibold leading-none text-[var(--fc-text-primary,#fff)] transition hover:bg-[rgba(255,255,255,0.10)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation p-0"
    : "fc-logset-step-btn box-border grid h-[20px] w-[26px] min-h-0 min-w-0 max-h-[20px] max-w-[26px] shrink-0 place-items-center rounded-[6px] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.06)] text-[13px] font-semibold leading-none text-[var(--fc-text-primary,#fff)] transition hover:bg-[rgba(255,255,255,0.10)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation p-0";

  return (
    <div className={cn("w-full min-w-0", className)}>
      <div
        className={cn(
          "box-border w-full min-w-0 overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] transition-colors",
          padX,
          padY,
          "focus-within:border-[rgba(197,255,74,0.40)] focus-within:bg-[rgba(255,255,255,0.06)]",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {showTopRow ? (
          <div
            className={cn(
              "mb-[6px] flex min-w-0 items-center justify-between gap-x-2",
              "text-[9.5px] font-bold uppercase tracking-[0.10em] text-[var(--fc-text-tertiary,#a1a1aa)]",
            )}
          >
            <span className="min-w-0 shrink-0 whitespace-nowrap text-left">
              {hasLabel ? label.trim() : "\u00a0"}
            </span>
            {unit ? (
              <span className="shrink-0 font-medium normal-case tracking-normal text-[var(--fc-text-quaternary,#71717a)]">
                {unit}
              </span>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "grid w-full min-w-0 items-center",
            isCompact ? "grid-cols-[minmax(0,1fr)_auto] gap-2" : "grid-cols-[minmax(0,1fr)_auto] gap-[6px]",
          )}
        >
          <div
            className={cn(
              "min-w-0 overflow-hidden font-[family-name:var(--f-display,var(--font-display,var(--font-number,ui-sans-serif)))]",
              numClass,
              "text-[var(--fc-text-primary,#fff)] tabular-nums",
            )}
          >
            <input
              type={
                resolvedType === "number" || inputType === "decimal"
                  ? "text"
                  : resolvedType
              }
              inputMode={
                resolvedType === "number" || inputType === "decimal"
                  ? "decimal"
                  : undefined
              }
              value={stringValue}
              onChange={(e) => emitChange(e.target.value)}
              placeholder={placeholder}
              autoFocus={autoFocus}
              disabled={disabled}
              aria-label={label.trim() || "Value"}
              title={hint ? String(hint) : undefined}
              readOnly={!onChange}
              className={cn(
                "fc-logset-num w-full min-w-0 border-0 bg-transparent p-0",
                numClass,
                "text-inherit outline-none",
                "placeholder:text-zinc-500",
                !onChange && "cursor-default",
              )}
            />
          </div>
          {showRightColumn ? (
            <div
              className={cn(
                "flex shrink-0 flex-col justify-center gap-[3px] justify-self-end",
                stepperCol,
              )}
            >
              <button
                type="button"
                onClick={() => handleStep(1)}
                disabled={incrementDisabled}
                aria-label={`${label.trim() || "Value"} increase`}
                className={stepBtn}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => handleStep(-1)}
                disabled={decrementDisabled}
                aria-label={`${label.trim() || "Value"} decrease`}
                className={stepBtn}
              >
                −
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
