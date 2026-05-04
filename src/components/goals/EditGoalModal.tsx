"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast-provider";

export type EditableGoalRow = {
  id: string;
  client_id: string;
  title: string;
  target_value?: number | null;
  target_date?: string | null;
  notes?: string | null;
  description?: string | null;
  status: "active" | "completed" | "paused" | "cancelled" | string;
};

type EditGoalModalProps = {
  open: boolean;
  goal: EditableGoalRow | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EditGoalModal({ open, goal, onClose, onSaved }: EditGoalModalProps) {
  const { addToast } = useToast();
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("active");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !goal) return;
    setTitle(goal.title);
    setTargetValue(goal.target_value != null ? String(goal.target_value) : "");
    setTargetDate(goal.target_date ? String(goal.target_date).slice(0, 10) : "");
    setNotes(goal.notes ?? "");
    const s = goal.status === "in_progress" ? "active" : goal.status;
    setStatus(s === "completed" || s === "paused" || s === "cancelled" ? s : "active");
  }, [open, goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal) return;
    if (!title.trim()) {
      addToast({ title: "Title is required.", variant: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      const tv = targetValue.trim() === "" ? null : parseFloat(targetValue);
      if (tv !== null && Number.isNaN(tv)) {
        addToast({ title: "Target must be a valid number.", variant: "warning" });
        return;
      }

      const { data: current } = await supabase
        .from("goals")
        .select("current_value")
        .eq("id", goal.id)
        .single();

      const updateRow: Record<string, unknown> = {
        title: title.trim(),
        target_value: tv,
        target_date: targetDate || null,
        notes: notes.trim() || null,
        status,
        updated_at: new Date().toISOString(),
      };

      const cv = current?.current_value != null ? Number(current.current_value) : null;
      if (tv != null && cv != null && tv > 0) {
        updateRow.progress_percentage = Math.min(100, Math.round((cv / tv) * 100));
      }

      const { error } = await supabase.from("goals").update(updateRow).eq("id", goal.id).eq("client_id", goal.client_id);

      if (error) throw error;

      addToast({ title: "Goal updated", variant: "success" });
      onSaved();
      onClose();
    } catch (err) {
      console.error("[EditGoalModal]", err);
      addToast({ title: "Could not update goal.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-md max-h-[90vh] overflow-y-auto gap-0 p-4">
        <DialogDescription className="sr-only">
          Edit goal title, target value, target date, notes, and status.
        </DialogDescription>
        <div className="flex justify-between items-start gap-2 mb-4">
          <DialogTitle className="text-lg font-semibold fc-text-primary">Edit goal</DialogTitle>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs fc-text-dim mb-4">
          To change tracking source, delete and recreate the goal.
        </p>

        {goal ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm fc-text-subtle">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-xl border-[color:var(--fc-glass-border)]" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm fc-text-subtle">Target value</Label>
              <Input
                type="number"
                step="0.01"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="rounded-xl border-[color:var(--fc-glass-border)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm fc-text-subtle">Target date</Label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="rounded-xl border-[color:var(--fc-glass-border)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm fc-text-subtle">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="rounded-xl border-[color:var(--fc-glass-border)]" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm fc-text-subtle">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-xl border-[color:var(--fc-glass-border)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 fc-btn fc-btn-primary" disabled={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
