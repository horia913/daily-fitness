"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import styles from "./liveCard.module.css";
import { useSkipRestOnInteract } from "../LiveRestTimerContext";

/**
 * Option B stacked log field — full-width row:
 * label (left) · − · value (centred) · +
 */
export function LiveCardLogField({
  label,
  value,
  empty,
  onChange,
  onIncrement,
  onDecrement,
  disabled,
}: {
  label: string;
  value: string;
  empty?: boolean;
  onChange?: (value: string) => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  disabled?: boolean;
}) {
  const skipRest = useSkipRestOnInteract();
  return (
    <div className={styles.field}>
      <span className={styles.fl}>{label}</span>
      <button
        type="button"
        className={styles.stBtn}
        disabled={disabled}
        onClick={() => {
          skipRest();
          onDecrement?.();
        }}
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <input
        className={cn(styles.fn, (empty || !value) && styles.fnEmpty)}
        value={value}
        placeholder="—"
        inputMode="decimal"
        disabled={disabled}
        onFocus={() => skipRest()}
        onChange={(e) => {
          skipRest();
          onChange?.(e.target.value);
        }}
        aria-label={label}
      />
      <button
        type="button"
        className={styles.stBtn}
        disabled={disabled}
        onClick={() => {
          skipRest();
          onIncrement?.();
        }}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}

/**
 * Green log button.
 * - `full` (default): full-width "✓ Log set" (~44px) for solo cards
 * - `compact`: square ✓ for grouped per-exercise logs
 */
export function LiveCardLogButton({
  onClick,
  disabled,
  label,
  variant = "full",
}: {
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
  variant?: "full" | "compact";
}) {
  const skipRest = useSkipRestOnInteract();
  const text = label ?? (variant === "compact" ? "✓" : "✓ Log set");
  return (
    <button
      type="button"
      className={cn(
        styles.lbtn,
        variant === "compact" ? styles.lbtnCompact : styles.lbtnFull,
      )}
      onClick={() => {
        skipRest();
        onClick?.();
      }}
      disabled={disabled}
      aria-label="Log set"
    >
      {text}
    </button>
  );
}

/**
 * Row 4 log strip — stacked Option B column, or a grow slot for custom body.
 */
export function LiveCardLog({
  children,
  onLog,
  disableLog,
  fields,
}: {
  /** Custom body (fields + button, or SetRowsListPanel). */
  children?: ReactNode;
  onLog?: () => void;
  disableLog?: boolean;
  /** When set, renders fields then a full-width log button. */
  fields?: ReactNode;
}) {
  if (children) {
    return <div className={styles.logSlot}>{children}</div>;
  }
  return (
    <div className={styles.log}>
      {fields}
      <LiveCardLogButton onClick={onLog} disabled={disableLog} />
    </div>
  );
}

/** Timed log variant — single "Time held" field. */
export function LiveCardLogTimeHeld(
  props: Omit<Parameters<typeof LiveCardLogField>[0], "label"> & {
    label?: string;
  },
) {
  const { label = "Time held", ...rest } = props;
  return <LiveCardLogField label={label} {...rest} />;
}

/** Distance log variant — Distance + Time stacked fields. */
export function LiveCardLogDistanceTime({
  distance,
  time,
  onDistanceChange,
  onTimeChange,
  onDistanceIncrement,
  onDistanceDecrement,
  onTimeIncrement,
  onTimeDecrement,
  distanceLabel = "Distance",
  timeLabel = "Time",
  disabled,
}: {
  distance: string;
  time: string;
  onDistanceChange?: (value: string) => void;
  onTimeChange?: (value: string) => void;
  onDistanceIncrement?: () => void;
  onDistanceDecrement?: () => void;
  onTimeIncrement?: () => void;
  onTimeDecrement?: () => void;
  distanceLabel?: string;
  timeLabel?: string;
  disabled?: boolean;
}) {
  return (
    <>
      <LiveCardLogField
        label={distanceLabel}
        value={distance}
        onChange={onDistanceChange}
        onIncrement={onDistanceIncrement}
        onDecrement={onDistanceDecrement}
        disabled={disabled}
      />
      <LiveCardLogField
        label={timeLabel}
        value={time}
        empty={!time}
        onChange={onTimeChange}
        onIncrement={onTimeIncrement}
        onDecrement={onTimeDecrement}
        disabled={disabled}
      />
    </>
  );
}
