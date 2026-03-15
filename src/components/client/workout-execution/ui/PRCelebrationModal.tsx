"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

export interface PRDetectedPayload {
  type: "weight" | "reps";
  exercise_name: string;
  new_value: number;
  previous_value: number | null;
  unit: string;
}

interface PRCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  pr: PRDetectedPayload | null;
}

export function PRCelebrationModal({
  visible,
  onClose,
  pr,
}: PRCelebrationModalProps) {
  const { isDark } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible && pr) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, pr]);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!visible || !pr) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [visible, pr, onClose]);

  if (!visible || !pr) return null;

  const improvement =
    pr.previous_value != null && pr.previous_value > 0
      ? pr.new_value - pr.previous_value
      : null;

  const improvementText =
    improvement != null
      ? pr.type === "weight"
        ? `+${improvement} ${pr.unit}`
        : `+${improvement} reps`
      : null;

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
        className="fc-modal relative max-w-md w-full rounded-3xl p-8 text-center fc-glass fc-card"
        style={{
          boxShadow: "0 20px 60px rgba(255, 215, 0, 0.4)",
          border: "2px solid #FFD700",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Trophy icon */}
        <div className="mb-6">
          <div
            className="w-32 h-32 mx-auto rounded-full flex items-center justify-center relative"
            style={{
              background: "linear-gradient(135deg, #FFD700, #FFA500)",
              boxShadow: "0 8px 32px rgba(255, 215, 0, 0.5)",
              animation: isAnimating ? "celebrate 1s ease-out" : "none",
            }}
          >
            <Trophy className="w-16 h-16 text-white" />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "4px solid #FFD700",
                opacity: 0.3,
                animation: isAnimating ? "pulse 1s ease-out infinite" : "none",
              }}
            />
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-3xl font-bold mb-2 fc-text-primary"
          style={{ animation: isAnimating ? "celebrate 0.8s ease-out" : "none" }}
        >
          NEW PERSONAL RECORD!
        </h2>

        {/* Exercise name */}
        <h3 className="text-xl font-bold mb-3" style={{ color: "#FFD700" }}>
          {pr.exercise_name}
        </h3>

        {/* Values */}
        <div className="space-y-1 mb-2">
          <p className="text-2xl font-bold fc-text-primary">
            {pr.new_value} {pr.type === "weight" ? pr.unit : "reps"}
          </p>
          {pr.previous_value != null && (
            <p
              className="text-sm"
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              Previous best: {pr.previous_value}{" "}
              {pr.type === "weight" ? pr.unit : "reps"}
            </p>
          )}
          {improvementText && (
            <p className="text-lg font-semibold" style={{ color: "#7CB342" }}>
              {improvementText}
            </p>
          )}
        </div>

        {/* Action button */}
        <p
          className="text-sm mb-6"
          style={{
            color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
          }}
        >
          Auto-closes in 4 seconds
        </p>
        <Button
          variant="energy"
          size="lg"
          onClick={onClose}
          className="w-full"
        >
          Nice! Continue
        </Button>
      </div>
    </div>
  );
}

export default PRCelebrationModal;
