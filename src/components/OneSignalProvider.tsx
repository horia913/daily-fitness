"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { oneSignalService } from "@/lib/onesignal";

interface OneSignalProviderProps {
  children: React.ReactNode;
}

export default function OneSignalProvider({
  children,
}: OneSignalProviderProps) {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [userSubscribed, setUserSubscribed] = useState(false);

  useEffect(() => {
    // Fire and forget - OneSignal initialization should NEVER block rendering
    // If it fails or times out, the app continues normally (just without push notifications)
    const initializeOneSignal = async () => {
      try {
        // Check if OneSignal is supported
        const supported =
          typeof window !== "undefined" && "serviceWorker" in navigator;
        setIsSupported(supported);

        if (!supported) {
          console.log("[OneSignal] Not supported in this environment");
          return;
        }

        // Initialize OneSignal (already has timeout wrapper in onesignal.ts)
        const initialized = await oneSignalService.initialize();

        if (initialized) {
          setIsInitialized(true);
          console.log("[OneSignal] Provider initialized successfully");
        } else {
          // Silently fallback - notifications just won't work, app continues normally
          console.log(
            "[OneSignal] Initialization skipped or failed (non-critical)",
          );
        }
      } catch (error: any) {
        // Log but don't throw - OneSignal errors should never break the app
        console.warn(
          "[OneSignal] Provider initialization error (non-critical):",
          error?.message || String(error),
        );
      }
    };

    // Don't await - fire and forget
    initializeOneSignal();
  }, []);

  useEffect(() => {
    // Fire and forget - user subscription should NEVER block page rendering
    const setupUserContext = async () => {
      if (!isInitialized || !user || userSubscribed) {
        return;
      }

      try {
        // Set up user context in OneSignal (already has timeout wrapper in onesignal.ts)
        const userTags = {
          role: user.role || "client",
          email: user.email || "",
          created_at: new Date().toISOString(),
        };

        const success = await oneSignalService.initializeWithUser(
          user.id,
          userTags,
        );
        if (success) {
          setUserSubscribed(true);
          console.log("[OneSignal] User context set up successfully");
        } else {
          // Silently fail - user just won't get push notifications
          console.log("[OneSignal] User subscription skipped (non-critical)");
        }
      } catch (error: any) {
        // Log but don't throw - subscription failure shouldn't break the app
        console.warn(
          "[OneSignal] User context setup error (non-critical):",
          error?.message || String(error),
        );
      }
    };

    // Don't await - fire and forget
    setupUserContext();
  }, [isInitialized, user?.id, userSubscribed]); // Only depend on user.id to prevent loops

  return (
    <>
      {children}
      {/* OneSignal initialization status indicator (hidden to avoid UI interference) */}
      {false && process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white p-2 rounded text-xs z-50">
          OneSignal:{" "}
          {isSupported
            ? isInitialized
              ? "✅ Ready"
              : "⏳ Initializing"
            : "❌ Not Supported"}
        </div>
      )}
    </>
  );
}
