"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Edit, Trash2, UserPlus, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface Program {
  id: string;
  name: string;
  description?: string;
  coach_id: string;
  difficulty_level: "beginner" | "intermediate" | "advanced" | "athlete";
  duration_weeks: number;
  target_audience: string;
  category?: string | null;
  is_public?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProgramCardProps {
  program: Program;
  onEdit: () => void;
  onOpenDetails: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
  assignmentCount?: number;
  /** Dense single-row layout for small screens / list mode */
  layout?: "card" | "row";
}

export default function ProgramCard({
  program,
  onEdit,
  onOpenDetails,
  onDelete,
  onAssign,
  assignmentCount = 0,
  layout = "card",
}: ProgramCardProps) {
  const difficultyLabel =
    program.difficulty_level.charAt(0).toUpperCase() +
    program.difficulty_level.slice(1);
  const eyebrowLine = [
    "Program",
    difficultyLabel,
    !program.is_active ? "Inactive" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const tagLabel =
    program.category?.trim() ||
    difficultyLabel;

  const subtitlePills = (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center rounded-full border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] px-2 py-0.5 text-xs text-[color:var(--fc-text-primary)]">
        {program.duration_weeks} weeks
      </span>
      <span className="inline-flex items-center rounded-full border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] px-2 py-0.5 text-xs text-[color:var(--fc-text-primary)]">
        {assignmentCount} client{assignmentCount !== 1 ? "s" : ""} assigned
      </span>
    </div>
  );

  if (layout === "row") {
    return (
      <div className="flex items-center gap-2 border-b border-[color:var(--fc-glass-border)]/40 py-2.5 px-1">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onOpenDetails}
        >
          <span className="block truncate font-medium text-[color:var(--fc-text-primary)]">
            {program.name}
          </span>
          <span className="text-sm text-gray-400">
            {program.duration_weeks} wk · {assignmentCount}{" "}
            {assignmentCount === 1 ? "client" : "clients"}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg fc-btn fc-btn-ghost fc-press"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails();
            }}
            aria-label="View program"
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
              aria-label="Assign program"
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
            aria-label="Edit program"
          >
            <Edit className="w-4 h-4" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg fc-btn fc-btn-ghost fc-press text-[color:var(--fc-status-error)] hover:bg-[color:var(--fc-status-error)]/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Delete program"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  const isInteractive = true;

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onOpenDetails}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenDetails();
              }
            }
          : undefined
      }
      className={cn(
        "mb-0 overflow-hidden rounded-[22px] border border-[color:var(--fc-glass-border)] bg-[var(--fc-surface-card)] shadow-[var(--fc-shadow-card)] transition-all duration-200",
        "cursor-pointer fc-hover-rise hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.35)]"
      )}
    >
      <div className="space-y-3 p-4 sm:p-5">
        <Eyebrow tone="dim" className="mb-2">
          <span className="inline-flex items-center gap-2">
            <Dumbbell className="h-4 w-4 shrink-0 opacity-80 [&_svg]:pointer-events-none" />
            {eyebrowLine}
          </span>
        </Eyebrow>

        <h3
          className="line-clamp-2 text-lg font-bold leading-tight text-[color:var(--fc-text-primary)]"
          data-slot="program-card-title"
        >
          {program.name}
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="status-info">{tagLabel}</Badge>
        </div>

        <div className="text-sm text-[color:var(--fc-text-dim)]" data-slot="program-card-subtitle">
          {subtitlePills}
        </div>

        {program.description ? (
          <p className="line-clamp-2 text-sm text-[color:var(--fc-text-dim)]">{program.description}</p>
        ) : null}
      </div>

      <div
        className="flex items-center gap-2 border-t border-[color:var(--fc-glass-border)] px-4 py-3 sm:px-5"
        data-slot="program-card-actions"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails();
          }}
          className="flex-1 rounded-xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-card)] text-[color:var(--fc-text-primary)] hover:border-[color:var(--fc-glass-border-strong)] hover:bg-[color:var(--fc-glass-soft)] fc-press"
        >
          <Eye className="mr-2 h-4 w-4" />
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
            <UserPlus className="h-4 w-4" />
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
          <Edit className="h-4 w-4" />
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-9 w-9 rounded-xl fc-btn fc-btn-ghost fc-press text-[color:var(--fc-status-error)] hover:bg-[color:var(--fc-status-error)]/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
