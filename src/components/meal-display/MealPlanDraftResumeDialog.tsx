"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MealPlanDraftResumeDialogProps {
  open: boolean;
  savedAt: string;
  onResume: () => void;
  onDiscard: () => void;
}

export function MealPlanDraftResumeDialog({
  open,
  savedAt,
  onResume,
  onDiscard,
}: MealPlanDraftResumeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDiscard()}>
      <DialogContent className="sm:max-w-md" data-testid="meal-plan-draft-resume">
        <DialogHeader>
          <DialogTitle>Resume unsaved work?</DialogTitle>
          <DialogDescription>
            You have a locally saved draft from {savedAt}. Resume editing it or start from the
            last saved version.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-lg border border-[color:var(--fc-glass-border)] px-4 py-2 text-sm font-medium fc-text-dim hover:fc-text-primary"
          >
            Use saved version
          </button>
          <button
            type="button"
            onClick={onResume}
            className="rounded-lg px-4 py-2 text-sm font-semibold fc-btn fc-btn-primary"
          >
            Resume draft
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
