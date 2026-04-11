"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, SkipForward, Trophy } from "lucide-react";
import { preventBackgroundScroll, restoreBackgroundScroll } from "@/lib/mobile-compatibility";
import { ModalPortal } from "@/components/ui/ModalPortal";

const TICK_MS = 250;

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
  const deadlineRef = useRef<number | null>(null);
  const reachedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isOpen) {
      deadlineRef.current = null;
      reachedRef.current = false;
      setTimeLeft(restSeconds);
      setTotalRestSeconds(restSeconds);
      return;
    }

    reachedRef.current = false;
    const total = restSeconds;
    deadlineRef.current = Date.now() + total * 1000;
    setTimeLeft(total);
    setTotalRestSeconds(total);

    if (total === 0) {
      queueMicrotask(() => onCompleteRef.current());
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const clearTick = () => {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const tick = () => {
      const end = deadlineRef.current;
      if (end == null) return;
      const rem = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem <= 0) {
        clearTick();
        if (!reachedRef.current) {
          reachedRef.current = true;
          onCompleteRef.current();
        }
      }
    };

    intervalId = setInterval(tick, TICK_MS);
    tick();

    const sync = () => tick();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);

    return () => {
      clearTick();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
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

  const adjustTime = (deltaSeconds: number) => {
    if (deadlineRef.current != null) {
      deadlineRef.current += deltaSeconds * 1000;
    }
    setTotalRestSeconds((prev) => Math.max(0, prev + deltaSeconds));
    setTimeLeft(() => {
      const end = deadlineRef.current;
      if (end == null) return 0;
      return Math.max(0, Math.ceil((end - Date.now()) / 1000));
    });
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
  const contextLabel =
    nextSetPreview != null
      ? `Set ${nextSetPreview.setNumber} of ${nextSetPreview.totalSets}`
      : nextLabel;

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-6 shadow-[0_0_40px_rgba(6,182,212,0.15)] backdrop-blur-md">
          <p className="mb-2 text-xs uppercase tracking-wider text-cyan-300">REST TIMER</p>
          <p className="mb-4 text-sm text-gray-400">
            Next: {nextLabel} — {contextLabel}
          </p>

          {lastSet ? (
            <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Last set: {lastSet.weight}kg × {lastSet.reps}
                </p>
                {lastSet.isPr ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                    <Trophy className="h-3 w-3" />
                    PR
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="my-6 text-center text-6xl font-bold tabular-nums text-white">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>

          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-cyan-900/30">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-700"
              style={{ width: `${100 - progressPercentage}%` }}
            />
          </div>

          <div className="mb-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => adjustTime(-15)}
              className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/10"
            >
              <Minus className="h-3.5 w-3.5" />
              15s
            </button>
            <button
              type="button"
              onClick={() => adjustTime(15)}
              className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/10"
            >
              <Plus className="h-3.5 w-3.5" />
              15s
            </button>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-800 py-3 text-gray-400 transition-colors hover:bg-gray-700"
          >
            <SkipForward className="h-4 w-4" />
            Skip rest
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
