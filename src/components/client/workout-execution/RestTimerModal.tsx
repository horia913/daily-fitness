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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pb-20 bg-black/60 backdrop-blur-sm">
      <div className="fc-modal fc-card w-full max-w-[320px] sm:max-w-sm overflow-hidden">
        {/* Compact Header */}
        <div className="px-4 pt-4 pb-3 border-b border-[color:var(--fc-glass-border)] text-center">
          <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
            Rest Timer
          </span>
          <p className="text-xs fc-text-dim mt-1">
            Next: {nextLabel}
          </p>
        </div>

        {/* Timer Circle - Compact */}
        <div className="px-4 py-4">
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-40 flex items-center justify-center">
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
                <div className="text-4xl font-bold font-mono tracking-tight fc-text-primary">
                  {String(minutes).padStart(2, "0")}:
                  {String(seconds).padStart(2, "0")}
                </div>
                <p className="text-xs fc-text-dim mt-1">
                  {timeLeft === 1 ? "Almost there!" : "Take a breather"}
                </p>
              </div>
            </div>

            {/* Compact Stats */}
            <div className="flex gap-4 mt-3 text-center">
              <div>
                <div className="text-[9px] tracking-wider uppercase fc-text-subtle">
                  Remaining
                </div>
                <div className="text-base font-semibold fc-text-primary font-mono">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </div>
              </div>
              <div className="w-px bg-[color:var(--fc-glass-border)]" />
              <div>
                <div className="text-[9px] tracking-wider uppercase fc-text-subtle">
                  Total
                </div>
                <div className="text-base font-semibold fc-text-primary font-mono">
                  {String(totalMinutes).padStart(2, "0")}:{String(totalSeconds).padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Skip Button */}
        <div className="px-4 pb-4 pt-2 border-t border-[color:var(--fc-glass-border)]">
          <Button
            variant="default"
            onClick={onSkip}
            className="w-full fc-btn fc-btn-primary fc-press py-3 text-sm"
          >
            Skip Rest
          </Button>
        </div>
      </div>
    </div>
  );
}

