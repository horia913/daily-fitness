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

const RARITY_CARD_TINT: Record<AchievementRarity, string> = {
  common: "bg-amber-50/30 dark:bg-amber-900/10",
  uncommon: "bg-slate-50/30 dark:bg-slate-800/10",
  rare: "bg-yellow-50/30 dark:bg-yellow-900/10",
  epic: "bg-violet-50/30 dark:bg-violet-900/10",
  legendary: "bg-rose-50/30 dark:bg-rose-900/10",
};

const RARITY_BADGE_CLASS: Record<AchievementRarity, string> = {
  common: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  uncommon: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  rare: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  epic: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  legendary: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

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
        className={`p-4 relative overflow-hidden ${RARITY_CARD_TINT[achievement.rarity]} ${className}`}
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
                  className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${RARITY_BADGE_CLASS[achievement.rarity]}`}
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
      className={`p-4 relative opacity-60 bg-gray-50/30 dark:bg-gray-800/20 ${className}`}
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
            {/* Rarity badge (locked = muted) */}
            <span className="px-2 py-0.5 rounded text-xs font-semibold capitalize bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
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
