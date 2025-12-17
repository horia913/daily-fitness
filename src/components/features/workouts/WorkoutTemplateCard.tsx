"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { GlassCard } from "@/components/ui/GlassCard";
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
  BarChart3,
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
  const { isDark, getSemanticColor } = useTheme();

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
        return getSemanticColor("success").primary;
      case "intermediate":
        return getSemanticColor("warning").primary;
      case "advanced":
        return getSemanticColor("critical").primary;
      default:
        return getSemanticColor("neutral").primary;
    }
  };

  const getPrimaryCategory = () => {
    if (template.exercises && template.exercises.length > 0) {
      const firstExercise = template.exercises[0];
      return (
        firstExercise.exercise?.category?.name || template.category || "General"
      );
    }
    return template.category || "General";
  };

  const primaryCategory = getPrimaryCategory();
  const CategoryIcon = getCategoryIcon(primaryCategory);
  const difficultyColor = getDifficultyColor(template.difficulty_level);
  const exerciseCount =
    template.exercise_count ??
    (Array.isArray(template.exercises) ? template.exercises.length : 0);

  return (
    <GlassCard
      elevation={2}
      className="overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02]"
      onClick={onOpenDetails}
      style={{
        boxShadow: isDark
          ? "0 4px 12px rgba(0,0,0,0.3)"
          : "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      {/* Header with gradient background */}
      <div
        className="relative h-24 flex items-center justify-center"
        style={{
          background: getSemanticColor("trust").gradient,
        }}
      >
        {/* Category Icon */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.25)",
            backdropFilter: "blur(10px)",
          }}
        >
          <CategoryIcon className="w-7 h-7 text-white" />
        </div>

        {/* Difficulty Badge */}
        <div className="absolute top-3 left-3">
          <span
            className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize"
            style={{
              background: "#FFFFFF",
              color: difficultyColor,
            }}
          >
            {template.difficulty_level}
          </span>
        </div>

        {/* Duration Badge */}
        <div className="absolute top-3 right-3">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Clock className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
            <span
              className="text-xs font-semibold"
              style={{ color: "#1A1A1A" }}
            >
              {template.estimated_duration}m
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Title & Category */}
        <div>
          <h3
            className="text-lg font-bold mb-1 line-clamp-2"
            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
          >
            {template.name}
          </h3>
          <span
            className="text-sm font-semibold"
            style={{ color: getSemanticColor("trust").primary }}
          >
            {primaryCategory}
          </span>
          {template.description && (
            <p
              className="text-sm line-clamp-2 mt-2"
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              {template.description}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Exercises */}
          <div
            className="flex flex-col items-center p-3 rounded-xl"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.03)",
            }}
          >
            <Dumbbell
              className="w-5 h-5 mb-2"
              style={{ color: getSemanticColor("trust").primary }}
            />
            <AnimatedNumber
              value={exerciseCount}
              className="text-xl font-bold"
              color={isDark ? "#fff" : "#1A1A1A"}
            />
            <span
              className="text-xs"
              style={{
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
              }}
            >
              exercises
            </span>
          </div>

          {/* Clients */}
          <div
            className="flex flex-col items-center p-3 rounded-xl"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.03)",
            }}
          >
            <Users
              className="w-5 h-5 mb-2"
              style={{ color: getSemanticColor("success").primary }}
            />
            <AnimatedNumber
              value={assignmentCount}
              className="text-xl font-bold"
              color={isDark ? "#fff" : "#1A1A1A"}
            />
            <span
              className="text-xs"
              style={{
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
              }}
            >
              clients
            </span>
          </div>

          {/* Rating */}
          <div
            className="flex flex-col items-center p-3 rounded-xl"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.03)",
            }}
          >
            <Star
              className="w-5 h-5 mb-2"
              style={{ color: getSemanticColor("warning").primary }}
            />
            <AnimatedNumber
              value={template.rating || 0}
              decimals={1}
              className="text-xl font-bold"
              color={isDark ? "#fff" : "#1A1A1A"}
            />
            <span
              className="text-xs"
              style={{
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
              }}
            >
              rating
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className="flex items-center gap-2 pt-4"
          style={{
            borderTop: `1px solid ${
              isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
            }`,
          }}
        >
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails();
            }}
            className="flex-1"
            style={{
              background: getSemanticColor("trust").gradient,
              boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
            }}
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
              style={{
                color: getSemanticColor("success").primary,
              }}
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
            style={{
              color: getSemanticColor("critical").primary,
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
