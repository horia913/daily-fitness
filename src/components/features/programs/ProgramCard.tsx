"use client";

import React from "react";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { Dumbbell, Edit, Trash2, UserPlus, Eye } from "lucide-react";

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
  const eyebrow = [
    "PROGRAM",
    difficultyLabel,
    !program.is_active ? "INACTIVE" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const subtitlePills = (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-[color:var(--fc-glass-soft)] border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)]">
        {program.duration_weeks} weeks
      </span>
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-[color:var(--fc-glass-soft)] border border-[color:var(--fc-glass-border)] text-[color:var(--fc-text-primary)]">
        {assignmentCount} client{assignmentCount !== 1 ? "s" : ""} assigned
      </span>
    </div>
  );

  if (layout === "row") {
    return (
      <div className="flex items-center gap-2 py-2.5 px-1 border-b border-[color:var(--fc-glass-border)]/40">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onOpenDetails}
        >
          <span className="font-medium text-[color:var(--fc-text-primary)] truncate block">
            {program.name}
          </span>
          <span className="text-sm text-gray-400">
            {program.duration_weeks} wk · {assignmentCount}{" "}
            {assignmentCount === 1 ? "client" : "clients"}
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

  return (
    <AppCard
      variant="coach"
      accentColor="var(--fc-accent-cyan)"
      eyebrow={eyebrow}
      eyebrowIcon={<Dumbbell className="w-4 h-4" />}
      title={program.name}
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
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </>
      }
    >
      {program.description && (
        <p className="text-sm line-clamp-2 text-[color:var(--fc-text-dim)]">
          {program.description}
        </p>
      )}
    </AppCard>
  );
}
