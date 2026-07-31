"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Edit, Trash, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  category:
    | "body_composition"
    | "performance"
    | "outcome"
    | "nutrition"
    | "weight_loss"
    | "muscle_gain"
    | "strength"
    | "endurance"
    | "mobility"
    | "other";
  type?: "target" | "habit" | "milestone";
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

function getPillarLabel(pillar: string): string {
  if (pillar === "checkins") return "Body";
  return pillar.charAt(0).toUpperCase() + pillar.slice(1);
}

function resolveDisplayPillar(goal: Goal): Goal["pillar"] {
  const cat = goal.category as string;
  if (cat === "behavioral") return "lifestyle";
  switch (goal.category) {
    case "body_composition":
    case "weight_loss":
    case "muscle_gain":
      return "checkins";
    case "nutrition":
      return "nutrition";
    case "outcome":
      return "lifestyle";
    case "performance":
    case "strength":
    case "endurance":
    case "mobility":
      return "training";
    default:
      return goal.pillar;
  }
}

function getPillarAccentColor(pillar: string): string {
  const map: Record<string, string> = {
    training: "var(--fc-domain-workouts)",
    nutrition: "var(--fc-domain-meals)",
    checkins: "var(--fc-group-d)",
    lifestyle: "var(--fc-status-warning)",
    general: "var(--fc-accent)",
  };
  return map[pillar] ?? "var(--fc-accent)";
}

function getStatusLabel(goal: Goal): string {
  if (goal.status === "completed") return "Completed";
  if (goal.status === "cancelled") return "Cancelled";
  if (goal.status === "paused") return "Paused";
  const prioritySuffix = goal.priority === "high" ? " · High" : "";
  return `Active${prioritySuffix}`;
}

function getStatusColor(goal: Goal): string {
  if (goal.status === "completed") return "var(--fc-status-success)";
  if (goal.status === "cancelled") return "var(--fc-status-error)";
  if (goal.status === "paused") return "var(--fc-status-warning)";
  return "var(--fc-accent)";
}

export function GoalCard({
  goal,
  isAutoTracked,
  onDelete,
  onUpdate,
  onEdit,
  compact = false,
}: GoalCardProps) {
  const [updateValue, setUpdateValue] = useState<string>(
    goal.current_value?.toString() || "0",
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const progressPercent = Math.min(goal.progress_percentage || 0, 100);
  const isCompleted = goal.status === "completed";
  const isCancelled = goal.status === "cancelled";
  const displayPillar = resolveDisplayPillar(goal);
  const accentColor = getPillarAccentColor(displayPillar);
  const statusColor = getStatusColor(goal);

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

  const daysUntilDeadline = goal.target_date
    ? Math.ceil(
        (new Date(goal.target_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  if (compact && isCompleted) {
    return (
      <div className="flex min-h-[48px] items-center justify-between rounded-[13px] border border-[color:var(--fc-hairline)] bg-transparent p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <CheckCircle className="h-4 w-4 shrink-0 text-[color:var(--fc-status-success)]" />
          <div className="min-w-0">
            <div className="text-sm font-semibold fc-text-primary">{goal.title}</div>
            <div className="mt-0.5 font-mono text-[11px] tabular-nums fc-text-subtle">
              Final: {goal.current_value ?? goal.target_value ?? "—"}{" "}
              {goal.target_unit ?? ""} ·{" "}
              {goal.target_date
                ? new Date(goal.target_date).toLocaleDateString()
                : "—"}
            </div>
          </div>
        </div>
        <span
          className="shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide"
          style={{
            color: "var(--fc-status-success)",
            borderColor: "color-mix(in srgb, var(--fc-status-success) 30%, transparent)",
            background: "color-mix(in srgb, var(--fc-status-success) 12%, transparent)",
          }}
        >
          Completed
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col justify-between overflow-hidden rounded-[13px] border border-[color:var(--fc-hairline)] bg-transparent p-4 pl-[18px]"
    >
      <span
        className="absolute bottom-3.5 left-0 top-3.5 w-[3px] rounded-r-[3px]"
        style={{ background: accentColor }}
        aria-hidden
      />

      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <p
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: accentColor }}
          >
            {getPillarLabel(displayPillar)}
          </p>
          <span
            className="rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em]"
            style={{
              color: statusColor,
              borderColor: `color-mix(in srgb, ${statusColor} 30%, transparent)`,
              background: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
            }}
          >
            {getStatusLabel(goal)}
          </span>
          {isAutoTracked ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] fc-text-subtle">
              Auto
            </span>
          ) : null}
        </div>
        <h3
          className="mb-1 text-base font-bold tracking-tight fc-text-primary"
          style={{ fontFamily: "var(--f-display)" }}
        >
          {goal.title}
        </h3>
        {goal.description ? (
          <p className="mb-3 text-sm leading-relaxed fc-text-dim line-clamp-2">
            {goal.description}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p
          className="text-sm tabular-nums fc-text-primary"
          style={{ fontFamily: "var(--f-mono)" }}
        >
          {goal.current_value ?? 0}
          {goal.target_unit ? ` ${goal.target_unit}` : ""}
          {" / "}
          {goal.target_value ?? "—"}
          {goal.target_unit ? ` ${goal.target_unit}` : ""}
          <span className="ml-2 fc-text-subtle">{Math.round(progressPercent)}%</span>
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--fc-surface-tint)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(progressPercent, 100)}%`,
              background: accentColor,
            }}
          />
        </div>
        <div className="flex items-center gap-2 pt-0.5 text-[11px] fc-text-subtle">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span style={{ fontFamily: "var(--f-mono)" }}>
            {goal.target_date
              ? `Deadline ${new Date(goal.target_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}${
                  daysUntilDeadline != null
                    ? ` · ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? "s" : ""} left`
                    : ""
                }`
              : "No deadline"}
          </span>
        </div>
      </div>

      {(!isAutoTracked || onEdit || onDelete) && !isCompleted && !isCancelled ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[color:var(--fc-hairline)] pt-3">
          {!isAutoTracked && onUpdate ? (
            <>
              <Input
                type="number"
                placeholder="Progress"
                value={updateValue}
                onChange={(e) => setUpdateValue(e.target.value)}
                className="h-8 w-24 border border-[color:var(--fc-hairline)] bg-[color:var(--fc-surface-well)] text-sm"
                min={0}
                max={goal.target_value}
              />
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="fc-btn fc-btn-primary fc-press h-8"
              >
                {isUpdating ? "…" : "Update"}
              </Button>
            </>
          ) : null}
          {onEdit ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(goal)}
              className={cn(
                "h-8 border border-[color:var(--fc-hairline)] bg-transparent fc-text-dim hover:fc-text-primary",
              )}
            >
              <Edit className="mr-1 h-3.5 w-3.5" /> Edit
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(goal.id)}
              className="h-8 border border-[color:var(--fc-hairline)] bg-transparent text-[color:var(--fc-status-error)]"
            >
              <Trash className="mr-1 h-3.5 w-3.5" /> Delete
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
