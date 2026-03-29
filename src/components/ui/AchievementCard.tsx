"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { GlassCard } from "./GlassCard";
import { Lock, Trophy } from "lucide-react";
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

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  bronze: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-400" },
  silver: { bg: "bg-slate-100 dark:bg-slate-700/40", text: "text-slate-600 dark:text-slate-200", border: "border-slate-400" },
  gold: { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-400" },
  platinum: { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300", border: "border-violet-400" },
};

const ALL_TIERS = ["bronze", "silver", "gold", "platinum"];

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  requirement?: string;
  unlockedTiers?: string[];
  isMastered?: boolean;
  nearMiss?: boolean;
}

interface AchievementCardProps {
  achievement: Achievement;
  onClick?: () => void;
  className?: string;
  /** Flat list row (no GlassCard chrome) for dense achievement lists */
  dense?: boolean;
}

function TierBadges({ unlockedTiers }: { unlockedTiers: string[] }) {
  const unlockedSet = new Set(unlockedTiers);
  return (
    <div className="flex items-center gap-1 mt-1.5">
      {ALL_TIERS.map((tier) => {
        const isEarned = unlockedSet.has(tier);
        const colors = TIER_COLORS[tier];
        return (
          <span
            key={tier}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
              isEarned
                ? `${colors.bg} ${colors.text} ${colors.border}`
                : "bg-transparent border-gray-300/40 dark:border-gray-600/40 text-gray-400 dark:text-gray-600"
            }`}
          >
            {tier[0].toUpperCase()}
          </span>
        );
      })}
    </div>
  );
}

type AchievementRowProps = Pick<
  AchievementCardProps,
  "achievement" | "onClick" | "className"
>;

function AchievementDenseRow({
  achievement,
  onClick,
  className = "",
}: AchievementRowProps) {
  const { isDark } = useTheme();
  const rarity = rarityColors[achievement.rarity];
  const earned =
    achievement.unlocked ||
    (achievement.unlockedTiers && achievement.unlockedTiers.length > 0);
  const inProgress =
    !earned &&
    achievement.progress !== undefined &&
    achievement.progress > 0;

  const iconBox = (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
      style={{
        background: earned
          ? `linear-gradient(135deg, ${rarity.gradient.join(", ")})`
          : isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.06)",
        boxShadow: earned ? `0 2px 8px ${rarity.glow}30` : undefined,
      }}
    >
      {earned ? (
        achievement.icon && !/^[🏆🏅🎖️⭐]/.test(achievement.icon) ? (
          <span className="text-xl">{achievement.icon}</span>
        ) : (
          <Trophy className="h-5 w-5" style={{ color: rarity.color }} />
        )
      ) : inProgress ? (
        achievement.icon && !/^[🏆🏅🎖️⭐]/.test(achievement.icon) ? (
          <span className="text-xl opacity-60">{achievement.icon}</span>
        ) : (
          <Trophy className="h-5 w-5 opacity-60" style={{ color: rarity.color }} />
        )
      ) : (
        <Lock
          className="h-5 w-5"
          style={{
            color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
          }}
        />
      )}
    </div>
  );

  const inner = (
    <>
      {iconBox}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4
            className="truncate text-sm font-bold"
            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
          >
            {achievement.name}
          </h4>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${RARITY_BADGE_CLASS[achievement.rarity]} ${!earned ? "opacity-70" : ""}`}
          >
            {achievement.rarity}
          </span>
          {achievement.isMastered && (
            <span className="rounded bg-gradient-to-r from-violet-500 to-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
              Mastered
            </span>
          )}
        </div>
        <p
          className="mt-0.5 line-clamp-2 text-xs"
          style={{
            color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)",
          }}
        >
          {achievement.description}
        </p>
        {inProgress && achievement.progress !== undefined && (
          <div className="mt-2">
            <div
              className="mb-0.5 h-1.5 overflow-hidden rounded-full"
              style={{
                background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
              }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${achievement.progress}%`,
                  background: `linear-gradient(90deg, ${rarity.gradient.join(", ")})`,
                }}
              />
            </div>
            <p className="text-[10px]" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
              {Math.round(achievement.progress)}% · {achievement.requirement || "In progress"}
            </p>
          </div>
        )}
        {earned && achievement.unlockedAt && (
          <p
            className="mt-1 text-[10px]"
            style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}
          >
            Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
          </p>
        )}
        {!earned && !inProgress && achievement.requirement && (
          <p
            className="mt-0.5 text-[10px]"
            style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}
          >
            {achievement.requirement}
          </p>
        )}
      </div>
    </>
  );

  const rowClass = `flex w-full min-h-[52px] items-start gap-3 border-b border-white/5 py-3 text-left transition-colors hover:bg-white/[0.02] ${className}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClass}>
        {inner}
      </button>
    );
  }
  return <div className={rowClass}>{inner}</div>;
}

export function AchievementCard({
  achievement,
  onClick,
  className = "",
  dense = false,
}: AchievementCardProps) {
  const { isDark } = useTheme();
  const rarity = rarityColors[achievement.rarity];
  const hasTiers = achievement.unlockedTiers !== undefined && achievement.unlockedTiers.length >= 0;
  const earnedTiers = achievement.unlockedTiers || [];

  if (dense) {
    return (
      <AchievementDenseRow
        achievement={achievement}
        onClick={onClick}
        className={className}
      />
    );
  }

  // Fully unlocked or partially unlocked (has at least one tier earned)
  if (achievement.unlocked || earnedTiers.length > 0) {
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

        {/* Mastered shimmer for fully unlocked */}
        {achievement.isMastered && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)",
              backgroundSize: "200% 100%",
              animation: "shine 3s linear infinite",
            }}
          />
        )}

        <div className="relative z-10">
          <div className="flex items-start gap-4 mb-3">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${rarity.gradient.join(", ")})`,
                boxShadow: `0 4px 12px ${rarity.glow}40`,
              }}
            >
              {achievement.icon && !/^[🏆🏅🎖️⭐]/.test(achievement.icon) ? (
                <span className="text-3xl">{achievement.icon}</span>
              ) : (
                <Trophy className="w-7 h-7" style={{ color: rarity.color }} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4
                  className="text-base font-bold"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  {achievement.name}
                </h4>
                {achievement.isMastered ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-gradient-to-r from-violet-500 to-amber-400 text-white">
                    Mastered
                  </span>
                ) : (
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${RARITY_BADGE_CLASS[achievement.rarity]}`}
                  >
                    {achievement.rarity}
                  </span>
                )}
              </div>

              <p
                className="text-sm mb-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                }}
              >
                {achievement.description}
              </p>

              {hasTiers && <TierBadges unlockedTiers={earnedTiers} />}

              {/* Progress bar toward next tier (partially unlocked only) */}
              {!achievement.isMastered && achievement.progress !== undefined && achievement.requirement && (
                <div className="mt-2">
                  <div
                    className="h-2 rounded-full overflow-hidden mb-1"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${achievement.progress}%`,
                        background: `linear-gradient(90deg, ${rarity.gradient.join(", ")})`,
                      }}
                    />
                  </div>
                  <p
                    className="text-xs"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                    }}
                  >
                    {achievement.requirement}
                  </p>
                </div>
              )}

              {achievement.unlockedAt && (
                <p
                  className="text-xs mt-1"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                  }}
                >
                  Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {achievement.rarity === "legendary" && (
            <div className="absolute top-2 right-2 animate-pulse">
              <span className="text-2xl">✨</span>
            </div>
          )}
        </div>
      </GlassCard>
    );
  }

  // In-progress state (no tiers earned yet but metric > 0)
  if (achievement.progress !== undefined && achievement.progress > 0) {
    return (
      <GlassCard
        pressable={false}
        elevation={1}
        className={`p-4 relative opacity-80 ${RARITY_CARD_TINT[achievement.rarity]} ${className}`}
      >
        {achievement.nearMiss && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-400/20 text-amber-600 dark:text-amber-300 border border-amber-400/40 animate-pulse">
              Almost there!
            </span>
          </div>
        )}
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              border: `1px dashed ${rarity.color}40`,
            }}
          >
            {achievement.icon && !/^[🏆🏅🎖️⭐]/.test(achievement.icon) ? (
              <span className="text-3xl opacity-60">{achievement.icon}</span>
            ) : (
              <Trophy className="w-7 h-7 opacity-60" style={{ color: rarity.color }} />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4
                className="text-base font-bold"
                style={{
                  color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.75)",
                }}
              >
                {achievement.name}
              </h4>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${RARITY_BADGE_CLASS[achievement.rarity]} opacity-70`}>
                {achievement.rarity}
              </span>
            </div>

            <p
              className="text-sm mb-2"
              style={{
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
              }}
            >
              {achievement.requirement || "???"}
            </p>

            <div>
              <div
                className="h-2 rounded-full overflow-hidden mb-1"
                style={{
                  background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${achievement.progress}%`,
                    background: `linear-gradient(90deg, ${rarity.gradient.join(", ")})`,
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
          </div>
        </div>
      </GlassCard>
    );
  }

  // Locked state (0 progress)
  return (
    <GlassCard
      pressable={false}
      elevation={1}
      className={`p-4 relative opacity-50 bg-gray-50/30 dark:bg-gray-800/20 ${className}`}
    >
      <div className="flex items-start gap-4">
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
        </div>
      </div>
    </GlassCard>
  );
}

export default AchievementCard;
