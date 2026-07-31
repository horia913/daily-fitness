"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { CoachPageShell } from "@/components/coach-ui/CoachPageShell";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Button } from "@/components/ui/button";
import { type MealPlan } from "@/lib/mealPlanService";
import { DatabaseService, type Client } from "@/lib/database";
import { MealPlanMetadataModal } from "@/components/coach/nutrition/MealPlanMetadataModal";
import MealPlanAssignmentModal from "@/components/features/nutrition/MealPlanAssignmentModal";
import { CoachPlanBuilderView } from "@/components/meal-display/CoachPlanBuilderView";
import { MealPlanDraftResumeDialog } from "@/components/meal-display/MealPlanDraftResumeDialog";
import {
  MealPlanDraftProvider,
  useMealPlanDraft,
} from "@/contexts/MealPlanDraftContext";
import { LeaveConfirmDialog } from "@/components/coach/programs/station/LeaveConfirmDialog";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast-provider";
import { isTypingInField } from "@/lib/mealPlans/isTypingInField";
import type { MealListEditorHandle } from "@/components/meal-display/MealListEditor";

function MealPlanBuilderContent({
  mealPlan,
  setMealPlan,
  assignedCount,
  setAssignedCount,
}: {
  mealPlan: MealPlan;
  setMealPlan: (p: MealPlan) => void;
  assignedCount: number;
  setAssignedCount: (n: number) => void;
}) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const draft = useMealPlanDraft();

  const [openMealId, setOpenMealId] = useState<string | null>(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const pendingNavRef = useRef<string | null>(null);
  const mealListEditorRef = useRef<MealListEditorHandle>(null);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!draft.isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [draft.isDirty]);

  const handleToggleMeal = (mealId: string) => {
    setOpenMealId((prev) => (prev === mealId ? null : mealId));
  };

  const handleAddMeal = useCallback(() => {
    const newId = draft.addMeal();
    if (newId) setOpenMealId(newId);
  }, [draft]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingInField(e.target)) return;
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        handleAddMeal();
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        mealListEditorRef.current?.openFoodSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleAddMeal]);

  const handleSave = async () => {
    const ok = await draft.commit();
    if (ok) {
      addToast({ title: "Meal plan saved", variant: "success" });
    } else if (draft.saveError) {
      addToast({ title: draft.saveError, variant: "destructive" });
    }
    return ok;
  };

  const handleBackNavigate = (): boolean => {
    if (!draft.isDirty) return true;
    pendingNavRef.current = "/coach/nutrition";
    setLeaveOpen(true);
    return false;
  };

  const handleAssign = async () => {
    if (!user?.id) return;
    setSelectedClients([]);
    try {
      const coachClients = await DatabaseService.getClients(user.id);
      setClients(coachClients);
      setShowAssignModal(true);
    } catch (error) {
      console.error("Error loading clients:", error);
      addToast({
        title: "Error",
        description: "Error loading clients. Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadAssignedCount = useCallback(async () => {
    const { count, error } = await supabase
      .from("meal_plan_assignments")
      .select("id", { count: "exact", head: true })
      .eq("meal_plan_id", mealPlan.id)
      .eq("is_active", true);
    if (!error) setAssignedCount(count ?? 0);
  }, [mealPlan.id, setAssignedCount]);

  if (draft.loading || !draft.workingCopy) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <>
      <CoachPlanBuilderView
        mealPlan={mealPlan}
        meals={draft.workingCopy.meals}
        assignedCount={assignedCount}
        openMealId={openMealId}
        saveState={draft.saveState}
        isDirty={draft.isDirty}
        saveError={draft.saveError}
        maxOptionsPerMeal={draft.maxOptionsPerMeal}
        onToggleMeal={handleToggleMeal}
        onEditMetadata={() => setShowMetadataModal(true)}
        onAssign={() => void handleAssign()}
        onSave={() => void handleSave()}
        onAddMeal={handleAddMeal}
        onUpdateMeal={draft.updateMeal}
        onDeleteMeal={(id) => {
          draft.removeMeal(id);
          if (openMealId === id) setOpenMealId(null);
        }}
        onAddOption={(id) => {
          draft.addOption(id);
          setOpenMealId(id);
        }}
        onUpdateOption={draft.updateOption}
        onDeleteOption={draft.removeOption}
        onAddFood={draft.addFood}
        onRemoveFood={draft.removeFood}
        onUpdateFoodQuantity={draft.updateFoodQuantity}
        onBackNavigate={handleBackNavigate}
        mealListEditorRef={mealListEditorRef}
      />

      {draft.resumePrompt ? (
        <MealPlanDraftResumeDialog
          open
          savedAt={draft.resumePrompt.savedAt}
          onResume={draft.acceptResume}
          onDiscard={draft.discardStoredDraft}
        />
      ) : null}

      <LeaveConfirmDialog
        open={leaveOpen}
        saving={leaveSaving}
        onCancel={() => {
          setLeaveOpen(false);
          pendingNavRef.current = null;
        }}
        onDiscard={() => {
          draft.discardToBaseline();
          setLeaveOpen(false);
          const href = pendingNavRef.current;
          pendingNavRef.current = null;
          if (href) router.push(href);
        }}
        onSave={async () => {
          setLeaveSaving(true);
          const ok = await handleSave();
          setLeaveSaving(false);
          if (ok) {
            setLeaveOpen(false);
            const href = pendingNavRef.current;
            pendingNavRef.current = null;
            if (href) router.push(href);
          }
        }}
      />

      <MealPlanMetadataModal
        isOpen={showMetadataModal}
        onClose={() => setShowMetadataModal(false)}
        mode="edit"
        mealPlan={mealPlan}
        onUpdated={(updated) => {
          setMealPlan(updated);
          setShowMetadataModal(false);
        }}
      />

      {showAssignModal ? (
        <MealPlanAssignmentModal
          mealPlan={mealPlan}
          clients={clients}
          selectedClients={selectedClients}
          onSelectedClientsChange={setSelectedClients}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedClients([]);
          }}
          onComplete={async () => {
            setShowAssignModal(false);
            setSelectedClients([]);
            await loadAssignedCount();
          }}
        />
      ) : null}
    </>
  );
}

export default function MealPlanDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

  const mealPlanId = params.id as string;

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignedCount, setAssignedCount] = useState(0);

  const mealPlanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMealPlan = useCallback(async () => {
    const { data, error } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("id", mealPlanId)
      .single();

    if (error) {
      console.error("Error loading meal plan:", error);
      setMealPlan(null);
    } else {
      setMealPlan(data as MealPlan);
    }
  }, [mealPlanId]);

  const loadAssignedCount = useCallback(async () => {
    const { count, error } = await supabase
      .from("meal_plan_assignments")
      .select("id", { count: "exact", head: true })
      .eq("meal_plan_id", mealPlanId)
      .eq("is_active", true);

    if (!error) setAssignedCount(count ?? 0);
  }, [mealPlanId]);

  useEffect(() => {
    if (!mealPlanId || !user) return;
    if (mealPlanTimeoutRef.current) clearTimeout(mealPlanTimeoutRef.current);
    mealPlanTimeoutRef.current = setTimeout(() => {
      mealPlanTimeoutRef.current = null;
      setLoading(false);
    }, 20_000);

    setLoading(true);
    Promise.all([loadMealPlan(), loadAssignedCount()]).finally(() => {
      setLoading(false);
      if (mealPlanTimeoutRef.current) {
        clearTimeout(mealPlanTimeoutRef.current);
        mealPlanTimeoutRef.current = null;
      }
    });

    return () => {
      if (mealPlanTimeoutRef.current) {
        clearTimeout(mealPlanTimeoutRef.current);
        mealPlanTimeoutRef.current = null;
      }
    };
  }, [mealPlanId, user, loadMealPlan, loadAssignedCount]);

  if (loading && !mealPlan) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <CoachPageShell widthVariant="canvas-full" className="p-0 sm:p-0">
            <PageSkeleton variant="dashboard" />
          </CoachPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  if (!mealPlan || !user?.id) {
    return (
      <ProtectedRoute requiredRole="coach">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}
          <CoachPageShell widthVariant="canvas-full" className="p-0 sm:p-0">
            <div className="text-center py-16">
              <h2 className="text-xl font-semibold fc-text-primary mb-4">
                Meal plan not found
              </h2>
              <Link href="/coach/nutrition">
                <Button className="fc-btn fc-btn-primary">Back to Nutrition</Button>
              </Link>
            </div>
          </CoachPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <CoachPageShell widthVariant="canvas-full" className="p-0 sm:p-0">
          <MealPlanDraftProvider mealPlanId={mealPlanId} coachId={user.id}>
            <MealPlanBuilderContent
              mealPlan={mealPlan}
              setMealPlan={setMealPlan}
              assignedCount={assignedCount}
              setAssignedCount={setAssignedCount}
            />
          </MealPlanDraftProvider>
        </CoachPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
