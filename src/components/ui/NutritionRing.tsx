"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedNumber } from "./AnimatedNumber";

interface NutritionRingProps {
  consumed: number;
  goal: number;
  size?: number; // diameter in pixels
  strokeWidth?: number;
  className?: string;
}

export function NutritionRing({
  consumed,
  goal,
  size = 200,
  strokeWidth = 16,
  className = "",
}: NutritionRingProps) {
  const { isDark, performanceSettings } = useTheme();
  const [progress, setProgress] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressValue = Math.min((consumed / goal) * 100, 100);

  useEffect(() => {
    if (performanceSettings.smoothAnimations) {
      // Animate progress
      const timer = setTimeout(() => setProgress(progressValue), 100);
      return () => clearTimeout(timer);
    } else {
      setProgress(progressValue);
    }
  }, [progressValue, performanceSettings.smoothAnimations]);

  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const remaining = Math.max(goal - consumed, 0);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)"}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress circle with gradient */}
          <defs>
            <linearGradient
              id="calorieGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#FF6B35" />
              <stop offset="100%" stopColor="#FF4E50" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#calorieGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            style={{
              transition: performanceSettings.smoothAnimations
                ? "stroke-dashoffset 0.8s cubic-bezier(0.0, 0.0, 0.2, 1)"
                : "none",
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedNumber
            value={remaining}
            size="hero"
            weight="heavy"
            color="#FF6B35"
          />
          <div
            className="h-0.5 my-1"
            style={{
              width: "40px",
              background: isDark
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(0, 0, 0, 0.2)",
            }}
          />
          <span
            className="text-base font-medium"
            style={{
              color: isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
            }}
          >
            {goal}
          </span>
          <span
            className="text-xs mt-0.5"
            style={{
              color: isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)",
            }}
          >
            calories left
          </span>
        </div>
      </div>
    </div>
  );
}

export default NutritionRing;
