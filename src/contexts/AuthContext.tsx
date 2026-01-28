'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { logAuthEvent } from '@/lib/debugHarness'
import { subscribeUser, unsubscribeUser } from '@/lib/onesignal'

export type ClientType = 'online' | 'in_gym';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  client_type?: ClientType;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<UserProfile | null>
  ensureFreshSession: () => Promise<Session | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshPromiseRef = useRef<Promise<Session | null> | null>(null)

  // Fetch user profile including client_type
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, client_type, first_name, last_name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
      return profileData;
    }
    return null;
  };

  const ensureFreshSession = async (): Promise<Session | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    refreshPromiseRef.current = (async () => {
      logAuthEvent('ensure_fresh_session_start')
      const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
        return (await Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), timeoutMs)
          ),
        ])) as T
      }

      const {
        data: { session: initialSession },
      } = await withTimeout(supabase.auth.getSession(), 3000)

      let activeSession = initialSession

      const expiresSoon =
        activeSession?.expires_at &&
        activeSession.expires_at * 1000 - Date.now() < 60_000

      if (!activeSession || expiresSoon) {
        logAuthEvent('refresh_session_attempt', { expiresSoon, hasSession: !!activeSession })
        await withTimeout(supabase.auth.refreshSession(), 3000)
        logAuthEvent('refresh_session_done')
      }

      const {
        data: { session: finalSession },
      } = await withTimeout(supabase.auth.getSession(), 3000)

      setSession(finalSession ?? null)
      setUser(finalSession?.user ?? null)
      logAuthEvent('ensure_fresh_session_done', {
        hasSession: !!finalSession,
        userId: finalSession?.user?.id ?? null,
      })

      return finalSession ?? null
    })()
      .catch(() => null)
      .finally(() => {
        refreshPromiseRef.current = null
      })

    return refreshPromiseRef.current
  }

  useEffect(() => {
    // Get initial session and profile
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session ?? null)
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logAuthEvent('auth_state_change', {
        event,
        hasSession: !!session,
        userId: session?.user?.id ?? null,
      })
      setSession(session ?? null)
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      ensureFreshSession().catch(() => {})
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        ensureFreshSession().catch(() => {})
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])


  const signOut = async () => {
    await unsubscribeUser() // Unsubscribe before signing out
    await supabase.auth.signOut()
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signOut,
    refreshProfile,
    ensureFreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
