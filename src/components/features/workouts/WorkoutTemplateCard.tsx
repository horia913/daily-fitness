"use client";

import React from "react";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Copy, UserPlus, Eye, Dumbbell } from "lucide-react";
import { WorkoutTemplate } from "@/lib/workoutTemplateService";
import { getCategoryAccent } from "@/lib/workoutCategoryColors";
import { cn } from "@/lib/utils";

interface WorkoutTemplateCardProps {
  template: WorkoutTemplate;
  assignmentCount?: number;
  onEdit: () => void;
  onOpenDetails: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAssign?: () => void;
  layout?: "card" | "row";
}

function getPrimaryCategory(template: WorkoutTemplate): string {
  if (template.exercises && template.exercises.length > 0) {
    const firstExercise = template.exercises[0];
    const category = firstExercise.exercise?.category;
    return (
      (typeof category === "string"
        ? category
        : (category as unknown as { name?: string })?.name) ||
      (typeof template.category === "string"
        ? template.category
        : (template.category as unknown as { name?: string })?.name) ||
      "General"
    );
  }
  return (
    typeof template.category === "string"
      ? template.category
      : (template.category as unknown as { name?: string })?.name
  ) || "General";
}

/** First 3–4 exercise names, truncated. */
function getExercisePreview(template: WorkoutTemplate, maxNames = 4): string {
  const names =
    template.exercises
      ?.map((e) => e.exercise?.name)
      .filter((n): n is string => Boolean(n)) ?? [];
  const slice = names.slice(0, maxNames);
  const joined = slice.join(", ");
  if (names.length > maxNames) return `${joined}...`;
  return joined;
}

export default function WorkoutTemplateCard({
  template,
  assignmentCount = 0,
  onEdit,
  onOpenDetails,
  onDelete,
  onDuplicate,
  onAssign,
  layout = "card",
}: WorkoutTemplateCardProps) {
  const primaryCategory = getPrimaryCategory(template);
  const accent = getCategoryAccent(primaryCategory);
  const exerciseCount =
    template.exercise_count ??
    (Array.isArray(template.exercises) ? template.exercises.length : 0);
  const duration = template.estimated_duration ?? 0;

  const eyebrow = `TEMPLATE · ${primaryCategory.toUpperCase().replace(/\s+/g, " ")}`;
  const subtitlePills = (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-[color:var(--fc-glass-soft)] border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)]">
        {exerciseCount} exercises
      </span>
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-[color:var(--fc-glass-soft)] border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)]">
        ~{duration} min
      </span>
    </div>
  );
  const bodyPreview = getExercisePreview(template);

  if (layout === "row") {
    return (
      <div className="flex items-center gap-2 py-2.5 px-1 border-b border-[color:var(--fc-glass-border)]/40">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onOpenDetails}
        >
          <span className="font-medium text-[color:var(--fc-text-primary)] truncate block">
            {template.name}
          </span>
          <span className="text-sm text-gray-400">
            {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} ·{" "}
            {primaryCategory}
          </span>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg fc-btn fc-btn-ghost fc-press"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails();
            }}
            aria-label="View template"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {onAssign && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg fc-btn fc-btn-ghost fc-press fc-text-workouts"
              onClick={(e) => {
                e.stopPropagation();
                onAssign();
              }}
              aria-label="Assign template"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg fc-btn fc-btn-ghost fc-press"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label="Edit template"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg fc-btn fc-btn-ghost fc-press"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            aria-label="Duplicate template"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg fc-btn fc-btn-ghost fc-press text-[color:var(--fc-status-error)] hover:bg-[color:var(--fc-status-error)]/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete template"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppCard
      variant="coach"
      className={cn("border-l-2", accent.border)}
      eyebrow={eyebrow}
      eyebrowIcon={
        <span className={cn("rounded-lg p-2", accent.iconBg)}>
          <Dumbbell className={cn("w-4 h-4", accent.text)} />
        </span>
      }
      title={template.name}
      subtitle={subtitlePills}
      onClick={onOpenDetails}
      actions={
        <>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails();
            }}
            className="flex-1 rounded-xl bg-[color:var(--fc-surface-card)] border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)] hover:bg-[color:var(--fc-glass-soft)] hover:border-[color:var(--fc-glass-border-strong)] fc-press"
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          {onAssign && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onAssign();
              }}
              className="h-9 w-9 rounded-xl fc-btn fc-btn-ghost fc-press fc-text-workouts"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="h-9 w-9 rounded-xl fc-btn fc-btn-ghost fc-press"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="h-9 w-9 rounded-xl fc-btn fc-btn-ghost fc-press"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-9 w-9 rounded-xl fc-btn fc-btn-ghost fc-press text-[color:var(--fc-status-error)] hover:bg-[color:var(--fc-status-error)]/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      }
    >
      {bodyPreview && (
        <p className="text-sm text-[color:var(--fc-text-dim)] line-clamp-2">
          {bodyPreview}
        </p>
      )}
    </AppCard>
  );
}
