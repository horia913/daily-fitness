"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export type CoachCardShellTone = "neutral" | "success" | "error" | "warning" | "info";

const toneModifier: Record<Exclude<CoachCardShellTone, "neutral">, string> = {
  success: "fc-card-shell--success",
  error: "fc-card-shell--error",
  warning: "fc-card-shell--warning",
  info: "fc-card-shell--info",
};

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  elevation?: 1 | 2 | 3 | 4;
  pressable?: boolean;
  onPress?: () => void;
  borderColor?: string;
  surfaceStyle?: React.CSSProperties;
  tone?: CoachCardShellTone;
}

export function GlassCard({
  children,
  className = "",
  intensity,
  elevation = 1,
  pressable = false,
  onPress,
  borderColor,
  surfaceStyle,
  tone = "neutral",
}: GlassCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  const cleanedClassName =
    typeof className === "string"
      ? className
          .replace(/\bfc-glass\b/g, "")
          .replace(/\bfc-card\b/g, "")
          .replace(/\bfc-card-shell\b(?!-)/g, "")
          .replace(/\s+/g, " ")
          .trim()
      : className;

  const hasCustomBg =
    typeof cleanedClassName === "string" && /\bbg-/.test(cleanedClassName);
  const hasAttentionTint =
    typeof cleanedClassName === "string" &&
    /\bfc-attention-(urgent|warning|good|inactive|info)\b/.test(
      cleanedClassName
    );
  const hasSurfaceBg = Boolean(
    surfaceStyle?.background ?? surfaceStyle?.backgroundColor
  );
  const blurValue =
    intensity != null ? `${intensity}px` : "var(--fc-blur-card)";
  const skipBlurForSurfaceTint = hasSurfaceBg;
  const useShellFill = !(hasCustomBg || hasAttentionTint || hasSurfaceBg);
  const shellToneClass =
    useShellFill && tone !== "neutral" ? toneModifier[tone] : undefined;

  const pressedStyle: React.CSSProperties =
    pressable && isPressed ? { transform: "scale(0.98)" } : {};

  const blurStyle: React.CSSProperties =
    useShellFill || skipBlurForSurfaceTint
      ? { backdropFilter: "none", WebkitBackdropFilter: "none" }
      : {
          backdropFilter: `blur(${blurValue})`,
          WebkitBackdropFilter: `blur(${blurValue})`,
        };

  const baseStyle: React.CSSProperties = {
    ...(borderColor ? { borderLeftColor: borderColor } : {}),
    ...blurStyle,
    transition: "all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
  };

  const handleMouseDown = () => {
    if (pressable) setIsPressed(true);
  };

  const handleMouseUp = () => {
    if (pressable) {
      setIsPressed(false);
      onPress?.();
    }
  };

  const handleMouseLeave = () => {
    if (pressable) setIsPressed(false);
  };

  return (
    <div
      className={cn(
        "overflow-hidden p-4",
        useShellFill
          ? cn("fc-card-shell", shellToneClass)
          : "fc-card-shell-outline",
        pressable && "cursor-pointer",
        cleanedClassName
      )}
      style={{ ...baseStyle, ...surfaceStyle, ...pressedStyle }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={pressable ? onPress : undefined}
    >
      {children}
    </div>
  );
}

export default GlassCard;
