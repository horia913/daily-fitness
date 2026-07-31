"use client";

import React from "react";
import { useParams, usePathname } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { CoachClientProvider } from "@/contexts/CoachClientContext";
import CoachClientTabBar from "@/components/coach/CoachClientTabBar";

function isClientStationEditPath(pathname: string | null, clientId: string): boolean {
  if (!pathname || !clientId) return false;
  const prefix = `/coach/clients/${clientId}/programs/`
  return pathname.startsWith(prefix) && pathname.endsWith("/edit");
}

export default function CoachClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const clientId = params.id as string;
  const { performanceSettings } = useTheme();
  const stationEdit = isClientStationEditPath(pathname, clientId);

  return (
    <ProtectedRoute requiredRole="coach">
      <CoachClientProvider>
        {stationEdit ? (
          children
        ) : (
          <AnimatedBackground>
            {performanceSettings.floatingParticles && <FloatingParticles />}
            <CoachPageShell widthVariant="data-7xl" className="px-4 pb-[var(--fc-bottom-safe-area)] pt-4 sm:px-6 sm:pt-6 lg:px-10">
              <CoachClientTabBar clientId={clientId} />
              {children}
            </CoachPageShell>
          </AnimatedBackground>
        )}
      </CoachClientProvider>
    </ProtectedRoute>
  );
}
