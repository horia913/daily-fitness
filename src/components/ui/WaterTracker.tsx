"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { GlassCard } from "./GlassCard";

interface WaterTrackerProps {
  glasses: number;
  goal: number;
  onGlassAdded: () => void;
  onGlassRemoved: () => void;
  className?: string;
}

export function WaterTracker({
  glasses,
  goal,
  onGlassAdded,
  onGlassRemoved,
  className = "",
}: WaterTrackerProps) {
  const { isDark } = useTheme();
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  const handleGlassClick = (index: number) => {
    if (index < glasses) {
      // Remove glass
      onGlassRemoved();
    } else if (index === glasses) {
      // Add glass
      onGlassAdded();
    }
  };

  return (
    <GlassCard className={`p-5 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #42A5F5 0%, #1E88E5 100%)",
              boxShadow: "0 4px 12px rgba(66, 165, 245, 0.3)",
            }}
          >
            <span className="text-2xl">💧</span>
          </div>

          <div className="flex-1">
            <h3
              className="text-base font-semibold"
              style={{
                color: isDark
                  ? "rgba(255, 255, 255, 0.9)"
                  : "rgba(0, 0, 0, 0.9)",
              }}
            >
              Water Intake
            </h3>
            <p
              className="text-sm"
              style={{
                color: isDark
                  ? "rgba(255, 255, 255, 0.6)"
                  : "rgba(0, 0, 0, 0.6)",
              }}
            >
              {glasses}/{goal} glasses ({glasses * 250}ml)
            </p>
          </div>
        </div>

        {/* Glass Grid */}
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: goal }).map((_, index) => (
            <WaterGlass
              key={index}
              filled={index < glasses}
              isPressed={pressedIndex === index}
              onMouseDown={() => setPressedIndex(index)}
              onMouseUp={() => {
                setPressedIndex(null);
                handleGlassClick(index);
              }}
              onMouseLeave={() => setPressedIndex(null)}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div
          className="flex gap-3 pt-3"
          style={{
            borderTop: `1px solid ${
              isDark ? "rgba(66, 165, 245, 0.2)" : "rgba(0, 0, 0, 0.06)"
            }`,
          }}
        >
          <button
            onClick={onGlassAdded}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all active:scale-95"
            style={{
              color: "#42A5F5",
              background: isDark
                ? "rgba(66, 165, 245, 0.1)"
                : "rgba(66, 165, 245, 0.1)",
            }}
          >
            + Add Glass
          </button>

          {glasses > 0 && (
            <button
              onClick={onGlassRemoved}
              className="py-2 px-3 rounded-lg text-sm transition-all active:scale-95"
              style={{
                color: isDark
                  ? "rgba(255, 255, 255, 0.5)"
                  : "rgba(0, 0, 0, 0.5)",
              }}
            >
              - Remove
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

interface WaterGlassProps {
  filled: boolean;
  isPressed: boolean;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}

function WaterGlass({
  filled,
  isPressed,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
}: WaterGlassProps) {
  const { performanceSettings } = useTheme();

  return (
    <button
      className="w-full aspect-square rounded-lg flex items-center justify-center cursor-pointer transition-all"
      style={{
        background: filled
          ? "linear-gradient(180deg, #42A5F5 0%, #1E88E5 100%)"
          : "rgba(0, 0, 0, 0.06)",
        transform: isPressed ? "scale(0.9)" : "scale(1)",
        transition: performanceSettings.smoothAnimations
          ? "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
          : "none",
        boxShadow: filled ? "0 2px 8px rgba(66, 165, 245, 0.3)" : "none",
      }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      <span className="text-xl">{filled ? "💧" : "⚪"}</span>
    </button>
  );
}

export default WaterTracker;
