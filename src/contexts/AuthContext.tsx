"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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
    let mounted = true;

    // Listen for auth state changes — this is the PRIMARY auth mechanism
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        const newUser = newSession?.user ?? null;
        setSession(newSession);
        setUser(newUser);
        
        if (newUser && profileLoadedForRef.current !== newUser.id) {
          profileLoadedForRef.current = newUser.id;
          const p = await fetchProfile(newUser.id);
          if (mounted) setProfile(p);
        } else if (!newUser) {
          profileLoadedForRef.current = null;
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Also do an initial getSession check
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      if (s?.user) {
        setSession(s);
        setUser(s.user);
        if (profileLoadedForRef.current !== s.user.id) {
          profileLoadedForRef.current = s.user.id;
          fetchProfile(s.user.id).then(p => {
            if (mounted) setProfile(p);
          });
        }
      }
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    profileLoadedForRef.current = null;
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
