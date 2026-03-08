import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

const DEFAULT_TIMEOUT_MS = 20_000;

function isAuthLikeError(err: any): boolean {
  if (!err) return false;
  if (err?.name === "AbortError") return false;
  const status = err?.status ?? err?.statusCode;
  if (status === 401) return true;
  const msg = (err?.message ?? "").toLowerCase();
  if (msg.includes("jwt") || msg.includes("unauthorized") || msg.includes("session")) return true;
  if (msg.includes("failed to fetch") || err?.name === "TypeError") return true;
  return false;
}

export function usePageData<T>(
  fetchFn: () => Promise<T>,
  deps: any[] = [],
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    // Abort any previous in-flight fetch
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      if (controller.signal.aborted) return;
      setLoading(false);
      setError("Loading took too long. Tap Retry to try again.");
    }, timeoutMs);
    try {
      const result = await fetchFn();
      if (controller.signal.aborted) return;
      setData(result);
    } catch (err: any) {
      if (err?.name === "AbortError" || controller.signal.aborted) return;
      if (isAuthLikeError(err)) {
        try {
          await supabase.auth.getSession();
          const result = await fetchFn();
          if (controller.signal.aborted) return;
          setData(result);
        } catch (retryErr: any) {
          if (retryErr?.name === "AbortError" || controller.signal.aborted) return;
          setError(retryErr?.message || err?.message || "Failed to load data");
        }
      } else {
        setError(err?.message || "Failed to load data");
      }
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (!controller.signal.aborted) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    load();
    return () => {
      // Cancel in-flight fetch when deps change or component unmounts
      if (abortRef.current) abortRef.current.abort();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [load]);

  return { data, loading, error, refetch: load };
}
