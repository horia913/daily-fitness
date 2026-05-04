"use client";

/**
 * useUpdateSetRpe — workout-exec-v6.
 *
 * Shared per-set RPE updater used by every block executor that renders
 * `LoggedSetsList`. Optimistically updates the parent-owned loggedSets via
 * `onSetLogUpsert`, then PATCHes /api/sets/[id]. Reverts on failure.
 *
 * Temp ids (`temp-…` prefix) skip the network call — set is still flushing
 * via the golden logging path; the orchestrator will resolve the real id and
 * a follow-up edit can land then.
 */

import { useCallback } from "react";
import { fetchApi } from "@/lib/apiClient";
import type { LoggedSet } from "@/types/workoutBlocks";

interface UseUpdateSetRpeArgs {
  blockId: string;
  onSetLogUpsert?: (
    blockId: string,
    entry: LoggedSet,
    opts?: { replaceId?: string },
  ) => void;
}

export function useUpdateSetRpe({
  blockId,
  onSetLogUpsert,
}: UseUpdateSetRpeArgs) {
  return useCallback(
    async (entry: LoggedSet, rpe: number) => {
      const previousRpe = entry.rpe;
      const optimistic: LoggedSet = { ...entry, rpe };
      onSetLogUpsert?.(blockId, optimistic, { replaceId: entry.id });

      if (entry.id.startsWith("temp-")) return;

      try {
        const res = await fetchApi(`/api/sets/${entry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rpe }),
          credentials: "include",
        });
        if (!res.ok) {
          if (process.env.NODE_ENV !== "production") {
            console.error("[useUpdateSetRpe] PATCH failed", {
              setId: entry.id,
              status: res.status,
              body: await res.text().catch(() => ""),
            });
          }
          const reverted: LoggedSet = { ...entry, rpe: previousRpe };
          onSetLogUpsert?.(blockId, reverted, { replaceId: entry.id });
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[useUpdateSetRpe] PATCH error", err);
        }
        const reverted: LoggedSet = { ...entry, rpe: previousRpe };
        onSetLogUpsert?.(blockId, reverted, { replaceId: entry.id });
      }
    },
    [blockId, onSetLogUpsert],
  );
}

export default useUpdateSetRpe;
