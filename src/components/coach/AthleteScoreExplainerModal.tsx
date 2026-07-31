"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SECTIONS = [
  {
    title: "Adherence (showing up)",
    body: "Percent of required program workouts completed in the rolling 14-day window — same source as the adherence calendar and notifications (program_day_completions, coach-skips excluded).",
  },
  {
    title: "Execution (session quality)",
    body: "How closely logged sets matched the instance prescription (reps, weight, effort). Compared against program_instance_set_prescriptions — your coach’s program copy, not a generic template.",
  },
  {
    title: "How they combine",
    body: "Score = 70% completion + 30% execution. If there are no gradable set logs in the window, execution is excluded and completion carries 100% of the score.",
  },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AthleteScoreExplainerModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-elevated)]">
        <DialogHeader>
          <DialogTitle className="text-[color:var(--fc-text-primary)]">
            How the Athlete Score works
          </DialogTitle>
          <DialogDescription className="sr-only">
            Explains the training-only athlete score: completion and execution.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-[color:var(--fc-text-primary)]">
          <p>
            The score reflects training in a rolling 14-day window.
          </p>
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <p className="font-semibold">{s.title}</p>
              <p className="mt-1 text-[color:var(--fc-text-dim)]">{s.body}</p>
            </div>
          ))}
          <p className="text-[color:var(--fc-text-dim)] border-t border-[color:var(--fc-glass-border)] pt-3">
            <span className="font-semibold text-[color:var(--fc-text-primary)]">Note: </span>
            Recovery, nutrition, extras, and subjective check-in fields are not part of this score.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
