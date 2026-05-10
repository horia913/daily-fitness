"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";

import { ArrowLeft, FileQuestion } from "lucide-react";
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
  const { user, loading: authLoading } = useAuth();
  const { performanceSettings } = useTheme();
  const templateId = useMemo(() => String(params?.id || ""), [params]);
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [initialBlocks, setInitialBlocks] = useState<any[] | null>(null);

  // Reset state when templateId changes
  useEffect(() => {
    setLoading(true);
    setTemplate(null);
    setLoadError(null);
    setInitialBlocks(null);
    setIsOpen(false);
    setIsDirty(false);
  }, [templateId]);

  const editTemplateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && templateId && user?.id) {
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
  }, [templateId, user, authLoading]);

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
        setLoadError(null);
        setIsOpen(true);
      } else {
        setTemplate(null);
        setInitialBlocks([]);
        setIsOpen(false);
        setLoadError("Template not found");
      }
    } catch (error) {
      console.error("Error loading template:", error);
      setTemplate(null);
      setInitialBlocks([]);
      setIsOpen(false);
      setLoadError("Failed to load template");
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

  if (!user && !authLoading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div></div>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <div className="min-h-screen p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              <PageSkeleton variant="form" />
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
          <div className="min-h-screen p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              <EmptyState
                icon={FileQuestion}
                title="Template not found"
                description={
                  loadError === "Failed to load template"
                    ? "There was an error loading this template. Please try again."
                    : "This template may have been deleted or moved."
                }
                action={{
                  label: "Back to templates",
                  onClick: () => router.push("/coach/workouts/templates"),
                }}
              />
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
        <div className="min-h-screen pb-[var(--fc-bottom-safe-area)]">
          <nav className="sticky top-0 z-50 border-b border-[color:var(--fc-glass-border)] bg-[color:var(--fc-bg-deep)]/85 backdrop-blur-md px-4 sm:px-6">
            <div className="max-w-7xl mx-auto flex min-h-11 max-h-12 items-center justify-between gap-2 py-2">
              <h1 className="text-lg font-semibold fc-text-primary truncate min-w-0">
                Edit template
              </h1>
              <div className="flex items-center gap-2 shrink-0">
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
                pageIsDirty={isDirty}
              />
            )}
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
