"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LogSetButtonProps {
  onClick: () => void;
  ready: boolean;
  loading?: boolean;
  label?: string;
  className?: string;
}

/**
 * Primary log CTA — mock log-btn: action gradient, uppercase 14px tracking 0.06em.
 * Never uses `disabled` — parent should no-op in onClick when not ready.
 */
export function LogSetButton({
  onClick,
  ready,
  loading = false,
  label = "Log set",
  className,
}: LogSetButtonProps) {
  return (
    <Button
      type="button"
      variant="btn-action"
      onClick={onClick}
      aria-busy={loading}
      className={cn(
        "w-full",
        !ready && !loading && "pointer-events-auto opacity-50",
        loading && "opacity-90",
        className,
      )}
    >
      {loading ? "Saving…" : label}
    </Button>
  );
}
