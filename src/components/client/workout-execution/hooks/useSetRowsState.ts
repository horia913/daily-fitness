import { useEffect, useMemo, useRef, useState } from "react";

type CreateDefaultRow<T> = (index: number, previous: T | null) => T;

interface UseSetRowsStateOptions<T extends { done?: boolean }> {
  rowCount: number;
  resetKey: string;
  loggedCount: number;
  createDefaultRow: CreateDefaultRow<T>;
}

interface UseSetRowsStateResult<T extends { done?: boolean }> {
  rows: T[];
  doneCount: number;
  setRow: (index: number, updater: (row: T) => T) => void;
  fillRemaining: (factory?: (index: number, previous: T | null) => Partial<T>) => void;
  markDone: (index: number, done: boolean) => void;
}

/**
 * Row list for active-set logging.
 *
 * `resetKey` must be structural (set entry / exercise), not ephemeral defaults
 * (sticky weight, suggestions). Those used to be in resetKey; after a log they
 * changed, rebuilt every row as `done: false`, and the loggedCount effect did
 * not re-run — so the client stayed stuck on set 1.
 */
export function useSetRowsState<T extends { done?: boolean }>({
  rowCount,
  resetKey,
  loggedCount,
  createDefaultRow,
}: UseSetRowsStateOptions<T>): UseSetRowsStateResult<T> {
  const [rows, setRows] = useState<T[]>([]);
  const createDefaultRowRef = useRef(createDefaultRow);
  const loggedCountRef = useRef(loggedCount);

  useEffect(() => {
    createDefaultRowRef.current = createDefaultRow;
  }, [createDefaultRow]);

  useEffect(() => {
    loggedCountRef.current = loggedCount;
  }, [loggedCount]);

  // Rebuild defaults when the block/exercise identity changes. Always re-apply
  // loggedCount so done flags are never wiped by a reset.
  useEffect(() => {
    setRows((prev) => {
      const cappedLogged = Math.max(
        0,
        Math.min(loggedCountRef.current, rowCount),
      );
      const next: T[] = [];
      for (let i = 0; i < rowCount; i += 1) {
        const created = createDefaultRowRef.current(
          i,
          i > 0 ? next[i - 1] : null,
        );
        if (i < cappedLogged) {
          // Preserve logged field values when the row already existed
          next.push(
            prev[i] ? { ...prev[i], done: true } : { ...created, done: true },
          );
        } else {
          next.push({ ...created, done: false });
        }
      }
      return next;
    });
  }, [rowCount, resetKey]);

  // Sync done flags when parent completedSets advances (without wiping inputs)
  useEffect(() => {
    setRows((prev) => {
      if (prev.length === 0) return prev;
      const cappedLogged = Math.max(0, Math.min(loggedCount, prev.length));
      let changed = false;
      const next = prev.map((row, index) => {
        const shouldBeDone = index < cappedLogged;
        const isDone = row.done === true;
        if (isDone === shouldBeDone) return row;
        changed = true;
        return { ...row, done: shouldBeDone };
      });
      return changed ? next : prev;
    });
  }, [loggedCount]);

  const doneCount = useMemo(
    () => rows.reduce((acc, row) => acc + (row.done ? 1 : 0), 0),
    [rows],
  );

  const setRow = (index: number, updater: (row: T) => T) => {
    setRows((prev) => {
      if (!prev[index]) return prev;
      const next = [...prev];
      next[index] = updater(next[index]);
      return next;
    });
  };

  const markDone = (index: number, done: boolean) => {
    setRow(index, (row) => ({ ...row, done }));
  };

  const fillRemaining = (
    factory?: (index: number, previous: T | null) => Partial<T>,
  ) => {
    setRows((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      for (let i = 0; i < next.length; i += 1) {
        if (next[i].done) continue;
        const patch = factory?.(i, i > 0 ? next[i - 1] : null) ?? {};
        next[i] = { ...next[i], ...patch, done: false };
      }
      return next;
    });
  };

  return {
    rows,
    doneCount,
    setRow,
    fillRemaining,
    markDone,
  };
}
