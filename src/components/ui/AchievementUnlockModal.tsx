"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "./button";
import { Share2 } from "lucide-react";
import { rarityColors } from "@/lib/colors";
import { fireCelebrationConfettiBurst } from "@/lib/celebrationConfetti";
import type { Achievement } from "./AchievementCard";
import { AchievementIconDisplay } from "./achievementIconDisplay";

const TIER_GRADIENT: Record<string, string[]> = {
  bronze: ["#CD7F32", "#8B4513"],
  silver: ["#C0C0C0", "#808080"],
  gold: ["#FFD700", "#FFA500"],
  platinum: ["#9B59B6", "#6C3483"],
};

export type AchievementLabCelebrationTier = "bronze" | "gold" | "platinum";

/** Same beat as PR celebration: confetti-only, then panel. */
const CONFETTI_LEAD_MS = 1500;

/** canvas-confetti above achievement overlay (z-index 99999). */
const CELEBRATION_CONFETTI_Z_INDEX = 100000;

function milestoneConfettiColors(
  labCelebrationTier: AchievementLabCelebrationTier | undefined,
  rarity: Achievement["rarity"],
): string[] {
  if (labCelebrationTier === "bronze") {
    return ["#CD7F32", "#DAA520", "#8B4513", "#FFD700", "#FFFFFF"];
  }
  if (labCelebrationTier === "gold") {
    return ["#FFD700", "#FFA500", "#FFEC8B", "#F59E0B", "#FFFFFF"];
  }
  if (labCelebrationTier === "platinum") {
    return ["#06b6d4", "#22d3ee", "#a5f3fc", "#ffffff", "#EC4899"];
  }
  switch (rarity) {
    case "legendary":
      return ["#9B59B6", "#E74C3C", "#FFD700", "#FF6B35", "#FFFFFF"];
    case "epic":
      return ["#9B59B6", "#8E44AD", "#FFD700", "#FFFFFF", "#22D3EE"];
    case "rare":
      return ["#FFD700", "#FFA500", "#FFEC8B", "#FFFFFF", "#10B981"];
    case "uncommon":
      return ["#C0C0C0", "#A0A0A0", "#E0E0E0", "#FFFFFF", "#94a3b8"];
    default:
      return ["#CD7F32", "#DAA520", "#8B4513", "#FFD700", "#FFFFFF"];
  }
}

interface AchievementUnlockModalProps {
  achievement: Achievement | null;
  visible: boolean;
  onClose: () => void;
  onShare?: () => void;
  /** Test / lab: override visuals & confetti for simplified tier demos */
  labCelebrationTier?: AchievementLabCelebrationTier;
}

function AchievementUnlockContent({
  achievement,
  visible,
  onClose,
  onShare,
  labCelebrationTier,
}: AchievementUnlockModalProps) {
  const { isDark } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);
  const [entered, setEntered] = useState(false);

  useLayoutEffect(() => {
    if (!visible || !achievement) return;
    const colors = milestoneConfettiColors(
      labCelebrationTier,
      achievement.rarity,
    );
    const timeouts = fireCelebrationConfettiBurst(colors, {
      zIndex: CELEBRATION_CONFETTI_Z_INDEX,
    });
    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [visible, achievement, labCelebrationTier]);

  useEffect(() => {
    if (!visible || !achievement) {
      setEntered(false);
      setIsAnimating(false);
      return;
    }
    setEntered(false);
    setIsAnimating(true);
    const enterTimer = window.setTimeout(() => setEntered(true), CONFETTI_LEAD_MS);
    const animTimer = window.setTimeout(() => setIsAnimating(false), 3000);
    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(animTimer);
    };
  }, [visible, achievement, labCelebrationTier]);

  if (!visible || !achievement) return null;

  const labVisual =
    labCelebrationTier === "bronze"
      ? {
          rarity: {
            color: rarityColors.common.color,
            gradient: [...rarityColors.common.gradient],
            glow: rarityColors.common.glow,
          },
          tierName: "Bronze" as const,
          tierGrad: TIER_GRADIENT.bronze,
        }
      : labCelebrationTier === "gold"
        ? {
            rarity: {
              color: rarityColors.rare.color,
              gradient: [...rarityColors.rare.gradient],
              glow: rarityColors.rare.glow,
            },
            tierName: "Gold" as const,
            tierGrad: TIER_GRADIENT.gold,
          }
        : labCelebrationTier === "platinum"
          ? {
              rarity: {
                color: "#22d3ee",
                gradient: ["#06b6d4", "#a5f3fc", "#ffffff"],
                glow: "#22d3ee",
              },
              tierName: "Platinum" as const,
              tierGrad: ["#06b6d4", "#e0f2fe"] as string[],
            }
          : null;

  const rarity = labVisual?.rarity ?? rarityColors[achievement.rarity];

  const tierName = labVisual
    ? labVisual.tierName
    : (() => {
        const r = achievement.rarity;
        if (r === "legendary") return "Platinum";
        if (r === "epic") return "Gold";
        if (r === "rare") return "Silver";
        if (r === "uncommon") return "Bronze";
        return null;
      })();
  const tierGrad = labVisual
    ? labVisual.tierGrad
    : tierName
      ? TIER_GRADIENT[tierName.toLowerCase()]
      : null;

  const nextTierText = (() => {
    if (!achievement.description) return null;
    const match = achievement.description.match(/Next:\s*(.+?)\s*[—–-]\s*(\d+)\/(\d+)/);
    if (match) {
      const remaining = parseInt(match[3]) - parseInt(match[2]);
      return remaining > 0 ? `Only ${remaining} more to ${match[1]}!` : null;
    }
    return null;
  })();

  return (
    <div
      role="dialog"
      aria-modal={entered}
      aria-busy={!entered}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      onClick={onClose}
    >
      {entered && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            boxShadow: `inset 0 0 120px 40px ${rarity.glow}15`,
          }}
        />
      )}

      {entered && (
        <div
          className="animate-in fade-in zoom-in-95 duration-300"
          style={{
            position: "relative",
            maxWidth: "420px",
            width: "100%",
            padding: "32px 24px",
            textAlign: "center" as const,
            background: "var(--fc-glass-base, #1c2333)",
            border: `2px solid ${rarity.color}`,
            borderRadius: "24px",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: `0 20px 60px ${rarity.glow}60`,
            maxHeight: "90vh",
            overflowY: "auto" as const,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div className="mb-5">
            <div
              className="w-28 h-28 mx-auto rounded-full flex items-center justify-center relative"
              style={{
                background: `linear-gradient(135deg, ${rarity.gradient.join(", ")})`,
                boxShadow: isAnimating
                  ? `0 8px 40px ${rarity.glow}70`
                  : `0 8px 32px ${rarity.glow}50`,
                transition: "box-shadow 0.3s ease",
              }}
            >
              <AchievementIconDisplay
                icon={achievement.icon}
                className="text-5xl leading-none text-white [&_svg]:h-14 [&_svg]:w-14 [&_svg]:shrink-0"
              />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: `4px solid ${rarity.color}`,
                  opacity: 0.4,
                  animation: isAnimating ? "pulse 1.2s ease-in-out infinite" : "none",
                }}
              />
            </div>
          </div>

          <h2
            className="text-2xl font-black mb-1 fc-text-primary tracking-tight"
            style={{ animation: "celebrate 0.8s ease-out" }}
          >
            Achievement Unlocked!
          </h2>

          <h3
            className="text-lg font-bold mb-2"
            style={{ color: rarity.color }}
          >
            {achievement.name}
          </h3>

          <div className="flex items-center justify-center gap-2 mb-3">
            {tierName && tierGrad && (
              <span
                className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide text-white"
                style={{
                  background: `linear-gradient(135deg, ${tierGrad.join(", ")})`,
                  boxShadow: `0 2px 8px ${tierGrad[0]}40`,
                }}
              >
                {tierName}
              </span>
            )}
            {!labCelebrationTier && (
              <span
                className="px-3 py-1 rounded-full text-xs font-bold capitalize text-white"
                style={{
                  background: `linear-gradient(135deg, ${rarity.gradient.join(", ")})`,
                  boxShadow: `0 2px 8px ${rarity.glow}30`,
                }}
              >
                {achievement.rarity}
              </span>
            )}
          </div>

          <p
            className="text-sm mb-2"
            style={{
              color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
            }}
          >
            {achievement.description}
          </p>

          {nextTierText && (
            <p
              className="text-sm font-semibold mb-3"
              style={{ color: rarity.color }}
            >
              {nextTierText}
            </p>
          )}

          <p
            className="text-sm font-semibold mb-5"
            style={{
              color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
            }}
          >
            {labCelebrationTier === "bronze" && "Nice job! Every step counts!"}
            {labCelebrationTier === "gold" && "Rare feat! You are on fire!"}
            {labCelebrationTier === "platinum" && "Incredible! You are unstoppable!"}
            {!labCelebrationTier && achievement.rarity === "legendary" && "Incredible! You are a legend!"}
            {!labCelebrationTier && achievement.rarity === "epic" && "Epic achievement! Keep crushing it!"}
            {!labCelebrationTier && achievement.rarity === "rare" && "Rare feat! You are on fire!"}
            {!labCelebrationTier && achievement.rarity === "uncommon" && "Great work! Keep it up!"}
            {!labCelebrationTier && achievement.rarity === "common" && "Nice job! Every step counts!"}
          </p>

          <div className="flex gap-3">
            {onShare && (
              <Button
                variant="outline"
                size="lg"
                onClick={onShare}
                className="flex-1"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            )}
            <Button
              variant="energy"
              size="lg"
              onClick={onClose}
              className="flex-1 font-bold"
            >
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AchievementUnlockModal(props: AchievementUnlockModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !props.visible || !props.achievement) return null;
  return createPortal(<AchievementUnlockContent {...props} />, document.body);
}

export default AchievementUnlockModal;
