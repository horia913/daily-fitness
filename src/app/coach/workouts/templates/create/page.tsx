"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import WorkoutTemplateForm from "@/components/WorkoutTemplateForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
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
        <div className="relative z-10 min-h-screen pb-24">
          <header className="sticky top-0 z-50 fc-glass border-b border-[color:var(--fc-glass-border)] px-4 sm:px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="fc-btn fc-btn-ghost h-10 w-10 rounded-xl"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold tracking-tight fc-text-primary">
                  Create Template
                </h1>
                <p className="text-sm fc-text-dim">Builder Mode</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-[color:var(--fc-glass-border)] fc-text-primary"
              onClick={() => {}}
            >
              Preview
            </Button>
          </header>
          <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
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
