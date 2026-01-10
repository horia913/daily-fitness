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
}: LoadPercentageWeightToggleProps) {
  const isLoadMode = value === "load";

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

