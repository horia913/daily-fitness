"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { numberAnimationConfig } from "@/lib/animations";
import { getTypographyStyles } from "@/lib/typography";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number; // ms, will be calculated if not provided
  size?: "hero" | "heroLg" | "h1" | "h2" | "h3" | "body";
  weight?: "heavy" | "bold" | "semibold" | "medium" | "regular";
  color?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration,
  size = "hero",
  weight = "heavy",
  color,
  className = "",
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousValueRef = useRef(0);
  const { performanceSettings } = useTheme();

  useEffect(() => {
    // Skip animation if disabled
    if (!performanceSettings.smoothAnimations) {
      setDisplayValue(value);
      return;
    }

    const startValue = previousValueRef.current;
    const endValue = value;
    const animationDuration =
      duration || numberAnimationConfig.getDuration(value);
    const startTime = Date.now();

    setIsAnimating(true);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Ease-out cubic function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOut;

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        previousValueRef.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, performanceSettings.smoothAnimations]);

  const formattedValue = displayValue.toFixed(decimals);
  const typographyStyle = getTypographyStyles(size, weight, true);

  return (
    <span
      className={`${className} ${isAnimating ? "animating" : ""}`}
      style={{
        ...typographyStyle,
        color: color || "inherit",
        display: "inline-block",
      }}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}

export default AnimatedNumber;
