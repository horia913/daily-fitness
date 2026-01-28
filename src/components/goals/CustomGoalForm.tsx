"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface CreateCustomGoalInput {
  title: string;
  description?: string;
  target_value: number;
  target_unit: string;
  target_date?: string | null;
  priority: "low" | "medium" | "high";
  status: "active";
  current_value: number;
  category: string;
  type: "target" | "habit" | "milestone";
}

interface CustomGoalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: CreateCustomGoalInput) => Promise<void>;
}

export function CustomGoalForm({ isOpen, onClose, onSubmit }: CustomGoalFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    target_value: "",
    target_unit: "",
    target_date: "",
    priority: "medium" as "low" | "medium" | "high",
    category: "other",
    type: "target" as "target" | "habit" | "milestone",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.target_value) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: formData.title,
        description: formData.description || undefined,
        target_value: parseFloat(formData.target_value),
        target_unit: formData.target_unit || "units",
        target_date: formData.target_date || null,
        priority: formData.priority,
        status: "active",
        current_value: 0,
        category: formData.category,
        type: formData.type,
      });
      // Reset form
      setFormData({
        title: "",
        description: "",
        target_value: "",
        target_unit: "",
        target_date: "",
        priority: "medium",
        category: "other",
        type: "target",
      });
      onClose();
    } catch (error) {
      console.error("Error creating custom goal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-sm"
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
              Goals
            </span>
            <h2 className="text-2xl font-bold fc-text-primary mt-2">
              Create Custom Goal
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 fc-press"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <Label className="text-sm font-medium mb-2 block fc-text-subtle">
              Goal Title *
            </Label>
            <Input
              type="text"
              placeholder="e.g., Read 12 books, Save $5000, Run a 5K"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full fc-glass-soft border border-[color:var(--fc-glass-border)]"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium mb-2 block fc-text-subtle">
              Description (optional)
            </Label>
            <Textarea
              placeholder="Why is this goal important to you?"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full fc-glass-soft border border-[color:var(--fc-glass-border)]"
            />
          </div>

          {/* Target Value & Unit */}
          <div>
            <Label className="text-sm font-medium mb-2 block fc-text-subtle">
              Target *
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Number"
                value={formData.target_value}
                onChange={(e) =>
                  setFormData({ ...formData, target_value: e.target.value })
                }
                required
                min={0}
                step="0.01"
                className="flex-1 fc-glass-soft border border-[color:var(--fc-glass-border)]"
              />
              <Input
                type="text"
                placeholder="Unit (books, $, km, etc)"
                value={formData.target_unit}
                onChange={(e) =>
                  setFormData({ ...formData, target_unit: e.target.value })
                }
                className="flex-1 fc-glass-soft border border-[color:var(--fc-glass-border)]"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm font-medium mb-2 block fc-text-subtle">
              Category
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger className="w-full fc-glass-soft border border-[color:var(--fc-glass-border)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="weight_loss">Weight Loss</SelectItem>
                <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                <SelectItem value="strength">Strength</SelectItem>
                <SelectItem value="endurance">Endurance</SelectItem>
                <SelectItem value="mobility">Mobility</SelectItem>
                <SelectItem value="body_composition">Body Composition</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div>
            <Label className="text-sm font-medium mb-2 block fc-text-subtle">
              Type
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value: "target" | "habit" | "milestone") =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger className="w-full fc-glass-soft border border-[color:var(--fc-glass-border)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="target">Target</SelectItem>
                <SelectItem value="habit">Habit</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div>
            <Label className="text-sm font-medium mb-2 block fc-text-subtle">
              Priority
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value: "low" | "medium" | "high") =>
                setFormData({ ...formData, priority: value })
              }
            >
              <SelectTrigger className="w-full fc-glass-soft border border-[color:var(--fc-glass-border)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Date */}
          <div>
            <Label className="text-sm font-medium mb-2 block fc-text-subtle">
              Deadline (optional)
            </Label>
            <Input
              type="date"
              value={formData.target_date}
              onChange={(e) =>
                setFormData({ ...formData, target_date: e.target.value })
              }
              className="w-full fc-glass-soft border border-[color:var(--fc-glass-border)]"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.target_value}
              className="flex-1 fc-btn fc-btn-primary fc-press"
            >
              {isSubmitting ? "Creating..." : "Create Goal"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 fc-btn fc-btn-secondary fc-press"
            >
              Cancel
            </Button>
          </div>
        </form>

        <p className="text-xs fc-text-subtle mt-4 text-center">
          💡 Custom goals are tracked manually - you'll update progress yourself.
        </p>
      </div>
    </div>
  );
}

