"use client";

import { useEffect } from "react";
import { Youtube, RefreshCw, Calculator, X } from "lucide-react";
import { preventBackgroundScroll, restoreBackgroundScroll } from "@/lib/mobile-compatibility";

interface ToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  hasVideo: boolean;
  hasAlternatives: boolean;
  onOpenVideo: () => void;
  onOpenAlternatives: () => void;
  onOpenPlateCalculator: () => void;
  exerciseName: string;
  /** When false, hide the Plate Calculator button. Default true for backward compat. */
  showPlateCalculator?: boolean;
}

export function ToolsDrawer({
  isOpen,
  onClose,
  hasVideo,
  hasAlternatives,
  onOpenVideo,
  onOpenAlternatives,
  onOpenPlateCalculator,
  exerciseName,
  showPlateCalculator = true,
}: ToolsDrawerProps) {
  // Lock background scroll when drawer is open
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

  if (!isOpen) return null;

  const handleVideoClick = () => {
    onOpenVideo();
    onClose();
  };

  const handleAlternativesClick = () => {
    onOpenAlternatives();
    onClose();
  };

  const handlePlateCalculatorClick = () => {
    onOpenPlateCalculator();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9997] bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9998] transition-transform duration-300 ease-out"
        style={{
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}
      >
        <div
          className="rounded-t-2xl border-t"
          style={{
            background: "color-mix(in srgb, var(--fc-app-bg) 98%, transparent)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderColor: "var(--fc-surface-card-border)",
            boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.15)",
          }}
        >
          {/* Drag handle */}
          <div className="flex items-center justify-center pt-3 pb-2">
            <div
              className="w-12 h-1.5 rounded-full"
              style={{ background: "var(--fc-surface-card-border)" }}
            />
          </div>

          {/* Header */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold fc-text-primary">Tools</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 fc-text-dim" />
              </button>
            </div>
            {exerciseName && (
              <p className="text-sm fc-text-dim mt-1">{exerciseName}</p>
            )}
          </div>

          {/* Tools list */}
          <div className="px-4 pb-4 space-y-2">
            {/* Video */}
            {hasVideo && (
              <button
                type="button"
                onClick={handleVideoClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-white/10 active:scale-[0.98]"
                style={{
                  background: "var(--fc-surface-sunken)",
                  border: "1px solid var(--fc-surface-card-border)",
                }}
              >
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-lg"
                  style={{
                    background: "color-mix(in srgb, var(--fc-status-error) 20%, transparent)",
                  }}
                >
                  <Youtube
                    className="w-5 h-5"
                    style={{ color: "var(--fc-status-error)" }}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold fc-text-primary">
                    Watch Video
                  </div>
                  <div className="text-xs fc-text-dim">
                    View exercise demonstration
                  </div>
                </div>
              </button>
            )}

            {/* Alternatives */}
            {hasAlternatives && (
              <button
                type="button"
                onClick={handleAlternativesClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-white/10 active:scale-[0.98]"
                style={{
                  background: "var(--fc-surface-sunken)",
                  border: "1px solid var(--fc-surface-card-border)",
                }}
              >
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-lg"
                  style={{
                    background: "color-mix(in srgb, var(--fc-accent-cyan) 20%, transparent)",
                  }}
                >
                  <RefreshCw
                    className="w-5 h-5"
                    style={{ color: "var(--fc-accent-cyan)" }}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold fc-text-primary">
                    Swap Exercise
                  </div>
                  <div className="text-xs fc-text-dim">
                    View alternative exercises
                  </div>
                </div>
              </button>
            )}

            {/* Plate Calculator - only for barbell exercises */}
            {showPlateCalculator && (
              <button
                type="button"
                onClick={handlePlateCalculatorClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-white/10 active:scale-[0.98]"
                style={{
                  background: "var(--fc-surface-sunken)",
                  border: "1px solid var(--fc-surface-card-border)",
                }}
              >
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-lg"
                  style={{
                    background: "color-mix(in srgb, var(--fc-domain-workouts) 20%, transparent)",
                  }}
                >
                  <Calculator
                    className="w-5 h-5"
                    style={{ color: "var(--fc-domain-workouts)" }}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold fc-text-primary">
                    Plate Calculator
                  </div>
                  <div className="text-xs fc-text-dim">
                    Calculate plates for target weight
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Close button */}
          <div className="px-4 pb-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: "var(--fc-surface-elevated)",
                border: "1px solid var(--fc-surface-card-border)",
                color: "var(--fc-text-primary)",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
