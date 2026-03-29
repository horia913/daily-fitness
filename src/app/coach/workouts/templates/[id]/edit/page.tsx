"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  const [isDirty, setIsDirty] = useState(false);

  const [initialBlocks, setInitialBlocks] = useState<any[] | null>(null);

  // Reset state when templateId changes
  useEffect(() => {
    setLoading(true);
    setTemplate(null);
    setInitialBlocks(null);
    setIsOpen(false);
    setIsDirty(false);
  }, [templateId]);

  const editTemplateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (templateId && user?.id) {
      if (editTemplateTimeoutRef.current) clearTimeout(editTemplateTimeoutRef.current);
      editTemplateTimeoutRef.current = setTimeout(() => {
        editTemplateTimeoutRef.current = null;
        setLoading(false);
      }, 20_000);
      loadTemplate().finally(() => {
        if (editTemplateTimeoutRef.current) {
          clearTimeout(editTemplateTimeoutRef.current);
          editTemplateTimeoutRef.current = null;
        }
      });
      return () => {
        if (editTemplateTimeoutRef.current) {
          clearTimeout(editTemplateTimeoutRef.current);
          editTemplateTimeoutRef.current = null;
        }
      };
    }
    if (!user) {
      setLoading(false);
    }
  }, [templateId, user]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      if (process.env.NODE_ENV !== "production") console.time("[EditTemplate] load");
      // Fetch template and blocks in parallel so the form can show without a second round-trip
      const [found, blocks] = await Promise.all([
        WorkoutTemplateService.getWorkoutTemplateById(templateId, { skipExerciseCount: true }),
        (async () => {
          const { WorkoutBlockService } = await import("@/lib/workoutBlockService");
          // Full enrichment (drop_sets, cluster_sets, time_protocols, etc.) — lite skips those and breaks non-straight-set blocks in the editor.
          return WorkoutBlockService.getWorkoutBlocks(templateId);
        })(),
      ]);
      if (process.env.NODE_ENV !== "production") {
        console.timeEnd("[EditTemplate] load");
        console.log("[EditTemplate] template:", !!found, "blocks:", blocks?.length ?? 0);
      }
      if (found) {
        setTemplate(found);
        setInitialBlocks(blocks || []);
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
          <nav className="sticky top-0 z-50 border-b border-[color:var(--fc-glass-border)] bg-[color:var(--fc-bg-deep)]/85 backdrop-blur-md px-4 sm:px-6">
            <div className="max-w-7xl mx-auto flex min-h-11 max-h-12 items-center justify-between gap-2 py-2">
              <h1 className="text-lg font-semibold fc-text-primary truncate min-w-0">
                Edit template
              </h1>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${isDirty ? "text-amber-600 dark:text-amber-400" : "text-[color:var(--fc-text-dim)]"}`}
                >
                  {isDirty ? "Unsaved" : "Saved"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-8 text-xs px-2"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Back
                </Button>
              </div>
            </div>
          </nav>
          <p className="max-w-7xl mx-auto px-4 sm:px-6 -mt-1 mb-1 text-xs text-[color:var(--fc-text-dim)] truncate">
            {template.name}
          </p>
          <div className="max-w-7xl mx-auto space-y-3 p-4 sm:p-6 pt-2">
            {isOpen && (
              <WorkoutTemplateForm
                isOpen={isOpen}
                onClose={handleClose}
                onSuccess={handleSuccess}
                template={template}
                initialBlocks={initialBlocks ?? undefined}
                renderMode="page"
                onDirtyChange={setIsDirty}
              />
            )}
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
