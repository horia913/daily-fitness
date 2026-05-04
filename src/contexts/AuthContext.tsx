"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  resetTimezoneSyncGuard,
  syncProfileTimezoneOnce,
} from "@/lib/timezoneSync";

export type ClientType = "online" | "in_gym";

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  client_type?: ClientType;
  first_name?: string;
  last_name?: string;
  timezone?: string | null;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileLoadedForRef = useRef<string | null>(null);
  /** One timezone sync attempt per signed-in user per session (avoids loops on profile re-fetches). */
  const timezoneSyncAttemptedForUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, client_type, first_name, last_name, timezone, avatar_url")
        .eq("id", userId)
        .single();
      if (error) return null;
      return data as UserProfile;
    } catch {
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!user) return null;
    const p = await fetchProfile(user.id);
    setProfile(p);
    return p;
  }, [user, fetchProfile]);

  useEffect(() => {
    if (!user?.id || !profile) return;
    const uid = user.id;
    if (timezoneSyncAttemptedForUserIdRef.current === uid) return;

    let cancelled = false;

    void (async () => {
      try {
        const updated = await syncProfileTimezoneOnce(uid, profile.timezone);
        if (cancelled) return;
        timezoneSyncAttemptedForUserIdRef.current = uid;
        if (updated) {
          const p = await fetchProfile(uid);
          if (!cancelled && p) setProfile(p);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("[AuthContext] timezone sync failed", e);
          timezoneSyncAttemptedForUserIdRef.current = uid;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, profile, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // IMPORTANT: This callback must NOT be async and must NOT call any supabase methods directly.
    // The auth lock is held during this callback. Calling supabase.from() or supabase.auth.* inside
    // will deadlock. Defer all Supabase operations via setTimeout(..., 0).
    // See: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;

        const newUser = newSession?.user ?? null;
        setSession(newSession);
        setUser(newUser);
        setLoading(false);

        setTimeout(() => {
          if (!mounted) return;

          if (newUser && profileLoadedForRef.current !== newUser.id) {
            profileLoadedForRef.current = newUser.id;
            void fetchProfile(newUser.id).then((p) => {
              if (mounted) setProfile(p);
            });
          } else if (!newUser) {
            profileLoadedForRef.current = null;
            setProfile(null);
          }
        }, 0);
      }
    );

    // Watchdog fallback: in rare cases INITIAL_SESSION may not arrive promptly.
    // If loading is still unresolved after 5s, settle loading and reconcile session once.
    const watchdog = setTimeout(() => {
      if (!mounted) return;

      setLoading((currentLoading) => {
        if (!currentLoading) return currentLoading;

        void supabase.auth
          .getSession()
          .then(({ data: { session: recoveredSession } }) => {
            if (!mounted) return;
            setSession(recoveredSession ?? null);
            setUser(recoveredSession?.user ?? null);

            if (recoveredSession?.user && profileLoadedForRef.current !== recoveredSession.user.id) {
              profileLoadedForRef.current = recoveredSession.user.id;
              void fetchProfile(recoveredSession.user.id).then((p) => {
                if (mounted) setProfile(p);
              });
            } else if (!recoveredSession?.user) {
              profileLoadedForRef.current = null;
              setProfile(null);
            }
          })
          .catch((err) => {
            console.error("[AuthContext] watchdog getSession failed", err);
          });

        return false;
      });
    }, 5000);

    // Use onAuthStateChange as the single source of truth.
    // Supabase emits INITIAL_SESSION on mount, so we avoid a parallel getSession()
    // path that can double-fetch profile and create auth timing races.

    return () => {
      mounted = false;
      clearTimeout(watchdog);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    profileLoadedForRef.current = null;
    timezoneSyncAttemptedForUserIdRef.current = null;
    resetTimezoneSyncGuard();
    router.push("/");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
