"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Button } from "@/components/ui/button";
import ClientWorkoutsView from "@/components/coach/client-views/ClientWorkoutsView";
import { ArrowLeft, Dumbbell } from "lucide-react";
import Link from "next/link";

export default function ClientWorkoutsPage() {
  const params = useParams();
  const { loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();

  const clientId = params.id as string;

  if (authLoading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-16 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
                <div className="h-64 rounded-2xl bg-[color:var(--fc-glass-highlight)]"></div>
              </div>
            </div>
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
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-10">
            <div className="flex items-center gap-4">
              <Link href={`/coach/clients/${clientId}`} className="fc-surface w-10 h-10 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-surface-card-border)]">
                <ArrowLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
              </Link>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                    Assigned Workouts
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                    View and manage training plans.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ClientWorkoutsView clientId={clientId} />
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
