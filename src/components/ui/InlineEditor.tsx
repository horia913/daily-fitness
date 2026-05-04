"use client";

/**
 * InlineEditor — v4 Inline value editor atomic
 *
 * Spec refs: design-system-v4 §6.8 (Inline editor — current value + Update + Edit + Delete),
 *             §6.22 (input-cell), §15.2 (component conventions).
 *
 * Used by: Goals, Habits, Body Metrics — anywhere a single primary value can be
 * adjusted in-line without opening a modal.
 *
 * Phase 0a: additive only. Not yet wired into any screen.
 * Phase 0b: citation corrected from §6.6 → §6.8 (Task 1 calibration).
 */

import React from "react";
import { cn } from "@/lib/utils";

export interface InlineEditorProps {
  /** The current value to display in the large numeric slot. */
  value: React.ReactNode;
  /** Optional unit suffix (e.g. "kg", "reps", "min"). */
  unit?: string;
  /** Optional small label above the value (e.g. "CURRENT WEIGHT"). */
  label?: React.ReactNode;
  /** Click handler for the primary "Update" action (saves the current value). */
  onUpdate?: () => void;
  /** Click handler for "Edit" (opens detailed editor / modal). */
  onEdit?: () => void;
  /** Click handler for "Delete" (destructive). */
  onDelete?: () => void;
  /** Override default button labels (i18n). */
  updateLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  /** Disable the Update CTA (e.g. while saving or when there's no change). */
  updateDisabled?: boolean;
  className?: string;
}

export function InlineEditor({
  value,
  unit,
  label,
  onUpdate,
  onEdit,
  onDelete,
  updateLabel = "Update",
  editLabel = "Edit",
  deleteLabel = "Delete",
  updateDisabled = false,
  className,
}: InlineEditorProps) {
  return (
    <div className={cn("input-cell", className)}>
      {label ? <div className="label">{label}</div> : null}

      <div className="flex items-baseline justify-between gap-3">
        <div className="num">
          {value}
          {unit ? (
            <span
              className="ml-1 text-[14px] font-semibold tracking-normal"
              style={{ color: "var(--fc-text-dim)" }}
            >
              {unit}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onUpdate ? (
            <button
              type="button"
              className="btn-action btn-action-sm"
              onClick={onUpdate}
              disabled={updateDisabled}
            >
              {updateLabel}
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              className="btn-ghost-icon-sm"
              onClick={onEdit}
              aria-label={editLabel}
            >
              {editLabel}
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="btn-ghost-icon-sm danger"
              onClick={onDelete}
              aria-label={deleteLabel}
            >
              {deleteLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default InlineEditor;
