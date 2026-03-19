"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Clock,
  MapPin,
  Zap,
  FileText,
  Calendar,
  X,
} from "lucide-react";
import {
  ACTIVITY_META,
  INTENSITY_META,
  type ActivityType,
  type Intensity,
  type LogActivityInput,
  type ClientActivity,
} from "@/lib/clientActivityService";
import { cn } from "@/lib/utils";

interface LogActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: LogActivityInput) => Promise<void>;
  editingActivity?: ClientActivity | null;
}

export function LogActivityModal({
  isOpen,
  onClose,
  onSave,
  editingActivity,
}: LogActivityModalProps) {
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [customName, setCustomName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [notes, setNotes] = useState("");
  const [activityDate, setActivityDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingActivity) {
      setActivityType(editingActivity.activity_type);
      setCustomName(editingActivity.custom_activity_name ?? "");
      setDurationMinutes(String(editingActivity.duration_minutes));
      setDistanceKm(
        editingActivity.distance_km
          ? String(editingActivity.distance_km)
          : ""
      );
      setIntensity(editingActivity.intensity);
      setNotes(editingActivity.notes ?? "");
      setActivityDate(editingActivity.activity_date);
    } else {
      resetForm();
    }
  }, [editingActivity, isOpen]);

  const resetForm = () => {
    setActivityType(null);
    setCustomName("");
    setDurationMinutes("");
    setDistanceKm("");
    setIntensity("moderate");
    setNotes("");
    setActivityDate(new Date().toISOString().split("T")[0]);
  };

  const isValid =
    activityType !== null &&
    Number(durationMinutes) > 0 &&
    (activityType !== "custom" || customName.trim().length > 0);

  const handleSubmit = async () => {
    if (!isValid || !activityType) return;
    setSaving(true);
    try {
      await onSave({
        activity_type: activityType,
        custom_activity_name:
          activityType === "custom" ? customName.trim() : null,
        duration_minutes: Number(durationMinutes),
        distance_km: distanceKm ? Number(distanceKm) : null,
        intensity,
        notes: notes.trim() || null,
        activity_date: activityDate,
      });
      resetForm();
      onClose();
    } catch (err) {
      console.error("Failed to save activity:", err);
    } finally {
      setSaving(false);
    }
  };

  const activityTypes = Object.entries(ACTIVITY_META) as [
    ActivityType,
    (typeof ACTIVITY_META)[ActivityType],
  ][];

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      style={{ paddingBottom: "5rem" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="fc-glass fc-card shadow-2xl rounded-3xl border border-[color:var(--fc-glass-border-strong)] w-full flex flex-col overflow-hidden"
        style={{
          animation: "modalSlideIn 0.3s ease-out",
          maxWidth: "min(92vw, 28rem)",
          maxHeight: "min(80vh, calc(100vh - 7rem))",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--fc-glass-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold fc-text-primary">
                {editingActivity ? "Edit Activity" : "Log Activity"}
              </h2>
              <p className="text-xs fc-text-dim">
                Track your extra training
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl fc-text-dim hover:fc-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Activity Type Grid */}
          <div>
            <label className="text-xs font-semibold fc-text-dim uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Activity Type
            </label>
            <div className="grid grid-cols-4 gap-1.5 mt-1.5">
              {activityTypes.map(([type, meta]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActivityType(type)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all duration-150",
                    activityType === type
                      ? "border-cyan-500 bg-cyan-500/10 shadow-sm"
                      : "border-[color:var(--fc-glass-border)] fc-surface hover:opacity-80"
                  )}
                >
                  <span className="text-lg leading-none">{meta.icon}</span>
                  <span className="text-[10px] font-medium fc-text-primary leading-tight text-center">
                    {meta.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Activity Name */}
          {activityType === "custom" && (
            <div>
              <label className="text-xs font-semibold fc-text-dim mb-1 block">
                Activity Name
              </label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Rock Climbing, Rowing..."
                className="fc-surface border-[color:var(--fc-glass-border)] fc-text-primary h-10 text-sm"
              />
            </div>
          )}

          {/* Duration and Distance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold fc-text-dim mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Duration (min)
              </label>
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="30"
                min={1}
                className="fc-surface border-[color:var(--fc-glass-border)] fc-text-primary h-10 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold fc-text-dim mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Distance (km)
              </label>
              <Input
                type="number"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                placeholder="Optional"
                min={0}
                step={0.1}
                className="fc-surface border-[color:var(--fc-glass-border)] fc-text-primary h-10 text-sm"
              />
            </div>
          </div>

          {/* Intensity Selector */}
          <div>
            <label className="text-xs font-semibold fc-text-dim mb-1.5 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Intensity
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(INTENSITY_META) as [Intensity, { label: string; color: string }][]).map(
                ([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIntensity(key)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-medium transition-all",
                      intensity === key
                        ? "border-cyan-500 bg-cyan-500/10 fc-text-primary"
                        : "border-[color:var(--fc-glass-border)] fc-surface fc-text-dim hover:opacity-80"
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    {meta.label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="text-xs font-semibold fc-text-dim mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Date
            </label>
            <Input
              type="date"
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="fc-surface border-[color:var(--fc-glass-border)] fc-text-primary h-10 text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold fc-text-dim mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it go?"
              rows={2}
              className="w-full rounded-xl px-3 py-2 text-sm fc-surface border border-[color:var(--fc-glass-border)] fc-text-primary placeholder:fc-text-dim resize-none focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-5 py-3 border-t border-[color:var(--fc-glass-border)] shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="fc-btn fc-btn-secondary h-10 px-4 text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className="fc-btn fc-btn-primary fc-press h-10 px-5 text-sm"
          >
            {saving ? "Saving..." : editingActivity ? "Update" : "Log Activity"}
          </Button>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
