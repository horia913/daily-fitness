"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export type Pillar = "training" | "nutrition" | "lifestyle" | "checkins" | "general";

const GOAL_TYPE_OPTIONS: Record<Pillar, { value: string; label: string }[]> = {
  training: [
    { value: "strength", label: "Strength" },
    { value: "endurance", label: "Endurance" },
    { value: "mobility", label: "Mobility" },
    { value: "performance", label: "Performance" },
  ],
  nutrition: [
    { value: "calorie", label: "Calorie" },
    { value: "protein", label: "Protein" },
    { value: "water", label: "Water" },
    { value: "macro", label: "Macros" },
  ],
  lifestyle: [
    { value: "habit", label: "Habit" },
    { value: "sleep", label: "Sleep" },
    { value: "activity", label: "Activity" },
  ],
  checkins: [
    { value: "body_composition", label: "Body Composition" },
    { value: "weight", label: "Weight" },
    { value: "measurements", label: "Measurements" },
  ],
  general: [
    { value: "other", label: "Other" },
    { value: "custom", label: "Custom" },
  ],
};

interface AddGoalModalProps {
  open: boolean;
  onClose: () => void;
  pillar: Pillar;
  onSuccess: () => void;
}

export function AddGoalModal({ open, onClose, pillar, onSuccess }: AddGoalModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetUnit, setTargetUnit] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalType, setGoalType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !title || !targetValue) return;

    setIsSubmitting(true);
    try {
      const parsed = parseFloat(targetValue);
      if (isNaN(parsed)) {
        alert("Please enter a valid number for target.");
        return;
      }

      const { error } = await supabase.from("goals").insert({
        client_id: user.id,
        pillar,
        title,
        target_value: parsed,
        target_unit: targetUnit || "units",
        target_date: targetDate || null,
        goal_type: goalType || null,
        current_value: 0,
        status: "active",
        priority: "medium",
        start_date: new Date().toISOString().split("T")[0],
        progress_percentage: 0,
        category: "other",
      });

      if (error) throw error;

      setTitle("");
      setTargetValue("");
      setTargetUnit("");
      setTargetDate("");
      setGoalType("");
      onClose();
      onSuccess();
    } catch (error) {
      console.error("Error creating goal:", error);
      alert("Failed to create goal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pillarLabels: Record<Pillar, string> = {
    training: "Training",
    nutrition: "Nutrition",
    lifestyle: "Lifestyle",
    checkins: "Check-ins",
    general: "General",
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md mt-8 mb-8 fc-modal fc-card p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
              {pillarLabels[pillar]} Goals
            </span>
            <h2 className="text-2xl font-bold fc-text-primary mt-2">
              Add Goal
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 fc-press">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block fc-text-subtle">Goal Title *</Label>
            <Input
              type="text"
              placeholder="e.g., Run 5K, Hit 150g protein daily"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full fc-glass-soft border border-[color:var(--fc-glass-border)]"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block fc-text-subtle">Target *</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                required
                min={0}
                step="0.01"
                className="flex-1 fc-glass-soft border border-[color:var(--fc-glass-border)]"
              />
              <Input
                type="text"
                placeholder="Unit (kg, reps, min, etc)"
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
                className="flex-1 fc-glass-soft border border-[color:var(--fc-glass-border)]"
              />
            </div>
          </div>

          {GOAL_TYPE_OPTIONS[pillar].length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block fc-text-subtle">Goal Type (optional)</Label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-lg px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {GOAL_TYPE_OPTIONS[pillar].map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium mb-2 block fc-text-subtle">Deadline (optional)</Label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full fc-glass-soft border border-[color:var(--fc-glass-border)]"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !title || !targetValue}
              className="flex-1 fc-btn fc-btn-primary fc-press"
            >
              {isSubmitting ? "Creating..." : "Create Goal"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 fc-btn fc-btn-secondary fc-press">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
