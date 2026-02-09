"use client";

import { useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";

export default function ProgramsAndWorkoutsPage() {
  const router = useRouter();
  const { performanceSettings } = useTheme();

  useEffect(() => {
    // Redirect to workout templates by default (can be updated later to handle both)
    router.replace("/coach/workouts/templates");
  }, [router]);

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] mx-auto max-w-lg p-10 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--fc-text-primary)] mx-auto mb-4"></div>
              <p className="text-[color:var(--fc-text-dim)]">
                Redirecting to workout templates...
              </p>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
