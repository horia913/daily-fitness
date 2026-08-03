"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Zap } from "lucide-react";
import {
  fireCelebrationConfettiBurst,
  PR_CELEBRATION_CONFETTI_COLORS,
} from "@/lib/celebrationConfetti";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PrDetectedPayload } from "@/lib/prService";

interface PRCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  pr: PrDetectedPayload | null;
  /** Retained for API compatibility; not used for visuals. */
  bodyWeightKg?: number | null;
}

const CARD_BOX_SHADOW = "0 0 40px rgba(245,158,11,0.2)";

const MOTIVATIONAL_LINES = [
  "Stronger than yesterday",
  "New heights",
  "Progress is power",
  "The grind pays off",
  "Built different",
];

const AMBIENT_STYLE: React.CSSProperties = {
  opacity: 0.88,
  background:
    "radial-gradient(ellipse 90% 55% at 50% 18%, rgba(250,204,21,0.26) 0%, transparent 52%), radial-gradient(ellipse 70% 50% at 80% 70%, rgba(245,158,11,0.1) 0%, transparent 48%)",
};

/** Confetti-only beat before the card mounts (ms). */
const CONFETTI_LEAD_MS = 1500;

function formatPct(p: number | null | undefined): string | null {
  if (p == null || !Number.isFinite(p)) return null;
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
}

function trimNum(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  if (Number.isInteger(r)) return String(r);
  return r.toFixed(2).replace(/\.?0+$/, "");
}

function formatVolumePreviousBest(se: NonNullable<PrDetectedPayload["strength_endurance"]>): string {
  const prevVol = se.previous_volume;
  const pw = se.previous_weight;
  const pr = se.previous_reps;
  if (prevVol <= 0) return "—";
  if (
    pw != null &&
    pr != null &&
    Number.isFinite(pw) &&
    Number.isFinite(pr) &&
    pw > 0 &&
    pr > 0
  ) {
    return `${trimNum(pw)} kg × ${pr} (${trimNum(prevVol)} vol)`;
  }
  return `${trimNum(prevVol)} vol`;
}

function PRCelebrationContent({
  visible,
  onClose,
  pr,
}: PRCelebrationModalProps) {
  const [cardRevealed, setCardRevealed] = useState(false);
  const [entranceKey, setEntranceKey] = useState(0);
  const [motivationalLine, setMotivationalLine] = useState(MOTIVATIONAL_LINES[0]);

  useLayoutEffect(() => {
    if (!visible || !pr) return;
    const timeouts = fireCelebrationConfettiBurst(PR_CELEBRATION_CONFETTI_COLORS);
    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [visible, pr]);

  useEffect(() => {
    if (!visible || !pr) {
      setCardRevealed(false);
      return;
    }
    setCardRevealed(false);
    const t = window.setTimeout(() => {
      setCardRevealed(true);
      setEntranceKey((k) => k + 1);
      setMotivationalLine(
        MOTIVATIONAL_LINES[
          Math.floor(Math.random() * MOTIVATIONAL_LINES.length)
        ] ?? MOTIVATIONAL_LINES[0],
      );
    }, CONFETTI_LEAD_MS);
    return () => window.clearTimeout(t);
  }, [visible, pr]);

  if (!visible || !pr) return null;

  const ms = pr.max_strength;
  const se = pr.strength_endurance;
  const showMaxStrength = !!ms;
  const showVolume = !!se;
  const isDual = showMaxStrength && showVolume;

  const title = isDual
    ? "New Max Strength & Volume PRs"
    : showMaxStrength
      ? "New Max Strength PR"
      : showVolume
        ? "New Volume PR"
        : "New PR";

  const headlineEmoji = isDual ? "🏆🔥" : showMaxStrength ? "🏆" : showVolume ? "🔥" : "🏆";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal={cardRevealed}
      aria-busy={!cardRevealed}
      aria-labelledby={cardRevealed ? "pr-celebration-title" : undefined}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />

      <div
        className="absolute inset-0 pointer-events-none z-0"
        aria-hidden
        style={AMBIENT_STYLE}
      />

      {cardRevealed && (
      <div
        className="relative z-[2] w-full pointer-events-none flex flex-col items-center justify-center min-h-0 animate-in fade-in zoom-in-95 duration-300"
        style={{ maxWidth: 440 }}
      >
        <div className="pointer-events-auto w-full rounded-2xl p-[2px] pr-celebration-gradient-border">
          <div
            key={entranceKey}
            className="relative w-full rounded-[14px] overflow-hidden max-h-[90vh] pr-celebration-card-shake"
            style={{
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
              boxShadow: CARD_BOX_SHADOW,
            }}
          >
            <div
              className="absolute inset-0 bg-gradient-to-b from-gray-900/95 to-black/95"
              aria-hidden
            />
            <div
              className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_100%_55%_at_50%_0%,rgba(245,158,11,0.1)_0%,transparent_65%)]"
              aria-hidden
            />
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden rounded-[14px]"
              aria-hidden
            >
              <div className="absolute left-1/2 top-0 h-[52%] w-[180%] -translate-x-1/2 pr-celebration-shimmer-sweep bg-gradient-to-r from-transparent via-amber-400/22 to-transparent" />
            </div>

            <Sparkles
              className="absolute top-2.5 right-2.5 w-4 h-4 text-amber-300/85 pointer-events-none z-[2]"
              aria-hidden
            />
            <Zap
              className="absolute top-3 left-2.5 w-3.5 h-3.5 text-amber-200/75 pointer-events-none z-[2]"
              aria-hidden
            />

            <div className="relative z-[3] p-4 text-center overflow-y-auto max-h-[90vh]">
              <h2
                id="pr-celebration-title"
                className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 mb-2 tracking-tight"
                style={{
                  filter: "drop-shadow(0 0 12px rgba(250,204,21,0.35))",
                }}
              >
                {headlineEmoji} {title}
              </h2>

              <div className="flex justify-center mb-3">
                <div
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 ring-2 ring-amber-300/30 flex items-center justify-center text-3xl leading-none select-none"
                  style={{
                    boxShadow: "0 0 30px rgba(245,158,11,0.25)",
                  }}
                  aria-hidden
                >
                  {isDual ? "🏆" : showVolume && !showMaxStrength ? "🔥" : "🏆"}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-3 px-0.5 leading-tight">
                {pr.exercise_name}
              </h3>

              {showMaxStrength && ms && (
                <div className={cn("mb-3", isDual && "rounded-xl border border-amber-500/20 bg-white/5 px-3 py-3")}>
                  {isDual ? (
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90 mb-1.5">
                      Max strength
                    </p>
                  ) : null}
                  <p className="text-4xl font-bold text-white tabular-nums mb-2">
                    {ms.weight} kg
                  </p>
                  {formatPct(ms.improvement_pct) && ms.previous > 0 ? (
                    <p className="text-sm text-gray-400">
                      Previous: {ms.previous} kg · {formatPct(ms.improvement_pct)}
                    </p>
                  ) : ms.previous <= 0 ? (
                    <div className="flex justify-center mt-2">
                      <Badge
                        variant="outline"
                        className="inline-flex rounded-full border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400"
                      >
                        First max-strength PR on this lift
                      </Badge>
                    </div>
                  ) : null}
                </div>
              )}

              {showVolume && se && (
                <div className={cn("mb-3", isDual && "rounded-xl border border-amber-500/20 bg-white/5 px-3 py-3")}>
                  {isDual ? (
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90 mb-1.5">
                      Volume
                    </p>
                  ) : null}
                  <p className="text-4xl font-bold text-white tabular-nums mb-2">
                    {se.weight} kg × {se.reps}
                  </p>
                  <p className="text-sm text-gray-400">
                    Previous best: {formatVolumePreviousBest(se)}
                  </p>
                  {formatPct(se.improvement_pct) && se.previous_volume > 0 ? (
                    <div className="flex justify-center mt-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "inline-flex rounded-full border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400",
                        )}
                      >
                        {formatPct(se.improvement_pct)}
                      </Badge>
                    </div>
                  ) : se.previous_volume <= 0 ? (
                    <div className="flex justify-center mt-2">
                      <Badge
                        variant="outline"
                        className="inline-flex rounded-full border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400"
                      >
                        First volume PR on this lift
                      </Badge>
                    </div>
                  ) : null}
                </div>
              )}

              <p className="text-sm text-gray-400 italic mb-5 px-1">
                {motivationalLine}
              </p>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-base shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/40 transition-all active:scale-[0.98] active:brightness-95"
              >
                KEEP GOING 💪
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
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
