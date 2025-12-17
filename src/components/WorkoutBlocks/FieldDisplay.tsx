import clsx from "clsx";
import { ReactNode } from "react";

export interface FieldDisplayProps {
  label: string;
  value?: ReactNode;
  className?: string;
  muted?: boolean;
  hideIfEmpty?: boolean;
}

function hasRenderableValue(value: ReactNode) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
}

export function FieldDisplay({
  label,
  value,
  className,
  muted = false,
  hideIfEmpty = false,
}: FieldDisplayProps) {
  if (hideIfEmpty && !hasRenderableValue(value)) {
    return null;
  }

  return (
    <div
      className={clsx(
        "rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-700/50",
        className
      )}
    >
      <div className="text-xs font-semibold text-slate-400 dark:text-slate-400">
        {label}
      </div>
      <div
        className={clsx(
          "mt-1 text-base font-semibold text-slate-800 dark:text-white",
          muted && "opacity-70"
        )}
      >
        {hasRenderableValue(value) ? value : "—"}
      </div>
    </div>
  );
}
