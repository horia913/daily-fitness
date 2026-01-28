"use client";

import React from "react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/button";
import {
  Dumbbell,
  Clock,
  Users,
  Star,
  Edit,
  Trash2,
  Copy,
  UserPlus,
  Heart,
  Zap,
  Activity,
  Award,
  Eye,
} from "lucide-react";
import { WorkoutTemplate } from "@/lib/workoutTemplateService";

interface WorkoutTemplateCardProps {
  template: WorkoutTemplate;
  assignmentCount?: number;
  onEdit: () => void;
  onOpenDetails: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAssign?: () => void;
}

export default function WorkoutTemplateCard({
  template,
  assignmentCount = 0,
  onEdit,
  onOpenDetails,
  onDelete,
  onDuplicate,
  onAssign,
}: WorkoutTemplateCardProps) {
  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
      case "strength":
        return Dumbbell;
      case "cardio":
        return Heart;
      case "hiit":
        return Zap;
      case "flexibility":
      case "yoga":
      case "pilates":
        return Activity;
      case "crossfit":
        return Zap;
      case "powerlifting":
      case "bodybuilding":
        return Dumbbell;
      case "endurance":
        return Activity;
      case "sports":
        return Award;
      case "rehabilitation":
        return Heart;
      default:
        return Dumbbell;
    }
  };

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

  const getPrimaryCategory = () => {
    if (template.exercises && template.exercises.length > 0) {
      const firstExercise = template.exercises[0];
      const category = firstExercise.exercise?.category;
      return (
        (typeof category === 'string' ? category : (category as any)?.name) || 
        (typeof template.category === 'string' ? template.category : (template.category as any)?.name) || 
        "General"
      );
    }
    return typeof template.category === 'string' ? template.category : (template.category as any)?.name || "General";
  };

  const primaryCategory = getPrimaryCategory();
  const CategoryIcon = getCategoryIcon(primaryCategory);
  const difficultyColor = getDifficultyColor(template.difficulty_level);
  const exerciseCount =
    template.exercise_count ??
    (Array.isArray(template.exercises) ? template.exercises.length : 0);

  return (
    <div
      onClick={onOpenDetails}
      className="cursor-pointer fc-glass fc-card rounded-3xl border border-[color:var(--fc-glass-border)] overflow-hidden transition-all duration-300 fc-hover-rise"
    >
      {/* Header */}
      <div className="relative h-24 flex items-center justify-center fc-glass-soft">
        {/* Category Icon */}
        <div className="fc-icon-tile fc-icon-workouts w-14 h-14">
          <CategoryIcon className="w-7 h-7" />
        </div>

        {/* Difficulty Badge */}
        <div className="absolute top-3 left-3">
          <span className={`fc-pill fc-pill-glass text-xs font-semibold capitalize ${difficultyColor}`}>
            {template.difficulty_level}
          </span>
        </div>

        {/* Duration Badge */}
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full fc-glass-soft border border-[color:var(--fc-glass-border)]">
            <Clock className="w-3.5 h-3.5 fc-text-subtle" />
            <span className="text-xs font-semibold fc-text-primary">
              {template.estimated_duration}m
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Title & Category */}
        <div>
          <h3 className="text-lg font-bold mb-1 line-clamp-2 fc-text-primary">
            {template.name}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
              {primaryCategory}
            </span>
            <span className={`fc-pill fc-pill-glass text-xs capitalize ${difficultyColor}`}>
              {template.difficulty_level}
            </span>
          </div>
          {template.description && (
            <p className="text-sm line-clamp-2 mt-2 fc-text-subtle">
              {template.description}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Exercises */}
          <div className="flex flex-col items-center p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
            <Dumbbell className="w-5 h-5 mb-2 fc-text-workouts" />
            <AnimatedNumber
              value={exerciseCount}
              className="text-xl font-bold fc-text-primary"
              color="currentColor"
            />
            <span className="text-xs fc-text-subtle">
              exercises
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

          {/* Rating */}
          <div className="flex flex-col items-center p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
            <Star className="w-5 h-5 mb-2 fc-text-workouts" />
            <AnimatedNumber
              value={template.rating || 0}
              decimals={1}
              className="text-xl font-bold fc-text-primary"
              color="currentColor"
            />
            <span className="text-xs fc-text-subtle">
              rating
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

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="fc-btn fc-btn-ghost fc-press"
          >
            <Copy className="w-4 h-4" />
          </Button>

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
        </div>
      </div>
    </div>
  );
}
