"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { GlassCard } from "@/components/ui/GlassCard";
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
  difficulty_level: "beginner" | "intermediate" | "advanced";
  duration_weeks: number;
  target_audience: string;
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
  const { isDark, getSemanticColor } = useTheme();
  const TargetIcon = getTargetAudienceIcon(program.target_audience);

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

  const difficultyColor = getDifficultyColor(program.difficulty_level);

  return (
    <div 
      onClick={onOpenDetails} 
      className="cursor-pointer"
      style={{
        boxShadow: isDark
          ? "0 4px 12px rgba(0,0,0,0.3)"
          : "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
    <GlassCard
      elevation={2}
      className="overflow-hidden transition-all duration-300 hover:scale-[1.02]"
    >
      {/* Header with gradient background */}
      <div
        className="relative h-24 flex items-center justify-center"
        style={{
          background: getSemanticColor("success").gradient,
        }}
      >
        {/* Target Audience Icon */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.25)",
            backdropFilter: "blur(10px)",
          }}
        >
          <TargetIcon className="w-7 h-7 text-white" />
        </div>

        {/* Difficulty Badge */}
        <div className="absolute top-3 left-3">
          <span
            className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize"
            style={{
              background: `${difficultyColor}20`,
              color: difficultyColor,
            }}
          >
            {program.difficulty_level}
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
            <Calendar className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
            <span
              className="text-xs font-semibold"
              style={{ color: "#1A1A1A" }}
            >
              {program.duration_weeks}w
            </span>
          </div>
        </div>

        {/* Active/Inactive Badge */}
        {!program.is_active && (
          <div className="absolute bottom-3 left-3">
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: `${getSemanticColor("neutral").primary}30`,
                color: getSemanticColor("neutral").primary,
              }}
            >
              Inactive
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Title & Description */}
        <div>
          <h3
            className="text-lg font-bold mb-1 line-clamp-2"
            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
          >
            {program.name}
          </h3>
          <span
            className="text-sm font-semibold capitalize"
            style={{ color: getSemanticColor("success").primary }}
          >
            {program.target_audience.replace(/_/g, " ")}
          </span>
          {program.description && (
            <p
              className="text-sm line-clamp-2 mt-2"
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
              }}
            >
              {program.description}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Duration */}
          <div
            className="flex flex-col items-center p-3 rounded-xl"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.03)",
            }}
          >
            <Calendar
              className="w-5 h-5 mb-2"
              style={{ color: getSemanticColor("trust").primary }}
            />
            <AnimatedNumber
              value={program.duration_weeks}
              className="text-xl font-bold"
              color={isDark ? "#fff" : "#1A1A1A"}
            />
            <span
              className="text-xs"
              style={{
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
              }}
            >
              weeks
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

          {/* Progress */}
          <div
            className="flex flex-col items-center p-3 rounded-xl justify-center"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.03)",
            }}
          >
            <TrendingUp
              className="w-5 h-5 mb-1"
              style={{ color: getSemanticColor("warning").primary }}
            />
            <span
              className="text-xs font-semibold text-center"
              style={{
                color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
              }}
            >
              Progress
            </span>
            <span
              className="text-xs text-center"
              style={{
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
              }}
            >
              Tracked
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
              background: getSemanticColor("success").gradient,
              boxShadow: `0 4px 12px ${getSemanticColor("success").primary}30`,
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
                color: getSemanticColor("trust").primary,
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

          {onDelete && (
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
          )}
        </div>
      </div>
    </GlassCard>
    </div>
  );
}
