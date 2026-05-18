"use client";

import type { GoalWizardCategory } from "@/lib/goalCreationService";
import { Scale, Zap, CalendarCheck, HeartPulse, Apple } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CATEGORIES: {
  id: GoalWizardCategory;
  label: string;
  description: string;
  Icon: LucideIcon;
}[] = [
  {
    id: "body_composition",
    label: "Body composition",
    description: "Weight, body fat, or muscle targets tied to your metrics.",
    Icon: Scale,
  },
  {
    id: "performance",
    label: "Performance",
    description: "Strength PRs and endurance targets.",
    Icon: Zap,
  },
  {
    id: "outcome",
    label: "Outcome",
    description:
      "Wellness averages (sleep, stress, energy) from your check-in data.",
    Icon: HeartPulse,
  },
  {
    id: "nutrition",
    label: "Nutrition",
    description:
      "Calories, protein, hydration, and meal-plan adherence — each tied to a data source.",
    Icon: Apple,
  },
];

export function CategoryPicker({
  onPick,
}: {
  onPick: (c: GoalWizardCategory) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {CATEGORIES.map(({ id, label, description, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onPick(id)}
          className="flex flex-col items-start text-left rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-highlight)] p-4 min-h-[120px] hover:border-[color-mix(in_srgb,var(--fc-accent-cyan)_45%,transparent)] transition-colors fc-press"
        >
          <Icon
            className="h-8 w-8 mb-2 text-[color:var(--fc-accent-cyan)]"
            aria-hidden
          />
          <span className="text-sm font-semibold fc-text-primary leading-tight">
            {label}
          </span>
          <span className="text-[11px] fc-text-dim mt-1.5 leading-snug">
            {description}
          </span>
        </button>
      ))}
    </div>
  );
}
