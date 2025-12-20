"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { GlassCard } from "./GlassCard";
import { Lock } from "lucide-react";
import { rarityColors } from "@/lib/colors";

export type AchievementRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number; // 0-100 for locked achievements
  requirement?: string; // e.g. "Complete 10 workouts"
}

interface AchievementCardProps {
  achievement: Achievement;
  onClick?: () => void;
  className?: string;
}

export function AchievementCard({
  achievement,
  onClick,
  className = "",
}: AchievementCardProps) {
  const { isDark } = useTheme();
  const rarity = rarityColors[achievement.rarity];

  if (achievement.unlocked) {
    return (
      <GlassCard
        pressable
        onPress={onClick}
        elevation={2}
        borderColor={rarity.color}
        className={`p-4 relative overflow-hidden ${className}`}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at center, ${rarity.glow} 0%, transparent 70%)`,
            animation: "pulse 3s ease-in-out infinite",
          }}
        />

        <div className="relative z-10">
          {/* Icon with gradient border */}
          <div className="flex items-start gap-4 mb-3">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${rarity.gradient.join(
                  ", "
                )})`,
                boxShadow: `0 4px 12px ${rarity.glow}40`,
              }}
            >
              <span className="text-3xl">{achievement.icon}</span>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4
                  className="text-base font-bold"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  {achievement.name}
                </h4>
                {/* Rarity badge */}
                <span
                  className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
                  style={{
                    background: `${rarity.color}20`,
                    color: rarity.color,
                  }}
                >
                  {achievement.rarity}
                </span>
              </div>

              <p
                className="text-sm mb-2"
                style={{
                  color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                }}
              >
                {achievement.description}
              </p>

              {achievement.unlockedAt && (
                <p
                  className="text-xs"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                  }}
                >
                  Unlocked{" "}
                  {new Date(achievement.unlockedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Sparkle effect for legendary */}
          {achievement.rarity === "legendary" && (
            <div className="absolute top-2 right-2 animate-pulse">
              <span className="text-2xl">✨</span>
            </div>
          )}
        </div>
      </GlassCard>
    );
  }

  // Locked state
  return (
    <GlassCard
      pressable={false}
      elevation={1}
      className={`p-4 relative opacity-60 ${className}`}
    >
      <div className="flex items-start gap-4">
        {/* Locked icon */}
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          }}
        >
          <Lock
            className="w-6 h-6"
            style={{
              color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
            }}
          />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className="text-base font-bold"
              style={{
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
              }}
            >
              {achievement.name}
            </h4>
            {/* Rarity badge */}
            <span
              className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
              style={{
                background: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.1)",
                color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
              }}
            >
              {achievement.rarity}
            </span>
          </div>

          <p
            className="text-sm mb-2"
            style={{
              color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
            }}
          >
            {achievement.requirement || "???"}
          </p>

          {/* Progress bar */}
          {achievement.progress !== undefined && (
            <div>
              <div
                className="h-2 rounded-full overflow-hidden mb-1"
                style={{
                  background: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${achievement.progress}%`,
                    background: `linear-gradient(90deg, ${rarity.gradient.join(
                      ", "
                    )})`,
                  }}
                />
              </div>
              <p
                className="text-xs"
                style={{
                  color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                }}
              >
                {Math.round(achievement.progress)}% complete
              </p>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

export default AchievementCard;
