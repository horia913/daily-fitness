"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import WorkoutTemplateForm from "@/components/WorkoutTemplateForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { useTheme } from "@/contexts/ThemeContext";

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
          <div className="max-w-7xl mx-auto">
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
