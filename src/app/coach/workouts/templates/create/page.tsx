"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import WorkoutTemplateForm from "@/components/WorkoutTemplateForm";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function CreateWorkoutTemplatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

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
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-2 sm:p-4">
        <div className="max-w-7xl mx-auto">
          <WorkoutTemplateForm
            isOpen={isOpen}
            onClose={handleClose}
            onSuccess={handleSuccess}
            template={undefined}
            renderMode="page"
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
