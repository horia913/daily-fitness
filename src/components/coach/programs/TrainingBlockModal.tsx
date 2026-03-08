"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Trash2 } from "lucide-react";
import {
  TrainingBlock,
  TrainingBlockGoal,
  ProgressionProfile,
  TRAINING_BLOCK_GOALS,
  PROGRESSION_PROFILES,
} from "@/types/trainingBlock";

/** Suggested progression profile when coach changes block goal (coach can accept or pick another). */
const GOAL_SUGGESTED_PROFILE: Record<TrainingBlockGoal, ProgressionProfile> = {
  hypertrophy: "volume_ramp",
  strength: "intensity_ramp",
  power: "intensity_ramp",
  peaking: "taper",
  accumulation: "volume_ramp",
  conditioning: "density_increase",
  deload: "reduction",
  general_fitness: "linear",
  sport_specific: "linear",
  custom: "none",
};
import { TrainingBlockService } from "@/lib/trainingBlockService";

interface TrainingBlockModalProps {
  isOpen: boolean;
  block: TrainingBlock | null;
  programId: string;
  nextBlockOrder: number;
  onSave: (block: TrainingBlock) => void;
  onDelete?: (blockId: string) => void;
  onClose: () => void;
}

export function TrainingBlockModal({
  isOpen,
  block,
  programId,
  nextBlockOrder,
  onSave,
  onDelete,
  onClose,
}: TrainingBlockModalProps) {
  const { isDark, getSemanticColor } = useTheme();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState<TrainingBlockGoal>("custom");
  const [customGoalLabel, setCustomGoalLabel] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [progressionProfile, setProgressionProfile] = useState<ProgressionProfile>("none");
  const [notes, setNotes] = useState("");

  // Sync fields from the block being edited (or reset for new)
  useEffect(() => {
    if (block) {
      setName(block.name);
      setGoal(block.goal);
      setCustomGoalLabel(block.custom_goal_label || "");
      setDurationWeeks(block.duration_weeks);
      setProgressionProfile(block.progression_profile ?? "none");
      setNotes(block.notes || "");
    } else {
      setName("");
      setGoal("custom");
      setCustomGoalLabel("");
      setDurationWeeks(4);
      setProgressionProfile("none");
      setNotes("");
    }
    setConfirmDelete(false);
  }, [block, isOpen]);

  if (!isOpen) return null;

  const isEditing = !!block;

  const inputStyle = {
    background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}`,
    color: isDark ? "#fff" : "#1A1A1A",
  };

  const labelStyle = {
    color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let saved: TrainingBlock | null = null;
      if (isEditing && block) {
        saved = await TrainingBlockService.updateTrainingBlock(block.id, {
          name: name.trim(),
          goal,
          custom_goal_label: goal === "custom" ? customGoalLabel.trim() || null : null,
          duration_weeks: durationWeeks,
          progression_profile: progressionProfile,
          notes: notes.trim() || null,
        });
      } else {
        saved = await TrainingBlockService.createTrainingBlock({
          program_id: programId,
          name: name.trim(),
          goal,
          custom_goal_label: goal === "custom" ? customGoalLabel.trim() || undefined : undefined,
          duration_weeks: durationWeeks,
          block_order: nextBlockOrder,
          progression_profile: progressionProfile,
          notes: notes.trim() || undefined,
        });
      }
      if (saved) {
        onSave(saved);
        onClose();
      }
    } catch (err) {
      console.error("[TrainingBlockModal] Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!block) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const ok = await TrainingBlockService.deleteTrainingBlock(block.id);
      if (ok) {
        onDelete?.(block.id);
        onClose();
      }
    } catch (err) {
      console.error("[TrainingBlockModal] Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal Panel */}
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl"
        style={{
          background: isDark ? "#1a1f2e" : "#ffffff",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          }}
        >
          <h2 className="text-base font-bold" style={labelStyle}>
            {isEditing ? "Edit Training Block" : "New Training Block"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[color:var(--fc-glass-highlight)] transition-colors"
            style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Phase Name */}
          <div>
            <label className="text-sm font-semibold block mb-1.5" style={labelStyle}>
              Block Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Hypertrophy Block"'
              style={inputStyle}
            />
          </div>

          {/* Goal */}
          <div>
            <label className="text-sm font-semibold block mb-1.5" style={labelStyle}>
              Goal
            </label>
            <Select value={goal} onValueChange={(v) => setGoal(v as TrainingBlockGoal)}>
              <SelectTrigger style={inputStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRAINING_BLOCK_GOALS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Goal Label */}
          {goal === "custom" && (
            <div>
              <label className="text-sm font-semibold block mb-1.5" style={labelStyle}>
                Custom Goal Name
                <span className="text-xs font-normal ml-2" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
                  (optional)
                </span>
              </label>
              <Input
                value={customGoalLabel}
                onChange={(e) => setCustomGoalLabel(e.target.value)}
                placeholder='e.g. "Off-season conditioning"'
                style={inputStyle}
              />
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="text-sm font-semibold block mb-1.5" style={labelStyle}>
              Duration (Weeks)
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={52}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(parseInt(e.target.value, 10) || 1)}
                className="w-24 text-center"
                style={inputStyle}
              />
              <span
                className="text-sm"
                style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}
              >
                weeks
              </span>
            </div>
          </div>

          {/* Progression Profile */}
          <div>
            <label className="text-sm font-semibold block mb-1.5" style={labelStyle}>
              Progression Profile
            </label>
            <Select
              value={progressionProfile}
              onValueChange={(v) => setProgressionProfile(v as ProgressionProfile)}
            >
              <SelectTrigger style={inputStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROGRESSION_PROFILES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {progressionProfile !== GOAL_SUGGESTED_PROFILE[goal] && (
              <button
                type="button"
                onClick={() => setProgressionProfile(GOAL_SUGGESTED_PROFILE[goal])}
                className="mt-1.5 text-xs underline"
                style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }}
              >
                Suggested: {PROGRESSION_PROFILES[GOAL_SUGGESTED_PROFILE[goal]]}
              </button>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold block mb-1.5" style={labelStyle}>
              Notes
              <span className="text-xs font-normal ml-2" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
                (optional)
              </span>
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes about this training block..."
              className="resize-none text-sm"
              style={inputStyle}
            />
          </div>

          {/* Delete Confirmation */}
          {confirmDelete && (
            <div
              className="rounded-xl p-3 text-sm"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#ef4444",
              }}
            >
              This will permanently delete this block and all its scheduled workouts and progression rules. This cannot be undone.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-2 px-5 py-4"
          style={{
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          }}
        >
          {/* Delete Button (edit mode only) */}
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl mr-auto"
              style={{ color: "#ef4444" }}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {deleting ? "Deleting..." : confirmDelete ? "Confirm Delete" : "Delete"}
            </Button>
          )}
          {confirmDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              className="rounded-xl"
            >
              Cancel Delete
            </Button>
          )}
          {!confirmDelete && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="rounded-xl ml-auto"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="rounded-xl"
                style={{
                  background: getSemanticColor("trust").gradient,
                  opacity: saving || !name.trim() ? 0.5 : 1,
                }}
              >
                {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Block"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
