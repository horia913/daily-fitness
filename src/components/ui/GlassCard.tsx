"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number; // blur amount; defaults to CSS var --fc-blur-card
  elevation?: 1 | 2 | 3 | 4; // reserved for future token-based elevation scale
  pressable?: boolean;
  onPress?: () => void;
  borderColor?: string;
  /** Merged after base styles — use for attention tints (wins over default inline bg). */
  surfaceStyle?: React.CSSProperties;
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
}: GlassCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  // Omit default inline background when:
  // - parent passes Tailwind bg-* (so utilities apply), or
  // - parent uses fc-attention-* (stylesheet tint must not lose to inline bg), or
  // - surfaceStyle sets a background.
  const hasCustomBg = typeof className === "string" && /\bbg-/.test(className);
  const hasAttentionTint =
    typeof className === "string" &&
    /\bfc-attention-(urgent|warning|good|inactive|info)\b/.test(className);
  const hasSurfaceBg = Boolean(
    surfaceStyle?.background ?? surfaceStyle?.backgroundColor
  );
  const blurValue =
    intensity != null ? `${intensity}px` : "var(--fc-blur-card)";
  // Opaque/solid attention tints + backdrop blur often produce harsh edge artifacts; use solid surface.
  const skipBlurForSurfaceTint = hasSurfaceBg;
  const baseStyle: React.CSSProperties = {
    ...(!(hasCustomBg || hasAttentionTint || hasSurfaceBg) && {
      background: "var(--fc-glass-base)",
    }),
    border: `1px solid ${borderColor ?? "var(--fc-glass-border)"}`,
    borderRadius: "var(--fc-radius-lg)",
    boxShadow: "var(--fc-shadow-card)",
    ...(skipBlurForSurfaceTint
      ? { backdropFilter: "none", WebkitBackdropFilter: "none" }
      : {
          backdropFilter: `blur(${blurValue})`,
          WebkitBackdropFilter: `blur(${blurValue})`,
        }),
    transition: "all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
  };

  const pressedStyle: React.CSSProperties =
    pressable && isPressed ? { transform: "scale(0.98)" } : {};

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
        "overflow-hidden",
        pressable && "cursor-pointer",
        className
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
