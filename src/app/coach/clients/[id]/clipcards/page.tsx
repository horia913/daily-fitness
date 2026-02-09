"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import ClientClipcards from "@/components/coach/client-views/ClientClipcards";
import { ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ClientClipcardsPage() {
  const params = useParams();
  const { loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

  const clientId = params.id as string;
  const [clientName, setClientName] = useState<string>("Client");

  useEffect(() => {
    if (clientId) {
      loadClientName();
    }
  }, [clientId]);

  const loadClientName = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", clientId)
        .single();

      if (profile) {
        const name =
          `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
          "Client";
        setClientName(name);
      }
    } catch (error) {
      console.error("Error loading client name:", error);
    }
  };

  if (authLoading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
            <GlassCard elevation={2} className="fc-glass fc-card p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-16 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="h-64 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
              </div>
            </GlassCard>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-10 space-y-6">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href={`/coach/clients/${clientId}`} className="fc-glass fc-card w-10 h-10 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-glass-border)]">
                  <ArrowLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
                </Link>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                      ClipCards
                    </h1>
                    <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                      Manage session credits and packages for {clientName}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          <ClientClipcards clientId={clientId} clientName={clientName} />
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
