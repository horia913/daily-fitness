"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import WorkoutTemplateForm from "@/components/WorkoutTemplateForm";
import WorkoutTemplateService, {
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function EditWorkoutTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const templateId = useMemo(() => String(params?.id || ""), [params]);
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (templateId && user?.id) {
      loadTemplate();
    }
  }, [templateId, user]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const templates = await WorkoutTemplateService.getWorkoutTemplates(
        user!.id
      );
      const found = templates.find((t) => t.id === templateId);
      if (found) {
        setTemplate(found);
        setIsOpen(true);
      } else {
        router.push("/coach/workouts/templates");
      }
    } catch (error) {
      console.error("Error loading template:", error);
      router.push("/coach/workouts/templates");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.push(`/coach/workouts/templates/${templateId}`);
  };

  const handleSuccess = () => {
    router.push(`/coach/workouts/templates/${templateId}`);
  };

  if (!user) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div></div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse bg-white dark:bg-slate-800 rounded-2xl p-6">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!template) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6">
              <p>Template not found.</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-2 sm:p-4">
        <div className="max-w-7xl mx-auto">
          {isOpen && (
            <WorkoutTemplateForm
              isOpen={isOpen}
              onClose={handleClose}
              onSuccess={handleSuccess}
              template={template}
              renderMode="page"
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
