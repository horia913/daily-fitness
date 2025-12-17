"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface MacroData {
  label: string;
  consumed: number;
  goal: number;
  unit: string;
  colors: [string, string];
  icon: string;
}

interface MacroBarsProps {
  protein: { consumed: number; goal: number };
  carbs: { consumed: number; goal: number };
  fat: { consumed: number; goal: number };
  className?: string;
}

export function MacroBars({
  protein,
  carbs,
  fat,
  className = "",
}: MacroBarsProps) {
  const macros: MacroData[] = [
    {
      label: "Protein",
      consumed: protein.consumed,
      goal: protein.goal,
      unit: "g",
      colors: ["#E53935", "#C62828"],
      icon: "🥩",
    },
    {
      label: "Carbs",
      consumed: carbs.consumed,
      goal: carbs.goal,
      unit: "g",
      colors: ["#FFA726", "#FB8C00"],
      icon: "🍞",
    },
    {
      label: "Fat",
      consumed: fat.consumed,
      goal: fat.goal,
      unit: "g",
      colors: ["#7CB342", "#558B2F"],
      icon: "🥑",
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {macros.map((macro, index) => (
        <MacroBar key={macro.label} {...macro} delay={index * 100} />
      ))}
    </div>
  );
}

function MacroBar({
  label,
  consumed,
  goal,
  unit,
  colors,
  icon,
  delay,
}: MacroData & { delay: number }) {
  const { isDark, performanceSettings } = useTheme();
  const [progress, setProgress] = useState(0);

  const progressValue = Math.min((consumed / goal) * 100, 100);
  const isOverGoal = consumed > goal;

  useEffect(() => {
    if (performanceSettings.smoothAnimations) {
      const timer = setTimeout(() => setProgress(progressValue), delay);
      return () => clearTimeout(timer);
    } else {
      setProgress(progressValue);
    }
  }, [progressValue, delay, performanceSettings.smoothAnimations]);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span
            className="text-sm font-medium"
            style={{
              color: isDark ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
            }}
          >
            {label}
          </span>
        </div>

        <div className="flex items-baseline gap-1">
          <span
            className="text-sm font-bold"
            style={{
              color: isOverGoal ? "#E53935" : colors[0],
            }}
          >
            {consumed}
          </span>
          <span
            className="text-xs"
            style={{
              color: isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)",
            }}
          >
            /{goal}
            {unit}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative h-2.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
              transitionDelay: performanceSettings.smoothAnimations
                ? `${delay}ms`
                : "0ms",
            }}
          />

          {/* Over goal warning */}
          {isOverGoal && (
            <div
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: "100%", marginLeft: "4px" }}
            >
              <span className="text-xs">⚠</span>
            </div>
          )}
        </div>

        <span
          className="text-xs font-semibold w-10 text-right"
          style={{ color: colors[0] }}
        >
          {Math.round(progressValue)}%
        </span>
      </div>
    </div>
  );
}

export default MacroBars;
