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
import { TrainingBlock } from "@/types/trainingBlock";
import { TrainingBlockService } from "@/lib/trainingBlockService";
import { useToast } from "@/components/ui/toast-provider";
import {
  blockSequentialLabel,
  blockSequentialOptions,
  getPresetPhaseTypeOptions,
  resolveBlockPhaseLabel,
  usesBlockSequentialPhaseType,
  usesFreeTextPhaseType,
  usesPresetPhaseTypeDropdown,
} from "@/lib/programs/periodizationStyles";

export interface TrainingBlockDraftPayload {
  name: string;
  duration_weeks: number;
  phase_label?: string | null;
  notes?: string | null;
}

interface TrainingBlockModalProps {
  isOpen: boolean;
  block: TrainingBlock | null;
  programId: string;
  nextBlockOrder: number;
  periodizationStyle?: string | null;
  totalBlockCount?: number;
  onSave: (block: TrainingBlock) => void;
  onDelete?: (blockId: string) => void;
  onClose: () => void;
  /** When true, mutations stay in working copy — no DB writes from this modal. */
  draftMode?: boolean;
  onDraftSave?: (payload: TrainingBlockDraftPayload) => void;
}

export function TrainingBlockModal({
  isOpen,
  block,
  programId,
  nextBlockOrder,
  periodizationStyle,
  totalBlockCount,
  onSave,
  onDelete,
  onClose,
  draftMode = false,
  onDraftSave,
}: TrainingBlockModalProps) {
  const { addToast } = useToast();
  const { isDark, getSemanticColor } = useTheme();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [notes, setNotes] = useState("");

  const blockOrder = block?.block_order ?? nextBlockOrder;
  const blockCount = Math.max(totalBlockCount ?? nextBlockOrder, blockOrder);
  const presetOptions = getPresetPhaseTypeOptions(periodizationStyle);
  const blockOptions = blockSequentialOptions(blockCount);
  const showPresetDropdown = usesPresetPhaseTypeDropdown(periodizationStyle);
  const showBlockDropdown = usesBlockSequentialPhaseType(periodizationStyle);
  const showFreeTextPhaseType = usesFreeTextPhaseType(periodizationStyle);
  const presetDropdownOptions =
    presetOptions && phaseLabel && !presetOptions.includes(phaseLabel)
      ? [phaseLabel, ...presetOptions]
      : presetOptions ?? [];
  const blockDropdownOptions =
    phaseLabel && !blockOptions.includes(phaseLabel)
      ? [phaseLabel, ...blockOptions]
      : blockOptions;

  // Sync fields from the block being edited (or reset for new)
  useEffect(() => {
    if (block) {
      setName(block.name);
      setDurationWeeks(block.duration_weeks);
      setPhaseLabel(
        resolveBlockPhaseLabel(block.block_order, block.phase_label, periodizationStyle) ?? "",
      );
      setNotes(block.notes || "");
    } else {
      setName(`Phase ${nextBlockOrder}`);
      setDurationWeeks(4);
      setPhaseLabel(
        resolveBlockPhaseLabel(nextBlockOrder, null, periodizationStyle) ?? "",
      );
      setNotes("");
    }
    setConfirmDelete(false);
  }, [block, isOpen, nextBlockOrder, periodizationStyle]);

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
    const resolvedPhaseLabel = showFreeTextPhaseType
      ? phaseLabel.trim() || null
      : showBlockDropdown
        ? phaseLabel.trim() || blockSequentialLabel(blockOrder)
        : phaseLabel.trim() || presetDropdownOptions[0] || null;
    const payload: TrainingBlockDraftPayload = {
      name: name.trim(),
      duration_weeks: durationWeeks,
      phase_label: resolvedPhaseLabel,
      notes: notes.trim() || null,
    };

    if (draftMode && onDraftSave) {
      onDraftSave(payload);
      onClose();
      return;
    }

    setSaving(true);
    try {
      let saved: TrainingBlock | null = null;
      if (isEditing && block) {
        saved = await TrainingBlockService.updateTrainingBlock(block.id, {
          name: payload.name,
          duration_weeks: payload.duration_weeks,
          phase_label: payload.phase_label,
          notes: payload.notes,
        });
      } else {
        saved = await TrainingBlockService.createTrainingBlock({
          program_id: programId,
          name: payload.name,
          duration_weeks: payload.duration_weeks,
          phase_label: payload.phase_label ?? undefined,
          notes: payload.notes ?? undefined,
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
    if (draftMode) {
      onDelete?.(block.id);
      onClose();
      return;
    }
    setDeleting(true);
    try {
      await TrainingBlockService.deleteTrainingBlock(block.id);
      onDelete?.(block.id);
      onClose();
    } catch (err: unknown) {
      console.error("[TrainingBlockModal] Delete failed:", err);
      const raw = err instanceof Error ? err.message : String(err);
      const title =
        raw.includes("Cannot delete the last block") ||
        raw.includes("last block of a program")
          ? "Cannot delete the last phase of a program. Delete the program instead, or add another phase first."
          : raw || "Could not delete training phase.";
      addToast({ title, variant: "destructive" });
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
            {isEditing ? "Edit Training Phase" : "New Training Phase"}
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
              Phase Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Hypertrophy Phase"'
              style={inputStyle}
            />
          </div>

          {showPresetDropdown && presetOptions ? (
            <div>
              <label className="text-sm font-semibold block mb-1.5" style={labelStyle}>
                Phase type
              </label>
              <Select
                value={phaseLabel || presetDropdownOptions[0] || ''}
                onValueChange={setPhaseLabel}
              >
                <SelectTrigger style={inputStyle}>
                  <SelectValue placeholder="Select phase type" />
                </SelectTrigger>
                <SelectContent>
                  {presetDropdownOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {showBlockDropdown ? (
            <div>
              <label className="text-sm font-semibold block mb-1.5" style={labelStyle}>
                Phase type
              </label>
              <Select
                value={phaseLabel || blockSequentialLabel(blockOrder)}
                onValueChange={setPhaseLabel}
              >
                <SelectTrigger style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {blockDropdownOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {showFreeTextPhaseType ? (
            <div>
              <label className="text-sm font-semibold block mb-1.5" style={labelStyle}>
                Phase type
                <span className="text-xs font-normal ml-2" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
                  (optional)
                </span>
              </label>
              <Input
                value={phaseLabel}
                onChange={(e) => setPhaseLabel(e.target.value)}
                placeholder='e.g. "Accumulation"'
                style={inputStyle}
              />
            </div>
          ) : null}

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
              placeholder="Any notes about this training phase..."
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
              This will permanently delete this phase and all its scheduled workouts and progression rules. This cannot be undone.
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
                {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Phase"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
