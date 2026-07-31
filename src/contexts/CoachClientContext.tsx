"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export type CoachClientContextValue = {
  clientId: string;
  /** Display name from profile */
  clientName: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  /** Raw `clients.status` for this coach–client link (null if no row) */
  clientRecordStatus: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

type IdentityQueryData = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  clientRecordStatus: string | null;
  /** Profile query error message; client-row errors only null status (parity with prior load). */
  profileError: string | null;
};

const CoachClientContext = createContext<CoachClientContextValue | null>(null);

export function CoachClientProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const clientId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const identityQuery = useQuery({
    queryKey: ["coach-client", clientId, "identity", user?.id],
    queryFn: async (): Promise<IdentityQueryData> => {
      try {
        const [
          { data: profile, error: profileError },
          { data: clientRow, error: clientError },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, email, first_name, last_name, avatar_url, phone")
            .eq("id", clientId)
            .maybeSingle(),
          supabase
            .from("clients")
            .select("status")
            .eq("client_id", clientId)
            .eq("coach_id", user!.id)
            .maybeSingle(),
        ]);

        const clientRecordStatus = clientError
          ? null
          : (clientRow?.status ?? null);

        if (profileError) {
          return {
            email: "",
            firstName: null,
            lastName: null,
            avatarUrl: null,
            phone: null,
            clientRecordStatus,
            profileError: profileError.message,
          };
        }

        if (profile) {
          return {
            email: profile.email ?? "",
            firstName: profile.first_name ?? null,
            lastName: profile.last_name ?? null,
            avatarUrl: profile.avatar_url ?? null,
            phone: profile.phone ?? null,
            clientRecordStatus,
            profileError: null,
          };
        }

        return {
          email: "",
          firstName: null,
          lastName: null,
          avatarUrl: null,
          phone: null,
          clientRecordStatus,
          profileError: null,
        };
      } catch (e) {
        throw e instanceof Error ? e : new Error("Failed to load client");
      }
    },
    enabled: !!clientId && !!user?.id && !authLoading,
  });

  const data = identityQuery.data;

  const email = data?.email ?? "";
  const firstName = data?.firstName ?? null;
  const lastName = data?.lastName ?? null;
  const avatarUrl = data?.avatarUrl ?? null;
  const phone = data?.phone ?? null;
  const clientRecordStatus = data?.clientRecordStatus ?? null;

  const clientName = useMemo(() => {
    const n = [firstName, lastName].filter(Boolean).join(" ").trim();
    return n || email || "Client";
  }, [firstName, lastName, email]);

  const error =
    data?.profileError ??
    (identityQuery.isError
      ? identityQuery.error instanceof Error
        ? identityQuery.error.message
        : "Failed to load client"
      : null);

  const refetch = useCallback(() => {
    void identityQuery.refetch();
  }, [identityQuery.refetch]);

  const value = useMemo<CoachClientContextValue>(
    () => ({
      clientId,
      clientName,
      email,
      phone,
      firstName,
      lastName,
      avatarUrl,
      clientRecordStatus,
      loading: authLoading || identityQuery.isLoading,
      error,
      refetch,
    }),
    [
      clientId,
      clientName,
      email,
      phone,
      firstName,
      lastName,
      avatarUrl,
      clientRecordStatus,
      authLoading,
      identityQuery.isLoading,
      error,
      refetch,
    ],
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
