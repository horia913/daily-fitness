"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
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
  const { getThemeStyles } = useTheme();
  const theme = getThemeStyles();

  useEffect(() => {
    if (!isOpen) return;

    setTimeLeft(restSeconds);

    if (restSeconds === 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, restSeconds, onComplete]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercentage = ((restSeconds - timeLeft) / restSeconds) * 100;

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl">
              <Timer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle className={`text-xl font-bold ${theme.text}`}>
              Rest Time
            </DialogTitle>
          </div>
          <DialogDescription className={`${theme.textSecondary} text-base`}>
            Get ready for {nextLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Timer Display with Progress Ring */}
          <div className="flex flex-col items-center justify-center space-y-6 py-6">
            {/* Circular Progress Indicator */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Background Circle */}
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-200 dark:text-slate-700"
                />
                {/* Progress Circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 90}`}
                  strokeDashoffset={`${2 * Math.PI * 90 * (1 - progressPercentage / 100)}`}
                  className="transition-all duration-1000 ease-linear"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Timer Text */}
              <div className="relative z-10 text-center">
                <div className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  {timeLeft === 1 ? "Almost there!" : "Take a breather"}
                </p>
              </div>
            </div>

            {/* Skip Button */}
            <Button
              variant="outline"
              onClick={onSkip}
              className="w-full border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200 text-slate-700 dark:text-slate-300 font-medium py-6 text-base"
            >
              Skip Rest
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

