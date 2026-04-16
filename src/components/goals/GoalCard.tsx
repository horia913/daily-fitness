"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Edit, Trash, Calendar } from "lucide-react";

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
  pillar: "training" | "nutrition" | "lifestyle" | "checkins" | "general";
  goal_type?: string | null;
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

function getPillarEmoji(pillar: string): string {
  const map: Record<string, string> = {
    training: "🏋️",
    nutrition: "🥗",
    lifestyle: "🌱",
    checkins: "✅",
    general: "🎯",
  };
  return map[pillar] ?? "🎯";
}

function getPillarLabel(pillar: string): string {
  return pillar.charAt(0).toUpperCase() + pillar.slice(1);
}

function getPillarAccentColor(pillar: string): string {
  const map: Record<string, string> = {
    training: "var(--fc-domain-workouts)",
    nutrition: "var(--fc-domain-meals)",
    checkins: "var(--fc-accent-purple)",
    lifestyle: "var(--fc-status-warning)",
    general: "var(--fc-domain-neutral)",
  };
  return map[pillar] ?? "var(--fc-domain-neutral)";
}

function getPillarTintClass(pillar: string): string {
  const map: Record<string, string> = {
    training: "bg-blue-50/30 dark:bg-blue-900/10",
    nutrition: "bg-emerald-50/30 dark:bg-emerald-900/10",
    checkins: "bg-purple-50/30 dark:bg-purple-900/10",
    lifestyle: "bg-amber-50/30 dark:bg-amber-900/10",
    general: "bg-gray-50/20 dark:bg-gray-800/10",
  };
  return map[pillar] ?? "bg-gray-50/20 dark:bg-gray-800/10";
}

function getTrajectoryStatusTag(goal: Goal): { label: string; className: string } {
  if (goal.status === "completed") return { label: "Completed", className: "fc-text-success bg-[color:var(--fc-status-success)]/20 border-[color:var(--fc-status-success)]/30" };
  if (goal.status === "cancelled") return { label: "Cancelled", className: "fc-text-error bg-[color:var(--fc-status-error)]/20 border-[color:var(--fc-status-error)]/30" };
  if (goal.status === "paused") return { label: "Paused", className: "fc-text-warning bg-[color:var(--fc-status-warning)]/20 border-[color:var(--fc-status-warning)]/30" };
  const statusLabel = "Active";
  const prioritySuffix = goal.priority === "high" ? " · High" : "";
  return { label: `${statusLabel}${prioritySuffix}`, className: "fc-text-workouts bg-[color:var(--fc-domain-workouts)]/20 border-[color:var(--fc-domain-workouts)]/30" };
}

export function GoalCard({ goal, isAutoTracked, onDelete, onUpdate, onEdit, compact = false }: GoalCardProps) {
  const [updateValue, setUpdateValue] = useState<string>(
    goal.current_value?.toString() || "0"
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const progressPercent = Math.min(goal.progress_percentage || 0, 100);
  const isCompleted = goal.status === "completed";
  const isCancelled = goal.status === "cancelled";

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

  const trajectoryTag = getTrajectoryStatusTag(goal);
  const eyebrow = `${getPillarEmoji(goal.pillar)} ${getPillarLabel(goal.pillar).toUpperCase()} · ${trajectoryTag.label}`;

  /* Compact row for completed-goals list */
  if (compact && isCompleted) {
    return (
      <div className="flex min-h-[48px] items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <CheckCircle className="h-4 w-4 shrink-0 fc-text-success" />
          <div className="min-w-0">
            <div className="text-sm font-semibold fc-text-primary">{goal.title}</div>
            <div className="mt-0.5 font-mono text-[11px] tabular-nums fc-text-subtle">
              Final: {goal.current_value ?? goal.target_value ?? "—"} {goal.target_unit ?? ""} · {goal.target_date ? new Date(goal.target_date).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>
        <span className="fc-pill fc-pill-glass shrink-0 border border-[color:var(--fc-status-success)]/30 text-[10px] font-semibold uppercase tracking-wide fc-text-success">
          Completed
        </span>
      </div>
    );
  }

  /* Trajectory card — one source for background: pillar tint only (no fc-glass) so tint is visible */
  const accentColor = getPillarAccentColor(goal.pillar);
  const pillarTint = getPillarTintClass(goal.pillar);
  return (
    <div
      className={`flex flex-col justify-between rounded-xl border border-white/10 border-l-[3px] bg-white/[0.04] p-4 ${pillarTint}`}
      style={{ borderLeftColor: accentColor }}
    >
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          {eyebrow}
        </p>
        <h3 className="mb-1 text-base font-semibold tracking-tight text-white">{goal.title}</h3>
        {goal.description && (
          <p className="mb-3 text-sm leading-relaxed text-gray-400 line-clamp-2">{goal.description}</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-mono tabular-nums text-white">
          {goal.current_value ?? 0}{goal.target_unit ? ` ${goal.target_unit}` : ""} / {goal.target_value ?? "—"}{goal.target_unit ? ` ${goal.target_unit}` : ""}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        <div className="flex items-center gap-2 pt-0.5 text-[11px] text-gray-500">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>
            {goal.target_date
              ? `Deadline: ${new Date(goal.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}${daysUntilDeadline != null ? ` (${daysUntilDeadline} day${daysUntilDeadline !== 1 ? "s" : ""} left)` : ""}`
              : "No deadline"}
          </span>
        </div>
      </div>

      {/* Manual update + actions: compact row */}
      {(!isAutoTracked || onEdit || onDelete) && !isCompleted && !isCancelled && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
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

