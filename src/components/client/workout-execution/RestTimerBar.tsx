"use client";

import { useEffect, useState, useRef } from "react";
import { Timer, SkipForward } from "lucide-react";

export interface RestTimerBarLastSet {
  weight: number;
  reps: number;
  exerciseName: string;
}

export interface RestTimerBarNextSet {
  setNumber: number;
  totalSets: number;
  targetWeight?: number | null;
  targetReps?: string | null;
}

interface RestTimerBarProps {
  durationSeconds: number;
  isActive: boolean;
  onSkip: () => void;
  onComplete: () => void;
  lastSet?: RestTimerBarLastSet | null;
  nextSet?: RestTimerBarNextSet | null;
}

export function RestTimerBar({
  durationSeconds,
  isActive,
  onSkip,
  onComplete,
  lastSet,
  nextSet,
}: RestTimerBarProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Reset and start timer when isActive or durationSeconds changes
  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
        expandTimeoutRef.current = null;
      }
      setRemainingSeconds(durationSeconds);
      setIsExpanded(false);
      setIsCompleted(false);
      return;
    }

    setRemainingSeconds(durationSeconds);
    setIsExpanded(false);
    setIsCompleted(false);

    if (durationSeconds === 0) {
      setTimeout(() => onCompleteRef.current(), 0);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setIsCompleted(true);
          // Show "REST COMPLETE" for 2 seconds, then auto-dismiss
          setTimeout(() => {
            onCompleteRef.current();
          }, 2000);
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
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
        expandTimeoutRef.current = null;
      }
    };
  }, [isActive, durationSeconds]);

  const handleBarClick = () => {
    if (isCompleted) return; // Don't expand when completed
    
    setIsExpanded((prev) => {
      const newExpanded = !prev;
      
      // Auto-collapse after 3 seconds if expanded
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
      if (newExpanded) {
        expandTimeoutRef.current = setTimeout(() => {
          setIsExpanded(false);
        }, 3000);
      }
      
      return newExpanded;
    });
  };

  const handleSkip = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
      expandTimeoutRef.current = null;
    }
    onSkip();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const progressPercentage =
    durationSeconds > 0
      ? Math.max(0, Math.min(100, ((durationSeconds - remainingSeconds) / durationSeconds) * 100))
      : 0;

  if (!isActive) return null;

  return (
    <>
      {/* Floating Rest Timer Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-[9998] transition-all duration-300 ease-out ${
          isActive ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
        style={{
          paddingTop: "env(safe-area-inset-top, 0)",
        }}
      >
        <div
          className={`relative overflow-hidden transition-all duration-300 ${
            isExpanded ? "h-auto" : "h-14"
          }`}
          style={{
            background: isCompleted
              ? "color-mix(in srgb, var(--fc-status-success) 90%, transparent)"
              : "color-mix(in srgb, var(--fc-app-bg) 95%, transparent)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid color-mix(in srgb, var(--fc-surface-card-border) 50%, transparent)",
          }}
        >
          {/* Progress bar */}
          <div
            className="absolute bottom-0 left-0 h-1 transition-all duration-1000 ease-linear"
            style={{
              width: `${progressPercentage}%`,
              background: isCompleted
                ? "var(--fc-status-success)"
                : "var(--fc-domain-workouts)",
            }}
          />

          {/* Main bar content */}
          <div
            className="flex items-center justify-between px-4 h-14 cursor-pointer"
            onClick={handleBarClick}
          >
            {/* Left: Timer icon + time */}
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                style={{
                  background: isCompleted
                    ? "color-mix(in srgb, var(--fc-status-success) 30%, transparent)"
                    : "color-mix(in srgb, var(--fc-domain-workouts) 20%, transparent)",
                }}
              >
                <Timer
                  className="w-4 h-4"
                  style={{
                    color: isCompleted
                      ? "var(--fc-status-success)"
                      : "var(--fc-domain-workouts)",
                  }}
                />
              </div>
              <div className="flex flex-col">
                {isCompleted ? (
                  <span className="text-sm font-bold fc-text-primary">
                    REST COMPLETE — GO!
                  </span>
                ) : (
                  <span
                    className="text-lg font-bold font-mono tabular-nums fc-text-primary"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatTime(remainingSeconds)}
                  </span>
                )}
              </div>
            </div>

            {/* Center: Progress bar visual (thin line) */}
            <div className="flex-1 mx-4 h-1 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--fc-surface-card-border) 30%, transparent)" }}>
              <div
                className="h-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${progressPercentage}%`,
                  background: isCompleted
                    ? "var(--fc-status-success)"
                    : "var(--fc-domain-workouts)",
                }}
              />
            </div>

            {/* Right: Skip button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSkip();
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                color: "var(--fc-domain-workouts)",
              }}
            >
              Skip
            </button>
          </div>

          {/* Expanded content: Last set + Next set preview */}
          {isExpanded && !isCompleted && (
            <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--fc-surface-card-border) 30%, transparent)" }}>
              <div className="flex items-center justify-between gap-4 text-sm">
                {/* Last set */}
                {lastSet && (
                  <div className="flex items-center gap-2">
                    <span className="fc-text-dim">Last:</span>
                    <span className="font-semibold fc-text-primary">
                      {lastSet.weight}kg × {lastSet.reps} reps
                    </span>
                  </div>
                )}

                {/* Next set */}
                {nextSet && (
                  <div className="flex items-center gap-2">
                    <span className="fc-text-dim">Next:</span>
                    <span className="font-semibold fc-text-primary">
                      Set {nextSet.setNumber} of {nextSet.totalSets}
                      {nextSet.targetWeight != null && nextSet.targetReps != null && (
                        <> — {nextSet.targetWeight}kg × {nextSet.targetReps}</>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
