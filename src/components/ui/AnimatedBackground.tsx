"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedBackground({
  children,
  className = "",
}: AnimatedBackgroundProps) {
  const { isDark, performanceSettings, getTimeBasedGradientColors } =
    useTheme();
  // Initialize with colors immediately to avoid empty gradient on first render
  const [gradientColors, setGradientColors] = useState<string[]>(() => {
    try {
      return getTimeBasedGradientColors();
    } catch {
      // Fallback to evening colors (blue and yellow) if theme context isn't ready
      return isDark
        ? ["#0b0f14", "#121824", "#0E7490", "#155E75"]
        : ["#f6f2ec", "#e8e3db", "#7DD3FC", "#60A5FA"];
    }
  });

  useEffect(() => {
    // Update gradient colors based on time of day
    const colors = getTimeBasedGradientColors();
    if (colors && colors.length > 0) {
      setGradientColors(colors);
    }

    // Update every minute to catch time transitions
    const interval = setInterval(() => {
      const newColors = getTimeBasedGradientColors();
      if (newColors && newColors.length > 0) {
        setGradientColors(newColors);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isDark, getTimeBasedGradientColors]);

  // Ensure we always have valid colors for the gradient
  const validColors =
    gradientColors.length > 0
      ? gradientColors
      : isDark
      ? ["#0b0f14", "#121824", "#0E7490", "#155E75"]
      : ["#f6f2ec", "#e8e3db", "#7DD3FC", "#60A5FA"];

  const gradientStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(180deg, ${validColors.join(", ")})`,
    backgroundSize: "100% 200%",
    backgroundPosition: "0% 50%",
    animation: performanceSettings.animatedBackground
      ? "gradientShift 25s ease-in-out infinite"
      : "none",
  };

  return (
    <div className={`min-h-screen relative ${className}`} style={gradientStyle}>
      {/* Vignette overlay for depth */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 50%, var(--fc-vignette-edge) 100%)`,
        }}
        aria-hidden
      />
      {/* Content */}
      <div className="relative z-[1]">
        {children}
      </div>
    </div>
  );
}

export default AnimatedBackground;
