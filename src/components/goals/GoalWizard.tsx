"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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

export interface GoalWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** When set, wizard opens on this category's form (user can still go back to pick another). */
  initialCategory?: GoalWizardCategory | null;
}

export function GoalWizard({ open, onClose, onSuccess, initialCategory = null }: GoalWizardProps) {
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
          title: result.error.message || "Could not create goal. Please try again.",
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

  const categoryLabel =
    category === "body_composition"
      ? "Body composition"
      : category === "performance"
        ? "Performance"
        : category === "outcome"
          ? "Outcome"
          : category === "nutrition"
            ? "Nutrition"
            : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-lg max-h-[90vh] overflow-y-auto gap-0 p-4 my-4 sm:my-8"
      >
        <DialogDescription className="sr-only">
          Set up a new goal by choosing a category and entering target details.
        </DialogDescription>
        <div className="flex justify-between items-start gap-2 mb-4">
          <div className="min-w-0">
            <DialogTitle className="text-lg font-semibold fc-text-primary pr-2">
              {step === 0 ? "New goal" : categoryLabel}
            </DialogTitle>
            {step === 1 ? (
              <p className="text-xs fc-text-dim mt-1">Fill in the details below.</p>
            ) : (
              <p className="text-xs fc-text-dim mt-1">Pick a category to continue.</p>
            )}
          </div>
          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handleClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {step === 0 ? (
          <CategoryPicker onPick={handlePickCategory} />
        ) : category === "body_composition" ? (
          <BodyCompositionForm onSubmit={handlePayload} onBack={handleBackToCategories} submitting={submitting} />
        ) : category === "performance" ? (
          <PerformanceForm onSubmit={handlePayload} onBack={handleBackToCategories} submitting={submitting} />
        ) : category === "outcome" ? (
          <OutcomeForm onSubmit={handlePayload} onBack={handleBackToCategories} submitting={submitting} />
        ) : category === "nutrition" ? (
          <NutritionForm onSubmit={handlePayload} onBack={handleBackToCategories} submitting={submitting} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
