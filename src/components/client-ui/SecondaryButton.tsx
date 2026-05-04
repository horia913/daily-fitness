"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SecondaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}

/**
 * @deprecated Prefer `<Button variant="fc-secondary" className="h-10" />` from `@/components/ui/button`.
 */
export function SecondaryButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  className,
}: SecondaryButtonProps) {
  return (
    <Button
      type={type}
      variant="fc-secondary"
      disabled={disabled}
      onClick={onClick}
      className={cn("h-10 px-6", className)}
    >
      {children}
    </Button>
  );
}

export default SecondaryButton;
