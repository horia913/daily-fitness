"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GoalCreationPayload } from "@/lib/goalCreationService";
import {
  WizardFieldLabel,
  WizardFormActions,
  WizardOptionChip,
  WizardSectionLabel,
  wizardInputClass,
  wizardTextareaClass,
} from "./wizardUi";

type SubType = "weight" | "body_fat" | "muscle_mass";
type DirChoice = "lose" | "gain" | "maintain";

function defaultDirection(sub: SubType): DirChoice {
  if (sub === "weight" || sub === "body_fat") return "lose";
  return "gain";
}

function dirChoiceToLink(
  choice: DirChoice,
): GoalCreationPayload["direction"] {
  if (choice === "lose") return "decrease";
  if (choice === "gain") return "increase";
  return "maintain";
}

function metricField(
  sub: SubType,
): "weight_kg" | "body_fat_percentage" | "muscle_mass_kg" {
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
  const [direction, setDirection] = useState<DirChoice>(() =>
    defaultDirection("weight"),
  );
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
      <fieldset>
        <WizardSectionLabel>Metric</WizardSectionLabel>
        <WizardOptionChip
          name="bc-metric"
          value={subType}
          onChange={setSubType}
          options={[
            { value: "weight", label: "Weight", hint: "kg target" },
            { value: "body_fat", label: "Body fat %", hint: "From metrics" },
            { value: "muscle_mass", label: "Muscle mass", hint: "kg target" },
          ]}
        />
      </fieldset>

      <div>
        <WizardFieldLabel>Target value ({unitFor(subType)})</WizardFieldLabel>
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
          name="bc-dir"
          value={direction}
          onChange={setDirection}
          columns={3}
          options={[
            { value: "lose", label: "Lose" },
            { value: "gain", label: "Gain" },
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
        <WizardFieldLabel>Target date (optional)</WizardFieldLabel>
        <Input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
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
