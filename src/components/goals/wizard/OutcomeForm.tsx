"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GoalCreationPayload } from "@/lib/goalCreationService";
import { WizardNotice } from "./WizardNotice";
import { AUTO_TRACKING_DEFERRED_NOTICE } from "./wizardCopy";
import {
  WizardFieldLabel,
  WizardFormActions,
  WizardHint,
  WizardOptionChip,
  WizardSectionLabel,
  wizardInputClass,
  wizardTextareaClass,
} from "./wizardUi";

type OutSub = "sleep" | "stress" | "energy";
type Dir = "increase" | "decrease" | "maintain";

function defaultDir(sub: OutSub): Dir {
  if (sub === "stress") return "decrease";
  return "increase";
}

function wellnessField(
  sub: OutSub,
): "sleep_hours" | "stress_level" | "energy_level" {
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
      <fieldset>
        <WizardSectionLabel>Focus</WizardSectionLabel>
        <WizardOptionChip
          name="out-focus"
          value={subType}
          onChange={setSubType}
          options={[
            { value: "sleep", label: "Sleep average", hint: "Hours / night" },
            { value: "stress", label: "Stress average", hint: "Scale 1–5" },
            { value: "energy", label: "Energy average", hint: "Scale 1–5" },
          ]}
        />
      </fieldset>

      <WizardNotice>{AUTO_TRACKING_DEFERRED_NOTICE}</WizardNotice>
      <WizardHint>Aggregation: last 7 days (average).</WizardHint>

      <div>
        <WizardFieldLabel>Target value ({unitLabel(subType)})</WizardFieldLabel>
        <Input
          type="number"
          step="0.1"
          min={0}
          required
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          className={wizardInputClass}
        />
      </div>

      <fieldset>
        <WizardSectionLabel>Direction</WizardSectionLabel>
        <WizardOptionChip
          name="out-dir"
          value={direction}
          onChange={setDirection}
          columns={3}
          options={[
            { value: "increase", label: "Increase" },
            { value: "decrease", label: "Decrease" },
            { value: "maintain", label: "Maintain" },
          ]}
        />
      </fieldset>

      <div>
        <WizardFieldLabel>Title</WizardFieldLabel>
        <Input
          value={title}
          onChange={(e) => {
            setTitleTouched(true);
            setTitle(e.target.value);
          }}
          required
          className={wizardInputClass}
        />
      </div>

      <div>
        <WizardFieldLabel>Notes (optional)</WizardFieldLabel>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={wizardTextareaClass}
        />
      </div>

      <WizardFormActions onBack={onBack} submitting={submitting} />
    </form>
  );
}
