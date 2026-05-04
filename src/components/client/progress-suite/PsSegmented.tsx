"use client";

import { cn } from "@/lib/utils";
import styles from "./progressSuiteV1.module.css";

export function PsSegmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      className={styles.psSegWrap}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className={cn(
            styles.psSegBtn,
            value === opt.value && styles.psSegBtnActive,
          )}
          onClick={() => onChange(opt.value)}
        >
          <span className={styles.psSegBtnLabel}>{opt.label}</span>
          {typeof opt.count === "number" ? (
            <span
              className={cn(
                styles.psSegCount,
                value === opt.value && styles.psSegCountActive,
              )}
            >
              {opt.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
