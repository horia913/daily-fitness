import { useEffect, useRef } from "react";

export const useLoggingReset = (
  isLogging: boolean,
  setIsLogging: (value: boolean) => void,
  timeoutMs: number = 12_000
) => {
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLogging) {
      startedAtRef.current = null;
      return;
    }

    startedAtRef.current = Date.now();
    const timeoutId = setTimeout(() => {
      setIsLogging(false);
    }, timeoutMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isLogging, setIsLogging, timeoutMs]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!isLogging || startedAtRef.current === null) return;

      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed >= timeoutMs) {
        setIsLogging(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isLogging, setIsLogging, timeoutMs]);
};
