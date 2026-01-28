"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "./button";
import { X, Share2 } from "lucide-react";
import { rarityColors } from "@/lib/colors";
import type { Achievement } from "./AchievementCard";

interface AchievementUnlockModalProps {
  achievement: Achievement | null;
  visible: boolean;
  onClose: () => void;
  onShare?: () => void;
}

export function AchievementUnlockModal({
  achievement,
  visible,
  onClose,
  onShare,
}: AchievementUnlockModalProps) {
  const { isDark } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible && achievement) {
      setIsAnimating(true);
      // Reset animation after it completes
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, achievement]);

  if (!visible || !achievement) return null;

  const rarity = rarityColors[achievement.rarity];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(10px)",
      }}
      onClick={onClose}
    >
      {/* Confetti particles */}
      {isAnimating && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: "-10%",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: [
                  "#FFD700",
                  "#FF6B35",
                  "#4A90E2",
                  "#7CB342",
                  "#9B59B6",
                ][Math.floor(Math.random() * 5)],
                animation: `celebrate ${1 + Math.random()}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Modal content */}
      <div
        className="relative max-w-md w-full rounded-3xl p-8 text-center fc-glass fc-card"
        style={{
          background: isDark
            ? "rgba(28, 28, 30, 0.95)"
            : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          boxShadow: `0 20px 60px ${rarity.glow}60`,
          border: `2px solid ${rarity.color}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{
            background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
          }}
        >
          <X className="w-4 h-4" style={{ color: isDark ? "#fff" : "#000" }} />
        </button>

        {/* Trophy animation */}
        <div className="mb-6">
          <div
            className="w-32 h-32 mx-auto rounded-full flex items-center justify-center relative"
            style={{
              background: `linear-gradient(135deg, ${rarity.gradient.join(
                ", "
              )})`,
              boxShadow: `0 8px 32px ${rarity.glow}60`,
              animation: isAnimating ? "celebrate 1s ease-out" : "none",
            }}
          >
            <span className="text-6xl">{achievement.icon}</span>

            {/* Glow ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: `4px solid ${rarity.color}`,
                opacity: 0.3,
                animation: isAnimating ? "pulse 1s ease-out infinite" : "none",
              }}
            />
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-3xl font-bold mb-2"
          style={{
            color: isDark ? "#fff" : "#1A1A1A",
            animation: isAnimating ? "celebrate 0.8s ease-out" : "none",
          }}
        >
          Achievement Unlocked!
        </h2>

        {/* Achievement name */}
        <h3
          className="text-xl font-bold mb-3"
          style={{
            color: rarity.color,
          }}
        >
          {achievement.name}
        </h3>

        {/* Rarity badge */}
        <div className="inline-block mb-4">
          <span
            className="px-4 py-1.5 rounded-full text-sm font-bold capitalize"
            style={{
              background: `linear-gradient(135deg, ${rarity.gradient.join(
                ", "
              )})`,
              color: "#fff",
              boxShadow: `0 4px 12px ${rarity.glow}40`,
            }}
          >
            {achievement.rarity}
          </span>
        </div>

        {/* Description */}
        <p
          className="text-base mb-6"
          style={{
            color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
          }}
        >
          {achievement.description}
        </p>

        {/* Motivational message based on rarity */}
        <p
          className="text-sm font-semibold mb-8"
          style={{
            color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
          }}
        >
          {achievement.rarity === "legendary" &&
            "🎉 Incredible! You're a legend!"}
          {achievement.rarity === "epic" &&
            "⚡ Epic achievement! Keep crushing it!"}
          {achievement.rarity === "rare" && "🌟 Rare feat! You're on fire!"}
          {achievement.rarity === "uncommon" && "💪 Great work! Keep it up!"}
          {achievement.rarity === "common" && "✨ Nice job! Every step counts!"}
        </p>

        {/* Action buttons */}
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
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AchievementUnlockModal;
