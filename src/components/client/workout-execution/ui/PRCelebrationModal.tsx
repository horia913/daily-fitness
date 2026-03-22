"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { getPRTier, PR_TIERS, type PRTier } from "@/lib/prTiers";

export interface PRDetectedPayload {
  type: "weight" | "reps";
  exercise_name: string;
  new_value: number;
  previous_value: number | null;
  unit: string;
  /** Logged set weight (kg); included by log-set API for celebration UI */
  weight_kg?: number;
  /** Logged set reps; included by log-set API for celebration UI */
  reps?: number;
}

interface PRCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  pr: PRDetectedPayload | null;
  bodyWeightKg?: number | null;
}

const TIER_SHORT: Record<string, string> = {
  Iron: "Iron",
  Bronze: "Brnz",
  Silver: "Slvr",
  Gold: "Gold",
  Platinum: "Plat",
  Diamond: "Diam",
  Champion: "Chmp",
  Titan: "Titn",
  Olympian: "Olym",
};

const CONFETTI_COLORS = ["#06b6d4", "#f59e0b", "#FFD700", "#ffffff", "#22d3ee", "#a855f7"];

function useConfettiPieces(visible: boolean, key: string) {
  const [pieces, setPieces] = useState<
    { id: string; left: string; delay: string; color: string; duration: string }[]
  >([]);

  useEffect(() => {
    if (!visible) {
      setPieces([]);
      return;
    }
    const count = 36;
    const next: typeof pieces = [];
    for (let i = 0; i < count; i++) {
      const seed = key.length + i * 17;
      const pseudo = ((seed * 9301 + 49297) % 233280) / 233280;
      const left = `${(pseudo * 100).toFixed(2)}%`;
      const delay = `${(pseudo * 2).toFixed(2)}s`;
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const duration = `${2.5 + (i % 5) * 0.15}s`;
      next.push({
        id: `${key}-${i}`,
        left,
        delay,
        color,
        duration,
      });
    }
    setPieces(next);
  }, [visible, key]);

  return pieces;
}

function PRCelebrationContent({
  visible,
  onClose,
  pr,
  bodyWeightKg = null,
}: PRCelebrationModalProps) {
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weightKg =
    pr?.weight_kg ??
    (pr?.type === "weight" ? pr.new_value : null);
  const repsVal =
    pr?.reps ?? (pr?.type === "reps" ? pr.new_value : null);

  const tier: PRTier = useMemo(() => {
    const w = weightKg != null && weightKg > 0 ? weightKg : pr?.new_value ?? 0;
    return getPRTier(w, bodyWeightKg ?? null);
  }, [weightKg, bodyWeightKg, pr?.new_value]);

  const confettiKey = pr
    ? `${pr.exercise_name}-${pr.new_value}-${pr.type}`
    : "none";
  const confettiPieces = useConfettiPieces(visible && !!pr, confettiKey);

  const clearDismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const handleDismiss = useCallback(() => {
    clearDismiss();
    onClose();
  }, [clearDismiss, onClose]);

  useEffect(() => {
    if (!visible || !pr) {
      clearDismiss();
      return;
    }
    clearDismiss();
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      onClose();
    }, 8000);
    return clearDismiss;
  }, [visible, pr, onClose, clearDismiss]);

  if (!visible || !pr) return null;

  const improvement =
    pr.previous_value != null && pr.previous_value > 0
      ? pr.new_value - pr.previous_value
      : null;

  const improvementText =
    improvement != null && improvement > 0
      ? pr.type === "weight"
        ? `+${improvement.toFixed(1)} ${pr.unit} improvement from previous PR`
        : `+${improvement} reps improvement from previous PR`
      : null;

  const currentIndex = PR_TIERS.findIndex((t) => t.name === tier.name);

  const weightLabel =
    weightKg != null && weightKg >= 0
      ? `${Number(weightKg).toFixed(Number(weightKg) % 1 === 0 ? 0 : 1)} kg`
      : "—";
  const repsLabel = repsVal != null ? String(repsVal) : "—";

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center px-3 py-6 bg-black/80 backdrop-blur-md"
      style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pr-celebration-title"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {confettiPieces.map((p) => (
          <div
            key={p.id}
            className="pr-confetti-piece"
            style={{
              left: p.left,
              top: "-12px",
              backgroundColor: p.color,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      <div
        className="relative w-full max-w-[min(100%,380px)] max-h-[min(92vh,640px)] overflow-y-auto rounded-2xl border border-white/10 bg-[color:var(--fc-glass-base,#1c2333)] px-4 py-6 text-center shadow-[0_0_24px_rgba(6,182,212,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          id="pr-celebration-title"
          className="text-xs font-bold uppercase tracking-[0.25em] mb-2"
          style={{ color: tier.color }}
        >
          {tier.name}
        </p>

        <div className="text-[80px] leading-none mb-2 select-none" aria-hidden>
          {tier.icon}
        </div>

        <h2 className="text-xl sm:text-2xl font-black fc-text-primary mb-4 px-1">
          {pr.exercise_name}
        </h2>

        <div className="flex items-stretch justify-center gap-3 mb-4">
          <div className="flex-1 min-w-0 rounded-xl border border-cyan-500/40 bg-cyan-500/5 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wider fc-text-dim mb-1">Weight</p>
            <p className="text-lg sm:text-xl font-black font-mono text-cyan-400 tabular-nums">
              {weightLabel}
            </p>
          </div>
          <span className="self-center text-2xl font-light text-white/30">×</span>
          <div className="flex-1 min-w-0 rounded-xl border border-cyan-500/40 bg-cyan-500/5 px-3 py-3">
            <p className="text-[10px] uppercase tracking-wider fc-text-dim mb-1">Reps</p>
            <p className="text-lg sm:text-xl font-black font-mono text-cyan-400 tabular-nums">
              {repsLabel}
            </p>
          </div>
        </div>

        {improvementText && (
          <p className="text-sm font-semibold text-amber-400 mb-5 px-1">{improvementText}</p>
        )}

        <div className="mb-5 overflow-x-auto pb-1 -mx-1 px-1">
          <div className="flex gap-1 min-w-min justify-center">
            {PR_TIERS.map((t, i) => {
              const active = i === currentIndex;
              return (
                <div
                  key={t.name}
                  className={`flex flex-col items-center shrink-0 w-8 sm:w-9 ${active ? "scale-105" : "opacity-45"}`}
                >
                  <span className="text-sm sm:text-base leading-none mb-0.5">{t.icon}</span>
                  <span
                    className={`text-[7px] sm:text-[8px] font-bold uppercase leading-tight text-center ${
                      active ? "text-cyan-400" : "fc-text-dim"
                    }`}
                  >
                    {TIER_SHORT[t.name] ?? t.name.slice(0, 4)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] fc-text-dim mt-2">▲ You are here</p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow text-base"
        >
          SMASHED IT! 💪
        </button>
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
