"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Edit, Trash, Calendar, Clock, Target, RefreshCw, Scale, Dumbbell, Activity, ChevronDown } from "lucide-react";

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
  /** When true, render compact row for completed-goals list */
  compact?: boolean;
}

function getCategoryIconTile(category: string) {
  const map: Record<string, { Icon: typeof Scale; bg: string; text: string }> = {
    weight_loss: { Icon: Scale, bg: "bg-blue-500/10", text: "text-blue-400" },
    muscle_gain: { Icon: Dumbbell, bg: "bg-red-500/10", text: "text-red-400" },
    body_composition: { Icon: Scale, bg: "bg-blue-500/10", text: "text-blue-400" },
    strength: { Icon: Dumbbell, bg: "bg-red-500/10", text: "text-red-400" },
    endurance: { Icon: Activity, bg: "bg-green-500/10", text: "text-green-400" },
    performance: { Icon: Activity, bg: "bg-green-500/10", text: "text-green-400" },
    mobility: { Icon: Activity, bg: "bg-indigo-500/10", text: "text-indigo-400" },
    other: { Icon: Target, bg: "bg-slate-500/10", text: "text-slate-400" },
  };
  return map[category] || map.other;
}

function getTrajectoryStatusTag(goal: Goal): { label: string; className: string } {
  if (goal.status === "completed") return { label: "Completed", className: "fc-text-success bg-[color:var(--fc-status-success)]/20 border-[color:var(--fc-status-success)]/30" };
  if (goal.status === "cancelled") return { label: "Cancelled", className: "fc-text-error bg-[color:var(--fc-status-error)]/20 border-[color:var(--fc-status-error)]/30" };
  if (goal.status === "paused") return { label: "Paused", className: "fc-text-warning bg-[color:var(--fc-status-warning)]/20 border-[color:var(--fc-status-warning)]/30" };
  const statusLabel = goal.status === "in_progress" ? "Active" : "Active";
  const priorityLabel = goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1);
  return { label: `${statusLabel} · ${priorityLabel}`, className: "fc-text-workouts bg-[color:var(--fc-domain-workouts)]/20 border-[color:var(--fc-domain-workouts)]/30" };
}

export function GoalCard({ goal, isAutoTracked, onDelete, onUpdate, onEdit, compact = false }: GoalCardProps) {
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

  const { Icon: CategoryIcon, bg: iconBg, text: iconText } = getCategoryIconTile(goal.category);
  const trajectoryTag = getTrajectoryStatusTag(goal);

  /* Compact row for completed-goals list */
  if (compact && isCompleted) {
    return (
      <div className="flex items-center justify-between p-4 border border-[color:var(--fc-glass-border)] rounded-xl fc-glass-soft">
        <div className="flex items-center gap-4">
          <CheckCircle className="w-5 h-5 fc-text-success flex-shrink-0" />
          <div>
            <div className="font-semibold fc-text-primary">{goal.title}</div>
            <div className="text-xs fc-text-subtle font-mono">
              Final: {goal.current_value ?? goal.target_value ?? "—"} {goal.target_unit ?? ""} • Completed {goal.target_date ? new Date(goal.target_date).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>
        <span className="fc-pill fc-pill-glass text-xs fc-text-success border border-[color:var(--fc-status-success)]/30">Completed</span>
      </div>
    );
  }

  /* Trajectory card (mockup layout) */
  return (
    <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6 transition-all duration-300 fc-hover-rise flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg} ${iconText}`}>
            <CategoryIcon className="w-6 h-6" />
          </div>
          <span className={`status-tag text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${trajectoryTag.className}`}>
            {trajectoryTag.label}
          </span>
        </div>
        <h3 className="text-xl font-bold fc-text-primary mb-1">{goal.title}</h3>
        {goal.description && (
          <p className="text-sm fc-text-dim mb-6">{goal.description}</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between text-sm font-mono">
          <span className="fc-text-dim">Current: {goal.current_value ?? 0}{goal.target_unit ? ` ${goal.target_unit}` : ""}</span>
          <span className="fc-text-primary">Target: {goal.target_value ?? "—"}{goal.target_unit ? ` ${goal.target_unit}` : ""}</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden fc-progress-track border border-[color:var(--fc-glass-border)]">
          <div
            className="h-full rounded-full transition-all duration-500 fc-progress-fill"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-2 text-xs fc-text-subtle">
            <Calendar className="w-3.5 h-3.5" />
            <span>{goal.target_date ? `Deadline: ${new Date(goal.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "No deadline"}</span>
          </div>
          <span className="font-mono text-xs font-bold fc-text-error">{Math.round(progressPercent)}% DONE</span>
        </div>
      </div>

      {/* Manual update + actions: compact row */}
      {(!isAutoTracked || onEdit || onDelete) && !isCompleted && !isCancelled && (
        <div className="mt-4 pt-4 border-t border-[color:var(--fc-glass-border)] flex flex-wrap items-center gap-2">
          {!isAutoTracked && onUpdate && (
            <>
              <Input
                type="number"
                placeholder="Progress"
                value={updateValue}
                onChange={(e) => setUpdateValue(e.target.value)}
                className="w-24 h-8 text-sm fc-glass-soft border border-[color:var(--fc-glass-border)]"
                min={0}
                max={goal.target_value}
              />
              <Button size="sm" onClick={handleUpdate} disabled={isUpdating} className="fc-btn fc-btn-primary fc-press h-8">
                {isUpdating ? "…" : "Update"}
              </Button>
            </>
          )}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(goal)} className="fc-btn fc-btn-secondary h-8">
              <Edit className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" size="sm" onClick={() => confirm(`Delete "${goal.title}"?`) && onDelete(goal.id)} className="fc-btn fc-btn-secondary fc-text-error h-8">
              <Trash className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

