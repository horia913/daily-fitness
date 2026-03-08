"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SecondaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}

export function SecondaryButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  className,
}: SecondaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "fc-btn fc-btn-secondary fc-press h-10 px-6 text-sm flex items-center justify-center gap-2 rounded-xl",
        className
      )}
    >
      {children}
    </button>
  );
}

export default SecondaryButton;
