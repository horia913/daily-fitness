"use client";

import React from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
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
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 pb-32 pt-4 sm:pt-6">
            <CoachClientTabBar clientId={clientId} />
            {children}
          </div>
        </AnimatedBackground>
      </CoachClientProvider>
    </ProtectedRoute>
  );
}
