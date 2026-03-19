"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "./button";
import { Share2 } from "lucide-react";
import { rarityColors } from "@/lib/colors";
import confetti from "canvas-confetti";
import type { Achievement } from "./AchievementCard";

const TIER_GRADIENT: Record<string, string[]> = {
  bronze: ["#CD7F32", "#8B4513"],
  silver: ["#C0C0C0", "#808080"],
  gold: ["#FFD700", "#FFA500"],
  platinum: ["#9B59B6", "#6C3483"],
};

interface AchievementUnlockModalProps {
  achievement: Achievement | null;
  visible: boolean;
  onClose: () => void;
  onShare?: () => void;
}

function AchievementUnlockContent({
  achievement,
  visible,
  onClose,
  onShare,
}: AchievementUnlockModalProps) {
  const { isDark } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);
  const [entered, setEntered] = useState(false);
  const confettiFired = useRef(false);

  const fireConfetti = useCallback(
    (rarity: string) => {
      if (confettiFired.current) return;
      confettiFired.current = true;

      const rarityConfetti: Record<string, () => void> = {
        legendary: () => {
          const colors = ["#9B59B6", "#E74C3C", "#FFD700", "#FF6B35"];
          confetti({ particleCount: 120, spread: 120, origin: { y: 0.55 }, colors, ticks: 150, gravity: 0.8, scalar: 1.2 });
          setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors, ticks: 120 }), 200);
          setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors, ticks: 120 }), 400);
        },
        epic: () => {
          confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 }, colors: ["#9B59B6", "#8E44AD", "#FFD700"], ticks: 120, gravity: 0.9 });
        },
        rare: () => {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, colors: ["#FFD700", "#FFA500", "#FFEC8B"], ticks: 100 });
        },
        uncommon: () => {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 }, colors: ["#C0C0C0", "#A0A0A0", "#E0E0E0"], ticks: 80 });
        },
        common: () => {
          confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 }, colors: ["#CD7F32", "#DAA520"], ticks: 60 });
        },
      };
      (rarityConfetti[rarity] || rarityConfetti.common)();
    },
    []
  );

  useEffect(() => {
    if (visible && achievement) {
      setIsAnimating(true);
      confettiFired.current = false;
      setEntered(false);
      fireConfetti(achievement.rarity);
      const enterTimer = setTimeout(() => setEntered(true), 500);
      const animTimer = setTimeout(() => setIsAnimating(false), 3000);
      return () => { clearTimeout(enterTimer); clearTimeout(animTimer); };
    } else {
      setEntered(false);
      confettiFired.current = false;
    }
  }, [visible, achievement, fireConfetti]);

  if (!visible || !achievement) return null;

  const rarity = rarityColors[achievement.rarity];

  const tierName = (() => {
    const r = achievement.rarity;
    if (r === "legendary") return "Platinum";
    if (r === "epic") return "Gold";
    if (r === "rare") return "Silver";
    if (r === "uncommon") return "Bronze";
    return null;
  })();
  const tierGrad = tierName ? TIER_GRADIENT[tierName.toLowerCase()] : null;

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
      {/* Edge glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          boxShadow: `inset 0 0 120px 40px ${rarity.glow}15`,
        }}
      />

      <div
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
          transform: entered ? "translateY(0) scale(1)" : "translateY(60px) scale(0.9)",
          opacity: entered ? 1 : 0,
          transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out",
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
            <span className="text-5xl">{achievement.icon}</span>
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
          style={{ animation: entered ? "celebrate 0.8s ease-out" : "none" }}
        >
          Achievement Unlocked!
        </h2>

        <h3
          className="text-lg font-bold mb-2"
          style={{ color: rarity.color }}
        >
          {achievement.name}
        </h3>

        {/* Tier badge + Rarity badge */}
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
          <span
            className="px-3 py-1 rounded-full text-xs font-bold capitalize text-white"
            style={{
              background: `linear-gradient(135deg, ${rarity.gradient.join(", ")})`,
              boxShadow: `0 2px 8px ${rarity.glow}30`,
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
          {achievement.rarity === "legendary" && "Incredible! You are a legend!"}
          {achievement.rarity === "epic" && "Epic achievement! Keep crushing it!"}
          {achievement.rarity === "rare" && "Rare feat! You are on fire!"}
          {achievement.rarity === "uncommon" && "Great work! Keep it up!"}
          {achievement.rarity === "common" && "Nice job! Every step counts!"}
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
