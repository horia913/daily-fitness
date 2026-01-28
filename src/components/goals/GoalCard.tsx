"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Edit, Trash, Calendar, Clock, Target, RefreshCw } from "lucide-react";

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
        return "fc-text-error";
      case "medium":
        return "fc-text-warning";
      case "low":
        return "fc-text-success";
      default:
        return "fc-text-subtle";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "fc-text-success";
      case "active":
        return "fc-text-workouts";
      case "paused":
        return "fc-text-warning";
      case "cancelled":
        return "fc-text-subtle";
      default:
        return "fc-text-subtle";
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
    <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6 transition-all duration-300 fc-hover-rise">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-lg font-bold fc-text-primary truncate">
              {goal.title}
            </h3>
            <span className={`fc-pill fc-pill-glass text-xs ${getPriorityColor(goal.priority)}`}>
              {goal.priority}
            </span>
            <span className={`fc-pill fc-pill-glass text-xs capitalize ${getStatusColor(goal.status)}`}>
              {goal.status.replace(/_/g, " ")}
            </span>
            {isCompleted && (
              <span className="fc-pill fc-pill-glass text-xs fc-text-success">
                ✓ Completed
              </span>
            )}
            {isAutoTracked && (
              <span className="fc-pill fc-pill-glass text-xs fc-text-workouts flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Auto
              </span>
            )}
          </div>
          {goal.description && (
            <p className="text-sm fc-text-dim mb-2">
              {goal.description}
            </p>
          )}
        </div>
      </div>

      {/* Progress Display */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium fc-text-dim">
            {goal.current_value || 0} / {goal.target_value || 0} {goal.target_unit || ""}
          </span>
          <span className="text-sm font-bold fc-text-primary">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div className="w-full rounded-full h-3 overflow-hidden fc-progress-track">
          <div
            className="h-3 rounded-full transition-all duration-500 fc-progress-fill"
            style={{
              width: `${Math.min(progressPercent, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="flex flex-wrap items-center gap-4 text-xs fc-text-subtle mb-4">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Started: {new Date(goal.start_date).toLocaleDateString()}
        </span>
        {goal.target_date && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Due: {new Date(goal.target_date).toLocaleDateString()}
            {daysUntilDeadline !== null && daysUntilDeadline > 0 && (
              <span className="ml-1 fc-text-warning">
                ({daysUntilDeadline} days left)
              </span>
            )}
          </span>
        )}
      </div>

      {/* Status Label */}
      <div className="mb-4 p-3 rounded-lg fc-glass-soft border border-[color:var(--fc-glass-border)]">
        <p className={`text-xs font-medium flex items-center gap-2 ${isAutoTracked ? "fc-text-workouts" : "fc-text-habits"}`}>
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
            className="flex-1 fc-glass-soft border border-[color:var(--fc-glass-border)]"
            min={0}
            max={goal.target_value}
          />
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-4 py-2 fc-btn fc-btn-primary fc-press"
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
            className="flex-1 fc-btn fc-btn-secondary"
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
            className="flex-1 fc-btn fc-btn-secondary fc-text-error"
          >
            <Trash className="w-4 h-4 mr-1" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

