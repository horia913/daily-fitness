"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell } from "@/components/client-ui";
import { PsHero } from "@/components/client/progress-suite";
import ps from "@/components/client/progress-suite/progressSuiteV1.module.css";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ProgressReportsStubPage() {
  const router = useRouter();
  const { performanceSettings } = useTheme();

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
          <div className={ps.psV1}>
            <PsHero
              glow="purple"
              onBack={() => router.push("/client/progress")}
              backAriaLabel="Back to progress hub"
              eyebrow="Progress"
              eyebrowColor="#A78BFA"
              title="Reports"
              subtitle="Weekly and monthly recap reports"
            />
            <div className="mt-8 flex justify-center px-2">
              <EmptyState
                title="Coming soon"
                description="Weekly and monthly recap reports are on the way"
              />
            </div>
          </div>
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
