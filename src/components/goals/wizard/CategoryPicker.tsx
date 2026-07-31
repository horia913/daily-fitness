"use client";

import type { GoalWizardCategory } from "@/lib/goalCreationService";
import { Scale, Zap, HeartPulse, Apple, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CATEGORIES: {
  id: GoalWizardCategory;
  label: string;
  description: string;
  Icon: LucideIcon;
  accent: string;
  soft: string;
}[] = [
  {
    id: "body_composition",
    label: "Body composition",
    description: "Weight, body fat, or muscle targets tied to your metrics.",
    Icon: Scale,
    accent: "var(--fc-group-d)",
    soft: "color-mix(in srgb, var(--fc-group-d) 14%, transparent)",
  },
  {
    id: "performance",
    label: "Performance",
    description: "Strength PRs and endurance targets.",
    Icon: Zap,
    accent: "var(--fc-domain-workouts)",
    soft: "color-mix(in srgb, var(--fc-domain-workouts) 14%, transparent)",
  },
  {
    id: "outcome",
    label: "Outcome",
    description:
      "Wellness averages (sleep, stress, energy) from your check-in data.",
    Icon: HeartPulse,
    accent: "var(--fc-status-warning)",
    soft: "color-mix(in srgb, var(--fc-status-warning) 14%, transparent)",
  },
  {
    id: "nutrition",
    label: "Nutrition",
    description:
      "Calories, protein, hydration, and meal-plan adherence — each tied to a data source.",
    Icon: Apple,
    accent: "var(--fc-domain-meals)",
    soft: "color-mix(in srgb, var(--fc-domain-meals) 14%, transparent)",
  },
];

export function CategoryPicker({
  onPick,
}: {
  onPick: (c: GoalWizardCategory) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {CATEGORIES.map(({ id, label, description, Icon, accent, soft }) => (
        <button
          key={id}
          type="button"
          onClick={() => onPick(id)}
          className="group relative flex w-full items-center gap-3 overflow-hidden rounded-[13px] border border-[color:var(--fc-hairline)] bg-transparent px-3 py-3 text-left transition-colors hover:bg-[color:var(--fc-surface-tint)]"
        >
          <span
            className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-[3px]"
            style={{ background: accent }}
            aria-hidden
          />
          <span
            className="ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]"
            style={{ background: soft, color: accent }}
            aria-hidden
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className="block text-[14px] font-bold leading-tight fc-text-primary"
              style={{ fontFamily: "var(--f-display)" }}
            >
              {label}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug fc-text-dim">
              {description}
            </span>
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 fc-text-subtle transition-colors group-hover:text-[color:var(--fc-accent)]"
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}
