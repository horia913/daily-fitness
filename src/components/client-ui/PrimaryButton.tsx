"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  className,
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "fc-btn fc-btn-primary fc-press w-full h-10 flex items-center justify-center gap-2 text-sm font-bold rounded-xl",
        className
      )}
    >
      {children}
    </button>
  );
}

export default PrimaryButton;
