"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { preventBackgroundScroll, restoreBackgroundScroll } from "@/lib/mobile-compatibility";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { useLiveRestTimer } from "./LiveRestTimerContext";
import type {
  RestTimerLastSet,
  RestTimerNextSetPreview,
} from "./restTimerModalTypes";
import styles from "./restTimerModal.module.css";

export type { RestTimerLastSet, RestTimerNextSetPreview };

const TICK_MS = 250;

interface RestTimerModalProps {
  isOpen: boolean;
  restSeconds: number;
  onComplete: () => void;
  onSkip: () => void;
  nextLabel?: string;
  lastSet?: RestTimerLastSet | null;
  nextSetPreview?: RestTimerNextSetPreview | null;
  /** When set, countdown reads from LiveRestTimerContext (no duplicate timer). */
  controlledTimeLeft?: number;
  controlledTotalSeconds?: number;
  onAdjustTime?: (deltaSeconds: number) => void;
  /** Hide modal without ending rest (in-card glue keeps counting). */
  onDismiss?: () => void;
}

export function RestTimerModal({
  isOpen,
  restSeconds,
  onComplete,
  onSkip,
  nextLabel: _nextLabel = "Next Set",
  lastSet,
  nextSetPreview,
  controlledTimeLeft,
  controlledTotalSeconds,
  onAdjustTime,
  onDismiss,
}: RestTimerModalProps) {
  const isControlled = controlledTimeLeft != null;
  const [timeLeft, setTimeLeft] = useState(restSeconds);
  const [totalRestSeconds, setTotalRestSeconds] = useState(restSeconds);
  const deadlineRef = useRef<number | null>(null);
  const reachedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (isControlled) return;

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
  }, [isControlled, isOpen, restSeconds]);

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

  const displayTimeLeft = isControlled ? controlledTimeLeft! : timeLeft;
  const displayTotal =
    isControlled && controlledTotalSeconds != null
      ? controlledTotalSeconds
      : totalRestSeconds;

  const adjustTime = (deltaSeconds: number) => {
    if (isControlled && onAdjustTime) {
      onAdjustTime(deltaSeconds);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(10);
      }
      return;
    }
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

  const handleDismiss = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
    onDismiss?.();
  };

  const minutes = Math.floor(displayTimeLeft / 60);
  const seconds = displayTimeLeft % 60;
  const safeTotal = displayTotal === 0 ? 1 : displayTotal;
  const remainingPct = Math.min(
    100,
    Math.max(0, (displayTimeLeft / safeTotal) * 100),
  );

  const upNextLabel =
    nextSetPreview != null
      ? `Set ${nextSetPreview.setNumber} of ${nextSetPreview.totalSets}`
      : null;

  const lastSetLine = lastSet
    ? `last set ${lastSet.reps} × ${lastSet.weight} kg`
    : null;

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className={styles.scrim}
        onClick={onDismiss ? handleDismiss : undefined}
        role="presentation"
      >
        <div
          className={styles.panel}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Rest timer"
        >
          <div className={styles.head}>
            <span className={styles.headLabel}>● Resting</span>
            {onDismiss ? (
              <button
                type="button"
                onClick={handleDismiss}
                className={styles.closeBtn}
                aria-label="Minimize rest timer"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
            ) : null}
          </div>
          <div className={styles.body}>
            {upNextLabel ? (
              <p className={styles.upNext}>
                Up next · <strong>{upNextLabel}</strong>
              </p>
            ) : null}
            {lastSetLine ? (
              <p className={styles.lastSet}>{lastSetLine}</p>
            ) : null}
            <div className={styles.countdown} aria-live="polite">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </div>
            <div className={styles.bar}>
              <span
                className={styles.barFill}
                style={{ width: `${remainingPct}%` }}
              />
            </div>
          </div>
          <div className={styles.adjRow}>
            <button
              type="button"
              onClick={() => adjustTime(-15)}
              className={styles.adjBtn}
            >
              − 15s
            </button>
            <button
              type="button"
              onClick={() => adjustTime(15)}
              className={styles.adjBtn}
            >
              + 15s
            </button>
          </div>
          <button type="button" onClick={handleSkip} className={styles.skipBtn}>
            ▶ Skip rest
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

/** Rest modal driven by LiveRestTimerContext — single deadline for modal + in-card glue. */
export function LiveRestTimerModal({
  lastSet,
  nextSetPreview,
  nextLabel = "Next Set",
}: {
  lastSet?: RestTimerLastSet | null;
  nextSetPreview?: RestTimerNextSetPreview | null;
  nextLabel?: string;
}) {
  const rest = useLiveRestTimer();
  const [dismissed, setDismissed] = useState(false);
  const wasRestingRef = useRef(false);

  useEffect(() => {
    if (rest?.isResting && !wasRestingRef.current) {
      setDismissed(false);
    }
    wasRestingRef.current = !!rest?.isResting;
  }, [rest?.isResting]);

  if (!rest) return null;

  return (
    <RestTimerModal
      isOpen={rest.isResting && !dismissed}
      restSeconds={rest.totalRestSeconds || rest.secondsLeft}
      controlledTimeLeft={rest.secondsLeft}
      controlledTotalSeconds={rest.totalRestSeconds || rest.secondsLeft}
      onAdjustTime={rest.adjustRest}
      onDismiss={() => setDismissed(true)}
      onComplete={() => {}}
      onSkip={() => rest.skipRest()}
      nextLabel={nextLabel}
      lastSet={lastSet}
      nextSetPreview={nextSetPreview}
    />
  );
}
