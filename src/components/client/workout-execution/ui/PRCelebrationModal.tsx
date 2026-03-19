"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import confetti from "canvas-confetti";

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

function PRCelebrationContent({ visible, onClose, pr }: PRCelebrationModalProps) {
  const { isDark } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);
  const [entered, setEntered] = useState(false);
  const confettiFired = useRef(false);

  const fireConfetti = useCallback(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;
    const gold = ["#FFD700", "#FFA500", "#FFEC8B"];
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: gold,
      ticks: 120,
      gravity: 0.9,
      scalar: 1.1,
    });
    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 100,
        origin: { y: 0.5, x: 0.3 },
        colors: gold,
        ticks: 100,
      });
      confetti({
        particleCount: 40,
        spread: 100,
        origin: { y: 0.5, x: 0.7 },
        colors: gold,
        ticks: 100,
      });
    }, 300);
  }, []);

  useEffect(() => {
    if (visible && pr) {
      setIsAnimating(true);
      confettiFired.current = false;
      setEntered(false);
      fireConfetti();
      const enterTimer = setTimeout(() => setEntered(true), 500);
      const animTimer = setTimeout(() => setIsAnimating(false), 3000);
      return () => { clearTimeout(enterTimer); clearTimeout(animTimer); };
    } else {
      setEntered(false);
      confettiFired.current = false;
    }
  }, [visible, pr, fireConfetti]);


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

  const improvementPct =
    improvement != null && pr.previous_value && pr.previous_value > 0
      ? Math.round((improvement / pr.previous_value) * 100)
      : null;

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
          boxShadow: "inset 0 0 120px 40px rgba(255, 215, 0, 0.12)",
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
          border: "2px solid #FFD700",
          borderRadius: "24px",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 20px 60px rgba(255, 215, 0, 0.4)",
          transform: entered ? "translateY(0) scale(1)" : "translateY(40px) scale(0.95)",
          opacity: entered ? 1 : 0,
          transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out",
          maxHeight: "90vh",
          overflowY: "auto" as const,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Trophy icon with pulsing badge */}
        <div className="mb-5 relative">
          <div
            className="w-28 h-28 mx-auto rounded-full flex items-center justify-center relative"
            style={{
              background: "linear-gradient(135deg, #FFD700, #FFA500)",
              boxShadow: isAnimating
                ? "0 8px 40px rgba(255, 215, 0, 0.6)"
                : "0 8px 32px rgba(255, 215, 0, 0.4)",
              transition: "box-shadow 0.3s ease",
            }}
          >
            <Trophy className="w-14 h-14 text-white" />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "4px solid #FFD700",
                opacity: 0.4,
                animation: isAnimating ? "pulse 1.2s ease-in-out infinite" : "none",
              }}
            />
          </div>
          {/* Pulsing NEW RECORD badge */}
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2"
            style={{
              animation: isAnimating ? "pulse-fire 1.5s ease-in-out infinite" : "none",
            }}
          >
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg">
              NEW RECORD
            </span>
          </div>
        </div>

        <h2
          className="text-2xl font-black mb-1 fc-text-primary tracking-tight"
          style={{
            animation: entered ? "celebrate 0.8s ease-out" : "none",
          }}
        >
          PERSONAL RECORD!
        </h2>

        <h3 className="text-lg font-bold mb-3" style={{ color: "#FFD700" }}>
          {pr.exercise_name}
        </h3>

        <div className="space-y-1 mb-3">
          <p className="text-2xl font-black fc-text-primary tabular-nums">
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
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold" style={{ color: "#7CB342" }}>
                {improvementText}
              </span>
              {improvementPct !== null && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: "rgba(124, 179, 66, 0.15)",
                    color: "#7CB342",
                  }}
                >
                  +{improvementPct}%
                </span>
              )}
            </div>
          )}
        </div>

        <Button
          variant="energy"
          size="lg"
          onClick={onClose}
          className="w-full font-bold"
        >
          Nice! Continue
        </Button>
      </div>
    </div>
  );
}

export function PRCelebrationModal(props: PRCelebrationModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !props.visible || !props.pr) return null;
  return createPortal(<PRCelebrationContent {...props} />, document.body);
}

export default PRCelebrationModal;
