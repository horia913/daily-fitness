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
        ? ["#0C4A6E", "#075985", "#92400E", "#78350F"]
        : ["#7DD3FC", "#60A5FA", "#FBBF24", "#FDE68A"];
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
      ? ["#0C4A6E", "#075985", "#92400E", "#78350F"]
      : ["#7DD3FC", "#60A5FA", "#FBBF24", "#FDE68A"];

  const gradientStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(180deg, ${validColors.join(", ")})`,
    backgroundSize: "100% 200%",
    backgroundPosition: "0% 50%",
    animation: performanceSettings.animatedBackground
      ? "gradientShift 10s ease-in-out infinite"
      : "none",
  };

  return (
    <div className={`min-h-screen relative ${className}`} style={gradientStyle}>
      {children}
    </div>
  );
}

export default AnimatedBackground;
