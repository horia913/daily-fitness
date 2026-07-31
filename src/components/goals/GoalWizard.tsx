"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast-provider";
import {
  createGoalWithSourceLink,
  pillarForGoalCategory,
  type GoalCreationPayload,
  type GoalWizardCategory,
} from "@/lib/goalCreationService";
import { CategoryPicker } from "./wizard/CategoryPicker";
import { BodyCompositionForm } from "./wizard/BodyCompositionForm";
import { PerformanceForm } from "./wizard/PerformanceForm";
import { OutcomeForm } from "./wizard/OutcomeForm";
import { NutritionForm } from "./wizard/NutritionForm";
import { cn } from "@/lib/utils";

export interface GoalWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** When set, wizard opens on this category's form (user can still go back to pick another). */
  initialCategory?: GoalWizardCategory | null;
}

function categoryMeta(category: GoalWizardCategory | null): {
  label: string;
  eyebrow: string;
  accent: string;
} {
  switch (category) {
    case "body_composition":
      return {
        label: "Body composition",
        eyebrow: "Body · metrics",
        accent: "var(--fc-group-d)",
      };
    case "performance":
      return {
        label: "Performance",
        eyebrow: "Training · performance",
        accent: "var(--fc-domain-workouts)",
      };
    case "outcome":
      return {
        label: "Outcome",
        eyebrow: "Lifestyle · wellness",
        accent: "var(--fc-status-warning)",
      };
    case "nutrition":
      return {
        label: "Nutrition",
        eyebrow: "Fuel · nutrition",
        accent: "var(--fc-domain-meals)",
      };
    default:
      return {
        label: "New goal",
        eyebrow: "Me · goals",
        accent: "var(--fc-accent)",
      };
  }
}

export function GoalWizard({
  open,
  onClose,
  onSuccess,
  initialCategory = null,
}: GoalWizardProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [step, setStep] = useState<0 | 1>(0);
  const [category, setCategory] = useState<GoalWizardCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setStep(0);
    setCategory(null);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (initialCategory) {
      setCategory(initialCategory);
      setStep(1);
    } else {
      setCategory(null);
      setStep(0);
    }
  }, [open, initialCategory]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickCategory = (c: GoalWizardCategory) => {
    setCategory(c);
    setStep(1);
  };

  const handleBackToCategories = () => {
    setStep(0);
    setCategory(null);
  };

  const handlePayload = async (payload: GoalCreationPayload) => {
    if (!user?.id) {
      addToast({ title: "You must be signed in.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createGoalWithSourceLink(supabase, {
        ...payload,
        clientId: user.id,
        pillar: pillarForGoalCategory(payload.category),
      });

      if (!result.ok) {
        console.error("[GoalWizard] create failed:", result.error);
        addToast({
          title:
            result.error.message || "Could not create goal. Please try again.",
          variant: "destructive",
        });
        return;
      }

      addToast({ title: "Goal created", variant: "success" });
      handleClose();
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  const meta = categoryMeta(step === 1 ? category : null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "fc-modal my-4 max-h-[min(90vh,720px)] w-[calc(100%-1.5rem)] max-w-lg gap-0 overflow-hidden p-0 sm:my-8",
          "border border-[color:var(--fc-hairline)] bg-[color:var(--fc-bg-deep)]",
        )}
      >
        <DialogDescription className="sr-only">
          Set up a new goal by choosing a category and entering target details.
        </DialogDescription>

        <header
          className="relative border-b border-[color:var(--fc-hairline)] px-4 pb-3.5 pt-4"
          style={{ borderLeft: `3px solid ${meta.accent}` }}
        >
          <div className="flex items-start gap-2.5 pr-8">
            {step === 1 ? (
              <button
                type="button"
                onClick={handleBackToCategories}
                disabled={submitting}
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[color:var(--fc-hairline)] bg-transparent fc-text-dim transition-colors hover:fc-text-primary disabled:opacity-50"
                aria-label="Back to categories"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: meta.accent }}
                  aria-hidden
                />
                <span
                  className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: meta.accent }}
                >
                  {meta.eyebrow}
                </span>
              </div>
              <DialogTitle
                className="text-[20px] font-bold leading-tight tracking-tight fc-text-primary"
                style={{ fontFamily: "var(--f-display)" }}
              >
                {meta.label}
              </DialogTitle>
              <p className="mt-1 text-xs fc-text-dim">
                {step === 0
                  ? "Pick a category to continue."
                  : "Fill in the details below."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[8px] border border-[color:var(--fc-hairline)] bg-transparent fc-text-dim transition-colors hover:fc-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </header>

        <div className="max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain px-4 py-4">
          {step === 0 ? (
            <CategoryPicker onPick={handlePickCategory} />
          ) : category === "body_composition" ? (
            <BodyCompositionForm
              onSubmit={handlePayload}
              onBack={handleBackToCategories}
              submitting={submitting}
            />
          ) : category === "performance" ? (
            <PerformanceForm
              onSubmit={handlePayload}
              onBack={handleBackToCategories}
              submitting={submitting}
            />
          ) : category === "outcome" ? (
            <OutcomeForm
              onSubmit={handlePayload}
              onBack={handleBackToCategories}
              submitting={submitting}
            />
          ) : category === "nutrition" ? (
            <NutritionForm
              onSubmit={handlePayload}
              onBack={handleBackToCategories}
              submitting={submitting}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
