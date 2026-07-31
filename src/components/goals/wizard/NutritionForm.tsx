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

type NutSub = "calories" | "protein" | "water" | "meal_plan";
type Dir = "increase" | "decrease" | "maintain";

function autoTitle(sub: NutSub, value: number): string {
  if (sub === "calories") return `Daily calorie target: ${value} kcal`;
  if (sub === "protein") return `Daily protein target: ${value} g`;
  if (sub === "water") return `Daily water: ${value} L`;
  if (sub === "meal_plan") return `Meal plan adherence ${value}%`;
  return "";
}

export function NutritionForm({
  onSubmit,
  onBack,
  submitting,
}: {
  onSubmit: (p: GoalCreationPayload) => void | Promise<void>;
  onBack: () => void;
  submitting: boolean;
}) {
  const [subType, setSubType] = useState<NutSub>("calories");
  const [targetValue, setTargetValue] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [direction, setDirection] = useState<Dir>("maintain");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (subType === "water") setDirection("increase");
    else if (subType === "calories") setDirection("maintain");
    else if (subType === "protein") setDirection("increase");
    else if (subType === "meal_plan") setDirection("increase");
    setTitleTouched(false);
  }, [subType]);

  const parsed = parseFloat(targetValue);

  useEffect(() => {
    if (titleTouched) return;
    if (!Number.isFinite(parsed)) {
      setTitle("");
      return;
    }
    setTitle(autoTitle(subType, parsed));
  }, [subType, parsed, titleTouched]);

  const unitFor = (): string | null => {
    if (subType === "calories") return "kcal";
    if (subType === "protein") return "g";
    if (subType === "water") return "L";
    if (subType === "meal_plan") return "%";
    return null;
  };

  const dirToLink = (d: Dir): GoalCreationPayload["direction"] => d;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (subType === "meal_plan") {
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return;
      const t = (titleTouched ? title : autoTitle("meal_plan", parsed)).trim();
      if (!t) return;
      await onSubmit({
        category: "nutrition",
        title: t,
        target_value: parsed,
        target_unit: "%",
        target_date: targetDate || null,
        notes: notes.trim() || null,
        source_type: "meal_plan",
        source_config: { window_days: 7 },
        direction: "increase",
      });
      return;
    }

    if (!Number.isFinite(parsed)) return;
    const t = (titleTouched ? title : autoTitle(subType, parsed)).trim();
    if (!t) return;

    const macro =
      subType === "calories"
        ? "calories"
        : subType === "protein"
          ? "protein_g"
          : "water_l";

    await onSubmit({
      category: "nutrition",
      title: t,
      target_value: parsed,
      target_unit: unitFor(),
      target_date: targetDate || null,
      notes: notes.trim() || null,
      source_type: "meal_plan",
      source_config: {
        tracking: "daily_macro",
        macro,
        window_days: 7,
      },
      direction: dirToLink(direction),
    });
  };

  const showMacroFields =
    subType === "calories" || subType === "protein" || subType === "water";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset>
        <WizardSectionLabel>Type</WizardSectionLabel>
        <WizardOptionChip
          name="nut-type"
          value={subType}
          onChange={setSubType}
          options={[
            { value: "calories", label: "Daily calories", hint: "kcal target" },
            { value: "protein", label: "Daily protein", hint: "grams" },
            { value: "water", label: "Water intake", hint: "liters" },
            {
              value: "meal_plan",
              label: "Meal plan adherence",
              hint: "Weekly %",
            },
          ]}
        />
      </fieldset>

      <WizardNotice>{AUTO_TRACKING_DEFERRED_NOTICE}</WizardNotice>

      {subType === "meal_plan" ? (
        <>
          <WizardHint>Window: last 7 days (locked for now).</WizardHint>
          <div>
            <WizardFieldLabel>Target percentage (0–100)</WizardFieldLabel>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              required
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className={wizardInputClass}
            />
          </div>
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
        </>
      ) : (
        <>
          <div>
            <WizardFieldLabel>Target value ({unitFor()})</WizardFieldLabel>
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

          {showMacroFields ? (
            <fieldset>
              <WizardSectionLabel>Direction</WizardSectionLabel>
              <WizardOptionChip
                name="nut-dir"
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
          ) : null}

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
        </>
      )}

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
