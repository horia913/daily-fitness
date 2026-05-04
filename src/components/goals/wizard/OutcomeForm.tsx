"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GoalCreationPayload } from "@/lib/goalCreationService";
import { WizardNotice } from "./WizardNotice";
import { AUTO_TRACKING_DEFERRED_NOTICE } from "./wizardCopy";

type OutSub = "sleep" | "stress" | "energy";
type Dir = "increase" | "decrease" | "maintain";

function defaultDir(sub: OutSub): Dir {
  if (sub === "stress") return "decrease";
  return "increase";
}

function wellnessField(sub: OutSub): "sleep_hours" | "stress_level" | "energy_level" {
  if (sub === "sleep") return "sleep_hours";
  if (sub === "stress") return "stress_level";
  return "energy_level";
}

function unitLabel(sub: OutSub): string {
  if (sub === "sleep") return "hours (avg)";
  return "scale 1–5 (avg)";
}

function dirToLink(d: Dir): GoalCreationPayload["direction"] {
  return d;
}

function autoTitle(sub: OutSub, value: number, dir: Dir): string {
  if (sub === "sleep") {
    if (dir === "increase") return `Average sleep ≥ ${value}h`;
    if (dir === "decrease") return `Average sleep ≤ ${value}h`;
    return `Average sleep near ${value}h`;
  }
  if (sub === "stress") {
    if (dir === "decrease") return `Average stress ≤ ${value}`;
    if (dir === "increase") return `Average stress ≥ ${value}`;
    return `Average stress near ${value}`;
  }
  if (dir === "increase") return `Average energy ≥ ${value}`;
  if (dir === "decrease") return `Average energy ≤ ${value}`;
  return `Average energy near ${value}`;
}

export function OutcomeForm({
  onSubmit,
  onBack,
  submitting,
}: {
  onSubmit: (p: GoalCreationPayload) => void | Promise<void>;
  onBack: () => void;
  submitting: boolean;
}) {
  const [subType, setSubType] = useState<OutSub>("sleep");
  const [direction, setDirection] = useState<Dir>(() => defaultDir("sleep"));
  const [targetValue, setTargetValue] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);

  const [notes, setNotes] = useState("");

  useEffect(() => {
    setDirection(defaultDir(subType));
    setTitleTouched(false);
  }, [subType]);

  const parsed = parseFloat(targetValue);

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
      category: "outcome",
      title: title.trim(),
      target_value: parsed,
      target_unit: subType === "sleep" ? "h" : "scale",
      target_date: null,
      notes: notes.trim() || null,
      source_type: "wellness_field",
      source_config: {
        wellness_field: wellnessField(subType),
        aggregation: "avg",
        window_days: 7,
      },
      direction: dirToLink(direction),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wider fc-text-dim mb-2">Focus</legend>
        <div className="flex flex-col gap-2">
          {(
            [
              ["sleep", "Sleep average"],
              ["stress", "Stress average"],
              ["energy", "Energy average"],
            ] as const
          ).map(([v, lab]) => (
            <label
              key={v}
              className="flex items-center gap-2 rounded-lg border border-[color:var(--fc-glass-border)] px-3 py-2 cursor-pointer has-[:checked]:border-[color:var(--fc-accent-cyan)]"
            >
              <input
                type="radio"
                name="out-sub"
                checked={subType === v}
                onChange={() => setSubType(v)}
                className="accent-[color:var(--fc-accent-cyan)]"
              />
              <span className="text-sm fc-text-primary">{lab}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <>
        <WizardNotice>{AUTO_TRACKING_DEFERRED_NOTICE}</WizardNotice>
        <p className="text-xs fc-text-dim">Aggregation: last 7 days (average).</p>

        <div className="space-y-2">
          <Label className="text-sm fc-text-subtle">Target value ({unitLabel(subType)})</Label>
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
                ["increase", "Increase"],
                ["decrease", "Decrease"],
                ["maintain", "Maintain"],
              ] as const
            ).map(([v, lab]) => (
              <label
                key={v}
                className="flex items-center gap-2 rounded-lg border border-[color:var(--fc-glass-border)] px-3 py-2 cursor-pointer has-[:checked]:border-[color:var(--fc-accent-cyan)]"
              >
                <input
                  type="radio"
                  name="out-dir"
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
      </>

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
