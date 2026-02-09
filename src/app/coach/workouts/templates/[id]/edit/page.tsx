"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import WorkoutTemplateForm from "@/components/WorkoutTemplateForm";
import WorkoutTemplateService, {
  WorkoutTemplate,
} from "@/lib/workoutTemplateService";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function EditWorkoutTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { performanceSettings } = useTheme();
  const templateId = useMemo(() => String(params?.id || ""), [params]);
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Reset state when templateId changes
  useEffect(() => {
    setLoading(true);
    setTemplate(null);
    setIsOpen(false);
  }, [templateId]);

  useEffect(() => {
    if (templateId && user?.id) {
      loadTemplate();
    } else if (!user) {
      setLoading(false);
    }
  }, [templateId, user]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      // Skip exercise count to avoid timeout; form loads blocks separately
      const found = await WorkoutTemplateService.getWorkoutTemplateById(templateId, { skipExerciseCount: true });
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
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div></div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="min-h-screen p-4">
            <div className="max-w-7xl mx-auto">
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
                <div className="animate-pulse">
                  <div className="h-8 bg-[color:var(--fc-glass-highlight)] rounded mb-4"></div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!template) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="min-h-screen p-4">
            <div className="max-w-7xl mx-auto">
              <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
                <p className="text-[color:var(--fc-text-dim)]">Template not found.</p>
              </div>
            </div>
          </div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen pb-32">
          <nav className="sticky top-0 z-50 fc-glass border-b border-[color:var(--fc-glass-border)] px-4 sm:px-6 py-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
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
                    Edit Template
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm fc-text-dim">
                      {template.name}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--fc-accent-green)]" />
                    <span className="text-[11px] font-bold uppercase tracking-wider fc-text-dim">Saved</span>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                >
                  Revert to Original
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-[color:var(--fc-glass-border)] fc-text-primary"
                >
                  Preview
                </Button>
              </div>
            </div>
          </nav>
          <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
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
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
