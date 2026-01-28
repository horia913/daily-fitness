"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { useTheme } from "@/contexts/ThemeContext";
import { GoalsAndHabits } from "@/components/progress/GoalsAndHabits";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GoalsAndHabitsPage() {
  const router = useRouter();
  const { performanceSettings } = useTheme();

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10 space-y-6">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <Button
                  onClick={() => router.push("/client/progress")}
                  variant="ghost"
                  size="icon"
                  className="fc-btn fc-btn-ghost h-10 w-10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    Progress Hub
                  </span>
                  <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                    Goals & Habits
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Set targets, track streaks, and stay accountable.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          <GoalsAndHabits loading={false} />
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
