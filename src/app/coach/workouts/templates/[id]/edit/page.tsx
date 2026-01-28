"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
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
              <GlassCard elevation={2} className="fc-glass fc-card p-6">
                <div className="animate-pulse">
                  <div className="h-8 bg-[color:var(--fc-glass-highlight)] rounded mb-4"></div>
                </div>
              </GlassCard>
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
              <GlassCard elevation={2} className="fc-glass fc-card p-6">
                <p className="text-[color:var(--fc-text-dim)]">Template not found.</p>
              </GlassCard>
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
        <div className="min-h-screen p-2 sm:p-4">
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
                    Template Editor
                  </span>
                  <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)]">
                    Edit Workout Template
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    {template.name}
                  </p>
                </div>
              </div>
            </GlassCard>
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
