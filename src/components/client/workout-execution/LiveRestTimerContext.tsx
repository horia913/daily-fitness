"use client";

/**
 * In-card rest countdown for the block execution route.
 * Deadline-based (not interval-decrement) so reload/background stays sane.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const STORAGE_PREFIX = "df:live-rest:";

export type LiveRestPendingAction = "set" | "exercise" | null;

export type LiveRestSnapshot = {
  isResting: boolean;
  secondsLeft: number;
  /** Initial rest duration when the current rest period started (for progress UI). */
  totalRestSeconds: number;
  nextSetNumber: number | null;
  totalSets: number | null;
  pendingAction: LiveRestPendingAction;
  /** Formatted m:ss for glue `.t` slot; never negative. */
  countdownLabel: string;
  skipRest: () => void;
  /** Shift the shared deadline by delta seconds (modal +/- controls). */
  adjustRest: (deltaSeconds: number) => void;
};

type PersistedRest = {
  deadlineMs: number;
  nextSetNumber: number | null;
  totalSets: number | null;
  pendingAction: LiveRestPendingAction;
  setEntryId: string;
};

type StartRestArgs = {
  restSeconds: number;
  nextSetNumber: number | null;
  totalSets: number | null;
  pendingAction: LiveRestPendingAction;
  setEntryId: string;
  sessionId: string | null | undefined;
};

type LiveRestTimerContextValue = LiveRestSnapshot & {
  startRest: (args: StartRestArgs) => void;
  clearRest: () => void;
};

const LiveRestTimerContext = createContext<LiveRestTimerContextValue | null>(
  null,
);

function storageKey(sessionId: string, setEntryId: string): string {
  return `${STORAGE_PREFIX}${sessionId}:${setEntryId}`;
}

function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function readPersisted(
  sessionId: string | null | undefined,
  setEntryId: string,
): PersistedRest | null {
  if (!sessionId || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(sessionId, setEntryId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedRest;
    if (
      !parsed ||
      typeof parsed.deadlineMs !== "number" ||
      parsed.setEntryId !== setEntryId
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(
  sessionId: string | null | undefined,
  data: PersistedRest | null,
): void {
  if (!sessionId || typeof window === "undefined") return;
  const key = storageKey(sessionId, data?.setEntryId ?? "");
  try {
    if (!data) {
      // Clear any keys for this session that match prefix+setEntry — caller passes setEntryId via clear
      return;
    }
    sessionStorage.setItem(storageKey(sessionId, data.setEntryId), JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

function clearPersisted(
  sessionId: string | null | undefined,
  setEntryId: string,
): void {
  if (!sessionId || typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(sessionId, setEntryId));
  } catch {
    /* ignore */
  }
}

function secondsUntil(deadlineMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
}

export function LiveRestTimerProvider({
  sessionId,
  setEntryId,
  children,
  onRestEnded,
}: {
  sessionId: string | null | undefined;
  setEntryId: string;
  children: React.ReactNode;
  /** Called when countdown hits 0 or skip (after clearing). */
  onRestEnded?: (pendingAction: LiveRestPendingAction) => void;
}) {
  const deadlineRef = useRef<number | null>(null);
  const pendingActionRef = useRef<LiveRestPendingAction>(null);
  const nextSetRef = useRef<number | null>(null);
  const totalSetsRef = useRef<number | null>(null);
  const onRestEndedRef = useRef(onRestEnded);
  onRestEndedRef.current = onRestEnded;

  const [isResting, setIsResting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalRestSeconds, setTotalRestSeconds] = useState(0);
  const [nextSetNumber, setNextSetNumber] = useState<number | null>(null);
  const [totalSets, setTotalSets] = useState<number | null>(null);
  const [pendingAction, setPendingAction] =
    useState<LiveRestPendingAction>(null);

  const clearRestInternal = useCallback(
    (announce: boolean) => {
      const action = pendingActionRef.current;
      deadlineRef.current = null;
      pendingActionRef.current = null;
      nextSetRef.current = null;
      totalSetsRef.current = null;
      setIsResting(false);
      setSecondsLeft(0);
      setTotalRestSeconds(0);
      setNextSetNumber(null);
      setTotalSets(null);
      setPendingAction(null);
      clearPersisted(sessionId, setEntryId);
      if (announce) {
        onRestEndedRef.current?.(action);
      }
    },
    [sessionId, setEntryId],
  );

  const clearRest = useCallback(() => {
    clearRestInternal(false);
  }, [clearRestInternal]);

  const skipRest = useCallback(() => {
    if (!deadlineRef.current && !isResting) return;
    clearRestInternal(true);
  }, [clearRestInternal, isResting]);

  const startRest = useCallback(
    (args: StartRestArgs) => {
      const sec = Math.max(0, Math.floor(Number(args.restSeconds) || 0));
      if (sec <= 0) {
        clearRestInternal(false);
        return;
      }
      const deadlineMs = Date.now() + sec * 1000;
      deadlineRef.current = deadlineMs;
      pendingActionRef.current = args.pendingAction;
      nextSetRef.current = args.nextSetNumber;
      totalSetsRef.current = args.totalSets;
      setIsResting(true);
      setSecondsLeft(sec);
      setTotalRestSeconds(sec);
      setNextSetNumber(args.nextSetNumber);
      setTotalSets(args.totalSets);
      setPendingAction(args.pendingAction);
      writePersisted(args.sessionId ?? sessionId, {
        deadlineMs,
        nextSetNumber: args.nextSetNumber,
        totalSets: args.totalSets,
        pendingAction: args.pendingAction,
        setEntryId: args.setEntryId,
      });
    },
    [clearRestInternal, sessionId],
  );

  // Hydrate from sessionStorage on mount / setEntry change
  useEffect(() => {
    const persisted = readPersisted(sessionId, setEntryId);
    if (!persisted) {
      clearRestInternal(false);
      return;
    }
    const left = secondsUntil(persisted.deadlineMs);
    if (left <= 0) {
      clearPersisted(sessionId, setEntryId);
      clearRestInternal(false);
      return;
    }
    deadlineRef.current = persisted.deadlineMs;
    pendingActionRef.current = persisted.pendingAction;
    nextSetRef.current = persisted.nextSetNumber;
    totalSetsRef.current = persisted.totalSets;
    setIsResting(true);
    setSecondsLeft(left);
    setTotalRestSeconds(left);
    setNextSetNumber(persisted.nextSetNumber);
    setTotalSets(persisted.totalSets);
    setPendingAction(persisted.pendingAction);
  }, [sessionId, setEntryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const adjustRest = useCallback(
    (deltaSeconds: number) => {
      const end = deadlineRef.current;
      if (end == null || !isResting) return;
      const nextDeadline = end + deltaSeconds * 1000;
      deadlineRef.current = nextDeadline;
      const left = secondsUntil(nextDeadline);
      setSecondsLeft(left);
      setTotalRestSeconds((prev) => Math.max(0, prev + deltaSeconds));
      writePersisted(sessionId, {
        deadlineMs: nextDeadline,
        nextSetNumber: nextSetRef.current,
        totalSets: totalSetsRef.current,
        pendingAction: pendingActionRef.current,
        setEntryId,
      });
    },
    [isResting, sessionId, setEntryId],
  );

  // Tick while resting
  useEffect(() => {
    if (!isResting) return;

    const tick = () => {
      const end = deadlineRef.current;
      if (end == null) return;
      const left = secondsUntil(end);
      setSecondsLeft(left);
      if (left <= 0) {
        clearRestInternal(true);
      }
    };

    tick();
    const id = setInterval(tick, 250);
    const onVis = () => tick();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [isResting, clearRestInternal]);

  const value = useMemo<LiveRestTimerContextValue>(
    () => ({
      isResting,
      secondsLeft,
      totalRestSeconds,
      nextSetNumber,
      totalSets,
      pendingAction,
      countdownLabel: formatCountdown(secondsLeft),
      skipRest,
      adjustRest,
      startRest,
      clearRest,
    }),
    [
      isResting,
      secondsLeft,
      totalRestSeconds,
      nextSetNumber,
      totalSets,
      pendingAction,
      skipRest,
      adjustRest,
      startRest,
      clearRest,
    ],
  );

  return (
    <LiveRestTimerContext.Provider value={value}>
      {children}
    </LiveRestTimerContext.Provider>
  );
}

export function useLiveRestTimer(): LiveRestTimerContextValue | null {
  return useContext(LiveRestTimerContext);
}

/** Skip rest if currently resting — for log field / button interaction. */
export function useSkipRestOnInteract(): () => void {
  const rest = useLiveRestTimer();
  return useCallback(() => {
    rest?.skipRest();
  }, [rest]);
}
