"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { GlassCard } from "./GlassCard";
import { AnimatedNumber } from "./AnimatedNumber";
import { Button } from "./button";
import {
  Trophy,
  Clock,
  Flame,
  Dumbbell,
  TrendingUp,
  Share2,
  X,
  Award,
} from "lucide-react";

interface WorkoutStats {
  duration: number; // in minutes
  calories: number;
  exercises: number;
  personalRecords?: Array<{
    exercise: string;
    achievement: string;
  }>;
}

interface WorkoutCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: WorkoutStats;
  workoutName?: string;
  onShare?: () => void;
  onContinue?: () => void;
}

export function WorkoutCompletionModal({
  isOpen,
  onClose,
  stats,
  workoutName = "Workout",
  onShare,
  onContinue,
}: WorkoutCompletionModalProps) {
  const { theme, getSemanticColor } = useTheme();
  const isDark = theme === "dark";
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Stop confetti after 3 seconds
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const motivationalMessages = [
    "Outstanding effort! You crushed it today! 💪",
    "Another step closer to your goals! Keep it up! 🔥",
    "You showed up and you conquered! That's what winners do! 🏆",
    "Your dedication is paying off! Great work! ⚡",
  ];

  const randomMessage =
    motivationalMessages[
      Math.floor(Math.random() * motivationalMessages.length)
    ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: "-10%",
                animation: `confettiFall ${
                  2 + Math.random() * 2
                }s linear forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: [
                    getSemanticColor("energy").primary,
                    getSemanticColor("trust").primary,
                    getSemanticColor("success").primary,
                    getSemanticColor("warning").primary,
                  ][Math.floor(Math.random() * 4)],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <GlassCard
        elevation={4}
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-8">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            style={{
              color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
            }}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Trophy Animation */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
              style={{
                background: getSemanticColor("warning").gradient,
                boxShadow: `0 8px 32px ${
                  getSemanticColor("warning").primary
                }40`,
                animation: "celebrate 0.6s ease-out",
              }}
            >
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h2
              className="text-4xl font-bold mb-2 text-center"
              style={{ color: isDark ? "#fff" : "#1A1A1A" }}
            >
              Workout Complete!
            </h2>
            <p
              className="text-lg text-center"
              style={{
                color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
              }}
            >
              {workoutName}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {/* Duration */}
            <div
              className="p-4 rounded-lg text-center"
              style={{
                background: isDark
                  ? "rgba(74,144,226,0.15)"
                  : "rgba(74,144,226,0.1)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{
                  background: getSemanticColor("trust").gradient,
                }}
              >
                <Clock className="w-6 h-6 text-white" />
              </div>
              <AnimatedNumber
                value={stats.duration}
                size="2xl"
                weight="bold"
                color={getSemanticColor("trust").primary}
                suffix=" min"
              />
              <p
                className="text-sm font-medium mt-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                Duration
              </p>
            </div>

            {/* Calories */}
            <div
              className="p-4 rounded-lg text-center"
              style={{
                background: isDark
                  ? "rgba(255,107,53,0.15)"
                  : "rgba(255,107,53,0.1)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{
                  background: getSemanticColor("energy").gradient,
                }}
              >
                <Flame className="w-6 h-6 text-white" />
              </div>
              <AnimatedNumber
                value={stats.calories}
                size="2xl"
                weight="bold"
                color={getSemanticColor("energy").primary}
              />
              <p
                className="text-sm font-medium mt-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                Calories
              </p>
            </div>

            {/* Exercises */}
            <div
              className="p-4 rounded-lg text-center col-span-2 md:col-span-1"
              style={{
                background: isDark
                  ? "rgba(124,179,66,0.15)"
                  : "rgba(124,179,66,0.1)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{
                  background: getSemanticColor("success").gradient,
                }}
              >
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <AnimatedNumber
                value={stats.exercises}
                size="2xl"
                weight="bold"
                color={getSemanticColor("success").primary}
              />
              <p
                className="text-sm font-medium mt-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                Exercises
              </p>
            </div>
          </div>

          {/* Personal Records */}
          {stats.personalRecords && stats.personalRecords.length > 0 && (
            <div
              className="mb-8 p-4 rounded-lg"
              style={{
                background: isDark
                  ? "rgba(255,167,38,0.15)"
                  : "rgba(255,167,38,0.1)",
                border: `2px solid ${getSemanticColor("warning").primary}30`,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Award
                  className="w-5 h-5"
                  style={{ color: getSemanticColor("warning").primary }}
                />
                <h3
                  className="font-bold text-lg"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  New Personal Records! 🎉
                </h3>
              </div>
              <div className="space-y-2">
                {stats.personalRecords.map((pr, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <span
                      className="font-medium"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(0,0,0,0.9)",
                      }}
                    >
                      {pr.exercise}
                    </span>
                    <span
                      className="text-sm"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(0,0,0,0.7)",
                      }}
                    >
                      {pr.achievement}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Motivational Message */}
          <div
            className="mb-8 p-4 rounded-lg flex items-start gap-3"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.03)",
            }}
          >
            <TrendingUp
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: getSemanticColor("success").primary }}
            />
            <p
              className="text-sm"
              style={{
                color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)",
              }}
            >
              {randomMessage}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {onShare && (
              <Button
                variant="outline"
                size="lg"
                className="flex-1 flex items-center justify-center gap-2"
                onClick={onShare}
              >
                <Share2 className="w-5 h-5" />
                Share
              </Button>
            )}
            <Button
              variant="default"
              size="lg"
              className="flex-1"
              style={{
                background: getSemanticColor("success").gradient,
                boxShadow: `0 4px 12px ${
                  getSemanticColor("success").primary
                }40`,
              }}
              onClick={onContinue || onClose}
            >
              Continue
            </Button>
          </div>
        </div>
      </GlassCard>

      <style jsx global>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes celebrate {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) rotate(180deg);
          }
          100% {
            transform: scale(1) rotate(360deg);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
