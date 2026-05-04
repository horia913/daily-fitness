"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GoalCreationPayload } from "@/lib/goalCreationService";

type SubType = "weight" | "body_fat" | "muscle_mass";
type DirChoice = "lose" | "gain" | "maintain";

function defaultDirection(sub: SubType): DirChoice {
  if (sub === "weight" || sub === "body_fat") return "lose";
  return "gain";
}

function dirChoiceToLink(
  choice: DirChoice
): GoalCreationPayload["direction"] {
  if (choice === "lose") return "decrease";
  if (choice === "gain") return "increase";
  return "maintain";
}

function metricField(sub: SubType): "weight_kg" | "body_fat_percentage" | "muscle_mass_kg" {
  if (sub === "weight") return "weight_kg";
  if (sub === "body_fat") return "body_fat_percentage";
  return "muscle_mass_kg";
}

function unitFor(sub: SubType): string {
  if (sub === "body_fat") return "%";
  return "kg";
}

function autoTitle(sub: SubType, value: number, dir: DirChoice): string {
  const u = unitFor(sub);
  if (sub === "weight") {
    if (dir === "maintain") return `Maintain ${value}${u}`;
    return `Reach ${value}${u}`;
  }
  if (sub === "body_fat") {
    if (dir === "maintain") return `Maintain ${value}% body fat`;
    return `Reach ${value}% body fat`;
  }
  if (dir === "lose") return `Reduce to ${value}${u} muscle`;
  if (dir === "gain") return `Gain to ${value}${u} muscle`;
  return `Maintain muscle at ${value}${u}`;
}

export function BodyCompositionForm({
  onSubmit,
  onBack,
  submitting,
}: {
  onSubmit: (p: GoalCreationPayload) => void | Promise<void>;
  onBack: () => void;
  submitting: boolean;
}) {
  const [subType, setSubType] = useState<SubType>("weight");
  const [direction, setDirection] = useState<DirChoice>(() => defaultDirection("weight"));
  const [targetValue, setTargetValue] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setDirection(defaultDirection(subType));
    setTitleTouched(false);
  }, [subType]);

  const parsed = useMemo(() => parseFloat(targetValue), [targetValue]);

  useEffect(() => {
    if (titleTouched) return;
    if (!Number.isFinite(parsed)) {
      setTitle("");
      return;
    }
    setTitle(autoTitle(subType, parsed, direction));
  }, [subType, direction, parsed, titleTouched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !Number.isFinite(parsed)) return;

    await onSubmit({
      category: "body_composition",
      title: title.trim(),
      target_value: parsed,
      target_unit: unitFor(subType),
      target_date: targetDate || null,
      notes: notes.trim() || null,
      source_type: "body_metric",
      source_config: { metric_field: metricField(subType) },
      direction: dirChoiceToLink(direction),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wider fc-text-dim mb-2">Metric</legend>
        <div className="flex flex-col gap-2">
          {(
            [
              ["weight", "Weight"],
              ["body_fat", "Body fat %"],
              ["muscle_mass", "Muscle mass"],
            ] as const
          ).map(([v, lab]) => (
            <label
              key={v}
              className="flex items-center gap-2 rounded-lg border border-[color:var(--fc-glass-border)] px-3 py-2 cursor-pointer has-[:checked]:border-[color:var(--fc-accent-cyan)]"
            >
              <input
                type="radio"
                name="bc-sub"
                checked={subType === v}
                onChange={() => setSubType(v)}
                className="accent-[color:var(--fc-accent-cyan)]"
              />
              <span className="text-sm fc-text-primary">{lab}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label className="text-sm fc-text-subtle">Target value ({unitFor(subType)})</Label>
        <Input
          type="number"
          step="0.1"
          min={0}
          required
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          className="rounded-xl border-[color:var(--fc-glass-border)]"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wider fc-text-dim mb-2">Direction</legend>
        <div className="flex flex-col gap-2">
          {(
            [
              ["lose", "Lose"],
              ["gain", "Gain"],
              ["maintain", "Maintain"],
            ] as const
          ).map(([v, lab]) => (
            <label
              key={v}
              className="flex items-center gap-2 rounded-lg border border-[color:var(--fc-glass-border)] px-3 py-2 cursor-pointer has-[:checked]:border-[color:var(--fc-accent-cyan)]"
            >
              <input
                type="radio"
                name="bc-dir"
                checked={direction === v}
                onChange={() => setDirection(v)}
                className="accent-[color:var(--fc-accent-cyan)]"
              />
              <span className="text-sm fc-text-primary">{lab}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label className="text-sm fc-text-subtle">Title</Label>
        <Input
          value={title}
          onChange={(e) => {
            setTitleTouched(true);
            setTitle(e.target.value);
          }}
          required
          className="rounded-xl border-[color:var(--fc-glass-border)]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm fc-text-subtle">Target date (optional)</Label>
        <Input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="rounded-xl border-[color:var(--fc-glass-border)]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm fc-text-subtle">Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="rounded-xl border-[color:var(--fc-glass-border)]"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button type="submit" className="flex-1 fc-btn fc-btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Create goal"}
        </Button>
      </div>
    </form>
  );
}
