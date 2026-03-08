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
}

export default function ProgramCard({
  program,
  onEdit,
  onOpenDetails,
  onDelete,
  onAssign,
  assignmentCount = 0,
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
