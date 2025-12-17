"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Edit, Trash, Calendar, Clock, Target, RefreshCw } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface Goal {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  category:
    | "weight_loss"
    | "muscle_gain"
    | "strength"
    | "endurance"
    | "mobility"
    | "body_composition"
    | "performance"
    | "other";
  type: "target" | "habit" | "milestone";
  target_value?: number;
  target_unit?: string;
  current_value?: number;
  start_date: string;
  target_date?: string;
  status: "active" | "in_progress" | "completed" | "paused" | "cancelled";
  priority: "low" | "medium" | "high";
  created_at: string;
  updated_at: string;
  progress_percentage?: number;
}

interface GoalCardProps {
  goal: Goal;
  isAutoTracked: boolean;
  onDelete?: (goalId: string) => void;
  onUpdate?: (goalId: string, newValue: number) => void;
  onEdit?: (goal: Goal) => void;
}

export function GoalCard({ goal, isAutoTracked, onDelete, onUpdate, onEdit }: GoalCardProps) {
  const { isDark, getSemanticColor } = useTheme();
  const [updateValue, setUpdateValue] = useState<string>(
    goal.current_value?.toString() || "0"
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const progressPercent = Math.min(goal.progress_percentage || 0, 100);
  const isCompleted = goal.status === "completed";
  const isCancelled = goal.status === "cancelled";

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "active":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const handleUpdate = async () => {
    if (!onUpdate) return;
    const numValue = parseFloat(updateValue);
    if (isNaN(numValue)) return;

    setIsUpdating(true);
    try {
      await onUpdate(goal.id, numValue);
      setUpdateValue(numValue.toString());
    } catch (error) {
      console.error("Error updating goal:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getDaysUntilDeadline = (targetDate: string) => {
    const today = new Date();
    const deadline = new Date(targetDate);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDeadline = goal.target_date
    ? getDaysUntilDeadline(goal.target_date)
    : null;

  return (
    <GlassCard
      elevation={2}
      className="p-6 transition-all duration-300 hover:shadow-xl"
      style={{
        background: isDark
          ? `rgba(255,255,255,${isCompleted ? "0.08" : "0.05"})`
          : `rgba(255,255,255,${isCompleted ? "0.95" : "1"})`,
        border: isDark
          ? "1px solid rgba(255,255,255,0.1)"
          : "1px solid rgba(0,0,0,0.1)",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 truncate">
              {goal.title}
            </h3>
            <Badge className={`${getPriorityColor(goal.priority)} rounded-full px-2 py-0.5 text-xs`}>
              {goal.priority}
            </Badge>
            {isCompleted && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full px-2 py-0.5 text-xs">
                ✓ Completed
              </Badge>
            )}
            {isAutoTracked && (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full px-2 py-0.5 text-xs flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Auto
              </Badge>
            )}
          </div>
          {goal.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
              {goal.description}
            </p>
          )}
        </div>
      </div>

      {/* Progress Display */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {goal.current_value || 0} / {goal.target_value || 0} {goal.target_unit || ""}
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div
          className="w-full rounded-full h-3 overflow-hidden"
          style={{
            background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          }}
        >
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(progressPercent, 100)}%`,
              background:
                progressPercent >= 100
                  ? "linear-gradient(90deg, #10B981, #059669)"
                  : progressPercent >= 80
                  ? "linear-gradient(90deg, #8B5CF6, #7C3AED)"
                  : progressPercent >= 50
                  ? "linear-gradient(90deg, #3B82F6, #2563EB)"
                  : "linear-gradient(90deg, #F59E0B, #D97706)",
            }}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Started: {new Date(goal.start_date).toLocaleDateString()}
        </span>
        {goal.target_date && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Due: {new Date(goal.target_date).toLocaleDateString()}
            {daysUntilDeadline !== null && daysUntilDeadline > 0 && (
              <span className="ml-1 text-orange-600 dark:text-orange-400">
                ({daysUntilDeadline} days left)
              </span>
            )}
          </span>
        )}
      </div>

      {/* Status Label */}
      <div
        className="mb-4 p-3 rounded-lg"
        style={{
          background: isAutoTracked
            ? isDark
              ? "rgba(59, 130, 246, 0.15)"
              : "rgba(59, 130, 246, 0.1)"
            : isDark
            ? "rgba(139, 92, 246, 0.15)"
            : "rgba(139, 92, 246, 0.1)",
        }}
      >
        <p
          className="text-xs font-medium flex items-center gap-2"
          style={{
            color: isAutoTracked
              ? isDark
                ? "#60A5FA"
                : "#3B82F6"
              : isDark
              ? "#A78BFA"
              : "#8B5CF6",
          }}
        >
          {isAutoTracked ? (
            <>
              <RefreshCw className="w-3 h-3" />
              Auto-updated from your activities
            </>
          ) : (
            <>
              <Edit className="w-3 h-3" />
              Manual tracking - Update progress below
            </>
          )}
        </p>
      </div>

      {/* Update Section - ONLY for manual goals */}
      {!isAutoTracked && !isCompleted && !isCancelled && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Input
            type="number"
            placeholder="Enter progress"
            value={updateValue}
            onChange={(e) => setUpdateValue(e.target.value)}
            className="flex-1"
            min={0}
            max={goal.target_value}
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            }}
          />
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-4 py-2"
            style={{
              background: getSemanticColor("success").gradient,
            }}
          >
            {isUpdating ? "Updating..." : "Update"}
          </Button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onEdit && !isCompleted && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(goal)}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm(`Delete "${goal.title}"?`)) {
                onDelete(goal.id);
              }
            }}
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash className="w-4 h-4 mr-1" />
            Delete
          </Button>
        )}
      </div>
    </GlassCard>
  );
}

