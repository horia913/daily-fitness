"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export type CoachClientContextValue = {
  clientId: string;
  /** Display name from profile */
  clientName: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  /** Raw `clients.status` for this coach–client link (null if no row) */
  clientRecordStatus: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

const CoachClientContext = createContext<CoachClientContextValue | null>(null);

export function CoachClientProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const clientId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [clientRecordStatus, setClientRecordStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId || !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [{ data: profile, error: profileError }, { data: clientRow, error: clientError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, email, first_name, last_name, avatar_url")
            .eq("id", clientId)
            .maybeSingle(),
          supabase
            .from("clients")
            .select("status")
            .eq("client_id", clientId)
            .eq("coach_id", user.id)
            .maybeSingle(),
        ]);

      if (profileError) {
        setError(profileError.message);
        setFirstName(null);
        setLastName(null);
        setEmail("");
        setAvatarUrl(null);
      } else if (profile) {
        setFirstName(profile.first_name ?? null);
        setLastName(profile.last_name ?? null);
        setEmail(profile.email ?? "");
        setAvatarUrl(profile.avatar_url ?? null);
      } else {
        setFirstName(null);
        setLastName(null);
        setEmail("");
        setAvatarUrl(null);
      }

      if (clientError) {
        setClientRecordStatus(null);
      } else {
        setClientRecordStatus(clientRow?.status ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load client");
    } finally {
      setLoading(false);
    }
  }, [clientId, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  const clientName = useMemo(() => {
    const n = [firstName, lastName].filter(Boolean).join(" ").trim();
    return n || email || "Client";
  }, [firstName, lastName, email]);

  const value = useMemo<CoachClientContextValue>(
    () => ({
      clientId,
      clientName,
      email,
      firstName,
      lastName,
      avatarUrl,
      clientRecordStatus,
      loading: authLoading || loading,
      error,
      refetch: load,
    }),
    [
      clientId,
      clientName,
      email,
      firstName,
      lastName,
      avatarUrl,
      clientRecordStatus,
      authLoading,
      loading,
      error,
      load,
    ]
  );

  return (
    <CoachClientContext.Provider value={value}>{children}</CoachClientContext.Provider>
  );
}

export function useCoachClient(): CoachClientContextValue {
  const ctx = useContext(CoachClientContext);
  if (!ctx) {
    throw new Error("useCoachClient must be used within CoachClientProvider");
  }
  return ctx;
}
