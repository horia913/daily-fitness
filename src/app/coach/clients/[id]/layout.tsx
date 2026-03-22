"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
            <div className="flex items-center mb-2 sm:mb-3">
              <Link
                href="/coach/clients"
                className="p-2 -ml-2 rounded-xl border border-transparent text-[color:var(--fc-text-primary)] hover:bg-[color:var(--fc-glass-soft)] hover:border-[color:var(--fc-glass-border)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fc-accent)]"
                aria-label="Back to client list"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden />
              </Link>
            </div>
            <CoachClientTabBar clientId={clientId} />
            {children}
          </div>
        </AnimatedBackground>
      </CoachClientProvider>
    </ProtectedRoute>
  );
}
