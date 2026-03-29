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
        <div className="relative z-10 min-h-screen pb-32">
          <div className="sticky top-0 z-50 fc-glass border-b border-[color:var(--fc-glass-border)] px-4 sm:px-6">
            <div className="max-w-7xl mx-auto flex min-h-11 max-h-12 items-center justify-between gap-2 py-2">
              <h1 className="text-lg font-semibold fc-text-primary truncate">
                Create template
              </h1>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-8 text-xs px-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Back
                </Button>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-3">
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
