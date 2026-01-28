"use client";

import React from "react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  TrendingUp,
  Users,
  Dumbbell,
  Target,
  Award,
  Zap,
  Activity,
  Edit,
  Trash2,
  UserPlus,
  Eye,
} from "lucide-react";

interface Program {
  id: string;
  name: string;
  description?: string;
  coach_id: string;
  difficulty_level: "beginner" | "intermediate" | "advanced" | "athlete";
  duration_weeks: number;
  target_audience: string;
  category?: string | null; // Training category for volume calculator
  is_public?: boolean; // Optional - not in database schema
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

function getTargetAudienceIcon(audience: string) {
  switch (audience?.toLowerCase()) {
    case "strength":
      return Dumbbell;
    case "weight_loss":
      return Target;
    case "muscle_gain":
      return Zap;
    case "endurance":
      return Activity;
    case "athletic_performance":
      return Award;
    case "general_fitness":
    default:
      return Users;
  }
}

export default function ProgramCard({
  program,
  onEdit,
  onOpenDetails,
  onDelete,
  onAssign,
  assignmentCount = 0,
}: ProgramCardProps) {
  const TargetIcon = getTargetAudienceIcon(program.target_audience);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "fc-text-success";
      case "intermediate":
        return "fc-text-warning";
      case "advanced":
        return "fc-text-error";
      default:
        return "fc-text-subtle";
    }
  };

  const difficultyColor = getDifficultyColor(program.difficulty_level);

  return (
    <div
      onClick={onOpenDetails}
      className="cursor-pointer fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)] overflow-hidden transition-all duration-300 fc-hover-rise"
    >
      {/* Header */}
      <div className="relative h-24 flex items-center justify-center fc-glass-soft">
        {/* Target Audience Icon */}
        <div className="fc-icon-tile fc-icon-workouts w-14 h-14">
          <TargetIcon className="w-7 h-7" />
        </div>

        {/* Difficulty Badge */}
        <div className="absolute top-3 left-3">
          <span className={`fc-pill fc-pill-glass text-xs capitalize ${difficultyColor}`}>
            {program.difficulty_level}
          </span>
        </div>

        {/* Duration Badge */}
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full fc-glass-soft border border-[color:var(--fc-glass-border)]">
            <Calendar className="w-3.5 h-3.5 fc-text-subtle" />
            <span className="text-xs font-semibold fc-text-primary">
              {program.duration_weeks}w
            </span>
          </div>
        </div>

        {/* Active/Inactive Badge */}
        {!program.is_active && (
          <div className="absolute bottom-3 left-3">
            <span className="fc-pill fc-pill-glass fc-text-subtle text-xs">Inactive</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Title & Description */}
        <div>
          <h3
            className="text-lg font-bold mb-1 line-clamp-2 fc-text-primary"
          >
            {program.name}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="fc-pill fc-pill-glass fc-text-workouts text-xs capitalize">
              {program.target_audience.replace(/_/g, " ")}
            </span>
            {!program.is_active && (
              <span className="fc-pill fc-pill-glass fc-text-subtle text-xs">
                Inactive
              </span>
            )}
          </div>
          {program.description && (
            <p
              className="text-sm line-clamp-2 mt-2 fc-text-subtle"
            >
              {program.description}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Duration */}
          <div className="flex flex-col items-center p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
            <Calendar className="w-5 h-5 mb-2 fc-text-workouts" />
            <AnimatedNumber
              value={program.duration_weeks}
              className="text-xl font-bold fc-text-primary"
              color="currentColor"
            />
            <span className="text-xs fc-text-subtle">
              weeks
            </span>
          </div>

          {/* Clients */}
          <div className="flex flex-col items-center p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
            <Users className="w-5 h-5 mb-2 fc-text-workouts" />
            <AnimatedNumber
              value={assignmentCount}
              className="text-xl font-bold fc-text-primary"
              color="currentColor"
            />
            <span className="text-xs fc-text-subtle">
              clients
            </span>
          </div>

          {/* Progress */}
          <div className="flex flex-col items-center p-3 rounded-xl justify-center fc-glass-soft border border-[color:var(--fc-glass-border)]">
            <TrendingUp className="w-5 h-5 mb-1 fc-text-warning" />
            <span className="text-xs font-semibold text-center fc-text-subtle">
              Progress
            </span>
            <span className="text-xs text-center fc-text-subtle">
              Tracked
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t border-[color:var(--fc-glass-border)]">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails();
            }}
            className="flex-1 fc-btn fc-btn-primary fc-press"
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>

          {onAssign && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAssign();
              }}
              className="fc-btn fc-btn-ghost fc-press fc-text-workouts"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="fc-btn fc-btn-ghost fc-press"
          >
            <Edit className="w-4 h-4" />
          </Button>

          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="fc-btn fc-btn-ghost fc-press fc-text-error"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
