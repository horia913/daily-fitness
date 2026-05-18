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
    title: "Training (the foundation, 60% completion + 40% execution)",
    body: "How many scheduled workouts they completed, and how well they followed the prescription (reps, weight, RPE).",
  },
  {
    title: "Recovery (multiplier, sleep 70% + steps 30%)",
    body: "Better recovery can boost training by up to +30%; worse recovery can dock it down to -30%. Recovery can't generate score on its own — it amplifies training.",
  },
  {
    title: "Nutrition (bonus, scales with training)",
    body: "Days they logged meals, capped at +10 points. A client at 50% training adherence only earns half their nutrition bonus.",
  },
  {
    title: "Extras (bonus, scales with training)",
    body: "Extra activities logged (walks, sports, cardio), capped at +5 points. Also scaled by training adherence.",
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
            Explains how training, recovery, nutrition, and extras combine into the weekly athlete
            score.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-[color:var(--fc-text-primary)]">
          <p>
            The score reflects what your client did this week (Mon–Sun in their timezone).
          </p>
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <p className="font-semibold">{s.title}</p>
              <p className="mt-1 text-[color:var(--fc-text-dim)]">{s.body}</p>
            </div>
          ))}
          <p className="text-[color:var(--fc-text-dim)] border-t border-[color:var(--fc-glass-border)] pt-3">
            <span className="font-semibold text-[color:var(--fc-text-primary)]">Note: </span>
            Subjective check-in fields (mood, soreness, stress, energy) are not scored — they&apos;re
            for your coaching insight only.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
