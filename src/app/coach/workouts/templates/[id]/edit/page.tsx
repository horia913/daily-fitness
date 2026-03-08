"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
          return WorkoutBlockService.getWorkoutBlocks(templateId, { lite: true });
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
            <Link href="/coach/workouts/templates" className="fc-surface inline-flex items-center gap-2 rounded-xl border border-[color:var(--fc-surface-card-border)] px-3 py-2.5 w-fit text-[color:var(--fc-text-primary)] text-sm font-medium">
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Back to Templates
            </Link>
          </div>
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
                    {!isDirty ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--fc-accent-green)]" />
                        <span className="text-[11px] font-bold uppercase tracking-wider fc-text-dim">Saved</span>
                      </>
                    ) : (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Unsaved changes</span>
                    )}
                  </div>
                </div>
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
