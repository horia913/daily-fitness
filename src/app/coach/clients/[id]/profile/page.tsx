"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import ClientProfileView from "@/components/coach/client-views/ClientProfileView";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

  const clientId = params.id as string;

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
            <div className="flex items-center gap-4">
              <Link href={`/coach/clients/${clientId}`}>
                <Button variant="ghost" size="icon" className="fc-btn fc-btn-ghost h-10 w-10">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  Client Profile
                </span>
                <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)]">
                  Profile & Settings
                </h1>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  View personal information and preferences.
                </p>
              </div>
            </div>
          </GlassCard>

          <ClientProfileView clientId={clientId} />
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
