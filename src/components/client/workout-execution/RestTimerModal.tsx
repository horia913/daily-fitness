"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { SkipForward, Plus, Trophy, Layers } from "lucide-react";
import { preventBackgroundScroll, restoreBackgroundScroll } from "@/lib/mobile-compatibility";
import { ModalPortal } from "@/components/ui/ModalPortal";

export interface RestTimerLastSet {
  weight: number;
  reps: number;
  setNumber: number;
  totalSets: number;
  isPr?: boolean;
}

export interface RestTimerNextSetPreview {
  setNumber: number;
  totalSets: number;
  targetWeight: number | null;
  targetReps: string | null;
}

interface RestTimerModalProps {
  isOpen: boolean;
  restSeconds: number;
  onComplete: () => void;
  onSkip: () => void;
  nextLabel?: string;
  /** Completion hero: last logged set (weight × reps) and optional PR badge */
  lastSet?: RestTimerLastSet | null;
  /** Next set preview: "Next up" / Set X of Y and target load */
  nextSetPreview?: RestTimerNextSetPreview | null;
}

export function RestTimerModal({
  isOpen,
  restSeconds,
  onComplete,
  onSkip,
  nextLabel = "Next Set",
  lastSet,
  nextSetPreview,
}: RestTimerModalProps) {
  const [timeLeft, setTimeLeft] = useState(restSeconds);
  const [totalRestSeconds, setTotalRestSeconds] = useState(restSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimeLeft(restSeconds);
      setTotalRestSeconds(restSeconds);
      return;
    }

    setTimeLeft(restSeconds);
    setTotalRestSeconds(restSeconds);

    if (restSeconds === 0) {
      setTimeout(() => onCompleteRef.current(), 0);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setTimeout(() => onCompleteRef.current(), 0);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, restSeconds]);

  // Lock background scroll while rest timer is visible
  useEffect(() => {
    if (isOpen) {
      preventBackgroundScroll();
    } else {
      restoreBackgroundScroll();
    }
    return () => {
      restoreBackgroundScroll();
    };
  }, [isOpen]);

  const handleAdd30 = () => {
    setTimeLeft((prev) => prev + 30);
    setTotalRestSeconds((prev) => prev + 30);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleSkip = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(20);
    }
    onSkip();
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const safeTotal = totalRestSeconds === 0 ? 1 : totalRestSeconds;
  const progressPercentage = Math.min(
    100,
    Math.max(0, ((totalRestSeconds - timeLeft) / safeTotal) * 100)
  );
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference * (1 - progressPercentage / 100);

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="fc-modal fc-card w-full max-w-[320px] overflow-hidden rounded-2xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass)]">
        {/* Optional: Completion hero */}
        {lastSet && (
          <div className="relative px-4 pt-4 pb-3 border-b border-[color:var(--fc-glass-border)]">
            <div className="absolute left-0 top-5 h-[1px] w-full bg-white/5" aria-hidden />
            <div className="absolute left-5 top-0 h-full w-[1px] bg-white/5" aria-hidden />
            <div className="flex items-start justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 text-cyan-400 mb-1">
                  <span className="text-lg font-semibold tracking-tight">
                    Set {lastSet.setNumber} of {lastSet.totalSets} completed
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-bold font-mono fc-text-primary">
                    {lastSet.weight}
                  </span>
                  <span className="text-lg text-[color:var(--fc-text-dim)] font-medium">kg</span>
                  <span className="text-lg text-white/20 mx-1">×</span>
                  <span className="text-2xl sm:text-3xl font-bold font-mono fc-text-primary">
                    {lastSet.reps}
                  </span>
                  <span className="text-lg text-[color:var(--fc-text-dim)] font-medium">reps</span>
                </div>
              </div>
              {lastSet.isPr && (
                <div className="px-3 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 flex flex-col items-center justify-center shadow-lg transform rotate-3">
                  <Trophy className="w-5 h-5 text-amber-400 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-amber-400">New PR</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rest timer: one job, one focus */}
        <div className="px-4 py-4 flex flex-col items-center">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--fc-text-dim)] font-mono block mb-1">
            Resting
          </span>
          <div className="relative w-52 h-52 flex items-center justify-center">
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 200 200"
              aria-hidden
            >
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="6"
              />
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-6 rounded-full border border-white/5 bg-[length:20px_20px]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)" }} aria-hidden />
            <div className="relative z-10 text-center">
              <span className="text-4xl sm:text-5xl font-bold font-mono tracking-tighter text-cyan-400 tabular-nums">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
              <p className="text-xs text-[color:var(--fc-text-dim)] mt-1">Next: {nextLabel}</p>
            </div>
          </div>
        </div>

        {/* Actions: +30s (glass) + Skip rest (primary with icon) */}
        <div className="px-5 pb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleAdd30}
              className="h-14 rounded-2xl fc-glass border border-[color:var(--fc-glass-border)] hover:bg-white/10 text-[color:var(--fc-text-primary)] font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              30s
            </Button>
            <Button
              type="button"
              onClick={handleSkip}
              className="h-12 rounded-xl fc-btn fc-btn-primary font-bold text-sm"
            >
              <span>Skip rest</span>
              <SkipForward className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Optional: Next set preview */}
          {nextSetPreview && (
            <div className="fc-glass rounded-xl p-3 flex items-center justify-between border border-[color:var(--fc-glass-border)] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-[color:var(--fc-text-dim)]" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[color:var(--fc-text-dim)] block font-mono">Next up</span>
                  <span className="font-medium fc-text-primary">Set {nextSetPreview.setNumber} of {nextSetPreview.totalSets}</span>
                </div>
              </div>
              <div className="text-right">
                {nextSetPreview.targetWeight != null && nextSetPreview.targetReps != null ? (
                  <>
                    <span className="block text-sm font-bold font-mono fc-text-primary">
                      {nextSetPreview.targetWeight}kg × {nextSetPreview.targetReps}
                    </span>
                    <span className="text-[10px] text-[color:var(--fc-text-dim)] uppercase tracking-tighter">Target load</span>
                  </>
                ) : (
                  <span className="text-xs text-[color:var(--fc-text-dim)]">—</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
