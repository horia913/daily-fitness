"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { WorkoutTemplateEditor } from "@/components/workout-canvas/WorkoutTemplateEditor";

export default function EditWorkoutTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const templateId = String(params?.id || "");

  if (!user) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <WorkoutTemplateEditor
        templateId={templateId}
        coachId={user.id}
        onClose={() => router.push(`/coach/workouts/templates/${templateId}`)}
      />
    </ProtectedRoute>
  );
}
