"use client";

import React from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { CoachClientProvider } from "@/contexts/CoachClientContext";
import CoachClientTabBar from "@/components/coach/CoachClientTabBar";

export default function CoachClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const clientId = params.id as string;
  const { performanceSettings } = useTheme();

  return (
    <ProtectedRoute requiredRole="coach">
      <CoachClientProvider>
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <CoachPageShell widthVariant="data-7xl" className="px-4 pb-32 pt-4 sm:px-6 sm:pt-6 lg:px-10">
            <CoachClientTabBar clientId={clientId} />
            {children}
          </CoachPageShell>
        </AnimatedBackground>
      </CoachClientProvider>
    </ProtectedRoute>
  );
}
