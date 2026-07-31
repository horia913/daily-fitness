"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface LoadPercentageWeightToggleProps {
  value: "load" | "weight";
  onValueChange: (value: "load" | "weight") => void;
  className?: string;
  labelClassName?: string;
  disabled?: boolean;
  /** Pill switch + % 1RM / kg labels (coach template editor v1). */
  visualVariant?: "default" | "coachPill";
}

/**
 * Toggle component for switching between Load % and Weight input modes.
 * Mobile-first design with small, compact switch.
 * 
 * @param value - Current mode: "load" for Load %, "weight" for Weight
 * @param onValueChange - Callback when toggle changes
 * @param className - Additional classes for container
 * @param labelClassName - Additional classes for labels
 * @param disabled - Whether toggle is disabled
 */
export function LoadPercentageWeightToggle({
  value,
  onValueChange,
  className,
  labelClassName,
  disabled = false,
  visualVariant = "default",
}: LoadPercentageWeightToggleProps) {
  const isLoadMode = value === "load";

  if (visualVariant === "coachPill") {
    return (
      <div
        className={cn(
          "inline-flex flex-row items-center gap-1.5 rounded-full border border-white/[0.05] bg-[#091420] px-2 py-0.5",
          className,
        )}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => onValueChange("load")}
          className={cn(
            "font-mono text-[10px] font-semibold leading-none bg-transparent border-none p-0 cursor-pointer",
            isLoadMode ? "text-[color:var(--fc-group-c)]" : "text-white/40",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          % 1RM
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={!isLoadMode}
          disabled={disabled}
          onClick={() => onValueChange(isLoadMode ? "weight" : "load")}
          className={cn(
            "relative h-3 w-[22px] shrink-0 rounded-full border-0 p-0 cursor-pointer transition-colors",
            isLoadMode ? "bg-[rgba(34, 211, 238, 0.35)]" : "bg-white/15",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <span
            className="absolute top-px h-2.5 w-2.5 rounded-full bg-[#0a1a26] transition-[left] duration-150"
            style={{ left: isLoadMode ? 2 : 11 }}
          />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onValueChange("weight")}
          className={cn(
            "font-mono text-[10px] font-semibold leading-none bg-transparent border-none p-0 cursor-pointer",
            !isLoadMode ? "text-[color:var(--fc-group-c)]" : "text-white/40",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          kg
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Label
        className={cn(
          "text-xs font-medium whitespace-nowrap",
          !isLoadMode && "opacity-60",
          labelClassName
        )}
      >
        Load %
      </Label>
      <Switch
        checked={!isLoadMode} // Checked = Weight mode
        onCheckedChange={(checked) => {
          onValueChange(checked ? "weight" : "load");
        }}
        disabled={disabled}
        className="h-5 w-9" // Smaller size for mobile-first
      />
      <Label
        className={cn(
          "text-xs font-medium whitespace-nowrap",
          isLoadMode && "opacity-60",
          labelClassName
        )}
      >
        Weight
      </Label>
    </div>
  );
}

