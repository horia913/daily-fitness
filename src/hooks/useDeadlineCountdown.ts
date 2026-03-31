"use client";

import { useEffect, useRef, useState } from "react";

const TICK_MS = 250;

/**
 * Countdown that follows real time: when the tab is backgrounded or the screen locks,
 * `setInterval` is throttled but elapsed wall time still advances, so we derive
 * remaining seconds from a deadline instead of decrementing each tick.
 */
export function useDeadlineCountdown(args: {
  active: boolean;
  durationSeconds: number;
  /** Runs once when remaining time hits zero (interval already cleared). */
  onDeadlineReached: () => void;
}): number {
  const { active, durationSeconds, onDeadlineReached } = args;
  const onDeadlineRef = useRef(onDeadlineReached);
  const deadlineRef = useRef<number | null>(null);
  const reachedRef = useRef(false);
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);

  useEffect(() => {
    onDeadlineRef.current = onDeadlineReached;
  }, [onDeadlineReached]);

  useEffect(() => {
    if (!active) {
      deadlineRef.current = null;
      reachedRef.current = false;
      setRemainingSeconds(durationSeconds);
      return;
    }

    reachedRef.current = false;
    const totalSec = durationSeconds;
    deadlineRef.current = Date.now() + totalSec * 1000;
    setRemainingSeconds(totalSec);

    if (totalSec === 0) {
      queueMicrotask(() => {
        if (!reachedRef.current) {
          reachedRef.current = true;
          onDeadlineRef.current();
        }
      });
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
      setRemainingSeconds(rem);
      if (rem <= 0) {
        clearTick();
        if (!reachedRef.current) {
          reachedRef.current = true;
          onDeadlineRef.current();
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
  }, [active, durationSeconds]);

  return remainingSeconds;
}
