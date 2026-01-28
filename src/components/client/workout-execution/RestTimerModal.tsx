"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { Timer } from "lucide-react";

interface RestTimerModalProps {
  isOpen: boolean;
  restSeconds: number;
  onComplete: () => void; // Called when timer finishes
  onSkip: () => void; // Called when user skips
  nextLabel?: string; // e.g., "Next Set", "Next Exercise"
}

export function RestTimerModal({
  isOpen,
  restSeconds,
  onComplete,
  onSkip,
  nextLabel = "Next Set",
}: RestTimerModalProps) {
  const [timeLeft, setTimeLeft] = useState(restSeconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isOpen) {
      // Clear timer when modal closes
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimeLeft(restSeconds);
      return;
    }

    // Reset timer when modal opens or restSeconds changes
    setTimeLeft(restSeconds);

    if (restSeconds === 0) {
      // Use setTimeout to avoid calling onComplete during render
      setTimeout(() => {
        onCompleteRef.current();
      }, 0);
      return;
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start new timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        
        if (newTime <= 0) {
          // Clear timer first
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Use setTimeout to avoid calling onComplete during render
          setTimeout(() => {
            onCompleteRef.current();
          }, 0);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, restSeconds]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalMinutes = Math.floor(restSeconds / 60);
  const totalSeconds = restSeconds % 60;
  const safeRestSeconds = restSeconds === 0 ? 1 : restSeconds;
  const progressPercentage = Math.min(
    100,
    Math.max(0, ((restSeconds - timeLeft) / safeRestSeconds) * 100)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="fc-modal fc-card w-full max-w-lg overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-[color:var(--fc-glass-border)] text-left">
          <div className="flex items-start gap-4">
            <div className="fc-icon-tile fc-icon-workouts">
              <Timer className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <span className="fc-pill fc-pill-glass fc-text-workouts">
                Rest Timer
              </span>
              <div className="text-2xl font-bold fc-text-primary">
                Recover and reset
              </div>
              <p className="text-sm fc-text-dim">
                Next up: {nextLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-52 h-52 flex items-center justify-center">
              <svg
                className="absolute inset-0 w-full h-full fc-rotate-ring"
                viewBox="0 0 200 200"
              >
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="var(--fc-glass-border-strong)"
                  strokeWidth="10"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="url(#rest-gradient)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 90}`}
                  strokeDashoffset={`${2 * Math.PI * 90 * (1 - progressPercentage / 100)}`}
                  className="transition-all duration-1000 ease-linear"
                />
                <defs>
                  <linearGradient
                    id="rest-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="var(--fc-accent-cyan)" />
                    <stop offset="100%" stopColor="var(--fc-domain-workouts)" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="relative z-10 text-center">
                <div className="text-5xl sm:text-6xl font-bold font-mono tracking-tight fc-text-primary">
                  {String(minutes).padStart(2, "0")}:
                  {String(seconds).padStart(2, "0")}
                </div>
                <p className="text-sm fc-text-dim mt-2">
                  {timeLeft === 1 ? "Almost there!" : "Take a breather"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="fc-glass-soft rounded-2xl px-4 py-3">
                <div className="text-[10px] tracking-[0.2em] uppercase fc-text-subtle">
                  Remaining
                </div>
                <div className="text-lg font-semibold fc-text-primary font-mono">
                  {String(minutes).padStart(2, "0")}:
                  {String(seconds).padStart(2, "0")}
                </div>
              </div>
              <div className="fc-glass-soft rounded-2xl px-4 py-3">
                <div className="text-[10px] tracking-[0.2em] uppercase fc-text-subtle">
                  Total
                </div>
                <div className="text-lg font-semibold fc-text-primary font-mono">
                  {String(totalMinutes).padStart(2, "0")}:
                  {String(totalSeconds).padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 border-t border-[color:var(--fc-glass-border)]">
          <Button
            variant="default"
            onClick={onSkip}
            className="w-full fc-btn fc-btn-primary fc-press py-6 text-base"
          >
            Skip Rest
          </Button>
        </div>
      </div>
    </div>
  );
}

