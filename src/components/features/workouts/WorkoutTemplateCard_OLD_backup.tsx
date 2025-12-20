"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell,
  Clock,
  Users,
  Star,
  Settings,
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
        return Activity;
      case "yoga":
        return Activity;
      case "pilates":
        return Activity;
      case "crossfit":
        return Zap;
      case "powerlifting":
        return Dumbbell;
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

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "24px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        overflow: "hidden",
        cursor: "pointer",
      }}
      className="hover:shadow-xl transition-all duration-300"
      onClick={onOpenDetails}
    >
      <div className="h-full flex flex-col">
        {/* Template Header */}
        <div
          className="relative"
          style={{
            height: "96px",
            background: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
          }}
        >
          {/* Category Icon */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "16px",
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CategoryIcon
                style={{ width: "24px", height: "24px", color: "#FFFFFF" }}
              />
            </div>
          </div>

          {/* Difficulty Badge */}
          <div
            className="absolute"
            style={{
              top: "8px",
              left: "8px",
              maxWidth: "calc(100% - 80px)",
              overflow: "hidden",
            }}
          >
            <Badge
              style={{
                backgroundColor:
                  template.difficulty_level === "beginner"
                    ? "#D1FAE5"
                    : template.difficulty_level === "intermediate"
                    ? "#FEF3C7"
                    : "#FEE2E2",
                color:
                  template.difficulty_level === "beginner"
                    ? "#065F46"
                    : template.difficulty_level === "intermediate"
                    ? "#92400E"
                    : "#991B1B",
                borderRadius: "12px",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: "600",
                border: "0",
                maxWidth: "100%",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {template.difficulty_level}
            </Badge>
          </div>

          {/* Duration */}
          <div
            className="absolute"
            style={{
              top: "8px",
              right: "8px",
              maxWidth: "calc(100% - 80px)",
              overflow: "hidden",
            }}
          >
            <div
              className="flex items-center gap-1.5"
              style={{
                padding: "6px 10px",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(10px)",
                borderRadius: "12px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                maxWidth: "100%",
              }}
            >
              <Clock
                style={{
                  width: "14px",
                  height: "14px",
                  color: "#6B7280",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#1A1A1A",
                  whiteSpace: "nowrap",
                }}
              >
                {template.estimated_duration}m
              </span>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div style={{ padding: "20px" }} className="space-y-4 flex-1">
          {/* Template Name & Description Card */}
          <div
            style={{
              padding: "16px",
              backgroundColor: "#F9FAFB",
              borderRadius: "16px",
              border: "2px solid #E5E7EB",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "#1A1A1A",
                marginBottom: "8px",
              }}
            >
              {template.name}
            </h3>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#6C5CE7",
                marginBottom: "8px",
                display: "block",
              }}
            >
              {primaryCategory}
            </span>
            {template.description && (
              <p
                className="line-clamp-2"
                style={{
                  fontSize: "14px",
                  fontWeight: "400",
                  color: "#6B7280",
                  marginTop: "12px",
                }}
              >
                {template.description}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div
              className="flex flex-col items-center"
              style={{
                padding: "16px",
                backgroundColor: "#DBEAFE",
                borderRadius: "16px",
                border: "2px solid #93C5FD",
              }}
            >
              <Dumbbell
                style={{
                  width: "24px",
                  height: "24px",
                  marginBottom: "8px",
                  color: "#2196F3",
                }}
              />
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#1A1A1A",
                }}
              >
                {template.exercises?.length || 0}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "400",
                  color: "#6B7280",
                }}
              >
                exercises
              </span>
            </div>
            <div
              className="flex flex-col items-center"
              style={{
                padding: "16px",
                backgroundColor: "#D1FAE5",
                borderRadius: "16px",
                border: "2px solid #6EE7B7",
              }}
            >
              <Users
                style={{
                  width: "24px",
                  height: "24px",
                  marginBottom: "8px",
                  color: "#4CAF50",
                }}
              />
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#1A1A1A",
                }}
              >
                {assignmentCount}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "400",
                  color: "#6B7280",
                }}
              >
                clients
              </span>
            </div>
            <div
              className="flex flex-col items-center"
              style={{
                padding: "16px",
                backgroundColor: "#FEF3C7",
                borderRadius: "16px",
                border: "2px solid #FDE68A",
              }}
            >
              <Star
                style={{
                  width: "24px",
                  height: "24px",
                  marginBottom: "8px",
                  color: "#FFE082",
                }}
              />
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#1A1A1A",
                }}
              >
                {template.rating || 0}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "400",
                  color: "#6B7280",
                }}
              >
                rating
              </span>
            </div>
          </div>

          {/* Actions */}
          <div
            className="flex items-center gap-2"
            style={{
              paddingTop: "12px",
              borderTop: "2px solid #E5E7EB",
            }}
          >
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails();
              }}
              className="flex-1 text-white"
              style={{
                borderRadius: "20px",
                padding: "12px 16px",
                fontSize: "14px",
                fontWeight: "600",
                background: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              <span>View</span>
            </Button>
            {onAssign && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssign();
                }}
                style={{
                  borderRadius: "20px",
                  padding: "10px",
                  border: "2px solid #4CAF50",
                  color: "#4CAF50",
                  backgroundColor: "transparent",
                }}
                className="hover:bg-green-50"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{
                borderRadius: "20px",
                padding: "10px",
                border: "2px solid #E5E7EB",
                backgroundColor: "transparent",
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              style={{
                borderRadius: "20px",
                padding: "10px",
                border: "2px solid #E5E7EB",
                backgroundColor: "transparent",
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{
                borderRadius: "20px",
                padding: "10px",
                border: "2px solid #EF4444",
                color: "#EF4444",
                backgroundColor: "transparent",
              }}
              className="hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
