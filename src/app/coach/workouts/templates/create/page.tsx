"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import WorkoutTemplateForm from "@/components/WorkoutTemplateForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreateWorkoutTemplatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

  const handleClose = () => {
    router.push("/coach/workouts/templates");
  };

  const handleSuccess = () => {
    router.push("/coach/workouts/templates");
  };

  if (!user) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div></div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 min-h-screen p-2 sm:p-4">
          <div className="max-w-7xl mx-auto space-y-6">
            <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  className="fc-btn fc-btn-ghost h-10 w-10"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    Workout Builder
                  </span>
                  <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)]">
                    Create Template
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Define exercises, blocks, and execution flow.
                  </p>
                </div>
              </div>
            </GlassCard>
            <WorkoutTemplateForm
              isOpen={true}
              onClose={handleClose}
              onSuccess={handleSuccess}
              template={undefined}
              renderMode="page"
            />
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
