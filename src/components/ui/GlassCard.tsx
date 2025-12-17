"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number; // 0-100, blur amount
  elevation?: 1 | 2 | 3 | 4; // Shadow elevation level
  pressable?: boolean;
  onPress?: () => void;
  borderColor?: string;
}

export function GlassCard({
  children,
  className = "",
  intensity = 20,
  elevation = 1,
  pressable = false,
  onPress,
  borderColor,
}: GlassCardProps) {
  const { isDark } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  // Elevation shadow styles
  const elevationStyles = {
    1: {
      light: "0px 2px 8px rgba(0,0,0,0.08)",
      dark: "0px 2px 8px rgba(0,0,0,0.4)",
    },
    2: {
      light: "0px 4px 16px rgba(0,0,0,0.12)",
      dark: "0px 4px 16px rgba(0,0,0,0.6)",
    },
    3: {
      light: "0px 8px 24px rgba(0,0,0,0.16)",
      dark: "0px 8px 24px rgba(0,0,0,0.7)",
    },
    4: {
      light: "0px 16px 48px rgba(0,0,0,0.24)",
      dark: "0px 16px 48px rgba(0,0,0,0.8)",
    },
  };

  const shadow = isDark
    ? elevationStyles[elevation].dark
    : elevationStyles[elevation].light;

  const baseStyle: React.CSSProperties = {
    background: isDark ? "rgba(28, 28, 30, 0.80)" : "rgba(255, 255, 255, 0.85)",
    backdropFilter: `blur(${intensity}px) saturate(${isDark ? 150 : 180}%)`,
    WebkitBackdropFilter: `blur(${intensity}px) saturate(${
      isDark ? 150 : 180
    }%)`,
    border: `1px solid ${
      borderColor ||
      (isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.18)")
    }`,
    borderRadius: "1rem",
    boxShadow: shadow,
    transition: "all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
  };

  const pressedStyle: React.CSSProperties =
    pressable && isPressed
      ? {
          transform: "scale(0.98)",
          boxShadow: isDark
            ? "0px 4px 12px rgba(0,0,0,0.6)"
            : "0px 4px 12px rgba(0,0,0,0.12)",
        }
      : {};

  const hoverStyle: React.CSSProperties = pressable
    ? {
        transform: "scale(1.02)",
        boxShadow: isDark
          ? "0px 12px 32px rgba(0,0,0,0.7)"
          : "0px 12px 32px rgba(0,0,0,0.18)",
      }
    : {};

  const handleMouseDown = () => {
    if (pressable) {
      setIsPressed(true);
    }
  };

  const handleMouseUp = () => {
    if (pressable) {
      setIsPressed(false);
      onPress?.();
    }
  };

  const handleMouseLeave = () => {
    if (pressable) {
      setIsPressed(false);
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden",
        pressable && "cursor-pointer",
        className
      )}
      style={{ ...baseStyle, ...pressedStyle }}
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
