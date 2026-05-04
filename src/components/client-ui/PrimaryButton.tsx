"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}

/**
 * @deprecated Prefer `<Button variant="btn-action" className="h-10 w-full" />` from `@/components/ui/button`.
 */
export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  className,
}: PrimaryButtonProps) {
  return (
    <Button
      type={type}
      variant="btn-action"
      disabled={disabled}
      onClick={onClick}
      className={cn("h-10 w-full", className)}
    >
      {children}
    </Button>
  );
}

export default PrimaryButton;
